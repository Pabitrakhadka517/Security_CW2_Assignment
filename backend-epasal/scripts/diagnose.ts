/**
 * READ-ONLY storefront diagnostic — explains exactly what customers can and
 * cannot see right now, and why.   Usage: npm run diagnose
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epasaley';
  await mongoose.connect(uri);
  const { Product } = await import('../src/models/Product');
  const { Category } = await import('../src/models/Category');
  const { SaleCategory } = await import('../src/models/SaleCategory');
  const { FlashSale } = await import('../src/models/FlashSale');
  const { Banner } = await import('../src/models/Banner');

  const nowIso = new Date().toISOString();
  const now = new Date();

  const [prodTotal, prodActive, catActive, bannerActive] = await Promise.all([
    Product.countDocuments({}), Product.countDocuments({ isActive: true }),
    Category.countDocuments({ isActive: true }), Banner.countDocuments({ isActive: true }),
  ]);
  console.log(`\nDatabase: ${uri}`);
  console.log(`Products: ${prodTotal} total, ${prodActive} active/visible`);
  console.log(`Categories active: ${catActive} · Banners active: ${bannerActive}`);
  if (prodActive === 0) {
    console.log('⚠ NO ACTIVE PRODUCTS — the shop and every sale will be empty.');
    console.log('  → run `npm run seed:bulk` or add products in Admin → Products / Bulk Upload.');
  }

  console.log('\n━━ SALE CATEGORIES / SEASONAL SALES ━━');
  const sales = await SaleCategory.find({}).lean();
  if (!sales.length) console.log('  (none in DB — run `npm run seed:bulk` for demo data)');
  for (const sc of sales as any[]) {
    let status = 'LIVE ✅';
    if (!sc.is_active) status = 'INACTIVE — hidden';
    else if (sc.start_date && sc.start_date > nowIso) status = `UPCOMING — hidden until ${String(sc.start_date).slice(0, 10)}`;
    else if (sc.end_date && sc.end_date < nowIso) status = `ENDED — hidden since ${String(sc.end_date).slice(0, 10)}`;

    const ids = (sc.products || []).map((p: any) => p.product_id);
    const resolved = ids.length
      ? await Product.countDocuments({ id: { $in: ids }, isActive: true })
      : 0;
    console.log(`  • "${sc.title}" (/sale/${sc.slug}) — ${status}`);
    console.log(`      products attached: ${ids.length}, resolvable & active: ${resolved}`);
    if (ids.length === 0) {
      console.log('      ⚠ EMPTY SALE — attach products in Admin → Sale Categories / Sale Products,');
      console.log('        or re-upload via Bulk Upload → Seasonal Sales (productSlugs / categorySlugs).');
    } else if (resolved < ids.length) {
      const existing = await Product.find({ id: { $in: ids } }).select('id isActive').lean();
      const map: Record<string, any> = {}; existing.forEach((p: any) => { map[p.id] = p; });
      for (const id of ids) {
        if (!map[id]) console.log(`      ⚠ dangling product_id "${id}" — no such product`);
        else if (!map[id].isActive) console.log(`      ⚠ product "${id}" exists but is INACTIVE`);
      }
    }
  }

  console.log('\n━━ FLASH SALES ━━');
  const flash = await FlashSale.find({}).lean();
  if (!flash.length) console.log('  (none in DB)');
  for (const fs of flash as any[]) {
    let status = 'LIVE ✅';
    if (!fs.isActive) status = 'INACTIVE';
    else if (new Date(fs.startTime) > now) status = `UPCOMING (starts ${new Date(fs.startTime).toLocaleString()})`;
    else if (new Date(fs.endTime) < now) status = 'ENDED';
    const p = await Product.findOne({ id: fs.productId }).select('name isActive').lean();
    const pinfo = p ? `${(p as any).name}${(p as any).isActive ? '' : ' (INACTIVE ⚠)'}` : `⚠ dangling productId "${fs.productId}"`;
    console.log(`  • ${fs.name || '(unnamed)'} → ${pinfo} — Rs.${fs.flashPrice}, stock ${fs.currentStock}/${fs.maxStock} — ${status}`);
  }

  console.log('\nDone — every ⚠ above is a reason something is invisible or empty on the storefront.\n');
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error('Diagnose failed:', e.message); process.exit(1); });
