import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'
import { Admin } from '../../src/models/Admin'

// Dedicated RBAC (vertical privilege escalation) + IDOR (horizontal
// privilege escalation) coverage, broader than the spot-checks already in
// endpoints.spec.ts -- covers more admin-only resource types, and probes
// every per-user resource that takes a client-supplied id/index for
// cross-user access rather than deriving everything from req.user.id alone.
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 60000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

let userAToken: string
let userBToken: string
let adminToken: string

beforeAll(async () => {
  const passwordA = 'RbacUserA@2024!'
  await request(app).post('/api/v1/auth/register').send({ name: 'Rbac User A', email: 'rbac-usera@example.com', password: passwordA })
  const loginA = await request(app).post('/api/v1/auth/user/login').send({ email: 'rbac-usera@example.com', password: passwordA })
  userAToken = loginA.body?.data?.accessToken

  const passwordB = 'RbacUserB@2024!'
  await request(app).post('/api/v1/auth/register').send({ name: 'Rbac User B', email: 'rbac-userb@example.com', password: passwordB })
  const loginB = await request(app).post('/api/v1/auth/user/login').send({ email: 'rbac-userb@example.com', password: passwordB })
  userBToken = loginB.body?.data?.accessToken

  const adminPassword = 'RbacSeededAdmin@2024!'
  await Admin.create({ adminId: 'rbac-admin-001', email: 'rbac-admin@example.com', password: adminPassword, name: 'Rbac Admin', role: 'admin', isActive: true })
  const loginAdmin = await request(app).post('/api/v1/auth/login').send({ email: 'rbac-admin@example.com', password: adminPassword })
  adminToken = loginAdmin.body?.data?.accessToken
}, 30000)

describe('RBAC — vertical privilege escalation across admin-only resources', () => {
  const cases: Array<[string, string, string]> = [
    ['POST', '/api/v1/categories', 'category'],
    ['POST', '/api/v1/banners', 'banner'],
    ['POST', '/api/v1/coupons', 'coupon'],
    ['POST', '/api/v1/sale-categories', 'sale category'],
    ['GET', '/api/v1/admin/audit/logs', 'audit logs'],
  ]

  for (const [method, path, label] of cases) {
    it(`${method} ${path} (${label}) rejects a regular user token`, async () => {
      const req = (request(app) as any)[method.toLowerCase()](path)
      const res = await req.set('Authorization', `Bearer ${userAToken}`).send({})
      expect(res.status).toBe(401)
    })

    it(`${method} ${path} (${label}) accepts an admin token`, async () => {
      const req = (request(app) as any)[method.toLowerCase()](path)
      const res = await req.set('Authorization', `Bearer ${adminToken}`).send({})
      // Not asserting 2xx (bodies are intentionally empty/invalid here) --
      // only that auth+role passes, i.e. never 401/403.
      expect(res.status).not.toBe(401)
      expect(res.status).not.toBe(403)
    })
  }
})

describe('IDOR — session revocation across users', () => {
  it("user B cannot revoke user A's session by guessing/probing its id", async () => {
    const sessionsA = await request(app).get('/api/v1/auth/sessions').set('Authorization', `Bearer ${userAToken}`)
    const sessionId = sessionsA.body?.data?.[0]?.sessionId
    expect(sessionId).toBeTruthy()

    const res = await request(app)
      .delete(`/api/v1/auth/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${userBToken}`)
    expect(res.status).toBe(403)

    // Confirm it's still actually active from A's perspective (B's attempt
    // didn't revoke it despite the 403).
    const stillThere = await mongoose.connection.collection('refreshtokens').findOne({ _id: new mongoose.Types.ObjectId(sessionId) })
    expect(stillThere?.revoked).toBe(false)
  })

  it("user A CAN revoke their own session by the same id shape", async () => {
    const sessionsA = await request(app).get('/api/v1/auth/sessions').set('Authorization', `Bearer ${userAToken}`)
    const sessionId = sessionsA.body?.data?.[0]?.sessionId

    const res = await request(app)
      .delete(`/api/v1/auth/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${userAToken}`)
    expect(res.status).toBe(200)
  })
})

describe('IDOR — per-user resources stay isolated between accounts', () => {
  it("user B's saved address list never contains user A's data, even at the same array index", async () => {
    await request(app).post('/api/v1/user/addresses').set('Authorization', `Bearer ${userAToken}`).send({
      addressLine: 'User A Street', city: 'Kathmandu', postalCode: '44600', country: 'Nepal',
    })
    await request(app).post('/api/v1/user/addresses').set('Authorization', `Bearer ${userBToken}`).send({
      addressLine: 'User B Street', city: 'Pokhara', postalCode: '33700', country: 'Nepal',
    })

    const addressesB = await request(app).get('/api/v1/user/addresses').set('Authorization', `Bearer ${userBToken}`)
    const streets = (addressesB.body?.data || []).map((a: any) => a.addressLine)
    expect(streets).toContain('User B Street')
    expect(streets).not.toContain('User A Street')
  })

  it("user B's favorites never contain a product user A favorited", async () => {
    await request(app).post('/api/v1/user/favorites').set('Authorization', `Bearer ${userAToken}`).send({ productId: 'RBAC-PRODUCT-A' })
    await request(app).post('/api/v1/user/favorites').set('Authorization', `Bearer ${userBToken}`).send({ productId: 'RBAC-PRODUCT-B' })

    // GET /user/favorites enriches ids against real Product documents (none
    // exist here), so check the raw stored array directly instead.
    const userB = await mongoose.connection.collection('users').findOne({ email: 'rbac-userb@example.com' })
    expect(userB?.favorites).toContain('RBAC-PRODUCT-B')
    expect(userB?.favorites).not.toContain('RBAC-PRODUCT-A')
  })

  it("user B cannot disable user A's MFA -- there is no request shape that accepts a foreign account id", async () => {
    // MFA endpoints derive the account exclusively from the verified access
    // token (req.user.id), never a body/param field -- confirm passing a
    // userId-shaped field in the body is simply ignored, not honored.
    const res = await request(app)
      .post('/api/v1/auth/mfa/disable')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ token: '000000', password: 'irrelevant', userId: 'someone-elses-id' })
    // Rejected for B's own account either way -- 422 if Joi's default
    // unknown-key rejection catches the extra `userId` field first, 400/401
    // otherwise (wrong password / no MFA enabled) -- never honored as an
    // action against another account.
    expect([400, 401, 422]).toContain(res.status)
  })
})
