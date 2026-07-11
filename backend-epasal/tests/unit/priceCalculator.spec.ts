import {
  calculateOrderTotal,
  VAT_RATE,
  DEFAULT_SHIPPING,
  FREE_SHIPPING_ABOVE,
  ResolvedItem,
  CouponDetails,
} from '../../src/utils/priceCalculator'

const item = (productId: string, price: number, qty: number): ResolvedItem => ({
  productId,
  name: productId,
  quantity: qty,
  originalPrice: price,
  resolvedPrice: price,
  discountSource: 'original',
  lineTotal: price * qty,
})

describe('calculateOrderTotal', () => {
  it('computes subtotal, 13% VAT and Rs.150 shipping with no coupon (under free-shipping threshold)', () => {
    const r = calculateOrderTotal({ items: [item('a', 1000, 2)] }) // subtotal 2000
    expect(r.subtotal).toBe(2000)
    expect(r.couponDiscount).toBe(0)
    expect(r.discountedSubtotal).toBe(2000)
    expect(r.vatAmount).toBe(Math.round(2000 * VAT_RATE)) // 260
    expect(r.shipping).toBe(DEFAULT_SHIPPING) // 150
    expect(r.total).toBe(2000 + 260 + 150)
  })

  it('gives FREE shipping when discounted subtotal >= threshold', () => {
    const r = calculateOrderTotal({ items: [item('a', FREE_SHIPPING_ABOVE, 1)] }) // 5000
    expect(r.shipping).toBe(0)
    expect(r.total).toBe(5000 + Math.round(5000 * VAT_RATE))
  })

  it('applies a percentage coupon and charges VAT on the DISCOUNTED amount', () => {
    const coupon: CouponDetails = { code: 'P10', discount_type: 'percentage', discount_value: 10, apply_on: 'cart' }
    const r = calculateOrderTotal({ items: [item('a', 1000, 1)], coupon }) // subtotal 1000
    expect(r.couponDiscount).toBe(100)            // 10%
    expect(r.discountedSubtotal).toBe(900)
    expect(r.vatAmount).toBe(Math.round(900 * VAT_RATE)) // VAT on 900, not 1000
    expect(r.total).toBe(900 + Math.round(900 * VAT_RATE) + DEFAULT_SHIPPING)
  })

  it('respects max_discount_cap on percentage coupons', () => {
    const coupon: CouponDetails = { code: 'P50', discount_type: 'percentage', discount_value: 50, max_discount_cap: 300, apply_on: 'cart' }
    const r = calculateOrderTotal({ items: [item('a', 2000, 1)], coupon }) // 50% = 1000, capped to 300
    expect(r.couponDiscount).toBe(300)
  })

  it('applies a fixed coupon', () => {
    const coupon: CouponDetails = { code: 'F250', discount_type: 'fixed', discount_value: 250, apply_on: 'cart' }
    const r = calculateOrderTotal({ items: [item('a', 1000, 1)], coupon })
    expect(r.couponDiscount).toBe(250)
    expect(r.discountedSubtotal).toBe(750)
  })

  it('never lets a coupon make the total negative (clamps to subtotal)', () => {
    const coupon: CouponDetails = { code: 'BIG', discount_type: 'fixed', discount_value: 99999, apply_on: 'cart' }
    const r = calculateOrderTotal({ items: [item('a', 500, 1)], coupon })
    expect(r.couponDiscount).toBe(500)
    expect(r.discountedSubtotal).toBe(0)
    expect(r.total).toBeGreaterThanOrEqual(0)
  })

  it('product-scoped coupon discounts ONLY the applicable products', () => {
    const coupon: CouponDetails = {
      code: 'PROD', discount_type: 'percentage', discount_value: 10,
      apply_on: 'product', applicable_products: ['a'],
    }
    // a: 1000, b: 1000 -> only a is eligible -> base 1000 -> 10% = 100
    const r = calculateOrderTotal({ items: [item('a', 1000, 1), item('b', 1000, 1)], coupon })
    expect(r.subtotal).toBe(2000)
    expect(r.couponDiscount).toBe(100)
  })

  it('free-shipping decision uses the DISCOUNTED subtotal (coupon can push it back to paid shipping)', () => {
    const coupon: CouponDetails = { code: 'F200', discount_type: 'fixed', discount_value: 200, apply_on: 'cart' }
    // subtotal 5100, -200 = 4900 < 5000 -> shipping should be charged
    const r = calculateOrderTotal({ items: [item('a', 5100, 1)], coupon })
    expect(r.discountedSubtotal).toBe(4900)
    expect(r.shipping).toBe(DEFAULT_SHIPPING)
  })
})
