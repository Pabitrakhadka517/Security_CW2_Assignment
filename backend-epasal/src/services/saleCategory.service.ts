import { SaleCategory, ISaleCategoryProduct } from '../models/SaleCategory';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { generateId } from '../utils/generateId';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import { safePagination, buildPaginationMeta } from '../utils/pagination';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export class SaleCategoryService {
  async getAll(query: any) {
    const { page, limit, skip } = safePagination({ page: query.page, limit: query.limit });
    const filter: any = {};
    if (query.is_active !== undefined) filter.is_active = query.is_active === 'true' || query.is_active === true;

    const [items, total] = await Promise.all([
      SaleCategory.find(filter).sort({ priority: -1, created_at: -1 }).skip(skip).limit(limit).lean().select('-_id -__v'),
      SaleCategory.countDocuments(filter),
    ]);
    return { items: Array.isArray(items) ? items : [], pagination: buildPaginationMeta(page, limit, total) };
  }

  async getActive() {
    const now = new Date().toISOString();
    const items = await SaleCategory.find({
      is_active: true,
      $or: [
        { start_date: null },
        { start_date: { $lte: now } },
      ],
      $and: [
        { $or: [{ end_date: null }, { end_date: { $gte: now } }] },
      ],
    }).sort({ priority: -1, created_at: -1 }).lean().select('-_id -__v');
    return Array.isArray(items) ? items : [];
  }

  async getBySlug(slug: string): Promise<any> {
    const sale = await SaleCategory.findOne({ slug }).lean().select('-_id -__v');
    if (!sale) throw new NotFoundError('Sale category not found');

    // Live status — products are always listed (the sale is a browsable
    // collection/folder), but sale prices only apply while the sale is live.
    const nowIso = new Date().toISOString();
    let status: 'live' | 'upcoming' | 'ended' | 'inactive' = 'live';
    if (!sale.is_active) status = 'inactive';
    else if (sale.start_date && sale.start_date > nowIso) status = 'upcoming';
    else if (sale.end_date && sale.end_date < nowIso) status = 'ended';
    const is_live = status === 'live';

    // Hydrate products
    const productIds = sale.products.map((p) => p.product_id);
    const products = productIds.length
      ? await Product.find({ id: { $in: productIds }, isActive: true }).lean().select('-_id -__v')
      : [];

    const productMap: Record<string, any> = {};
    products.forEach((p: any) => { productMap[p.id] = p; });

    const hydratedProducts = sale.products
      .map((sp) => {
        const p = productMap[sp.product_id];
        if (!p) return null;
        const originalPrice = p.price;
        // Outside the live window the discount does NOT apply — expose the
        // regular price so the storefront never advertises a price checkout
        // would refuse.
        const discountedPrice = is_live
          ? Math.round(originalPrice * (1 - sp.discount_percentage / 100))
          : originalPrice;
        return {
          ...p,
          discount_percentage: is_live ? sp.discount_percentage : 0,
          original_price: originalPrice,
          sale_price: discountedPrice,
        };
      })
      .filter(Boolean);

    return {
      ...sale,
      is_live,
      status,
      // How many products the admin attached vs how many are actually
      // resolvable (existing + active). Lets the storefront distinguish
      // "no products attached" from "products attached but unavailable".
      configured_products: sale.products.length,
      unresolved_products: sale.products.length - hydratedProducts.length,
      products: hydratedProducts,
    };
  }

  async getById(id: string) {
    const sale = await SaleCategory.findOne({ id }).lean().select('-_id -__v');
    if (!sale) throw new NotFoundError('Sale category not found');
    return sale;
  }

  async create(data: any) {
    const id = generateId('sale');
    const slug = data.slug || slugify(data.title);
    const created_at = new Date().toISOString();

    const existing = await SaleCategory.findOne({ $or: [{ slug }, { title: data.title }] });
    if (existing) throw new ConflictError('Sale category with this title/slug already exists');

    const sale = await SaleCategory.create({
      id,
      slug,
      created_at,
      title: data.title,
      banner: data.banner || null,
      description: data.description || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      priority: typeof data.priority === 'number' ? data.priority : 0,
      cta_label: data.cta_label || null,
      cta_url: data.cta_url || null,
      products: Array.isArray(data.products) ? data.products : [],
      season: data.season || null,
      badge_label: data.badge_label || null,
      badge_color: data.badge_color || null,
    });
    return sale.toObject({ versionKey: false, transform: (_doc, ret) => { delete (ret as any)._id; return ret; } });
  }

  async update(id: string, data: any) {
    const sale = await SaleCategory.findOne({ id });
    if (!sale) throw new NotFoundError('Sale category not found');

    if (data.title && data.title !== sale.title) {
      const slug = data.slug || slugify(data.title);
      const conflict = await SaleCategory.findOne({ slug, id: { $ne: id } });
      if (conflict) throw new ConflictError('Slug already in use');
      sale.slug = slug;
      sale.title = data.title;
    }
    if (data.banner !== undefined) sale.banner = data.banner;
    if (data.description !== undefined) sale.description = data.description;
    if (data.is_active !== undefined) sale.is_active = data.is_active;
    if (data.start_date !== undefined) sale.start_date = data.start_date;
    if (data.end_date !== undefined) sale.end_date = data.end_date;
    if (data.priority !== undefined) sale.priority = data.priority;
    if (data.cta_label !== undefined) sale.cta_label = data.cta_label;
    if (data.cta_url !== undefined) sale.cta_url = data.cta_url;
    if (Array.isArray(data.products)) sale.products = data.products;
    if (data.season !== undefined) sale.season = data.season;
    if (data.badge_label !== undefined) sale.badge_label = data.badge_label;
    if (data.badge_color !== undefined) sale.badge_color = data.badge_color;
    await sale.save();
    return sale.toObject({ versionKey: false, transform: (_doc, ret) => { delete (ret as any)._id; return ret; } });
  }

  async delete(id: string) {
    const sale = await SaleCategory.findOneAndDelete({ id });
    if (!sale) throw new NotFoundError('Sale category not found');
    return { message: 'Sale category deleted' };
  }

  async setProducts(id: string, products: ISaleCategoryProduct[]) {
    const sale = await SaleCategory.findOne({ id });
    if (!sale) throw new NotFoundError('Sale category not found');
    if (!Array.isArray(products)) throw new BadRequestError('Products must be an array');
    sale.products = products;
    await sale.save();
    return sale.toObject({ versionKey: false, transform: (_doc, ret) => { delete (ret as any)._id; return ret; } });
  }

  /**
   * Returns aggregated homepage data:
   *  - activeSaleCategories: each active sale category with top-8 products hydrated
   *  - featuredProducts: products flagged isFeatured (up to 12)
   *  - categories: all active categories
   */
  async getHomepage(): Promise<{ activeSaleCategories: any[]; featuredProducts: any[]; categories: any[] }> {
    const now = new Date().toISOString();

    // 1. Active sale categories (same filter as getActive)
    const activeSales = await SaleCategory.find({
      is_active: true,
      $or: [{ start_date: null }, { start_date: { $lte: now } }],
      $and: [{ $or: [{ end_date: null }, { end_date: { $gte: now } }] }],
    })
      .sort({ priority: -1, created_at: -1 })
      .lean()
      .select('-_id -__v');

    // 2. Hydrate top-8 products per sale category (sorted by display_order asc)
    const hydratedSales = await Promise.all(
      activeSales.map(async (sale) => {
        const sortedProductEntries = [...sale.products].sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
        );
        const top8 = sortedProductEntries.slice(0, 8);
        const productIds = top8.map((sp) => sp.product_id);

        const dbProducts = productIds.length
          ? await Product.find({ id: { $in: productIds }, isActive: true }).lean().select('-_id -__v')
          : [];

        const productMap: Record<string, any> = {};
        (dbProducts as any[]).forEach((p) => { productMap[p.id] = p; });

        const hydratedProducts = top8
          .map((sp) => {
            const p = productMap[sp.product_id];
            if (!p) return null;
            const sale_price = Math.round(p.price * (1 - sp.discount_percentage / 100));
            return {
              ...p,
              discount_percentage: sp.discount_percentage,
              original_price: p.price,
              sale_price,
              display_order: sp.display_order ?? 0,
              stock_limit: sp.stock_limit ?? null,
              badge_label: sp.badge_label ?? null,
            };
          })
          .filter(Boolean);

        return { ...sale, products: hydratedProducts };
      })
    );

    // 3. Featured products (isFeatured flag — fall back to hasOffer if isFeatured doesn't exist)
    // Product model uses `hasOffer` as the featured-like boolean; use it as the proxy.
    const featuredProducts = await (Product as any)
      .find({ isActive: true, status: 'published' })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean()
      .select('-_id -__v');

    // 4. Active categories
    const categories = await Category.find({ isActive: true }).lean().select('-_id -__v');

    return {
      activeSaleCategories: hydratedSales,
      featuredProducts: Array.isArray(featuredProducts) ? featuredProducts : [],
      categories: Array.isArray(categories) ? categories : [],
    };
  }

  /**
   * Bulk-adds every active product that belongs to `categoryId` into the
   * sale category identified by `saleId`.  Existing entries are kept; new
   * ones are appended (deduplicated by product_id).
   */
  async addProductsByCategory(
    saleId: string,
    categoryId: string,
    discountPercentage: number
  ) {
    const sale = await SaleCategory.findOne({ id: saleId });
    if (!sale) throw new NotFoundError('Sale category not found');

    // Product model uses category_id for the foreign key
    const products = await Product.find({ category_id: categoryId, isActive: true })
      .lean()
      .select('id');

    if (!products.length) {
      throw new BadRequestError('No active products found for the given category');
    }

    const existingIds = new Set(sale.products.map((p) => p.product_id));
    let nextOrder =
      sale.products.length
        ? Math.max(...sale.products.map((p) => p.display_order ?? 0)) + 1
        : 0;

    for (const product of products as any[]) {
      if (!existingIds.has(product.id)) {
        sale.products.push({
          product_id: product.id,
          discount_percentage: discountPercentage,
          display_order: nextOrder++,
          stock_limit: null,
          badge_label: null,
        });
        existingIds.add(product.id);
      }
    }

    await sale.save();
    return sale.toObject({ versionKey: false, transform: (_doc, ret) => { delete (ret as any)._id; return ret; } });
  }
}

export default new SaleCategoryService();
