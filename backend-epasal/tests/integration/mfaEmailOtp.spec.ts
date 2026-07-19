import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'
import * as mfaService from '../../src/services/mfa.service'

// End-to-end coverage for the email-OTP MFA method (setup -> verify ->
// login challenge -> disable), run against a real in-memory Mongo so route
// wiring, model fields, and controller branching are all exercised for
// real rather than mocked. No real SMTP is configured in this test env, so
// `sendMFAEmailOtp` silently no-ops on the send (see mfa.service.ts's
// dev-mode fallback) -- generateEmailOtp is stubbed to a fixed code so the
// test can supply it back through the public API exactly like a user
// reading it from their inbox would.
const FIXED_CODE = '654321'

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  jest.spyOn(mfaService, 'generateEmailOtp').mockReturnValue(FIXED_CODE)
}, 60000)

afterAll(async () => {
  jest.restoreAllMocks()
  await mongoose.disconnect()
  await mongod.stop()
})

describe('MFA — email OTP method', () => {
  const email = 'mfa-email-user@example.com'
  const password = 'TestMfaUser@2024!'
  let userToken: string

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'MFA Email User', email, password })
    const login = await request(app).post('/api/v1/auth/user/login').send({ email, password })
    userToken = login.body?.data?.accessToken
  }, 30000)

  it('has a valid initial login token', () => {
    expect(userToken).toBeTruthy()
  })

  it('POST /auth/mfa/setup {method: email} starts email-method setup', async () => {
    const res = await request(app)
      .post('/api/v1/auth/mfa/setup')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ method: 'email' })
    expect(res.status).toBe(200)
    expect(res.body?.data?.method).toBe('email')
    // No secret/QR leaked for the email method.
    expect(res.body?.data?.qrCode).toBeUndefined()
  })

  it('POST /auth/mfa/verify-setup with the (stubbed) emailed code enables MFA', async () => {
    const res = await request(app)
      .post('/api/v1/auth/mfa/verify-setup')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ token: FIXED_CODE })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body?.data?.backupCodes)).toBe(true)
    expect(res.body?.data?.backupCodes.length).toBeGreaterThan(0)
  })

  it('GET /auth/mfa/status reports mfaMethod: email', async () => {
    // Enabling MFA revokes existing sessions, so log in fresh to get a
    // token that survives the revocation.
    const login = await request(app).post('/api/v1/auth/user/login').send({ email, password })
    expect(login.body?.data?.requiresMFA).toBe(true)
    expect(login.body?.data?.mfaMethod).toBe('email')
  })

  let mfaPendingToken: string
  let sessionToken: string

  it('login now requires the emailed MFA challenge', async () => {
    const login = await request(app).post('/api/v1/auth/user/login').send({ email, password })
    expect(login.status).toBe(200)
    expect(login.body?.data?.requiresMFA).toBe(true)
    expect(login.body?.data?.mfaMethod).toBe('email')
    mfaPendingToken = login.body?.data?.mfaPendingToken
    expect(mfaPendingToken).toBeTruthy()
  })

  it('POST /auth/mfa/challenge with the correct emailed code completes login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/mfa/challenge')
      .set('Authorization', `Bearer ${mfaPendingToken}`)
      .send({ token: FIXED_CODE })
    expect(res.status).toBe(200)
    expect(res.body?.data?.accessToken).toBeTruthy()
    sessionToken = res.body?.data?.accessToken
  })

  it('POST /auth/mfa/disable/request-code emails a fresh code for disabling', async () => {
    const res = await request(app)
      .post('/api/v1/auth/mfa/disable/request-code')
      .set('Authorization', `Bearer ${sessionToken}`)
    expect(res.status).toBe(200)
  })

  it('POST /auth/mfa/disable with the code + password disables MFA', async () => {
    const res = await request(app)
      .post('/api/v1/auth/mfa/disable')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ token: FIXED_CODE, password })
    expect(res.status).toBe(200)

    const status = await request(app)
      .post('/api/v1/auth/user/login')
      .send({ email, password })
    // MFA disabled -- no more challenge step, straight to a session.
    expect(status.body?.data?.requiresMFA).toBeUndefined()
    expect(status.body?.data?.accessToken).toBeTruthy()
  })
})
