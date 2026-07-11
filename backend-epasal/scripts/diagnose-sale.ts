/**
 * Diagnose why a sale category's products aren't showing on the storefront.
 *   npm run diagnose:sale -- winter-sale     (by slug)
 *   npm run diagnose:sale                     (lists all sale categories)
 *
 * For each attached product it reports whether a matching product exists and
 * whether it is active — the two conditions getBySlug() requires to hydrate.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { SaleCategory } from '../src/models/SaleCategory';
import { Product } from '../src/models/Product';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epasaley';

async function run() {
  await mongoose.connect(MONGO_URI);
  const slug = process.argv.slice(2).find(a => !a.startsWith('-'));

  if (!slug) {
    const all = await SaleCategory.find().lean().select('title slug is_active products -_id');
    console.log(`\nSale categories (${all.length}):`);
    all.forEach((s: any) => console.log(`  • ${s.slug}  | active=${s.is_active} | ${s.products?.length || 0} product(s)`));
    console.log('\nRun:  npm run diagnose:sale -- <slug>  for details.');
    await mongoose.disconnect();
    return;
  }

  const sale: any = await SaleCategory.findOne({ slug }).lean();
  if (!sale) { console.log(`❌ No sale category with slug "${slug}"`); await mongoose.disconnect(); return; }

  console.log(`\nSale: ${sale.title}  (slug=${sale.slug})`);
  console.log(`is_active=${sale.is_active}  start=${sale.start_date || '—'}  end=${sale.end_date || '—'}`);
  console.log(`Attached products: ${sale.products?.length || 0}`);

  let ok = 0, missing = 0, inactive = 0;
  for (const sp of (sale.products || [])) {
    const p: any = await Product.findOne({ id: sp.product_id }).lean();
    if (!p) { missing++; console.log(`  ✗ ${sp.product_id}  → NO product with this id (id mismatch)`); }
    else if (!p.isActive) { inactive++; console.log(`  ⚠ ${sp.product_id}  → "${p.name}" exists but isActive=false`); }
    else { ok++; console.log(`  ✓ ${sp.product_id}  → "${p.name}" (active) will show`); }
  }
  console.log(`\nResult: ${ok} will show, ${inactive} hidden (inactive), ${missing} unresolved (id mismatch).`);
  if (missing) console.log('→ Fix: the stored product_id does not equal any Product.id. Re-add the products in the admin.');
  if (inactive) console.log('→ Fix: set those products to Active in the Products admin.');
  await mongoose.disconnect();
}
run().catch(e => { console.error('❌', e.message); process.exit(1); });
