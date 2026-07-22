import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'
import { Admin } from '../../src/models/Admin'
import { User } from '../../src/models/User'
import { RefreshToken } from '../../src/models/RefreshToken'

// Integration coverage for the Admin User Management feature: list/search,
// view detail, lock/unlock, activate/deactivate, revoke-sessions, soft
// delete -- plus the RBAC gate and the "can't target your own account"
// guards. Follows the same MongoMemoryServer + supertest pattern as
// rbacIdor.spec.ts.
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 60000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

let targetUserId: string
let adminToken: string
let adminOwnId: string
let plainUserToken: string

beforeAll(async () => {
  const targetPassword = 'TargetUser@2024!'
  const reg = await request(app).post('/api/v1/auth/register').send({
    name: 'Target User', email: 'admin-mgmt-target@example.com', password: targetPassword,
  })
  targetUserId = reg.body?.data?.user?.id
  await request(app).post('/api/v1/auth/user/login').send({ email: 'admin-mgmt-target@example.com', password: targetPassword })
  if (!targetUserId) {
    const doc = await User.findOne({ email: 'admin-mgmt-target@example.com' })
    targetUserId = doc!._id.toString()
  }

  const plainPassword = 'PlainUser@2024!'
  await request(app).post('/api/v1/auth/register').send({ name: 'Plain User', email: 'admin-mgmt-plain@example.com', password: plainPassword })
  const plainLogin = await request(app).post('/api/v1/auth/user/login').send({ email: 'admin-mgmt-plain@example.com', password: plainPassword })
  plainUserToken = plainLogin.body?.data?.accessToken

  const adminPassword = 'AdminMgmt@2024!'
  const adminDoc = await Admin.create({
    adminId: 'admin-mgmt-001', email: 'admin-mgmt-admin@example.com', password: adminPassword,
    name: 'Mgmt Admin', role: 'admin', isActive: true,
  })
  adminOwnId = adminDoc._id.toString()
  const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin-mgmt-admin@example.com', password: adminPassword })
  adminToken = adminLogin.body?.data?.accessToken
}, 30000)

describe('RBAC — /api/v1/admin/users is admin-only', () => {
  it('rejects a regular user token on every route', async () => {
    const calls: Array<[string, string]> = [
      ['get', '/api/v1/admin/users'],
      ['get', `/api/v1/admin/users/${targetUserId}`],
      ['patch', `/api/v1/admin/users/${targetUserId}/lock`],
      ['patch', `/api/v1/admin/users/${targetUserId}/unlock`],
      ['patch', `/api/v1/admin/users/${targetUserId}/status`],
      ['post', `/api/v1/admin/users/${targetUserId}/revoke-sessions`],
      ['delete', `/api/v1/admin/users/${targetUserId}`],
    ]
    for (const [method, path] of calls) {
      const res = await (request(app) as any)[method](path).set('Authorization', `Bearer ${plainUserToken}`).send({})
      expect(res.status).toBe(401)
    }
  })

  it('accepts an admin token', async () => {
    const res = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('rejects a request with no token at all', async () => {
    const res = await request(app).get('/api/v1/admin/users')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/admin/users', () => {
  it('lists users and finds the seeded target by search', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .query({ search: 'admin-mgmt-target' })
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    const emails = (res.body?.data || []).map((u: any) => u.email)
    expect(emails).toContain('admin-mgmt-target@example.com')
  })

  it('never exposes password, mfaSecret or passwordHistory in list rows', async () => {
    const res = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${adminToken}`)
    for (const row of res.body?.data || []) {
      expect(row.password).toBeUndefined()
      expect(row.mfaSecret).toBeUndefined()
      expect(row.passwordHistory).toBeUndefined()
    }
  })

  it('rejects a malformed id in a param-based route with a validation error', async () => {
    const res = await request(app).get('/api/v1/admin/users/not-a-valid-id').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(422)
  })
})

describe('GET /api/v1/admin/users/:id', () => {
  it('returns the full profile plus session count and recent events, never sensitive fields', async () => {
    const res = await request(app).get(`/api/v1/admin/users/${targetUserId}`).set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    const { user, activeSessionCount, recentEvents } = res.body.data
    expect(user.email).toBe('admin-mgmt-target@example.com')
    expect(user.password).toBeUndefined()
    expect(user.mfaSecret).toBeUndefined()
    expect(user.passwordHistory).toBeUndefined()
    expect(typeof activeSessionCount).toBe('number')
    expect(Array.isArray(recentEvents)).toBe(true)
  })

  it('404s for a well-formed id that does not exist', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/users/${new mongoose.Types.ObjectId().toString()}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/v1/admin/users/:id/lock and /unlock', () => {
  it('locks the account, blocks login, then unlock restores it', async () => {
    const lockRes = await request(app)
      .patch(`/api/v1/admin/users/${targetUserId}/lock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'suspected compromise' })
    expect(lockRes.status).toBe(200)
    expect(new Date(lockRes.body.data.lockUntil).getTime()).toBeGreaterThan(Date.now())

    const blockedLogin = await request(app).post('/api/v1/auth/user/login').send({ email: 'admin-mgmt-target@example.com', password: 'TargetUser@2024!' })
    expect(blockedLogin.status).toBe(423)

    const unlockRes = await request(app)
      .patch(`/api/v1/admin/users/${targetUserId}/unlock`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(unlockRes.status).toBe(200)
    expect(unlockRes.body.data.lockUntil).toBeNull()

    const okLogin = await request(app).post('/api/v1/auth/user/login').send({ email: 'admin-mgmt-target@example.com', password: 'TargetUser@2024!' })
    expect(okLogin.status).toBe(200)
  })

  it('an admin cannot lock their own account through this endpoint', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminOwnId}/lock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/v1/admin/users/:id/status', () => {
  it('deactivating blocks login and revokes existing sessions immediately', async () => {
    const before = await RefreshToken.countDocuments({ userId: targetUserId, revoked: false })
    expect(before).toBeGreaterThan(0)

    const res = await request(app)
      .patch(`/api/v1/admin/users/${targetUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false, reason: 'policy violation' })
    expect(res.status).toBe(200)
    expect(res.body.data.isActive).toBe(false)

    const after = await RefreshToken.countDocuments({ userId: targetUserId, revoked: false })
    expect(after).toBe(0)

    const loginAttempt = await request(app).post('/api/v1/auth/user/login').send({ email: 'admin-mgmt-target@example.com', password: 'TargetUser@2024!' })
    expect(loginAttempt.status).toBe(401)
  })

  it('reactivating allows login again', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${targetUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true })
    expect(res.status).toBe(200)

    const login = await request(app).post('/api/v1/auth/user/login').send({ email: 'admin-mgmt-target@example.com', password: 'TargetUser@2024!' })
    expect(login.status).toBe(200)
  })

  it('an admin cannot deactivate their own account through this endpoint', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminOwnId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/admin/users/:id/revoke-sessions', () => {
  it('force-revokes every active session for the target user', async () => {
    await request(app).post('/api/v1/auth/user/login').send({ email: 'admin-mgmt-target@example.com', password: 'TargetUser@2024!' })
    const before = await RefreshToken.countDocuments({ userId: targetUserId, revoked: false })
    expect(before).toBeGreaterThan(0)

    const res = await request(app)
      .post(`/api/v1/admin/users/${targetUserId}/revoke-sessions`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.revokedSessions).toBeGreaterThan(0)

    const after = await RefreshToken.countDocuments({ userId: targetUserId, revoked: false })
    expect(after).toBe(0)
  })
})

describe('DELETE /api/v1/admin/users/:id', () => {
  it('soft-deletes the account and anonymises PII, blocking future login by the old email', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)

    const stored = await mongoose.connection.collection('users').findOne({ _id: new mongoose.Types.ObjectId(targetUserId) })
    expect(stored?.isDeleted).toBe(true)
    expect(stored?.email).not.toBe('admin-mgmt-target@example.com')
    expect(stored?.name).not.toBe('Target User')

    const loginAttempt = await request(app).post('/api/v1/auth/user/login').send({ email: 'admin-mgmt-target@example.com', password: 'TargetUser@2024!' })
    expect(loginAttempt.status).toBe(401)
  })

  it('deleting the same account twice is rejected', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(400)
  })

  it('an admin cannot delete their own account through this endpoint', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/users/${adminOwnId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(400)
  })
})
