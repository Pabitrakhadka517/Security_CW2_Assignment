/**
 * Full demo-data seeder for the admin panel.
 * ----------------------------------------------------------------------------
 * Populates Categories, Products, Banners, Sale Categories, and Coupons so
 * every admin panel section has something to show. Idempotent: skips any
 * collection that already has documents, and skips individual records that
 * already exist (matched by slug/code/title).
 *
 *   npm run seed:data
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import categoryService from './services/category.service';
import productService from './services/product.service';
import bannerService from './services/banner.service';
import saleCategoryService from './services/saleCategory.service';
import couponService from './services/coupon.service';
import { Category } from './models/Category';
import { Product } from './models/Product';
import { Banner } from './models/Banner';
import { SaleCategory } from './models/SaleCategory';
import { Coupon } from './models/Coupon';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const img = (seed: string, w = 800, h = 800) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

async function seedCategories() {
  const defs = [
    { name: 'Electronics', description: 'Phones, laptops, gadgets and accessories.' },
    { name: 'Fashion', description: 'Clothing, footwear and accessories for everyone.' },
    { name: 'Home & Kitchen', description: 'Furniture, decor and kitchen essentials.' },
    { name: 'Beauty & Health', description: 'Skincare, wellness and personal care.' },
    { name: 'Sports & Outdoors', description: 'Fitness gear and outdoor equipment.' },
    { name: 'Groceries', description: 'Everyday food and household staples.' },
  ];

  const created: Record<string, string> = {};
  for (const def of defs) {
    const existing = await Category.findOne({ name: def.name }).lean();
    if (existing) {
      created[def.name] = existing.id;
      continue;
    }
    const cat = await categoryService.createCategory(
      { name: def.name, description: def.description } as any,
      img(`cat-${def.name}`, 600, 400),
    );
    created[def.name] = cat.id;
    console.log(`  + category: ${def.name}`);
  }
  return created;
}

async function seedProducts(categoryIds: Record<string, string>) {
  const defs = [
    { name: 'Wireless Bluetooth Earbuds', category: 'Electronics', price: 4500, discountPrice: 3499, hasOffer: true, stock: 120, description: 'Noise-cancelling wireless earbuds with 24hr battery life.' },
    { name: '4K Smart LED TV 43"', category: 'Electronics', price: 55000, stock: 15, description: 'Ultra HD smart TV with built-in streaming apps.' },
    { name: 'Mechanical Gaming Keyboard', category: 'Electronics', price: 6800, discountPrice: 5299, hasOffer: true, stock: 60, description: 'RGB backlit mechanical keyboard with blue switches.' },
    { name: "Men's Cotton Casual Shirt", category: 'Fashion', price: 1800, stock: 200, description: 'Breathable slim-fit cotton shirt, machine washable.' },
    { name: "Women's Running Shoes", category: 'Fashion', price: 3200, discountPrice: 2399, hasOffer: true, stock: 90, description: 'Lightweight cushioned running shoes for daily training.' },
    { name: 'Leather Handbag', category: 'Fashion', price: 4200, stock: 45, description: 'Genuine leather handbag with adjustable strap.' },
    { name: 'Non-Stick Cookware Set (5pc)', category: 'Home & Kitchen', price: 5200, stock: 70, description: 'Durable non-stick cookware set for everyday cooking.' },
    { name: 'Memory Foam Pillow', category: 'Home & Kitchen', price: 1500, discountPrice: 1099, hasOffer: true, stock: 150, description: 'Ergonomic memory foam pillow for neck support.' },
    { name: 'LED Table Lamp', category: 'Home & Kitchen', price: 1200, stock: 80, description: 'Adjustable brightness LED desk lamp with USB charging.' },
    { name: 'Vitamin C Face Serum', category: 'Beauty & Health', price: 950, discountPrice: 699, hasOffer: true, stock: 200, description: 'Brightening face serum with vitamin C and hyaluronic acid.' },
    { name: 'Electric Toothbrush', category: 'Beauty & Health', price: 2400, stock: 65, description: 'Rechargeable electric toothbrush with 3 cleaning modes.' },
    { name: 'Yoga Mat (Non-Slip)', category: 'Sports & Outdoors', price: 1600, stock: 110, description: '6mm thick non-slip yoga mat with carry strap.' },
    { name: 'Adjustable Dumbbell Set', category: 'Sports & Outdoors', price: 8500, discountPrice: 6999, hasOffer: true, stock: 30, description: 'Space-saving adjustable dumbbells, 2.5–24kg per side.' },
    { name: 'Camping Tent (4-Person)', category: 'Sports & Outdoors', price: 7200, stock: 25, description: 'Waterproof 4-person tent, easy setup in minutes.' },
    { name: 'Organic Basmati Rice (5kg)', category: 'Groceries', price: 950, stock: 300, description: 'Premium long-grain organic basmati rice.' },
    { name: 'Cold-Pressed Mustard Oil (1L)', category: 'Groceries', price: 380, stock: 250, description: 'Traditional cold-pressed mustard oil for cooking.' },
  ];

  const createdIds: string[] = [];
  for (const def of defs) {
    const existing = await Product.findOne({ name: def.name }).lean();
    if (existing) {
      createdIds.push(existing.id);
      continue;
    }
    const categoryId = categoryIds[def.category];
    const product = await productService.createProduct(
      {
        name: def.name,
        description: def.description,
        price: def.price,
        discountPrice: def.discountPrice || 0,
        hasOffer: !!def.hasOffer,
        stock: def.stock,
        category_id: categoryId,
        status: 'published',
        isActive: true,
      } as any,
      img(def.name),
    );
    createdIds.push(product.id);
    console.log(`  + product: ${def.name}`);
  }
  return createdIds;
}

async function seedBanners() {
  const defs = [
    { title: 'Big Summer Sale', subtitle: 'Up to 50% off electronics', position: 'hero', displayOrder: 1 },
    { title: 'New Fashion Arrivals', subtitle: 'Shop the latest trends', position: 'hero', displayOrder: 2 },
    { title: 'Free Delivery on Orders Above Rs. 2000', subtitle: null, position: 'strip', displayOrder: 1 },
    { title: 'Beauty Essentials Under Rs. 1000', subtitle: 'Glow up for less', position: 'promo', displayOrder: 1 },
  ];

  for (const def of defs) {
    const existing = await Banner.findOne({ title: def.title }).lean();
    if (existing) continue;
    await bannerService.createBanner(
      {
        title: def.title,
        subtitle: def.subtitle,
        position: def.position,
        displayOrder: def.displayOrder,
        isActive: true,
      } as any,
      img(`banner-${def.title}`, 1600, 600),
    );
    console.log(`  + banner: ${def.title}`);
  }
}

async function seedSaleCategories(productIds: string[]) {
  const now = new Date();
  const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const defs = [
    {
      title: 'Dashain Dhamaka',
      season: 'dashain' as const,
      badge_label: 'DASHAIN OFFER',
      badge_color: '#E85D04',
      description: 'Biggest festival discounts on electronics and fashion.',
      priority: 10,
      products: productIds.slice(0, 4),
    },
    {
      title: 'Tihar Lights Sale',
      season: 'tihar' as const,
      badge_label: 'TIHAR SPECIAL',
      badge_color: '#F4A261',
      description: 'Light up your home with festive deals.',
      priority: 8,
      products: productIds.slice(4, 8),
    },
    {
      title: 'Weekly Flash Deals',
      season: null,
      badge_label: 'FLASH SALE',
      badge_color: '#EF4444',
      description: 'Hot deals refreshed every week — limited stock.',
      priority: 5,
      products: productIds.slice(8, 12),
    },
  ];

  for (const def of defs) {
    const existing = await SaleCategory.findOne({ title: def.title }).lean();
    if (existing) continue;
    await saleCategoryService.create({
      title: def.title,
      description: def.description,
      is_active: true,
      start_date: now.toISOString(),
      end_date: in30d,
      priority: def.priority,
      season: def.season,
      badge_label: def.badge_label,
      badge_color: def.badge_color,
      banner: img(`sale-${def.title}`, 1600, 500),
      products: def.products.map((product_id, i) => ({
        product_id,
        discount_percentage: 15 + i * 5,
        display_order: i,
        stock_limit: null,
        badge_label: null,
      })),
    });
    console.log(`  + sale category: ${def.title}`);
  }
}

async function seedCoupons() {
  const now = new Date();
  const in60d = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const defs = [
    { code: 'WELCOME10', description: '10% off your first order', discount_type: 'percentage', discount_value: 10, min_order_amount: 500, max_discount_cap: 1000, usage_limit: 1000, per_user_limit: 1 },
    { code: 'FLAT500', description: 'Flat Rs. 500 off orders above Rs. 5000', discount_type: 'fixed', discount_value: 500, min_order_amount: 5000, max_discount_cap: null, usage_limit: 500, per_user_limit: 2 },
    { code: 'FESTIVE20', description: '20% off festive season sale', discount_type: 'percentage', discount_value: 20, min_order_amount: 1000, max_discount_cap: 2000, usage_limit: null, per_user_limit: 1 },
  ];

  for (const def of defs) {
    const existing = await Coupon.findOne({ code: def.code }).lean();
    if (existing) continue;
    await couponService.createCoupon({
      code: def.code,
      description: def.description,
      discount_type: def.discount_type as 'percentage' | 'fixed',
      discount_value: def.discount_value,
      apply_on: 'cart',
      applicable_products: [],
      applicable_categories: [],
      validFrom: now.toISOString(),
      validTo: in60d,
      usage_limit: def.usage_limit,
      per_user_limit: def.per_user_limit,
      max_discount_cap: def.max_discount_cap,
      min_order_amount: def.min_order_amount,
      isActive: true,
    } as any);
    console.log(`  + coupon: ${def.code}`);
  }
}

async function run(): Promise<void> {
  if (!MONGO_URI) {
    throw new Error('MONGODB_URI is not set in the environment.');
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  console.log('Seeding categories...');
  const categoryIds = await seedCategories();

  console.log('Seeding products...');
  const productIds = await seedProducts(categoryIds);

  console.log('Seeding banners...');
  await seedBanners();

  console.log('Seeding sale categories...');
  await seedSaleCategories(productIds);

  console.log('Seeding coupons...');
  await seedCoupons();

  await mongoose.disconnect();
  console.log('🎉 Demo data seeding complete.');
}

run().catch((err: unknown) => {
  console.error('❌ Data seeding failed:', (err as Error).message);
  process.exit(1);
});
