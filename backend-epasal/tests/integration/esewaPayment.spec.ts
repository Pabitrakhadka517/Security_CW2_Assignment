import request from 'supertest'
import mongoose from 'mongoose'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../../src/app'
import { Product } from '../../src/models/Product'

// Proves the full eSewa round trip end to end:
//  - an order created with paymentMethod 'esewa' starts 'pending' and is
//    never trusted to be paid just because the client asked for it
//  - /payments/esewa/initiate returns a correctly HMAC-signed form
//  - /payments/esewa/callback only marks an order 'paid' after BOTH the
//    redirect signature verifies AND the (mocked) server-to-server status
//    check independently confirms COMPLETE
//  - a tampered signature, and a failed/cancelled payment, both cancel the
//    order and release the stock reserved at creation
let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 60000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

afterEach(() => {
  jest.restoreAllMocks()
})

const adminToken = jwt.sign(
  { id: new mongoose.Types.ObjectId().toString(), email: 'a@a.com', role: 'admin' },
  process.env.JWT_ADMIN_SECRET as string,
  { expiresIn: '15m' }
)
const auth = { Authorization: `Bearer ${adminToken}` }

const PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST'
const SECRET_KEY = process.env.ESEWA_SECRET_KEY as string

// Independent re-implementation of eSewa's signing scheme (not a reuse of
// src/services/esewa.service.ts) so this test verifies the actual wire
// format, not just "the service agrees with itself".
function signResponsePayload(fields: Record<string, string>, signedFieldNames: string): string {
  const message = signedFieldNames
    .split(',')
    .map((f) => `${f}=${fields[f]}`)
    .join(',')
  return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64')
}

function buildCallbackData(overrides: Partial<Record<string, string>> = {}): string {
  const signedFieldNames = 'transaction_code,status,total_amount,transaction_uuid,product_code'
  const fields: Record<string, string> = {
    transaction_code: 'REF-TEST-1',
    status: 'COMPLETE',
    total_amount: '5650',
    transaction_uuid: 'placeholder',
    product_code: PRODUCT_CODE,
    ...overrides,
  }
  const signature = overrides.signature ?? signResponsePayload(fields, signedFieldNames)
  return Buffer.from(JSON.stringify({ ...fields, signed_field_names: signedFieldNames, signature })).toString(
    'base64'
  )
}

async function seedProduct(id: string, price = 5000, stock = 10) {
  await Product.create({ id, name: 'Test Product', price, category_id: 'test-category', stock, isActive: true })
}

async function createEsewaOrder(productId: string) {
  const res = await request(app)
    .post('/api/v1/orders')
    .send({
      name: 'Test Buyer',
      phone: '9800000000',
      district: 'Kathmandu',
      city: 'Kathmandu',
      address: 'Test Street',
      description: 'eSewa payment test',
      items: [{ productId, quantity: 1 }],
      totalAmount: 5650, // 5000 + 13% VAT (650) + free shipping over Rs. 5000
      paymentMethod: 'esewa',
    })
  return res.body.data
}

describe('eSewa payment integration', () => {
  it('order created with paymentMethod=esewa starts pending, never pre-marked paid', async () => {
    await seedProduct('esewa-prod-1')
    const order = await createEsewaOrder('esewa-prod-1')

    expect(order.paymentMethod).toBe('esewa')
    expect(order.paymentStatus).toBe('pending')
  })

  it('rejects unsupported payment methods (khalti/card/bank_transfer are not wired up)', async () => {
    await seedProduct('esewa-prod-reject')
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        name: 'Test Buyer', phone: '9800000000', district: 'Kathmandu', city: 'Kathmandu',
        address: 'Test Street', description: 'x',
        items: [{ productId: 'esewa-prod-reject', quantity: 1 }],
        totalAmount: 5650, paymentMethod: 'khalti',
      })
    expect(res.status).toBe(422)
  })

  it('initiate returns a correctly signed form scoped to the order total', async () => {
    await seedProduct('esewa-prod-2')
    const order = await createEsewaOrder('esewa-prod-2')

    const res = await request(app).post('/api/v1/payments/esewa/initiate').send({ orderId: order.id })
    expect(res.status).toBe(200)

    const { gatewayUrl, fields } = res.body.data
    expect(gatewayUrl).toContain('esewa.com.np')
    expect(fields.product_code).toBe(PRODUCT_CODE)
    expect(fields.total_amount).toBe('5650')
    expect(fields.transaction_uuid.startsWith(order.id)).toBe(true)

    // The request-side signature (total_amount,transaction_uuid,product_code)
    // must be independently reproducible with the same secret key.
    const expectedSig = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(`total_amount=${fields.total_amount},transaction_uuid=${fields.transaction_uuid},product_code=${PRODUCT_CODE}`)
      .digest('base64')
    expect(fields.signature).toBe(expectedSig)
  })

  it('refuses to initiate payment for an order that is not paymentMethod=esewa', async () => {
    await seedProduct('esewa-prod-cod')
    const codOrder = await request(app)
      .post('/api/v1/orders')
      .send({
        name: 'Test Buyer', phone: '9800000000', district: 'Kathmandu', city: 'Kathmandu',
        address: 'Test Street', description: 'x',
        items: [{ productId: 'esewa-prod-cod', quantity: 1 }],
        totalAmount: 5650, paymentMethod: 'cod',
      })

    const res = await request(app).post('/api/v1/payments/esewa/initiate').send({ orderId: codOrder.body.data.id })
    expect(res.status).toBe(400)
  })

  it('callback marks the order paid only after signature verification AND the status-check API confirms COMPLETE', async () => {
    await seedProduct('esewa-prod-3')
    const order = await createEsewaOrder('esewa-prod-3')

    const initiateRes = await request(app).post('/api/v1/payments/esewa/initiate').send({ orderId: order.id })
    const { transaction_uuid: transactionUuid } = initiateRes.body.data.fields

    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ status: 'COMPLETE', ref_id: 'REF-TEST-1' }) } as any)

    const data = buildCallbackData({ transaction_uuid: transactionUuid })
    const callbackRes = await request(app).get('/api/v1/payments/esewa/callback').query({ data })

    expect(callbackRes.status).toBe(302)
    expect(callbackRes.headers.location).toContain('status=paid')
    expect(callbackRes.headers.location).toContain(`orderId=${order.id}`)
    expect(fetchSpy).toHaveBeenCalled()

    const orderAfter = await request(app).get(`/api/v1/orders/${order.id}`).set(auth)
    expect(orderAfter.body.data.paymentStatus).toBe('paid')
    expect(orderAfter.body.data.status).toBe('confirmed')
    expect(orderAfter.body.data.paymentGatewayRef).toBe('REF-TEST-1')

    // Idempotency — a duplicate redirect (or the user refreshing the result
    // page) must not fail or double-process an already-settled payment.
    const secondCallback = await request(app).get('/api/v1/payments/esewa/callback').query({ data })
    expect(secondCallback.status).toBe(302)
    expect(secondCallback.headers.location).toContain('status=paid')
  })

  it('a tampered/forged signature is rejected WITHOUT ever calling the status-check API, and cancels the order + restores stock', async () => {
    await seedProduct('esewa-prod-4', 5000, 3)
    const order = await createEsewaOrder('esewa-prod-4')

    const initiateRes = await request(app).post('/api/v1/payments/esewa/initiate').send({ orderId: order.id })
    const { transaction_uuid: transactionUuid } = initiateRes.body.data.fields

    const fetchSpy = jest.spyOn(global, 'fetch')

    // Forged payload: claims COMPLETE but the signature was never produced
    // with the real secret key.
    const data = buildCallbackData({ transaction_uuid: transactionUuid, signature: 'not-a-real-signature==' })
    const callbackRes = await request(app).get('/api/v1/payments/esewa/callback').query({ data })

    expect(callbackRes.status).toBe(302)
    expect(callbackRes.headers.location).toContain('status=failed')
    expect(fetchSpy).not.toHaveBeenCalled()

    const orderAfter = await request(app).get(`/api/v1/orders/${order.id}`).set(auth)
    expect(orderAfter.body.data.paymentStatus).toBe('failed')
    expect(orderAfter.body.data.status).toBe('cancelled')

    const product = await Product.findOne({ id: 'esewa-prod-4' }).lean()
    expect((product as any)?.stock).toBe(3) // restored after the reservation made at order creation
  })

  it('a plain failure/cancel redirect (no data param) cancels the order and releases stock', async () => {
    await seedProduct('esewa-prod-5', 5000, 7)
    const order = await createEsewaOrder('esewa-prod-5')

    const initiateRes = await request(app).post('/api/v1/payments/esewa/initiate').send({ orderId: order.id })
    const { transaction_uuid: transactionUuid } = initiateRes.body.data.fields

    const callbackRes = await request(app)
      .get('/api/v1/payments/esewa/callback')
      .query({ transaction_uuid: transactionUuid })

    expect(callbackRes.status).toBe(302)
    expect(callbackRes.headers.location).toContain('status=failed')

    const orderAfter = await request(app).get(`/api/v1/orders/${order.id}`).set(auth)
    expect(orderAfter.body.data.paymentStatus).toBe('failed')
    expect(orderAfter.body.data.status).toBe('cancelled')

    const product = await Product.findOne({ id: 'esewa-prod-5' }).lean()
    expect((product as any)?.stock).toBe(7)
  })

  it('rejects an amount confirmed by eSewa that does not match the order total (tamper defense-in-depth)', async () => {
    await seedProduct('esewa-prod-6')
    const order = await createEsewaOrder('esewa-prod-6')

    const initiateRes = await request(app).post('/api/v1/payments/esewa/initiate').send({ orderId: order.id })
    const { transaction_uuid: transactionUuid } = initiateRes.body.data.fields

    jest
      .spyOn(global, 'fetch')
      // Status check itself is queried with the payload's total_amount, so it
      // still reports COMPLETE for that (wrong) amount — the mismatch is
      // caught by comparing against the order's own stored total, not by the
      // status check itself.
      .mockResolvedValue({ ok: true, json: async () => ({ status: 'COMPLETE', ref_id: 'REF-BAD' }) } as any)

    // Signed honestly, but for a different (lower) total_amount than the order actually has.
    const data = buildCallbackData({ transaction_uuid: transactionUuid, total_amount: '1' })
    const callbackRes = await request(app).get('/api/v1/payments/esewa/callback').query({ data })

    expect(callbackRes.status).toBe(302)
    expect(callbackRes.headers.location).toContain('status=failed')

    const orderAfter = await request(app).get(`/api/v1/orders/${order.id}`).set(auth)
    expect(orderAfter.body.data.paymentStatus).toBe('failed')
  })
})
