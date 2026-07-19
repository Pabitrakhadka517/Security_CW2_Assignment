import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'

// CSRF protection covers exactly the two auth routes that authenticate via
// the refresh-token cookie ALONE (no Bearer header): /auth/refresh and
// /auth/logout. This proves the double-submit check actually rejects a
// request that has the (auto-attached-by-browser) refreshToken cookie but
// lacks/mismatches the X-CSRF-Token header -- simulating a cross-site
// attacker who can trigger the request but can't read the cookie value.
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 60000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

function extractCookie(setCookieHeader: string[] | undefined, name: string): string | undefined {
  const line = (setCookieHeader || []).find((c) => c.startsWith(`${name}=`))
  if (!line) return undefined
  return line.split(';')[0].split('=')[1]
}

describe('CSRF protection on /auth/refresh and /auth/logout', () => {
  const email = 'csrf-test-user@example.com'
  const password = 'CsrfTestSecret@2024!'
  let refreshCookie: string
  let csrfToken: string

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Csrf Test User', email, password })
    const login = await request(app).post('/api/v1/auth/user/login').send({ email, password })
    const setCookie = login.headers['set-cookie'] as unknown as string[]
    refreshCookie = extractCookie(setCookie, 'refreshToken')!
    csrfToken = extractCookie(setCookie, 'csrfToken')!
  }, 30000)

  it('login issues both a refreshToken and a csrfToken cookie', () => {
    expect(refreshCookie).toBeTruthy()
    expect(csrfToken).toBeTruthy()
  })

  it('POST /auth/refresh with the cookie but no CSRF header is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${refreshCookie}`)
    expect(res.status).toBe(403)
  })

  it('POST /auth/refresh with a mismatched CSRF header is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${refreshCookie}; csrfToken=${csrfToken}`)
      .set('X-CSRF-Token', 'wrong-token-value')
    expect(res.status).toBe(403)
  })

  it('POST /auth/refresh with the correct matching CSRF header succeeds', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${refreshCookie}; csrfToken=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
    expect(res.body?.data?.accessToken).toBeTruthy()

    // Rotation issues a fresh pair -- update for the logout tests below.
    const setCookie = res.headers['set-cookie'] as unknown as string[]
    refreshCookie = extractCookie(setCookie, 'refreshToken')!
    csrfToken = extractCookie(setCookie, 'csrfToken')!
  })

  it('POST /auth/logout with the cookie but no CSRF header is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `refreshToken=${refreshCookie}`)
    expect(res.status).toBe(403)
  })

  it('POST /auth/logout with a mismatched CSRF header is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `refreshToken=${refreshCookie}; csrfToken=${csrfToken}`)
      .set('X-CSRF-Token', 'wrong-token-value')
    expect(res.status).toBe(403)
  })

  it('POST /auth/logout with the correct matching CSRF header succeeds', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `refreshToken=${refreshCookie}; csrfToken=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
    expect(res.status).toBe(200)
  })

  it('POST /auth/logout with no cookies at all still succeeds as a graceful no-op', async () => {
    const res = await request(app).post('/api/v1/auth/logout')
    expect(res.status).toBe(200)
  })
})
