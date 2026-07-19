import request from 'supertest'
import mongoose from 'mongoose'
import speakeasy from 'speakeasy'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'

// The TOTP secret is now encrypted at rest (models/User.ts, models/Admin.ts
// pre-save/post-find hooks) instead of stored as plaintext. This test proves
// the encrypt-on-write / decrypt-on-read round trip is actually transparent
// to verifyTOTP -- i.e. that wiring encryption in didn't silently break the
// pre-existing authenticator-app method, which has no other direct coverage
// in this suite.
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 60000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('MFA — TOTP secret encryption round trip', () => {
  const email = 'mfa-totp-user@example.com'
  const password = 'TestTotpUser@2024!'
  let userToken: string
  let secret: string

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'MFA Totp User', email, password })
    const login = await request(app).post('/api/v1/auth/user/login').send({ email, password })
    userToken = login.body?.data?.accessToken
  }, 30000)

  it('POST /auth/mfa/setup (default method) returns a usable TOTP secret', async () => {
    const res = await request(app)
      .post('/api/v1/auth/mfa/setup')
      .set('Authorization', `Bearer ${userToken}`)
      .send({})
    expect(res.status).toBe(200)
    expect(res.body?.data?.method).toBe('totp')
    secret = res.body?.data?.secret
    expect(secret).toBeTruthy()
  })

  it('the secret is stored encrypted in MongoDB, not as plaintext', async () => {
    const raw = await mongoose.connection.collection('users').findOne(
      { email },
      { projection: { mfaSecret: 1 } }
    )
    expect(raw?.mfaSecret).toBeTruthy()
    expect(raw?.mfaSecret).not.toBe(secret)
    // encryption.service.ts format: "<keyVersion>:<ivHex>:<authTagHex>:<ciphertextHex>"
    expect(raw?.mfaSecret).toMatch(/^\d+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/i)
  })

  it('POST /auth/mfa/verify-setup with a real TOTP code (computed from the decrypted secret) enables MFA', async () => {
    const code = speakeasy.totp({ secret, encoding: 'base32' })
    const res = await request(app)
      .post('/api/v1/auth/mfa/verify-setup')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ token: code })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body?.data?.backupCodes)).toBe(true)
  })

  it('a subsequent login challenge accepts a fresh TOTP code against the decrypted secret', async () => {
    const login = await request(app).post('/api/v1/auth/user/login').send({ email, password })
    expect(login.body?.data?.requiresMFA).toBe(true)
    expect(login.body?.data?.mfaMethod).toBe('totp')
    const mfaPendingToken = login.body?.data?.mfaPendingToken

    const code = speakeasy.totp({ secret, encoding: 'base32' })
    const res = await request(app)
      .post('/api/v1/auth/mfa/challenge')
      .set('Authorization', `Bearer ${mfaPendingToken}`)
      .send({ token: code })
    expect(res.status).toBe(200)
    expect(res.body?.data?.accessToken).toBeTruthy()
  })
})
