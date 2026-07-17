import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'
import { Admin } from '../../src/models/Admin'
import { Product } from '../../src/models/Product'

// An in-memory MongoDB so DB-touching flows (register/login/order creation,
// ownership checks) run against a real database instead of failing fast.
// bufferCommands stays false (see tests/setup.ts) but that's moot once
// actually connected -- readyState becomes 1 for real, no hack needed.
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 60000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

// Real access tokens always carry a genuine Mongo _id (set at login from
// admin._id.toString()) -- checkPasswordExpiry now does Admin.findById(req.user.id)
// on every admin route, which throws a CastError on a non-ObjectId string like
// the old literal 'admin1'. Using a syntactically valid (if non-existent) ObjectId
// here matches what a real token actually contains.
const adminToken = jwt.sign(
  { id: new mongoose.Types.ObjectId().toString(), email: 'a@a.com', role: 'admin' },
  process.env.JWT_ADMIN_SECRET as string,
  { expiresIn: '15m' }
)
const auth = { Authorization: `Bearer ${adminToken}` }
const DBERR = [200, 500, 503] // reached service layer

describe('infra & docs', () => {
  it('GET / -> 200', async () => expect((await request(app).get('/')).status).toBe(200))
  it('GET /health -> 200', async () => expect((await request(app).get('/health')).status).toBe(200))
  it('GET /api-docs.json -> 200', async () => expect((await request(app).get('/api-docs.json')).status).toBe(200))
  it('unknown route -> 404', async () => expect((await request(app).get('/api/v1/nope')).status).toBe(404))
})

describe('removed modules are gone', () => {
  it('GET /api/v1/brands -> 404', async () => expect((await request(app).get('/api/v1/brands')).status).toBe(404))
  it('GET /api/v1/flash-sales/active -> 404', async () => expect((await request(app).get('/api/v1/flash-sales/active')).status).toBe(404))
  it('POST /api/v1/sale-categories/activate-season -> 404', async () =>
    expect((await request(app).post('/api/v1/sale-categories/activate-season').set(auth).send({ season: 'dashain' })).status).toBe(404))
})

describe('public reads are wired (not 404)', () => {
  for (const p of ['/api/v1/products', '/api/v1/categories', '/api/v1/banners/active', '/api/v1/sale-categories/active', '/api/v1/coupons/active']) {
    it(`GET ${p}`, async () => expect(DBERR).toContain((await request(app).get(p)).status))
  }
})

describe('auth gate', () => {
  for (const p of ['/api/v1/orders', '/api/v1/orders/stats', '/api/v1/user/profile', '/api/v1/user/favorites']) {
    it(`GET ${p} without token -> 401`, async () => expect((await request(app).get(p)).status).toBe(401))
  }
  it('POST /api/v1/products without token -> 401', async () => expect((await request(app).post('/api/v1/products')).status).toBe(401))
  it('POST /api/v1/coupons without token -> 401', async () => expect((await request(app).post('/api/v1/coupons')).status).toBe(401))
  it('GET /api/v1/orders WITH admin token passes auth', async () =>
    expect(DBERR).toContain((await request(app).get('/api/v1/orders').set(auth)).status))
})

describe('validation layer', () => {
  it('POST /api/v1/orders empty -> 4xx', async () => expect([400, 422]).toContain((await request(app).post('/api/v1/orders').send({})).status))
  it('POST /api/v1/coupons/validate empty -> 4xx', async () => expect([400, 422]).toContain((await request(app).post('/api/v1/coupons/validate').send({})).status))
  it('POST /api/v1/coupons empty (admin) -> 4xx', async () => expect([400, 422]).toContain((await request(app).post('/api/v1/coupons').set(auth).send({})).status))
  it('coupon WITH max_discount_cap passes validation (reaches service)', async () => {
    const res = await request(app).post('/api/v1/coupons').set(auth).send({
      code: 'TEST10', discount_type: 'percentage', discount_value: 10,
      validFrom: '2026-01-01', validTo: '2026-02-01', max_discount_cap: 50,
    })
    expect(res.status).not.toBe(422) // not a validation rejection
    expect([...DBERR, 201]).toContain(res.status) // 201 once the real DB write succeeds
  })
  it('invalid order status -> 4xx', async () =>
    expect([400, 422]).toContain((await request(app).put('/api/v1/orders/NP26001/status').set(auth).send({ status: 'banana' })).status))
  it('track without phone -> 4xx', async () =>
    expect([400, 422]).toContain((await request(app).get('/api/v1/orders/track/NP26001')).status))
})

// ============================================================================
// RBAC (vertical privilege escalation) + IDOR (horizontal / ownership)
// ============================================================================
// Uses the real register -> login -> act flow against the in-memory Mongo
// above, so tokens/ids/roles come from the actual auth stack rather than
// being hand-assembled. Route paths and expected outcomes were verified
// against the actual route files, not assumed:
//   - Admin login is POST /auth/login (there is no /auth/admin/login).
//   - Order ownership is enforced by scoping the DB query itself
//     (order.controller#getMyOrderById), so a non-owner gets 404, not 403 --
//     that's deliberate, to avoid an existence oracle (see the comment
//     above getMyOrderById). A test asserting 403 there would be wrong.
//   - There is no admin/users, user/:userId, or order-cancel route in this
//     API, so those draft cases are omitted rather than faked.
//   - The User model has no `role`/`isAdmin` field at all -- admin vs user
//     is a separate collection + separate JWT secret, not a document field
//     -- so mass-assignment coverage focuses on what the middleware
//     actually protects: the field is stripped from the request, not that
//     it changes a role a user document doesn't have.
let userAToken: string
let userBToken: string
let seededAdminToken: string
let userAOrderId: string

beforeAll(async () => {
  const passwordA = 'TestUserA@2024!'
  await request(app).post('/api/v1/auth/register').send({
    name: 'Test User A', email: 'usera@example.com', password: passwordA,
  })
  const loginA = await request(app).post('/api/v1/auth/user/login').send({
    email: 'usera@example.com', password: passwordA,
  })
  userAToken = loginA.body?.data?.accessToken

  const passwordB = 'TestUserB@2024!'
  await request(app).post('/api/v1/auth/register').send({
    name: 'Test User B', email: 'userb@example.com', password: passwordB,
  })
  const loginB = await request(app).post('/api/v1/auth/user/login').send({
    email: 'userb@example.com', password: passwordB,
  })
  userBToken = loginB.body?.data?.accessToken

  // No admin-registration endpoint exists by design -- seed the Admin
  // document directly, then log in for real through /auth/login so the
  // token comes from the actual auth code path.
  const adminPassword = 'SeededAdmin@2024!'
  await Admin.create({
    adminId: 'admin002',
    email: 'testadmin@example.com',
    password: adminPassword,
    name: 'Test Admin',
    role: 'admin',
    isActive: true,
  })
  const loginAdmin = await request(app).post('/api/v1/auth/login').send({
    email: 'testadmin@example.com', password: adminPassword,
  })
  seededAdminToken = loginAdmin.body?.data?.accessToken

  // Price chosen to land exactly on the free-shipping threshold so the
  // expected total is simple to compute: subtotal 5000, +13% VAT (650),
  // +0 shipping (>= Rs. 5000) = 5650. See utils/priceCalculator.ts.
  const productId = 'TEST-PRODUCT-001'
  await Product.create({
    id: productId, name: 'Test Product', price: 5000, category_id: 'test-category', stock: 10, isActive: true,
  })

  const orderRes = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${userAToken}`)
    .send({
      name: 'Test User A',
      phone: '9800000000',
      district: 'Kathmandu',
      city: 'Kathmandu',
      address: 'Test Street',
      description: 'Seed order for IDOR test',
      items: [{ productId, quantity: 1 }],
      totalAmount: 5650,
      paymentMethod: 'cod',
    })
  userAOrderId = orderRes.body?.data?.id
}, 60000)

// requireAdmin (authMiddleware.ts#authenticate(true)) verifies the token
// against JWT_ADMIN_SECRET, a completely different secret than user tokens
// are signed with (JWT_SECRET). A real user token therefore fails signature
// verification before the `decoded.role !== 'admin'` check is ever reached,
// so vertical escalation is rejected at 401 ("invalid token"), not 403
// ("wrong role") -- a stronger guarantee than a role check alone, since it
// can't be socially-engineered by a client claiming a different role in an
// otherwise-valid token. These tests assert the actual observed behavior;
// do not "fix" them to 403 without re-checking authMiddleware.ts first.
describe('RBAC — user token rejected on admin-only routes', () => {
  test('POST /api/v1/products returns 401 with a user token (wrong signing secret)', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Hack', price: 1 })
    expect(res.status).toBe(401)
  })

  test('DELETE /api/v1/products/:id returns 401 with a user token (wrong signing secret)', async () => {
    const res = await request(app)
      .delete('/api/v1/products/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${userAToken}`)
    expect(res.status).toBe(401)
  })

  test('GET /api/v1/admin/audit/logs returns 401 with a user token (wrong signing secret)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit/logs')
      .set('Authorization', `Bearer ${userAToken}`)
    expect(res.status).toBe(401)
  })

  test('GET /api/v1/admin/audit/logs returns 401 with no token', async () => {
    const res = await request(app).get('/api/v1/admin/audit/logs')
    expect(res.status).toBe(401)
  })

  test('GET /api/v1/orders/:id (admin-only) returns 401 with a user token (wrong signing secret)', async () => {
    if (!userAOrderId) return
    const res = await request(app)
      .get(`/api/v1/orders/${userAOrderId}`)
      .set('Authorization', `Bearer ${userAToken}`)
    expect(res.status).toBe(401)
  })

  test('Admin token is accepted on the same admin route', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit/logs')
      .set('Authorization', `Bearer ${seededAdminToken}`)
    expect(res.status).toBe(200)
  })
})

describe('IDOR — order ownership on /orders/my/:id', () => {
  test('User A can read their own order', async () => {
    if (!userAOrderId) throw new Error('seed order was not created — check beforeAll')
    const res = await request(app)
      .get(`/api/v1/orders/my/${userAOrderId}`)
      .set('Authorization', `Bearer ${userAToken}`)
    expect(res.status).toBe(200)
    expect(res.body?.data?.id).toBe(userAOrderId)
  })

  // Ownership is enforced by scoping the DB query to {id, user_id}, so a
  // mismatched owner 404s exactly like a nonexistent id -- there is no
  // existence oracle. This is the actual, intended behavior; do not change
  // this assertion to 403 without also changing the controller.
  test('User B gets 404 (not the order, not an oracle) reading User A\'s order', async () => {
    if (!userAOrderId) throw new Error('seed order was not created — check beforeAll')
    const res = await request(app)
      .get(`/api/v1/orders/my/${userAOrderId}`)
      .set('Authorization', `Bearer ${userBToken}`)
    expect(res.status).toBe(404)
  })

  test('User B gets the same 404 for an order id that does not exist at all', async () => {
    const res = await request(app)
      .get('/api/v1/orders/my/NONEXISTENT-ORDER-ID')
      .set('Authorization', `Bearer ${userBToken}`)
    expect(res.status).toBe(404)
  })

  test('Admin can read the order via the admin-only route', async () => {
    if (!userAOrderId) throw new Error('seed order was not created — check beforeAll')
    const res = await request(app)
      .get(`/api/v1/orders/${userAOrderId}`)
      .set('Authorization', `Bearer ${seededAdminToken}`)
    expect(res.status).toBe(200)
  })

  test('GET /api/v1/orders/my/:id returns 401 with no token', async () => {
    const res = await request(app).get('/api/v1/orders/my/anything')
    expect(res.status).toBe(401)
  })
})

describe('mass assignment — PUT /api/v1/user/profile strips protected fields', () => {
  test('role/isAdmin/loginAttempts are silently dropped, legitimate fields still apply', async () => {
    const res = await request(app)
      .put('/api/v1/user/profile')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Updated Name', role: 'admin', isAdmin: true, loginAttempts: 0 })

    // preventMassAssignment strips the protected fields before validation,
    // so the request still succeeds on its legitimate field rather than
    // being rejected outright (see middlewares/sanitizeBody.ts).
    expect(res.status).toBe(200)
    expect(res.body?.data?.name).toBe('Updated Name')
    expect(res.body?.data).not.toHaveProperty('role')
    expect(res.body?.data).not.toHaveProperty('isAdmin')

    // The attacker-supplied role never had anywhere to land: the User
    // model itself has no role field, and the update response confirms it.
    const profileRes = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', `Bearer ${userAToken}`)
    expect(profileRes.status).toBe(200)
    expect(profileRes.body?.data).not.toHaveProperty('role')
    expect(profileRes.body?.data).not.toHaveProperty('isAdmin')
  })
})
