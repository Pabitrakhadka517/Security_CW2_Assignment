import { createCouponSchema, updateCouponSchema, validateCouponSchema } from '../../src/validations/coupon.validation'
import { createOrderSchema, updateOrderStatusSchema, trackOrderSchema } from '../../src/validations/order.validation'

const validCoupon = {
  code: 'SAVE10', discount_type: 'percentage', discount_value: 10,
  validFrom: '2026-01-01', validTo: '2026-12-31',
}

describe('coupon validation', () => {
  it('accepts a valid coupon payload', () => {
    const { error } = createCouponSchema.body.validate(validCoupon)
    expect(error).toBeUndefined()
  })

  // Regression: the admin UI always sends max_discount_cap; the schema used to
  // omit it, so Joi rejected EVERY create/update. This guards that fix.
  it('accepts max_discount_cap on create (regression)', () => {
    const { error } = createCouponSchema.body.validate({ ...validCoupon, max_discount_cap: 500 })
    expect(error).toBeUndefined()
  })
  it('accepts max_discount_cap = null on create', () => {
    const { error } = createCouponSchema.body.validate({ ...validCoupon, max_discount_cap: null })
    expect(error).toBeUndefined()
  })
  it('accepts max_discount_cap on update (regression)', () => {
    const { error } = updateCouponSchema.body.validate({ max_discount_cap: 300 })
    expect(error).toBeUndefined()
  })

  it('rejects a coupon with no code', () => {
    const { error } = createCouponSchema.body.validate({ ...validCoupon, code: undefined })
    expect(error).toBeDefined()
  })
  it('rejects a non-positive discount_value', () => {
    const { error } = createCouponSchema.body.validate({ ...validCoupon, discount_value: 0 })
    expect(error).toBeDefined()
  })
  it('uppercases the code on validate-coupon', () => {
    const { value } = validateCouponSchema.body.validate({ code: 'save10' })
    expect(value.code).toBe('SAVE10')
  })
})

describe('order validation', () => {
  const validOrder = {
    name: 'Ram', phone: '9812345678', district: 'Kathmandu', city: 'Kathmandu',
    address: 'Thamel', description: 'call before', totalAmount: 1000,
    items: [{ productId: 'p1', quantity: 2 }],
  }
  it('accepts a valid order', () => {
    const { error } = createOrderSchema.body.validate(validOrder)
    expect(error).toBeUndefined()
  })
  it('rejects an empty order body', () => {
    const { error } = createOrderSchema.body.validate({})
    expect(error).toBeDefined()
  })
  it('rejects a bad phone number', () => {
    const { error } = createOrderSchema.body.validate({ ...validOrder, phone: 'abc' })
    expect(error).toBeDefined()
  })
  it('rejects an order with no items', () => {
    const { error } = createOrderSchema.body.validate({ ...validOrder, items: [] })
    expect(error).toBeDefined()
  })
  it('accepts every valid order status and rejects unknown ones', () => {
    for (const status of ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']) {
      expect(updateOrderStatusSchema.body.validate({ status }).error).toBeUndefined()
    }
    expect(updateOrderStatusSchema.body.validate({ status: 'banana' }).error).toBeDefined()
  })
  it('requires a phone to track an order', () => {
    expect(trackOrderSchema.query.validate({}).error).toBeDefined()
    expect(trackOrderSchema.query.validate({ phone: '9812345678' }).error).toBeUndefined()
  })
})
