import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { ICreateProductBody, IProductQuery } from '../types';
import { generateId } from '../utils/generateId';
import { NotFoundError } from '../utils/errors';
import { safePagination, buildPaginationMeta } from '../utils/pagination';

export class ProductService {
  /**
   * Apply the optional per-product sale window at read time. If a product has an
   * offer but its sale window (saleStartDate/saleEndDate) is set and the current
   * time falls outside it, the offer is reported as inactive so the storefront
   * shows the normal price. Products without a window are unaffected.
   */
  private applyOfferWindow<T extends Record<string, any>>(product: T): T {
    if (!product || !product.hasOffer) return product;
    const now = Date.now();
    const start = product.saleStartDate ? new Date(product.saleStartDate).getTime() : null;
    const end = product.saleEndDate ? new Date(product.saleEndDate).getTime() : null;
    const active = (start === null || now >= start) && (end === null || now <= end);
    return active ? product : { ...product, hasOffer: false };
  }

  /**
   * Get all products with pagination and filters
   */
  async getProducts(query: IProductQuery) {
    const {
      search,
      hasOffer,
      minPrice,
      maxPrice,
      isActive,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    // Contract: query params are camelCase (`categoryId`). `category_id` is
    // still honoured for internal callers (getProductsByCategory).
    const category_id = (query as any).categoryId || query.category_id;

    // Defensive: clamp page/limit and never divide by zero below.
    const { page, limit, skip } = safePagination({ page: query.page, limit: query.limit });

    const filter: any = {};

    if (search && typeof search === 'string' && search.trim()) {
      filter.$text = { $search: search.trim() };
    }
    if (category_id) {
      // categoryId may be a top-level department (e.g. "cat_men") under which
      // products are never directly tagged — only its subcategory leaves are
      // (e.g. "cat_men-jeans"). Expand to the whole subtree so picking a
      // department in the storefront filter actually returns its products.
      const descendantIds = await Category.find({ ancestors: category_id }).distinct('id');
      filter.category_id = descendantIds.length > 0
        ? { $in: [category_id, ...descendantIds] }
        : category_id;
    }
    if (hasOffer !== undefined) filter.hasOffer = hasOffer;
    if (isActive !== undefined) filter.isActive = isActive;

    // Price range applies to the EFFECTIVE price: discountPrice when an
    // active offer exists, otherwise the base price. (The old code filtered
    // on a non-existent `afterPrice` field and always returned 0 results.)
    const min = minPrice !== undefined && Number.isFinite(Number(minPrice)) ? Number(minPrice) : null;
    const max = maxPrice !== undefined && Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : null;
    if (min !== null || max !== null) {
      const effectivePrice = {
        $cond: [
          { $and: [{ $eq: ['$hasOffer', true] }, { $gt: ['$discountPrice', 0] }] },
          '$discountPrice',
          '$price',
        ],
      };
      const conds: any[] = [];
      if (min !== null) conds.push({ $gte: [effectivePrice, min] });
      if (max !== null) conds.push({ $lte: [effectivePrice, max] });
      filter.$expr = conds.length === 1 ? conds[0] : { $and: conds };
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean()
        .select('-_id -__v'),
      Product.countDocuments(filter),
    ]);

    return {
      // Always return an array — never null/undefined — so the frontend can
      // safely call `.map` without a guard.
      products: Array.isArray(products) ? products.map((p) => this.applyOfferWindow(p)) : [],
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string) {
    const product = await Product.findOne({ id }).lean().select('-_id -__v');

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return this.applyOfferWindow(product);
  }

  /**
   * Create new product
   */
  async createProduct(data: ICreateProductBody, imageUrl?: string) {
    const id = generateId('prod');
    const created_at = new Date().toISOString();

    const productData = {
      id,
      ...data,
      imageUrl: imageUrl || data.imageUrl || null,
      created_at,
    };

    const product = await Product.create(productData);
    return product.toObject({ versionKey: false, transform: (_doc, ret) => {
      const obj = ret as any;
      delete obj._id;
      return obj;
    }});
  }

  /**
   * Update product
   */
  async updateProduct(id: string, data: Partial<ICreateProductBody>, imageUrl?: string) {
    const product = await Product.findOne({ id });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (imageUrl) {
      (data as any).imageUrl = imageUrl;
    }

    Object.assign(product, data);
    await product.save();

    return product.toObject({ versionKey: false, transform: (_doc, ret) => {
      delete (ret as any)._id;
      return ret;
    }});
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string) {
    const product = await Product.findOneAndDelete({ id });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return { message: 'Product deleted successfully' };
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: string, query: IProductQuery) {
    return this.getProducts({ ...query, category_id: categoryId });
  }

  /**
   * Get products with offers
   */
  async getProductsWithOffers(query: IProductQuery) {
    return this.getProducts({ ...query, hasOffer: true });
  }
}

export default new ProductService();
