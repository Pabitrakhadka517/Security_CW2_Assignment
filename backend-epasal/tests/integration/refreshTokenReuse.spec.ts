import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'

// Proves refresh-token rotation reuse detection: presenting an
// already-rotated-out refresh token doesn't just fail that one request --
// it revokes the ENTIRE rotation family, so a subsequent request with the
// legitimately-rotated (currently valid) token also stops working. This is
// the standard response to detected token theft, since either party
// (attacker or legitimate user) could hold the live descendant token.
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

describe('Refresh token reuse detection', () => {
  const email = 'reuse-detect-user@example.com'
  const password = 'ReuseDetectSecret@2024!'

  it('reusing an already-rotated-out refresh token revokes its whole family, including the current one', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Reuse Detect User', email, password })
    const login = await request(app).post('/api/v1/auth/user/login').send({ email, password })
    const loginCookies = login.headers['set-cookie'] as unknown as string[]
    const originalRefreshToken = extractCookie(loginCookies, 'refreshToken')!
    const originalCsrfToken = extractCookie(loginCookies, 'csrfToken')!

    // Legitimate rotation: old token is now revoked, a new one is issued.
    const firstRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${originalRefreshToken}; csrfToken=${originalCsrfToken}`)
      .set('X-CSRF-Token', originalCsrfToken)
    expect(firstRefresh.status).toBe(200)
    const rotatedCookies = firstRefresh.headers['set-cookie'] as unknown as string[]
    const rotatedRefreshToken = extractCookie(rotatedCookies, 'refreshToken')!
    const rotatedCsrfToken = extractCookie(rotatedCookies, 'csrfToken')!

    // Attacker (or a bug) replays the ORIGINAL, already-rotated-out token.
    const replay = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${originalRefreshToken}; csrfToken=${originalCsrfToken}`)
      .set('X-CSRF-Token', originalCsrfToken)
    expect(replay.status).toBe(401)

    // The legitimately-rotated token -- which was valid one request ago --
    // must now ALSO be rejected, because reuse detection revoked the whole
    // family, not just the replayed token.
    const afterReuse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${rotatedRefreshToken}; csrfToken=${rotatedCsrfToken}`)
      .set('X-CSRF-Token', rotatedCsrfToken)
    expect(afterReuse.status).toBe(401)
  })
})
