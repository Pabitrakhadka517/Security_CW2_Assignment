import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'

// Proves the magic-byte check (middlewares/validateImageContent.ts, wired
// into upload.ts's exported uploadSingle/uploadMultiple/uploadFields) fires
// on a real upload endpoint -- multer's own fileFilter only sees the
// client-declared Content-Type, which this test deliberately lies about.
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  process.env.DISABLE_CLOUDINARY = 'true'
}, 60000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('Secure file upload — magic-byte validation', () => {
  const email = 'upload-test-user@example.com'
  const password = 'UploadTestSecret@2024!'
  let userToken: string

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Upload Test User', email, password })
    const login = await request(app).post('/api/v1/auth/user/login').send({ email, password })
    userToken = login.body?.data?.accessToken
  }, 30000)

  it('rejects a file whose declared type is image/png but whose bytes are actually a script (MIME spoofing)', async () => {
    const res = await request(app)
      .post('/api/v1/user/profile/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'avatar.png', contentType: 'image/png' })

    expect(res.status).toBe(400)
    expect(res.body?.message).toMatch(/does not match/i)
  })

  it('rejects a disguised extension even with a matching declared MIME type', async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    const res = await request(app)
      .post('/api/v1/user/profile/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('image', pngBytes, { filename: 'avatar.php.png.exe', contentType: 'image/png' })

    // Extension check runs first and is the one that should trip here since
    // the parsed extname is ".exe" -- not on the allowlist.
    expect(res.status).toBe(400)
  })

  it('accepts a real PNG with matching extension and declared type', async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    const res = await request(app)
      .post('/api/v1/user/profile/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('image', pngBytes, { filename: 'avatar.png', contentType: 'image/png' })

    expect(res.status).toBe(200)
  })
})
