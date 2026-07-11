/**
 * Bulk fashion catalog expansion.
 * ----------------------------------------------------------------------------
 * Generates many colour variants of a set of fashion product templates
 * (shirts, dresses, kurtis, sarees, sneakers, jewelry, ...) so the store has
 * a realistic-sized catalog (100+ products) instead of one item per style.
 * Each variant gets a keyword-matched, lock-stabilised loremflickr photo —
 * same approach as seed-fashion.ts.
 *
 * Idempotent: skips any product whose generated name already exists.
 *
 *   npm run seed:fashion:bulk
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import productService from './services/product.service';
import { Category } from './models/Category';
import { Product } from './models/Product';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const lock = (seed: string) => parseInt(crypto.createHash('md5').update(seed).digest('hex').slice(0, 8), 16) % 100000;

const fashionImg = (keywords: string, seed: string, w = 900, h = 1100) => {
  const tags = keywords.split(',').map((t) => encodeURIComponent(t.trim())).join(',');
  return `https://loremflickr.com/${w}/${h}/${tags}?lock=${lock(seed)}`;
};

const COLORS = [
  'Black', 'White', 'Navy Blue', 'Maroon', 'Olive Green', 'Charcoal Grey',
  'Beige', 'Mustard Yellow', 'Teal', 'Wine Red', 'Sky Blue', 'Rust Orange',
];

type Gender = 'men' | 'women' | 'kids' | 'unisex';

interface Template {
  base: string;
  gender: Gender;
  keywords: string;
  price: number;
  variants?: number; // defaults to 4
  extraTags?: string[];
}

const PREFIX: Record<Gender, string> = { men: "Men's", women: "Women's", kids: "Kids'", unisex: '' };

const TEMPLATES: Template[] = [
  // ── Men's clothing ────────────────────────────────────────────
  { base: 'Cotton Casual Shirt', gender: 'men', keywords: 'mens-fashion,shirt', price: 1800 },
  { base: 'Slim Fit Jeans', gender: 'men', keywords: 'mens-fashion,jeans', price: 2800 },
  { base: 'Denim Jacket', gender: 'men', keywords: 'mens-fashion,denim-jacket', price: 4200 },
  { base: 'Pullover Hoodie', gender: 'men', keywords: 'mens-fashion,hoodie', price: 2400 },
  { base: 'Chino Shorts', gender: 'men', keywords: 'mens-fashion,shorts', price: 1600 },
  { base: 'Wool Sweater', gender: 'men', keywords: 'mens-fashion,sweater', price: 2600 },
  { base: 'Track Suit', gender: 'men', keywords: 'mens-fashion,tracksuit', price: 3200 },
  { base: 'Polo T-Shirt', gender: 'men', keywords: 'mens-fashion,polo-shirt', price: 1500 },
  { base: 'Daura Suruwal (Traditional)', gender: 'men', keywords: 'nepali-fashion,traditional-dress', price: 5500, variants: 3, extraTags: ['ethnic'] },

  // ── Women's clothing ──────────────────────────────────────────
  { base: 'Floral Dress', gender: 'women', keywords: 'womens-fashion,dress', price: 2600 },
  { base: 'Crop Top', gender: 'women', keywords: 'womens-fashion,top', price: 1200 },
  { base: 'Skinny Jeans', gender: 'women', keywords: 'womens-fashion,jeans', price: 2500 },
  { base: 'Printed Kurti', gender: 'women', keywords: 'womens-fashion,kurti', price: 1900, extraTags: ['ethnic'] },
  { base: 'Silk Saree', gender: 'women', keywords: 'womens-fashion,saree', price: 6500, variants: 3, extraTags: ['ethnic'] },
  { base: 'High-Waist Leggings', gender: 'women', keywords: 'womens-fashion,leggings', price: 1400 },
  { base: 'Wool Cardigan', gender: 'women', keywords: 'womens-fashion,cardigan', price: 3100 },
  { base: 'Sports Bra & Leggings Set', gender: 'women', keywords: 'womens-fashion,activewear', price: 2200, extraTags: ['activewear'] },
  { base: 'Palazzo Pants', gender: 'women', keywords: 'womens-fashion,palazzo-pants', price: 1700 },

  // ── Kids' fashion ─────────────────────────────────────────────
  { base: 'Printed T-Shirt', gender: 'kids', keywords: 'kids-fashion,tshirt', price: 700, variants: 3 },
  { base: 'Party Frock', gender: 'kids', keywords: 'kids-fashion,dress', price: 1500, variants: 3 },

  // ── Footwear ──────────────────────────────────────────────────
  { base: 'Canvas Sneakers', gender: 'unisex', keywords: 'fashion,sneakers', price: 2200, extraTags: ['footwear'] },
  { base: 'Block Heel Sandals', gender: 'women', keywords: 'womens-fashion,heels', price: 2900, extraTags: ['footwear'] },
  { base: 'Leather Formal Shoes', gender: 'men', keywords: 'mens-fashion,formal-shoes', price: 4200, variants: 3, extraTags: ['footwear'] },

  // ── Bags & accessories ────────────────────────────────────────
  { base: 'Tote Bag', gender: 'women', keywords: 'womens-fashion,tote-bag', price: 2100, extraTags: ['bag'] },
  { base: 'Travel Backpack', gender: 'unisex', keywords: 'fashion,backpack', price: 3600, extraTags: ['bag'] },
  { base: 'Leather Belt', gender: 'men', keywords: 'mens-fashion,belt', price: 900, extraTags: ['accessories'] },

  // ── Jewelry ───────────────────────────────────────────────────
  { base: 'Statement Necklace', gender: 'women', keywords: 'womens-fashion,necklace-jewelry', price: 1800, variants: 3, extraTags: ['jewelry'] },
  { base: 'Drop Earrings', gender: 'women', keywords: 'womens-fashion,earrings', price: 1100, variants: 3, extraTags: ['jewelry'] },
];

function buildName(gender: Gender, color: string, base: string) {
  const prefix = PREFIX[gender];
  return prefix ? `${prefix} ${color} ${base}` : `${color} ${base}`;
}

async function seedBulkProducts(fashionCategoryId: string) {
  let created = 0;
  let skipped = 0;

  for (let t = 0; t < TEMPLATES.length; t++) {
    const tpl = TEMPLATES[t];
    const count = tpl.variants ?? 4;
    for (let i = 0; i < count; i++) {
      const color = COLORS[(t + i) % COLORS.length];
      const name = buildName(tpl.gender, color, tpl.base);

      const existing = await Product.findOne({ name }).lean();
      if (existing) {
        skipped++;
        continue;
      }

      const hasOffer = i % 2 === 1;
      const price = tpl.price + i * 50;
      const discountPrice = hasOffer ? Math.round((price * 0.78) / 5) * 5 : 0;
      const tags = [tpl.gender, ...(tpl.extraTags || [])];

      const imageUrl = fashionImg(tpl.keywords, name);
      await productService.createProduct(
        {
          name,
          description: `${color} ${tpl.base.replace(' (Traditional)', '')} — premium quality, true to size.`,
          price,
          discountPrice,
          hasOffer,
          stock: 50 + ((t * 7 + i * 13) % 150),
          category_id: fashionCategoryId,
          status: 'published',
          isActive: true,
          tags,
        } as any,
        imageUrl,
      );
      created++;
    }
  }
  return { created, skipped };
}

async function run(): Promise<void> {
  if (!MONGO_URI) throw new Error('MONGODB_URI is not set in the environment.');

  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const fashion = await Category.findOne({ name: 'Fashion' }).lean();
  if (!fashion) throw new Error('Fashion category not found — run npm run seed:data first.');

  console.log('Seeding bulk fashion product variants...');
  const { created, skipped } = await seedBulkProducts(fashion.id);
  console.log(`  + created ${created} product(s), skipped ${skipped} already-existing`);

  const total = await Product.countDocuments({ category_id: fashion.id });
  console.log(`Total fashion products now: ${total}`);

  await mongoose.disconnect();
  console.log('🎉 Bulk fashion seeding complete.');
}

run().catch((err: unknown) => {
  console.error('❌ Bulk fashion seeding failed:', (err as Error).message);
  process.exit(1);
});
