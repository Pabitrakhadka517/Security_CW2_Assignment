/**
 * Frontend mirror of backend/src/utils/priceCalculator.ts
 * Same formula — used for instant UI updates while the API call is in-flight.
 * Source of truth is always the server; this is for optimistic display only.
 */

export const VAT_RATE            = 0.13;
export const DEFAULT_SHIPPING    = 150;
export const FREE_SHIPPING_ABOVE = 5000;

function couponBase(coupon, items, subtotal) {
  if (coupon.apply_on === 'product' && coupon.applicable_products?.length) {
    return items
      .filter(i => coupon.applicable_products.includes(i.productId))
      .reduce((s, i) => s + i.lineTotal, 0);
  }
  return subtotal;
}

function computeCouponDiscount(coupon, items, subtotal) {
  const base = couponBase(coupon, items, subtotal);
  let discount;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round(base * coupon.discount_value / 100);
    const cap = coupon.max_discount_cap;
    if (cap != null && cap > 0) discount = Math.min(discount, cap);
  } else {
    discount = coupon.discount_value;
  }
  return Math.min(discount, subtotal);
}

/**
 * @param {Object} opts
 * @param {Array}  opts.items              - [{productId, name, quantity, resolvedPrice, lineTotal}]
 * @param {Object} [opts.coupon]           - coupon object or null
 * @param {number} [opts.shippingRate]
 * @param {number} [opts.freeShippingAbove]
 * @param {number} [opts.vatRate]
 */
export function calculateOrderTotal({
  items,
  coupon            = null,
  shippingRate      = DEFAULT_SHIPPING,
  freeShippingAbove = FREE_SHIPPING_ABOVE,
  vatRate           = VAT_RATE,
}) {
  const subtotal          = items.reduce((s, i) => s + (i.lineTotal ?? i.resolvedPrice * i.quantity), 0);
  const couponDiscount    = coupon ? computeCouponDiscount(coupon, items, subtotal) : 0;
  const couponCode        = coupon?.code ?? null;
  const discountedSubtotal = subtotal - couponDiscount;
  const vatAmount         = Math.round(discountedSubtotal * vatRate);
  const isFree            = discountedSubtotal >= freeShippingAbove;
  const shipping          = isFree ? 0 : shippingRate;
  const shippingNote      = isFree
    ? `Free shipping on orders above Rs. ${freeShippingAbove.toLocaleString()}`
    : `Standard delivery Rs. ${shippingRate}`;
  const total             = discountedSubtotal + vatAmount + shipping;

  return {
    items, subtotal, couponCode, couponDiscount,
    discountedSubtotal, vatRate, vatAmount,
    shipping, shippingNote, total,
  };
}
