/**
 * Downloadable sample templates for each bulk-upload entity.
 * Column names here ARE the contract — the parser camelCases headers, so
 * "Sale Price"/"sale_price" in admin-edited files still map correctly.
 */

export interface BulkTemplate {
  filename: string;
  columns: string[];
  sampleRows: string[][];
  notes: string;
}

export const BULK_TEMPLATES: Record<string, BulkTemplate> = {
  categories: {
    filename: 'categories-template.csv',
    columns: ['name', 'slug', 'description', 'imageUrl', 'imageFile', 'isActive', 'kind', 'startDate', 'endDate', 'discountPercent'],
    sampleRows: [
      ['Electronics', 'electronics', 'Phones, laptops and gadgets', 'https://example.com/electronics.jpg', '', 'true', 'regular', '', '', ''],
      ['Dashain Mega Sale', 'dashain-mega-sale', 'Festival discounts', '', 'dashain-banner.png', 'true', 'sale', '2026-09-20', '2026-10-15', '25'],
    ],
    notes: 'kind=regular creates a normal category; kind=sale creates a sale/seasonal category. slug optional (auto from name). imageFile = filename inside the uploaded images ZIP.',
  },
  products: {
    filename: 'products-template.csv',
    columns: ['name', 'slug', 'description', 'price', 'stock', 'categorySlug', 'imageUrl', 'imageFile', 'salePrice', 'discountPercent', 'saleStart', 'saleEnd', 'tags', 'isActive'],
    sampleRows: [
      ['Wireless Mouse', 'wireless-mouse', 'Ergonomic 2.4G mouse', '1500', '40', 'electronics', 'https://example.com/mouse.jpg', '', '', '', '', '', 'accessories|office', 'true'],
      ['Gaming Keyboard', 'gaming-keyboard', 'RGB mechanical keyboard', '6500', '25', 'electronics', '', 'keyboard.png', '4999', '', '2026-06-15', '2026-06-30', 'gaming', 'true'],
      ['Running Shoes', 'running-shoes', 'Lightweight road shoes', '4200', '60', 'footwear', '', '', '', '20', '', '', 'sports', 'true'],
    ],
    notes: 'Dates YYYY-MM-DD. Give salePrice OR discountPercent (salePrice wins). Sale fields set the product on offer; categorySlug is auto-created if missing. Upsert key: slug.',
  },
  banners: {
    filename: 'banners-template.csv',
    columns: ['title', 'subtitle', 'imageUrl', 'imageFile', 'linkUrl', 'position', 'displayOrder', 'isActive'],
    sampleRows: [
      ['Summer Sale Hero', 'Up to 50% off', 'https://example.com/hero1.jpg', '', '/sale/summer-sale', 'hero', '0', 'true'],
      ['Free Shipping Strip', 'On orders above Rs. 5000', '', 'strip.png', '', 'strip', '0', 'true'],
    ],
    notes: 'position: hero (homepage carousel), promo (mid-page), strip (thin bar). Upsert key: title.',
  },
  'seasonal-sales': {
    filename: 'seasonal-sales-template.csv',
    columns: ['name', 'slug', 'description', 'bannerUrl', 'bannerFile', 'startDate', 'endDate', 'discountPercent', 'productSlugs', 'categorySlugs', 'season', 'priority', 'ctaLabel', 'ctaUrl', 'isActive'],
    sampleRows: [
      ['Winter Warmers', 'winter-warmers', 'Cozy season deals', 'https://example.com/winter.jpg', '', '2026-12-01', '2027-01-15', '30', 'wireless-mouse|gaming-keyboard', 'footwear', 'winter', '5', 'Shop Winter Deals', '/sale/winter-warmers', 'true'],
    ],
    notes: 'productSlugs and categorySlugs are pipe-separated; categorySlugs pulls in every active product of those categories. discountPercent applies to all listed products. Upsert key: slug.',
  },
};

const csvEscape = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export const templateAsCsv = (t: BulkTemplate): string =>
  [t.columns.join(','), ...t.sampleRows.map((r) => r.map(csvEscape).join(','))].join('\n') + '\n';

export const templateAsJson = (t: BulkTemplate): object => ({
  notes: t.notes,
  rows: t.sampleRows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i] ?? '']))),
});
