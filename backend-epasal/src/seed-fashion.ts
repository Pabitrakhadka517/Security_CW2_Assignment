/**
 * Fashion-store catalog seeder.
 * ----------------------------------------------------------------------------
 * This store sells fashion only, so every product/banner/sale image should
 * actually look like fashion — not a random placeholder photo. Picks a
 * keyword-matched photo from a curated Unsplash pool (+ a stable numeric
 * lock per product so the same product always gets the same photo).
 *
 * Only images.unsplash.com is used, since that's the one third-party image
 * host allowed by the app's CSP img-src directive (backend helmet.config.ts
 * / frontend index.html + netlify.toml / vercel.json). An earlier version of
 * this script used loremflickr.com for its keyword-tag matching, but that
 * domain isn't in the CSP allowlist, so every image it generated was
 * silently blocked by the browser.
 *
 * Upserts by name/title: creates missing products/banners, and re-points the
 * image of any that already exist (e.g. the 3 fashion products from the
 * earlier generic seed). Safe to re-run.
 *
 *   npm run seed:fashion
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import productService from './services/product.service';
import bannerService from './services/banner.service';
import { Category } from './models/Category';
import { Product } from './models/Product';
import { Banner } from './models/Banner';
import { SaleCategory } from './models/SaleCategory';
import { pickFashionImage } from './seed-fashion-images';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

// Stable per-seed lock so the same product always renders the same photo
// instead of a new random one on every request.
const lock = (seed: string) => parseInt(crypto.createHash('md5').update(seed).digest('hex').slice(0, 8), 16) % 100000;

const fashionImg = (keywords: string, seed: string, w = 900, h = 1100) =>
  pickFashionImage(keywords, lock(seed), w, h);

const PRODUCTS = [
  // ── Men's clothing ────────────────────────────────────────────
  { name: "Men's Cotton Casual Shirt", price: 1800, discountPrice: 0, hasOffer: false, stock: 200, tags: ['men', 'shirt', 'casual'], keywords: 'mens-fashion,shirt', description: 'Breathable slim-fit cotton shirt, machine washable.' },
  { name: "Men's Slim Fit Denim Jeans", price: 2800, discountPrice: 2199, hasOffer: true, stock: 150, tags: ['men', 'jeans', 'denim'], keywords: 'mens-fashion,jeans', description: 'Stretch-denim slim fit jeans for everyday wear.' },
  { name: "Men's Leather Biker Jacket", price: 8500, discountPrice: 6999, hasOffer: true, stock: 40, tags: ['men', 'jacket', 'leather'], keywords: 'mens-fashion,leather-jacket', description: 'Genuine leather biker jacket with quilted lining.' },
  { name: "Men's Formal Blazer", price: 6200, discountPrice: 0, hasOffer: false, stock: 55, tags: ['men', 'blazer', 'formal'], keywords: 'mens-fashion,blazer', description: 'Tailored two-button blazer for formal occasions.' },
  { name: "Men's Graphic Print T-Shirt", price: 1200, discountPrice: 899, hasOffer: true, stock: 250, tags: ['men', 'tshirt', 'casual'], keywords: 'mens-fashion,tshirt', description: 'Soft cotton tee with original graphic print.' },
  { name: "Men's Hooded Sweatshirt", price: 2400, discountPrice: 0, hasOffer: false, stock: 130, tags: ['men', 'hoodie', 'winter'], keywords: 'mens-fashion,hoodie', description: 'Fleece-lined hoodie for cold-weather layering.' },

  // ── Women's clothing ──────────────────────────────────────────
  { name: "Women's Floral Summer Dress", price: 2600, discountPrice: 1999, hasOffer: true, stock: 120, tags: ['women', 'dress', 'summer'], keywords: 'womens-fashion,dress', description: 'Lightweight floral dress, perfect for summer days.' },
  { name: "Women's Denim Jacket", price: 3400, discountPrice: 0, hasOffer: false, stock: 75, tags: ['women', 'jacket', 'denim'], keywords: 'womens-fashion,denim-jacket', description: 'Classic cropped denim jacket, layers over anything.' },
  { name: "Women's High-Waist Leggings", price: 1400, discountPrice: 999, hasOffer: true, stock: 220, tags: ['women', 'leggings', 'activewear'], keywords: 'womens-fashion,leggings', description: 'Squat-proof high-waist leggings with side pockets.' },
  { name: "Women's Wool Blend Cardigan", price: 3100, discountPrice: 0, hasOffer: false, stock: 60, tags: ['women', 'cardigan', 'winter'], keywords: 'womens-fashion,cardigan', description: 'Cozy wool-blend cardigan for layering.' },
  { name: "Women's Silk Scarf", price: 950, discountPrice: 0, hasOffer: false, stock: 140, tags: ['women', 'scarf', 'accessories'], keywords: 'womens-fashion,silk-scarf', description: 'Printed silk scarf, hand-rolled edges.' },
  { name: "Women's Running Shoes", price: 3200, discountPrice: 2399, hasOffer: true, stock: 90, tags: ['women', 'shoes', 'sportswear'], keywords: 'womens-fashion,running-shoes', description: 'Lightweight cushioned running shoes for daily training.' },

  // ── Footwear ──────────────────────────────────────────────────
  { name: "Men's Leather Formal Shoes", price: 4200, discountPrice: 0, hasOffer: false, stock: 65, tags: ['men', 'shoes', 'formal'], keywords: 'mens-fashion,formal-shoes', description: 'Handcrafted leather oxford shoes.' },
  { name: "Women's Block Heel Sandals", price: 2900, discountPrice: 2299, hasOffer: true, stock: 85, tags: ['women', 'heels', 'sandals'], keywords: 'womens-fashion,heels', description: 'Comfortable block-heel sandals for all-day wear.' },
  { name: "Unisex Canvas Sneakers", price: 2200, discountPrice: 0, hasOffer: false, stock: 180, tags: ['unisex', 'sneakers', 'casual'], keywords: 'fashion,sneakers', description: 'Classic low-top canvas sneakers.' },

  // ── Bags & accessories ────────────────────────────────────────
  { name: 'Leather Handbag', price: 4200, discountPrice: 0, hasOffer: false, stock: 45, tags: ['women', 'bag', 'leather'], keywords: 'womens-fashion,leather-handbag', description: 'Genuine leather handbag with adjustable strap.' },
  { name: "Men's Leather Bifold Wallet", price: 1500, discountPrice: 1099, hasOffer: true, stock: 160, tags: ['men', 'wallet', 'leather'], keywords: 'mens-fashion,leather-wallet', description: 'Slim bifold wallet in genuine leather.' },
  { name: 'Canvas Travel Backpack', price: 3600, discountPrice: 0, hasOffer: false, stock: 70, tags: ['unisex', 'backpack', 'travel'], keywords: 'fashion,backpack', description: 'Durable canvas backpack with laptop sleeve.' },
  { name: 'Polarized Sunglasses', price: 1800, discountPrice: 1349, hasOffer: true, stock: 200, tags: ['unisex', 'sunglasses', 'accessories'], keywords: 'fashion,sunglasses', description: 'UV400 polarized sunglasses with metal frame.' },

  // ── Jewelry & watches ─────────────────────────────────────────
  { name: "Women's Gold-Plated Necklace", price: 2100, discountPrice: 0, hasOffer: false, stock: 95, tags: ['women', 'jewelry', 'necklace'], keywords: 'womens-fashion,necklace-jewelry', description: '18k gold-plated pendant necklace.' },
  { name: "Men's Analog Wrist Watch", price: 5200, discountPrice: 3999, hasOffer: true, stock: 55, tags: ['men', 'watch', 'accessories'], keywords: 'mens-fashion,wrist-watch', description: 'Stainless steel analog watch with leather strap.' },
  { name: "Women's Pearl Drop Earrings", price: 1300, discountPrice: 0, hasOffer: false, stock: 110, tags: ['women', 'jewelry', 'earrings'], keywords: 'womens-fashion,pearl-earrings', description: 'Freshwater pearl drop earrings.' },

  // ── Kids' fashion ─────────────────────────────────────────────
  { name: "Kids' Printed T-Shirt", price: 700, discountPrice: 0, hasOffer: false, stock: 180, tags: ['kids', 'tshirt', 'casual'], keywords: 'kids-fashion,tshirt', description: 'Soft cotton tee with playful print, sizes 2–10y.' },
  { name: "Kids' Denim Overalls", price: 1600, discountPrice: 1199, hasOffer: true, stock: 90, tags: ['kids', 'overalls', 'denim'], keywords: 'kids-fashion,overalls', description: 'Adjustable-strap denim overalls for toddlers.' },
];

const BANNERS = [
  { title: 'New Fashion Arrivals', subtitle: 'Shop the latest trends', position: 'hero', displayOrder: 1, keywords: 'fashion,runway' },
  { title: 'Free Delivery on Orders Above Rs. 2000', subtitle: null, position: 'strip', displayOrder: 1, keywords: 'fashion,clothing-rack' },
  { title: 'Footwear & Accessories Sale', subtitle: 'Step up your style', position: 'hero', displayOrder: 2, keywords: 'fashion,shoes' },
];

async function seedProducts(fashionCategoryId: string) {
  const idByName: Record<string, string> = {};
  for (const def of PRODUCTS) {
    const imageUrl = fashionImg(def.keywords, def.name);
    const existing = await Product.findOne({ name: def.name });
    if (existing) {
      existing.imageUrl = imageUrl;
      existing.tags = def.tags;
      existing.description = def.description;
      await existing.save();
      idByName[def.name] = existing.id;
      console.log(`  ~ updated image: ${def.name}`);
      continue;
    }
    const product = await productService.createProduct(
      {
        name: def.name,
        description: def.description,
        price: def.price,
        discountPrice: def.discountPrice,
        hasOffer: def.hasOffer,
        stock: def.stock,
        category_id: fashionCategoryId,
        status: 'published',
        isActive: true,
        tags: def.tags,
      } as any,
      imageUrl,
    );
    idByName[def.name] = product.id;
    console.log(`  + created: ${def.name}`);
  }
  return idByName;
}

async function seedBanners() {
  for (const def of BANNERS) {
    const imageUrl = fashionImg(def.keywords, def.title, 1600, 700);
    const existing = await Banner.findOne({ title: def.title });
    if (existing) {
      existing.imageUrl = imageUrl;
      await existing.save();
      console.log(`  ~ updated banner image: ${def.title}`);
      continue;
    }
    await bannerService.createBanner(
      { title: def.title, subtitle: def.subtitle, position: def.position, displayOrder: def.displayOrder, isActive: true } as any,
      imageUrl,
    );
    console.log(`  + banner: ${def.title}`);
  }
}

async function repointSaleCategories(idByName: Record<string, string>) {
  const dashainProducts = ["Men's Leather Biker Jacket", "Women's Floral Summer Dress", "Men's Analog Wrist Watch", 'Leather Handbag'];
  const tiharProducts = ["Women's Block Heel Sandals", "Men's Slim Fit Denim Jeans", 'Polarized Sunglasses', "Women's Wool Blend Cardigan"];

  const defs: Array<{ title: string; keywords: string; products: string[] }> = [
    { title: 'Dashain Dhamaka', keywords: 'fashion,festival-outfit', products: dashainProducts },
    { title: 'Tihar Lights Sale', keywords: 'fashion,style', products: tiharProducts },
  ];

  for (const def of defs) {
    const sale = await SaleCategory.findOne({ title: def.title });
    if (!sale) continue;
    sale.banner = fashionImg(def.keywords, def.title, 1600, 600);
    sale.products = def.products
      .filter((name) => idByName[name])
      .map((name, i) => ({
        product_id: idByName[name],
        discount_percentage: 15 + i * 5,
        display_order: i,
        stock_limit: null,
        badge_label: null,
      }));
    await sale.save();
    console.log(`  ~ re-pointed sale category: ${def.title} (${sale.products.length} products)`);
  }
}

async function run(): Promise<void> {
  if (!MONGO_URI) throw new Error('MONGODB_URI is not set in the environment.');

  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const fashion = await Category.findOne({ name: 'Fashion' }).lean();
  if (!fashion) throw new Error('Fashion category not found — run npm run seed:data first.');

  console.log('Seeding fashion products...');
  const idByName = await seedProducts(fashion.id);

  console.log('Seeding fashion banners...');
  await seedBanners();

  console.log('Re-pointing sale categories to fashion products...');
  await repointSaleCategories(idByName);

  await mongoose.disconnect();
  console.log('🎉 Fashion catalog seeding complete.');
}

run().catch((err: unknown) => {
  console.error('❌ Fashion seeding failed:', (err as Error).message);
  process.exit(1);
});
