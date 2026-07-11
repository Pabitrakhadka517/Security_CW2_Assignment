/**
 * Price utilities — single source of truth for all price display logic.
 *
 * Product model fields:
 *   price         — MRP / original price (always set)
 *   discountPrice — sale/offer price (set when hasOffer = true)
 *   hasOffer      — boolean flag
 *
 * Rule:  if hasOffer && discountPrice > 0 && discountPrice < price
 *        → selling price = discountPrice,  show price struck-through
 *        else
 *        → selling price = price, no strikethrough
 */

/** The price the customer actually pays */
export function getSellingPrice(product) {
  if (!product) return 0;
  const { price = 0, discountPrice = 0, hasOffer = false } = product;
  if (hasOffer && discountPrice > 0 && discountPrice < price) return discountPrice;
  return price;
}

/** The original MRP (shown with strikethrough when on offer) */
export function getMrpPrice(product) {
  return product?.price || 0;
}

/** True when the product is on offer and should show a strikethrough */
export function hasDiscount(product) {
  if (!product) return false;
  const { price = 0, discountPrice = 0, hasOffer = false } = product;
  return hasOffer && discountPrice > 0 && discountPrice < price;
}

/** Discount percentage rounded to nearest integer */
export function getDiscountPercent(product) {
  if (!hasDiscount(product)) return 0;
  const { price, discountPrice } = product;
  return Math.round(((price - discountPrice) / price) * 100);
}

/** Format as Nepali Rupees: Rs. 1,299 */
export function formatPrice(amount) {
  if (amount === undefined || amount === null) return 'Rs. 0';
  return `Rs. ${Number(amount).toLocaleString('en-NP')}`;
}
