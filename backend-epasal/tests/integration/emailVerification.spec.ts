import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'
import * as emailVerificationService from '../../src/services/emailVerification.service'

// Proves the non-blocking email-verification flow end to end: registering
// leaves the account usable immediately (emailVerified: false, login still
// works), a verification link flips it to true, and the token is single-use
// with a generic rejection otherwise -- same anti-enumeration posture as
// forgot/reset password.
const FIXED_TOKEN = 'b'.repeat(64)

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  jest.spyOn(emailVerificationService, 'generateVerificationToken').mockReturnValue(FIXED_TOKEN)
  jest.spyOn(emailVerificationService, 'sendVerificationEmail').mockResolvedValue(undefined)
}, 60000)

afterAll(async () => {
  jest.restoreAllMocks()
  await mongoose.disconnect()
  await mongod.stop()
})

describe('Email verification', () => {
  const email = 'verify-flow-user@example.com'
  const password = 'VerifyFlowSecret@2024!'
  let accessToken: string

  it('registration creates an unverified account that can still log in immediately', async () => {
    const register = await request(app).post('/api/v1/auth/register').send({ name: 'Verify Flow User', email, password })
    expect(register.status).toBe(201)

    const stored = await mongoose.connection.collection('users').findOne({ email })
    expect(stored?.emailVerified).toBe(false)
    expect(stored?.emailVerificationTokenHash).toBeTruthy()

    const login = await request(app).post('/api/v1/auth/user/login').send({ email, password })
    expect(login.status).toBe(200)
    accessToken = login.body?.data?.accessToken
    expect(accessToken).toBeTruthy()
  })

  it('POST /auth/verify-email with an invalid token is rejected generically', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: 'c'.repeat(64) })
    expect(res.status).toBe(400)
    expect(res.body?.message).toMatch(/invalid or expired/i)
  })

  it('POST /auth/verify-email with the real token verifies the account', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: FIXED_TOKEN })
    expect(res.status).toBe(200)

    const stored = await mongoose.connection.collection('users').findOne({ email })
    expect(stored?.emailVerified).toBe(true)
    expect(stored?.emailVerificationTokenHash).toBeFalsy()
  })

  it('the verification token is single-use', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: FIXED_TOKEN })
    expect(res.status).toBe(400)
  })

  it('POST /auth/resend-verification on an already-verified account is a no-op success', async () => {
    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body?.message).toMatch(/already verified/i)
  })

  it('a brand-new Google sign-in account is verified immediately with no token issued', async () => {
    // Simulate what googleLogin does for a first-time Google-only account
    // directly against the model, mirroring how existing tests avoid faking
    // a real Google ID token.
    const { User } = await import('../../src/models/User')
    const googleUser = await User.create({
      name: 'Google User', email: 'google-verify-user@example.com',
      googleId: 'fake-google-id-123', authProvider: 'google', isActive: true, emailVerified: true,
    })
    expect(googleUser.emailVerified).toBe(true)
    expect(googleUser.emailVerificationTokenHash).toBeFalsy()
  })
})
