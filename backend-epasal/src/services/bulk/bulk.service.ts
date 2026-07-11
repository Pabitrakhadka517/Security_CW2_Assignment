import { Category } from '../../models/Category';
import { Product } from '../../models/Product';
import { Banner } from '../../models/Banner';
import { SaleCategory } from '../../models/SaleCategory';
import { generateId } from '../../utils/generateId';
import { generateSlug } from '../../utils/slugGenerator';
import { ParsedFile, requireColumns } from './parse';
import { resolveRowImage } from './images';

/**
 * Bulk upload services — one processor per entity.
 *
 * Contract (Global Rule 4): atomic PER ROW. Valid rows are upserted, invalid
 * rows are reported with field-level errors; one bad row never aborts the
 * batch, and a row is only written after ALL its validations passed.
 * Every processor returns the universal report consumed by the admin UI.
 */

export interface BulkRowError {
  row: number; // spreadsheet row number (header = row 1, first data row = 2)
  field: string;
  value: string;
  message: string;
}

export interface BulkReport {
  summary: { totalRows: number; inserted: number; updated: number; skipped: number; failed: number };
  errors: BulkRowError[];
  insertedIds: string[];
  updatedIds: string[];
}

const newReport = (totalRows: number): BulkReport => ({
  summary: { totalRows, inserted: 0, updated: 0, skipped: 0, failed: 0 },
  errors: [],
  insertedIds: [],
  updatedIds: [],
});

export const summarize = (r: BulkReport): string => {
  const s = r.summary;
  return `Processed ${s.totalRows} rows: ${s.inserted} inserted, ${s.updated} updated, ${s.skipped} skipped, ${s.failed} failed`;
};

// ── Field coercers — each returns a value or pushes an error ────────────────

type Err = (field: string, value: string, message: string) => void;

const reqStr = (row: Record<string, string>, field: string, err: Err): string | null => {
  const v = (row[field] ?? '').trim();
  if (!v) { err(field, '', `${field} is required`); return null; }
  return v;
};

const optBool = (row: Record<string, string>, field: string, dflt: boolean, err: Err): boolean => {
  const v = (row[field] ?? '').trim().toLowerCase();
  if (!v) return dflt;
  if (['true', '1', 'yes'].includes(v)) return true;
  if (['false', '0', 'no'].includes(v)) return false;
  err(field, row[field], `${field} must be true or false`);
  return dflt;
};

const numVal = (row: Record<string, string>, field: string, opts: { required?: boolean; min?: number; max?: number; integer?: boolean }, err: Err): number | null => {
  const raw = (row[field] ?? '').trim();
  if (!raw) {
    if (opts.required) err(field, '', `${field} is required`);
    return null;
  }
  const n = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(n)) { err(field, raw, `${field} must be a number`); return null; }
  if (opts.integer && !Number.isInteger(n)) { err(field, raw, `${field} must be a whole number`); return null; }
  if (opts.min !== undefined && n < opts.min) { err(field, raw, `${field} must be ≥ ${opts.min}`); return null; }
  if (opts.max !== undefined && n > opts.max) { err(field, raw, `${field} must be ≤ ${opts.max}`); return null; }
  return n;
};

/** YYYY-MM-DD (date) or YYYY-MM-DD HH:mm (datetime) → Date, else error. */
const dateVal = (row: Record<string, string>, field: string, required: boolean, err: Err): Date | null => {
  const raw = (row[field] ?? '').trim();
  if (!raw) {
    if (required) err(field, '', `${field} is required (format YYYY-MM-DD)`);
    return null;
  }
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})([ T](\d{2}):(\d{2}))?$/);
  if (!m) { err(field, raw, `${field} must be YYYY-MM-DD or YYYY-MM-DD HH:mm`); return null; }
  const d = new Date(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    m[5] !== undefined ? Number(m[5]) : 0,
    m[6] !== undefined ? Number(m[6]) : 0,
  );
  if (isNaN(d.getTime()) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
    err(field, raw, `${field} is not a valid calendar date`);
    return null;
  }
  return d;
};

const pipeList = (row: Record<string, string>, field: string): string[] =>
  (row[field] ?? '').split('|').map((s) => s.trim()).filter(Boolean);

// ── Shared row loop ─────────────────────────────────────────────────────────

interface RowCtx {
  row: Record<string, string>;
  rowNo: number;
  report: BulkReport;
  err: Err;
  zipIndex: Map<string, Buffer> | null;
}

const processRows = async (
  parsed: ParsedFile,
  zipIndex: Map<string, Buffer> | null,
  handler: (ctx: RowCtx) => Promise<void>
): Promise<BulkReport> => {
  const report = newReport(parsed.rows.length);
  for (let i = 0; i < parsed.rows.length; i++) {
    const rowNo = i + 2;
    const before = report.errors.length;
    const err: Err = (field, value, message) => report.errors.push({ row: rowNo, field, value: String(value ?? ''), message });
    try {
      await handler({ row: parsed.rows[i], rowNo, report, err, zipIndex });
      if (report.errors.length > before) report.summary.failed++;
    } catch (e: any) {
      // Unexpected per-row failure (image fetch, DB write, …) — report, move on.
      err('row', '', e?.message || 'Unexpected error processing this row');
      report.summary.failed++;
    }
  }
  return report;
};

// ════════════════════════════════════════════════════════════════════════════
// 1. CATEGORIES  (kind=regular → Category, kind=sale → SaleCategory)
// ════════════════════════════════════════════════════════════════════════════

export const bulkCategories = async (parsed: ParsedFile, zipIndex: Map<string, Buffer> | null): Promise<BulkReport> => {
  requireColumns(parsed, ['name']);
  const seen = new Set<string>();

  return processRows(parsed, zipIndex, async ({ row, report, err, zipIndex }) => {
    const errsBefore = report.errors.length;
    const name = reqStr(row, 'name', err);
    const kindRaw = (row.kind || 'regular').trim().toLowerCase();
    if (!['regular', 'sale'].includes(kindRaw)) err('kind', row.kind, 'kind must be "regular" or "sale"');
    const isActive = optBool(row, 'isActive', true, err);
    const description = (row.description ?? '').trim() || (name ?? '');
    const slug = (row.slug ?? '').trim().toLowerCase() || (name ? generateSlug(name) : '');

    // sale-kind extras
    const start = dateVal(row, 'startDate', false, err);
    const end = dateVal(row, 'endDate', false, err);
    if (start && end && end <= start) err('endDate', row.endDate, 'endDate must be after startDate');
    const discountPercent = numVal(row, 'discountPercent', { min: 0, max: 100 }, err);

    if (report.errors.length > errsBefore || !name) return;

    const dupKey = `${kindRaw}:${slug}`;
    if (seen.has(dupKey)) { err('slug', slug, `Duplicate ${kindRaw} category slug "${slug}" within file — row skipped`); report.summary.failed--; report.summary.skipped++; return; }
    seen.add(dupKey);

    const imageUrl = await resolveRowImage({ imageUrl: row.imageUrl, imageFile: row.imageFile, zipIndex, folder: 'categories' });

    if (kindRaw === 'sale') {
      const existing = await SaleCategory.findOne({ slug });
      if (existing) {
        existing.title = name;
        if (description) (existing as any).description = description;
        if (imageUrl) (existing as any).banner = imageUrl;
        (existing as any).is_active = isActive;
        if (start) (existing as any).start_date = start.toISOString();
        if (end) (existing as any).end_date = end.toISOString();
        await existing.save();
        report.summary.updated++; report.updatedIds.push(existing.id);
      } else {
        const doc = await SaleCategory.create({
          id: generateId('sale'),
          title: name,
          slug,
          description,
          banner: imageUrl || null,
          is_active: isActive,
          start_date: start ? start.toISOString() : null,
          end_date: end ? end.toISOString() : null,
          products: [],
          created_at: new Date().toISOString(),
          ...(discountPercent !== null ? { default_discount_percentage: discountPercent } : {}),
        } as any);
        report.summary.inserted++; report.insertedIds.push(doc.id);
      }
      return;
    }

    const existing = await Category.findOne({ slug });
    if (existing) {
      existing.name = name;
      (existing as any).description = description;
      if (imageUrl) (existing as any).imageUrl = imageUrl;
      (existing as any).isActive = isActive;
      await existing.save();
      report.summary.updated++; report.updatedIds.push(existing.id);
    } else {
      const doc = await Category.create({
        id: generateId('cat'),
        name,
        slug,
        description,
        imageUrl: imageUrl || null,
        isActive,
        created_at: new Date().toISOString(),
      } as any);
      report.summary.inserted++; report.insertedIds.push(doc.id);
    }
  });
};

// ════════════════════════════════════════════════════════════════════════════
// 2. PRODUCTS  (upsert by slug → seo.slug; categories auto-created)
// ════════════════════════════════════════════════════════════════════════════

export const bulkProducts = async (parsed: ParsedFile, zipIndex: Map<string, Buffer> | null): Promise<BulkReport> => {
  requireColumns(parsed, ['name', 'price', 'stock', 'categorySlug']);
  const seen = new Set<string>();
  const categoryCache = new Map<string, string>(); // slug → category id

  const resolveCategory = async (slug: string): Promise<string> => {
    const key = slug.toLowerCase();
    if (categoryCache.has(key)) return categoryCache.get(key)!;
    let cat = await Category.findOne({ slug: key });
    if (!cat) cat = await Category.findOne({ name: new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!cat) {
      // Confirmed behavior: auto-create missing categories.
      const pretty = key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      cat = await Category.create({
        id: generateId('cat'),
        name: pretty,
        slug: key,
        description: pretty,
        imageUrl: null,
        isActive: true,
        created_at: new Date().toISOString(),
      } as any);
    }
    categoryCache.set(key, cat.id);
    return cat.id;
  };

  return processRows(parsed, zipIndex, async ({ row, report, err, zipIndex }) => {
    const errsBefore = report.errors.length;
    const name = reqStr(row, 'name', err);
    const price = numVal(row, 'price', { required: true, min: 0.01 }, err);
    const stock = numVal(row, 'stock', { required: true, min: 0, integer: true }, err);
    const categorySlug = reqStr(row, 'categorySlug', err);
    const isActive = optBool(row, 'isActive', true, err);
    const slug = (row.slug ?? '').trim().toLowerCase() || (name ? generateSlug(name) : '');

    // ── Sale fields ──────────────────────────────────────────────────────────
    const salePriceRaw = numVal(row, 'salePrice', { min: 0.01 }, err);
    const discountPercent = numVal(row, 'discountPercent', { min: 0, max: 100 }, err);
    const saleStart = dateVal(row, 'saleStart', false, err);
    const saleEnd = dateVal(row, 'saleEnd', false, err);
    if (saleStart && saleEnd && saleEnd <= saleStart) err('saleEnd', row.saleEnd, 'saleEnd must be after saleStart');

    let salePrice: number | null = salePriceRaw;
    if (salePrice === null && discountPercent !== null && discountPercent > 0 && price !== null) {
      salePrice = Math.round(price * (1 - discountPercent / 100));
    }
    if (salePrice !== null && price !== null && salePrice >= price) {
      err('salePrice', String(salePrice), `salePrice (${salePrice}) must be lower than price (${price})`);
    }
    if ((saleStart || saleEnd) && salePrice === null) {
      err('salePrice', '', 'saleStart/saleEnd given but no salePrice or discountPercent');
    }

    if (report.errors.length > errsBefore || !name || price === null || stock === null || !categorySlug) return;

    if (seen.has(slug)) { err('slug', slug, `Duplicate product slug "${slug}" within file — row skipped`); report.summary.failed--; report.summary.skipped++; return; }
    seen.add(slug);

    const category_id = await resolveCategory(categorySlug);
    const imageUrl = await resolveRowImage({ imageUrl: row.imageUrl, imageFile: row.imageFile, zipIndex, folder: 'products' });
    const tags = pipeList(row, 'tags');

    const saleFields = salePrice !== null
      ? {
          discountPrice: salePrice,
          hasOffer: true,
          saleStartDate: saleStart ? saleStart.toISOString() : null,
          saleEndDate: saleEnd ? saleEnd.toISOString() : null,
        }
      : { discountPrice: 0, hasOffer: false, saleStartDate: null, saleEndDate: null };

    const existing = await Product.findOne({ 'seo.slug': slug });
    if (existing) {
      Object.assign(existing, {
        name,
        description: (row.description ?? '').trim() || existing.description,
        price,
        stock,
        category_id,
        isActive,
        ...(tags.length ? { tags } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...saleFields,
      });
      await existing.save();
      report.summary.updated++; report.updatedIds.push(existing.id);
    } else {
      const doc = await Product.create({
        id: generateId('prod'),
        name,
        description: (row.description ?? '').trim() || null,
        price,
        stock,
        category_id,
        imageUrl: imageUrl || null,
        isActive,
        status: 'published',
        tags,
        seo: { slug },
        createdAt: new Date(),
        ...saleFields,
      } as any);
      report.summary.inserted++; report.insertedIds.push(doc.id);
    }
  });
};

// ════════════════════════════════════════════════════════════════════════════
// 3. BANNERS  (upsert by title)
// ════════════════════════════════════════════════════════════════════════════

export const bulkBanners = async (parsed: ParsedFile, zipIndex: Map<string, Buffer> | null): Promise<BulkReport> => {
  requireColumns(parsed, ['title']);
  const seen = new Set<string>();

  return processRows(parsed, zipIndex, async ({ row, report, err, zipIndex }) => {
    const errsBefore = report.errors.length;
    const title = reqStr(row, 'title', err);
    if (title && title.length < 3) err('title', title, 'title must be at least 3 characters');
    const isActive = optBool(row, 'isActive', true, err);
    const displayOrder = numVal(row, 'displayOrder', { min: 0, integer: true }, err) ?? 0;
    const positionRaw = (row.position || 'hero').trim().toLowerCase();
    if (!['hero', 'promo', 'strip'].includes(positionRaw)) err('position', row.position, 'position must be hero, promo or strip');
    if (!(row.imageUrl ?? '').trim() && !(row.imageFile ?? '').trim()) {
      err('imageUrl', '', 'Banner needs an imageUrl or imageFile');
    }
    if (report.errors.length > errsBefore || !title) return;

    const key = title.toLowerCase();
    if (seen.has(key)) { err('title', title, `Duplicate banner title "${title}" within file — row skipped`); report.summary.failed--; report.summary.skipped++; return; }
    seen.add(key);

    const imageUrl = await resolveRowImage({ imageUrl: row.imageUrl, imageFile: row.imageFile, zipIndex, folder: 'banners' });

    const existing = await Banner.findOne({ title: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (existing) {
      Object.assign(existing, {
        subtitle: (row.subtitle ?? '').trim() || (existing as any).subtitle,
        ...(imageUrl ? { imageUrl } : {}),
        linkUrl: (row.linkUrl ?? '').trim() || null,
        position: positionRaw,
        displayOrder,
        isActive,
      });
      await existing.save();
      report.summary.updated++; report.updatedIds.push(existing.id);
    } else {
      const doc = await Banner.create({
        id: generateId('banner'),
        title,
        subtitle: (row.subtitle ?? '').trim() || null,
        imageUrl,
        linkUrl: (row.linkUrl ?? '').trim() || null,
        position: positionRaw,
        displayOrder,
        isActive,
        created_at: new Date().toISOString(),
      } as any);
      report.summary.inserted++; report.insertedIds.push(doc.id);
    }
  });
};

// ════════════════════════════════════════════════════════════════════════════
// 4. SEASONAL SALES  (SaleCategory; upsert by slug)
// ════════════════════════════════════════════════════════════════════════════

export const bulkSeasonalSales = async (parsed: ParsedFile, zipIndex: Map<string, Buffer> | null): Promise<BulkReport> => {
  requireColumns(parsed, ['name', 'startDate', 'endDate', 'discountPercent']);
  const seen = new Set<string>();

  return processRows(parsed, zipIndex, async ({ row, report, err, zipIndex }) => {
    const errsBefore = report.errors.length;
    const name = reqStr(row, 'name', err);
    const start = dateVal(row, 'startDate', true, err);
    const end = dateVal(row, 'endDate', true, err);
    if (start && end && end <= start) err('endDate', row.endDate, 'endDate must be after startDate');
    const discountPercent = numVal(row, 'discountPercent', { required: true, min: 0, max: 100 }, err);
    const priority = numVal(row, 'priority', { min: 0, integer: true }, err) ?? 0;
    const isActive = optBool(row, 'isActive', true, err);
    const slug = (row.slug ?? '').trim().toLowerCase() || (name ? generateSlug(name) : '');
    const season = (row.season ?? '').trim().toLowerCase() || null;
    if (season && !['dashain', 'tihar', 'new_year', 'summer', 'winter'].includes(season)) {
      err('season', row.season, 'season must be one of dashain, tihar, new_year, summer, winter');
    }

    const productSlugs = pipeList(row, 'productSlugs');
    const categorySlugs = pipeList(row, 'categorySlugs');

    if (report.errors.length > errsBefore || !name || !start || !end || discountPercent === null) return;

    if (seen.has(slug)) { err('slug', slug, `Duplicate seasonal-sale slug "${slug}" within file — row skipped`); report.summary.failed--; report.summary.skipped++; return; }
    seen.add(slug);

    // Resolve linked products: explicit slugs + every product of listed categories.
    const productIds = new Set<string>();
    for (const ps of productSlugs) {
      const p = await Product.findOne({ $or: [{ 'seo.slug': ps.toLowerCase() }, { id: ps }] }).select('id');
      if (!p) { err('productSlugs', ps, `Product "${ps}" not found`); continue; }
      productIds.add(p.id);
    }
    for (const cs of categorySlugs) {
      const c = await Category.findOne({ slug: cs.toLowerCase() }).select('id');
      if (!c) { err('categorySlugs', cs, `Category "${cs}" not found`); continue; }
      const prods = await Product.find({ category_id: c.id, isActive: true }).select('id');
      prods.forEach((p) => productIds.add(p.id));
    }
    if (report.errors.length > errsBefore) return; // bad references fail the row

    const banner = await resolveRowImage({ imageUrl: row.bannerUrl, imageFile: row.bannerFile, zipIndex, folder: 'sale-banners' });
    const products = [...productIds].map((pid, i) => ({
      product_id: pid,
      discount_percentage: discountPercent,
      display_order: i,
      stock_limit: null,
      badge_label: null,
    }));

    const payload: any = {
      title: name,
      description: (row.description ?? '').trim() || null,
      is_active: isActive,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      priority,
      season,
      cta_label: (row.ctaLabel ?? '').trim() || null,
      cta_url: (row.ctaUrl ?? '').trim() || null,
      products,
      ...(banner ? { banner } : {}),
    };

    const existing = await SaleCategory.findOne({ slug });
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      report.summary.updated++; report.updatedIds.push(existing.id);
    } else {
      const doc = await SaleCategory.create({
        id: generateId('sale'),
        slug,
        created_at: new Date().toISOString(),
        ...payload,
      });
      report.summary.inserted++; report.insertedIds.push(doc.id);
    }
  });
};
