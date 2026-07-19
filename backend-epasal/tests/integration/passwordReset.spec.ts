import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'
import * as passwordResetService from '../../src/services/passwordReset.service'

// End-to-end coverage for forgot/reset password: request -> reset -> login
// with the new password, plus the two security properties that matter most
// here — anti-enumeration (same response for a real vs unknown email) and
// single-use tokens (a second reset with the same token must fail).
const FIXED_TOKEN = 'a'.repeat(64) // valid hex shape, doesn't need to be random for this test

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  jest.spyOn(passwordResetService, 'generateResetToken').mockReturnValue(FIXED_TOKEN)
  jest.spyOn(passwordResetService, 'sendPasswordResetEmail').mockResolvedValue(undefined)
}, 60000)

afterAll(async () => {
  jest.restoreAllMocks()
  await mongoose.disconnect()
  await mongod.stop()
})

describe('Forgot / reset password', () => {
  const email = 'reset-flow-user@example.com'
  const oldCredential = 'OriginalSecret@2024!'
  const newPassword = 'BrandNewSecret@2024!'

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Reset Flow User', email, password: oldCredential })
  }, 30000)

  it('POST /auth/forgot-password returns the same generic message for an unknown email', async () => {
    const known = await request(app).post('/api/v1/auth/forgot-password').send({ email })
    const unknown = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nobody-here@example.com' })
    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    expect(known.body?.message).toBe(unknown.body?.message)
  })

  it('the reset token is stored as a hash, not the raw token', async () => {
    const raw = await mongoose.connection.collection('users').findOne(
      { email },
      { projection: { resetPasswordTokenHash: 1, resetPasswordExpiresAt: 1 } }
    )
    expect(raw?.resetPasswordTokenHash).toBeTruthy()
    expect(raw?.resetPasswordTokenHash).not.toBe(FIXED_TOKEN)
    expect(new Date(raw!.resetPasswordExpiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('POST /auth/reset-password with an invalid token is rejected generically', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({ token: 'b'.repeat(64), newPassword })
    expect(res.status).toBe(400)
    expect(res.body?.message).toMatch(/invalid or expired/i)
  })

  it('POST /auth/reset-password with the real token sets the new password', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({ token: FIXED_TOKEN, newPassword })
    expect(res.status).toBe(200)
  })

  it('login fails with the old password and succeeds with the new one', async () => {
    const oldLogin = await request(app).post('/api/v1/auth/user/login').send({ email, password: oldCredential })
    expect(oldLogin.status).toBe(401)

    const newLogin = await request(app).post('/api/v1/auth/user/login').send({ email, password: newPassword })
    expect(newLogin.status).toBe(200)
    expect(newLogin.body?.data?.accessToken).toBeTruthy()
  })

  it('the token is single-use — reusing it a second time fails', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({ token: FIXED_TOKEN, newPassword: 'AnotherPassword@2024!' })
    expect(res.status).toBe(400)
    expect(res.body?.message).toMatch(/invalid or expired/i)
  })
})
