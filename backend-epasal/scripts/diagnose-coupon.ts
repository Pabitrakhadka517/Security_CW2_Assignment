/**
 * Inspect coupons to see why one isn't being accepted at checkout.
 *   npm run diagnose:coupon                 (list all coupons)
 *   npm run diagnose:coupon -- SALE20       (details for one code)
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Coupon } from '../src/models/Coupon';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epasaley';

async function run() {
  await mongoose.connect(MONGO_URI);
  const code = process.argv.slice(2).find(a => !a.startsWith('-'));

  if (!code) {
    const all = await Coupon.find().lean().select('code isActive validFrom validTo apply_on -_id');
    console.log(`\nCoupons in DB (${all.length}):`);
    all.forEach((c: any) => console.log(`  • ${c.code}  active=${c.isActive}  scope=${c.apply_on}  valid ${String(c.validFrom).slice(0,10)} → ${String(c.validTo).slice(0,10)}`));
    if (!all.length) console.log('  (none — coupon creation may be failing; restart the backend so the validation fix is live, then re-create)');
    await mongoose.disconnect();
    return;
  }

  const c: any = await Coupon.findOne({ code: code.toUpperCase() }).lean();
  if (!c) { console.log(`❌ No coupon "${code.toUpperCase()}" in DB → checkout will say "Coupon not found".`); await mongoose.disconnect(); return; }

  const now = new Date();
  console.log(`\nCoupon ${c.code}`);
  console.log(`  isActive:   ${c.isActive}${c.isActive ? '' : '  ← inactive → rejected'}`);
  console.log(`  window:     ${String(c.validFrom).slice(0,10)} → ${String(c.validTo).slice(0,10)}` +
    (now < new Date(c.validFrom) ? '  ← not started' : now > new Date(c.validTo) ? '  ← expired' : '  (in window)'));
  console.log(`  scope:      ${c.apply_on}`);
  if (c.apply_on === 'product') console.log(`  applies to products: ${(c.applicable_products||[]).join(', ') || '(none set → applies to none!)'}`);
  if (c.apply_on === 'category') console.log(`  applies to categories: ${(c.applicable_categories||[]).join(', ') || '(none set)'}`);
  console.log(`  discount:   ${c.discount_type === 'percentage' ? c.discount_value + '%' : 'Rs. ' + c.discount_value}${c.max_discount_cap ? ` (cap Rs. ${c.max_discount_cap})` : ''}`);
  console.log(`  min order:  Rs. ${c.min_order_amount || 0}`);
  console.log(`  usage:      ${c.usage_count || 0}/${c.usage_limit ?? '∞'}  per-user: ${c.per_user_limit ?? '∞'}`);
  console.log('\nIf scope is product/category and your cart item is not in that list, checkout says "not applicable". Set scope to "cart" to apply store-wide.');
  await mongoose.disconnect();
}
run().catch(e => { console.error('❌', e.message); process.exit(1); });
