import request from 'supertest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'
import { Admin } from '../../src/models/Admin'
import { Category } from '../../src/models/Category'

// Proves the Mongoose schema-level `set: stripHtml` transforms (models/Product.ts,
// models/User.ts, etc.) actually fire on real write paths through the public
// API -- not just in isolation against the stripHtml() function itself.
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 60000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('HTML sanitization on write', () => {
  it('registering a user with an HTML/script payload in name stores it sanitized', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: '<script>evil()</script>Alex',
      email: 'sanitize-user@example.com',
      password: 'SanitizeTest@2024!',
    })
    expect(res.status).toBe(201)

    const stored = await mongoose.connection.collection('users').findOne({ email: 'sanitize-user@example.com' })
    expect(stored?.name).toBe('Alex')
    expect(stored?.name).not.toContain('<')
  })

  it('creating a product (admin) with an XSS payload in name/description stores them sanitized', async () => {
    const adminPassword = 'SanitizeAdmin@2024!'
    await Admin.create({
      adminId: 'admin-sanitize-001',
      email: 'sanitize-admin@example.com',
      password: adminPassword,
      name: 'Sanitize Admin',
      role: 'admin',
      isActive: true,
    })
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'sanitize-admin@example.com', password: adminPassword,
    })
    const adminToken = login.body?.data?.token

    const category = await Category.create({
      id: 'cat-sanitize-001', name: 'Test Category', slug: 'test-category-sanitize',
      created_at: new Date().toISOString(),
    })

    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Running Shoes',
        description: '<img src=x onerror=alert(1)>Nice shoes',
        price: 2500,
        category_id: category.id,
      })
    expect(res.status).toBe(201)

    const stored = await mongoose.connection.collection('products').findOne({ name: 'Running Shoes' })
    expect(stored?.description).toBe('Nice shoes')
    expect(stored?.description).not.toContain('<')
  })
})
