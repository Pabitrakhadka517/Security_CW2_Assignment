import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import app from '../../src/app'

// Models registered above while disconnected; now make dbReady think Mongo is
// up so requests reach the routing / auth / validation layers. Real DB ops
// fail fast (bufferCommands=false from setup) -> 500 = "reached the service".
beforeAll(() => {
  Object.defineProperty(mongoose.connection, 'readyState', { get: () => 1, configurable: true })
})

const adminToken = jwt.sign(
  { id: 'admin1', email: 'a@a.com', role: 'admin' },
  process.env.JWT_ADMIN_SECRET as string,
  { expiresIn: '15m' }
)
const auth = { Authorization: `Bearer ${adminToken}` }
const DBERR = [200, 500, 503] // reached service layer (no DB here)

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
    expect(DBERR).toContain(res.status)
  })
  it('invalid order status -> 4xx', async () =>
    expect([400, 422]).toContain((await request(app).put('/api/v1/orders/NP26001/status').set(auth).send({ status: 'banana' })).status))
  it('track without phone -> 4xx', async () =>
    expect([400, 422]).toContain((await request(app).get('/api/v1/orders/track/NP26001')).status))
})
