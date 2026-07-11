/**
 * Fashion catalogue seeder — Admin Panel demo data.
 * ----------------------------------------------------------------------------
 * Plain Node.js script (no ts-node/build step required). Reads the product
 * data from `seed/fashionProducts.js`, enriches every row with generated
 * fields (id, SKU, slug, images, stock, rating, timestamps, flags), and
 * writes the result straight to the `categories`/`products` collections used
 * by the running backend (same Mongoose collection names as
 * src/models/Category.ts and src/models/Product.ts).
 *
 * Safe to re-run: categories are upserted by slug, and only products created
 * by a previous run of this script (marked with `seedSource`) are deleted
 * before the fresh batch is inserted — hand-created admin products are never
 * touched.
 *
 *   node seedProducts.js
 *   npm run seed:fashion:catalog
 */
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const { IMAGE_BANK, CATEGORY_TREE, PRODUCTS } = require('./seed/fashionProducts');

const MONGO_URI = process.env.MONGODB_URI;
const SEED_SOURCE = 'fashion-catalog-seed-v1';

// ---------------------------------------------------------------------------
// Small deterministic helpers (no external deps beyond mongoose/dotenv).
// ---------------------------------------------------------------------------

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const genId = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randFloat = (min, max, decimals = 1) => Number((Math.random() * (max - min) + min).toFixed(decimals));

const pick = (arr, n) => arr[((n % arr.length) + arr.length) % arr.length];

const subcatCode = (name) =>
  name
    .replace(/[^A-Za-z\s]/g, '')
    .split(/\s+/)[0]
    .slice(0, 3)
    .toUpperCase();

const DEPT_CODE = {
  Men: 'MEN',
  Women: 'WOM',
  Kids: 'KID',
  Footwear: 'FTW',
  Accessories: 'ACC',
  Sportswear: 'SPT',
};

/** Appends size/quality query params so repeated base photos never resolve to an identical URL. */
function buildImageUrl(baseUrl, offset) {
  const w = 1000 + (offset % 5) * 40;
  const h = 1250 + (offset % 4) * 30;
  if (baseUrl.includes('images.pexels.com')) {
    return `${baseUrl}?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;
  }
  return `${baseUrl}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

function buildGallery(imageKey, productIndex, title) {
  const pool = IMAGE_BANK[imageKey];
  if (!pool || !pool.length) {
    throw new Error(`No images registered in IMAGE_BANK for key "${imageKey}" (product: ${title})`);
  }
  const count = randInt(4, Math.min(6, Math.max(4, pool.length >= 6 ? 6 : pool.length + 2)));
  const images = [];
  for (let i = 0; i < count; i++) {
    const base = pick(pool, productIndex + i * 3);
    const url = buildImageUrl(base, productIndex * 5 + i);
    images.push({ url, alt: `${title} — image ${i + 1}`, order: i, publicId: null });
  }
  return images;
}

// ---------------------------------------------------------------------------
// Category tree: upsert Men/Women/Kids/Footwear/Accessories/Sportswear and
// their sub-categories, mirroring the parentId/ancestors materialised-path
// shape the Category model already uses.
// ---------------------------------------------------------------------------

async function seedCategories(db) {
  const categories = db.collection('categories');
  const now = new Date().toISOString();
  const idBySlugPath = {}; // `${Department}::${Subcategory}` -> category id

  let created = 0;
  let updated = 0;

  for (let deptIndex = 0; deptIndex < CATEGORY_TREE.length; deptIndex++) {
    const dept = CATEGORY_TREE[deptIndex];
    const deptSlug = slugify(dept.name);
    const deptId = `cat_${deptSlug}`;
    const deptImageKey = {
      Men: 'mens_shirt',
      Women: 'womens_dress',
      Kids: 'kids_boys',
      Footwear: 'sneakers',
      Accessories: 'watches',
      Sportswear: 'gymwear',
    }[dept.name];

    const deptDoc = {
      id: deptId,
      name: dept.name,
      slug: deptSlug,
      description: `${dept.name} fashion — browse the full ${dept.name.toLowerCase()} collection.`,
      imageUrl: buildImageUrl(IMAGE_BANK[deptImageKey][0], deptIndex),
      isActive: true,
      parentId: null,
      ancestors: [],
      depth: 0,
      sortOrder: deptIndex,
      created_at: now,
    };

    const deptResult = await categories.updateOne(
      { slug: deptSlug },
      { $set: deptDoc, $setOnInsert: {} },
      { upsert: true },
    );
    if (deptResult.upsertedCount) created++; else updated++;
    console.log(`  ${deptResult.upsertedCount ? '+' : '~'} category: ${dept.name}`);

    for (let subIndex = 0; subIndex < dept.subcategories.length; subIndex++) {
      const subName = dept.subcategories[subIndex];
      const subSlug = `${deptSlug}-${slugify(subName)}`;
      const subId = `cat_${subSlug}`;
      const imageKey = subcategoryImageKey(dept.name, subName);

      const subDoc = {
        id: subId,
        name: subName,
        slug: subSlug,
        description: `${subName} for ${dept.name.toLowerCase()}.`,
        imageUrl: buildImageUrl(IMAGE_BANK[imageKey][0], deptIndex * 10 + subIndex),
        isActive: true,
        parentId: deptId,
        ancestors: [deptId],
        depth: 1,
        sortOrder: subIndex,
        created_at: now,
      };

      const subResult = await categories.updateOne(
        { slug: subSlug },
        { $set: subDoc },
        { upsert: true },
      );
      if (subResult.upsertedCount) created++; else updated++;
      console.log(`    ${subResult.upsertedCount ? '+' : '~'} sub-category: ${dept.name} > ${subName}`);

      idBySlugPath[`${dept.name}::${subName}`] = subId;
    }
  }

  console.log(`Categories ready (${created} created, ${updated} already existed).`);
  return idBySlugPath;
}

// Maps a product's (category, subcategory) to the IMAGE_BANK key used above.
function subcategoryImageKey(category, subcategory) {
  const table = {
    'Men::T-Shirts': 'mens_tshirt',
    'Men::Shirts': 'mens_shirt',
    'Men::Polo Shirts': 'mens_polo',
    'Men::Hoodies': 'mens_hoodie',
    'Men::Jackets': 'mens_jacket',
    'Men::Jeans': 'mens_jeans',
    'Men::Chinos': 'mens_chinos',
    'Men::Shorts': 'mens_shorts',
    'Men::Blazers': 'mens_blazer',
    'Men::Suits': 'mens_suit',
    'Women::Dresses': 'womens_dress',
    'Women::Tops': 'womens_top',
    'Women::T-Shirts': 'womens_tshirt',
    'Women::Shirts': 'womens_shirt',
    'Women::Hoodies': 'womens_hoodie',
    'Women::Sweaters': 'womens_sweater',
    'Women::Jackets': 'womens_jacket',
    'Women::Jeans': 'womens_jeans',
    'Women::Skirts': 'womens_skirt',
    'Women::Pants': 'womens_pants',
    'Women::Leggings': 'womens_leggings',
    'Kids::Boys Clothing': 'kids_boys',
    'Kids::Girls Clothing': 'kids_girls',
    'Kids::Baby Wear': 'kids_baby',
    'Footwear::Sneakers': 'sneakers',
    'Footwear::Running Shoes': 'running_shoes',
    'Footwear::Boots': 'boots',
    'Footwear::Sandals': 'sandals',
    'Footwear::Heels': 'heels',
    'Footwear::Flats': 'flats',
    'Footwear::Loafers': 'loafers',
    'Accessories::Watches': 'watches',
    'Accessories::Sunglasses': 'sunglasses',
    'Accessories::Caps': 'caps',
    'Accessories::Handbags': 'handbags',
    'Accessories::Wallets': 'wallets',
    'Accessories::Belts': 'belts',
    'Accessories::Backpacks': 'backpacks',
    'Accessories::Scarves': 'scarves',
    'Accessories::Jewelry': 'jewelry',
    'Accessories::Socks': 'socks',
    'Sportswear::Gym Wear': 'gymwear',
    'Sportswear::Track Pants': 'trackpants',
    'Sportswear::Sports T-Shirts': 'sportstshirt',
    'Sportswear::Sports Shoes': 'sportsshoes',
  };
  const key = table[`${category}::${subcategory}`];
  if (!key) throw new Error(`No image key mapping for ${category} > ${subcategory}`);
  return key;
}

// ---------------------------------------------------------------------------
// Product enrichment: turns a compact PRODUCTS row into a full document.
// ---------------------------------------------------------------------------

function buildProductDocs(categoryIdByPath) {
  const skuCounters = {};
  const usedSlugs = new Set();
  const docs = [];

  PRODUCTS.forEach((p, index) => {
    const categoryId = categoryIdByPath[`${p.category}::${p.subcategory}`];
    if (!categoryId) throw new Error(`Unresolved category for product "${p.title}"`);

    const deptCode = DEPT_CODE[p.category];
    const subCode = subcatCode(p.subcategory);
    const counterKey = `${deptCode}-${subCode}`;
    skuCounters[counterKey] = (skuCounters[counterKey] || 0) + 1;
    const sku = `${counterKey}-${String(skuCounters[counterKey]).padStart(4, '0')}`;

    let slug = slugify(`${p.title}-${p.brand}`);
    if (usedSlugs.has(slug)) slug = `${slug}-${index}`;
    usedSlugs.add(slug);

    const images = buildGallery(p.imageKey, index, p.title);
    const stock = randInt(10, 150);
    const rating = randFloat(3.8, 5.0, 1);
    const reviewCount = randInt(12, 640);
    const hasOffer = p.discountPrice > 0;

    // Spread creation dates across the last ~270 days so listings look
    // organically accumulated rather than all seeded in the same instant.
    const daysAgo = randInt(0, 270);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    docs.push({
      // ---- Back-compat fields the existing Product model/service/frontend read ----
      id: genId('prod'),
      name: p.title,
      description: p.description,
      price: p.price,
      discountPrice: p.discountPrice,
      hasOffer,
      imageUrl: images[0].url,
      stock,
      images,
      tags: Array.from(new Set([...p.tags, slugify(p.brand)])),
      attributes: {
        brand: p.brand,
        gender: p.gender,
        color: p.color,
        availableColors: p.availableColors,
        availableSizes: p.availableSizes,
        material: p.material,
        sku,
        slug,
        shortDescription: p.shortDescription,
        category: p.category,
        subcategory: p.subcategory,
        rating,
        reviewCount,
      },
      seo: { metaTitle: p.title, metaDescription: p.shortDescription, slug, ogImage: images[0].url },
      status: 'published',
      lowStockThreshold: 5,
      category_id: categoryId,
      isActive: true,
      createdAt,

      // ---- Rich fashion fields requested for the admin panel (top-level so
      // they're visible on any `.lean()` read, matching how getProducts()/
      // getProductById() already query this collection) ----
      title: p.title,
      slug,
      sku,
      shortDescription: p.shortDescription,
      category: p.category,
      subcategory: p.subcategory,
      brand: p.brand,
      gender: p.gender,
      color: p.color,
      availableColors: p.availableColors,
      availableSizes: p.availableSizes,
      material: p.material,
      thumbnail: images[0].url,
      rating,
      reviewCount,
      featured: false, // computed below
      newArrival: false, // computed below
      bestSeller: false, // computed below

      // ---- Seed bookkeeping (lets this script find & replace its own data) ----
      seedSource: SEED_SOURCE,
      seedIndex: index,
    });
  });

  applyMerchandisingFlags(docs);
  return docs;
}

/** Featured ~15%, best-seller ~20%, new-arrival ~25% (newest createdAt first). */
function applyMerchandisingFlags(docs) {
  const n = docs.length;

  const byRecency = [...docs.keys()].sort((a, b) => docs[b].createdAt - docs[a].createdAt);
  byRecency.slice(0, Math.round(n * 0.25)).forEach((i) => {
    docs[i].newArrival = true;
    docs[i].tags.push('new-arrival');
  });

  const shuffledForBestSeller = shuffle([...docs.keys()]);
  shuffledForBestSeller.slice(0, Math.round(n * 0.2)).forEach((i) => {
    docs[i].bestSeller = true;
    docs[i].tags.push('best-seller');
  });

  const shuffledForFeatured = shuffle([...docs.keys()]);
  shuffledForFeatured.slice(0, Math.round(n * 0.15)).forEach((i) => {
    docs[i].featured = true;
    docs[i].tags.push('featured');
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run() {
  if (!MONGO_URI) throw new Error('MONGODB_URI is not set (check backend-epasal/.env).');

  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected.');
  const db = mongoose.connection.db;

  console.log('\nSeeding category tree (Men / Women / Kids / Footwear / Accessories / Sportswear)...');
  const categoryIdByPath = await seedCategories(db);

  console.log('\nRemoving products from a previous run of this seed script...');
  const deleteResult = await db.collection('products').deleteMany({ seedSource: SEED_SOURCE });
  console.log(`  - removed ${deleteResult.deletedCount} previously-seeded product(s).`);

  console.log('\nBuilding product catalogue...');
  const docs = buildProductDocs(categoryIdByPath);

  console.log(`\nInserting ${docs.length} products...`);
  let inserted = 0;
  const perCategory = {};
  for (const doc of docs) {
    await db.collection('products').insertOne(doc);
    inserted++;
    const key = `${doc.category} > ${doc.subcategory}`;
    perCategory[key] = (perCategory[key] || 0) + 1;
    console.log(`  + [${key}] ${doc.title} (${doc.sku}) — $${doc.price}${doc.hasOffer ? ` -> $${doc.discountPrice}` : ''}`);
  }

  console.log('\nProducts per sub-category:');
  Object.entries(perCategory).forEach(([key, count]) => console.log(`  ${key}: ${count}`));

  const featuredCount = docs.filter((d) => d.featured).length;
  const bestSellerCount = docs.filter((d) => d.bestSeller).length;
  const newArrivalCount = docs.filter((d) => d.newArrival).length;

  console.log('\n================ Seed summary ================');
  console.log(`Total products inserted : ${inserted}`);
  console.log(`Featured                : ${featuredCount}`);
  console.log(`Best sellers            : ${bestSellerCount}`);
  console.log(`New arrivals            : ${newArrivalCount}`);
  console.log('================================================');

  await mongoose.disconnect();
  console.log('\nDone. MongoDB connection closed.');
}

run().catch((err) => {
  console.error('\nFashion catalogue seeding failed:', err.message);
  process.exit(1);
});
