/**
 * Shared order-total calculator.
 * Pure functions — no DB access. Import from both order service and the
 * calculate-total endpoint so frontend and backend can never diverge.
 */

export const VAT_RATE             = 0.13;   // Nepal standard VAT
export const DEFAULT_SHIPPING     = 150;    // Rs.
export const FREE_SHIPPING_ABOVE  = 5000;   // Rs. discounted subtotal threshold

export type DiscountSource = 'sale_category' | 'product_discount' | 'original';

export interface ResolvedItem {
  productId:      string;
  name:           string;
  quantity:       number;
  originalPrice:  number;
  resolvedPrice:  number;
  discountSource: DiscountSource;
  lineTotal:      number;
}

export interface CouponDetails {
  code:                   string;
  discount_type:          'percentage' | 'fixed';
  discount_value:         number;
  max_discount_cap?:      number | null;
  apply_on:               'cart' | 'product' | 'category';
  applicable_products?:   string[];
  applicable_categories?: string[];
}

export interface OrderBreakdown {
  items:              ResolvedItem[];
  subtotal:           number;
  couponCode:         string | null;
  couponDiscount:     number;
  discountedSubtotal: number;
  vatRate:            number;
  vatAmount:          number;
  shipping:           number;
  shippingNote:       string;
  total:              number;
}

function couponBase(coupon: CouponDetails, items: ResolvedItem[], subtotal: number): number {
  if (coupon.apply_on === 'product' && coupon.applicable_products?.length) {
    return items
      .filter(i => coupon.applicable_products!.includes(i.productId))
      .reduce((s, i) => s + i.lineTotal, 0);
  }
  // For 'category' scope the service already validated that at least one item
  // falls in the eligible categories, so we apply the discount to the full cart.
  return subtotal;
}

function computeCouponDiscount(
  coupon: CouponDetails,
  items: ResolvedItem[],
  subtotal: number
): number {
  const base = couponBase(coupon, items, subtotal);
  let discount: number;

  if (coupon.discount_type === 'percentage') {
    discount = Math.round(base * coupon.discount_value / 100);
    const cap = coupon.max_discount_cap;
    if (cap != null && cap > 0) discount = Math.min(discount, cap);
  } else {
    discount = coupon.discount_value;
  }

  return Math.min(discount, subtotal); // clamp: never make total negative
}

export function calculateOrderTotal({
  items,
  coupon            = null,
  shippingRate      = DEFAULT_SHIPPING,
  freeShippingAbove = FREE_SHIPPING_ABOVE,
  vatRate           = VAT_RATE,
}: {
  items:              ResolvedItem[];
  coupon?:            CouponDetails | null;
  shippingRate?:      number;
  freeShippingAbove?: number;
  vatRate?:           number;
}): OrderBreakdown {
  // Step 3 — subtotal
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);

  // Step 4 — coupon
  const couponDiscount = coupon ? computeCouponDiscount(coupon, items, subtotal) : 0;
  const couponCode     = coupon?.code ?? null;

  // Step 5 — discounted subtotal
  const discountedSubtotal = subtotal - couponDiscount;

  // Step 6 — VAT on discounted subtotal
  const vatAmount = Math.round(discountedSubtotal * vatRate);

  // Step 7 — shipping based on discounted subtotal
  const isFree     = discountedSubtotal >= freeShippingAbove;
  const shipping   = isFree ? 0 : shippingRate;
  const shippingNote = isFree
    ? `Free shipping on orders above Rs. ${freeShippingAbove.toLocaleString()}`
    : `Standard delivery Rs. ${shippingRate}`;

  // Step 8 — final total
  const total = discountedSubtotal + vatAmount + shipping;

  return {
    items,
    subtotal,
    couponCode,
    couponDiscount,
    discountedSubtotal,
    vatRate,
    vatAmount,
    shipping,
    shippingNote,
    total,
  };
}
