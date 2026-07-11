import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { ICreateCategoryBody, IPaginationQuery } from '../types';
import { generateId } from '../utils/generateId';
import { generateSlug } from '../utils/slugGenerator';
import { NotFoundError, ConflictError } from '../utils/errors';
import { safePagination, buildPaginationMeta } from '../utils/pagination';

export class CategoryService {
  /**
   * Get all categories with pagination and filters
   */
  async getCategories(query: IPaginationQuery) {
    const { search, sortBy = 'created_at', order = 'desc' } = query;
    const { page, limit, skip } = safePagination({ page: query.page, limit: query.limit });

    const filter: any = {};
    if (search && typeof search === 'string' && search.trim()) {
      // Escape regex metacharacters so user input like "(test)" doesn't blow up
      // the BSON regex compiler.
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: safe, $options: 'i' };
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean()
        .select('-_id -__v'),
      Category.countDocuments(filter),
    ]);

    return {
      categories: Array.isArray(categories) ? categories : [],
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string) {
    const category = await Category.findOne({ id }).lean().select('-_id -__v');

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return category;
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string) {
    const category = await Category.findOne({ slug }).lean().select('-_id -__v');

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return category;
  }

  /**
   * Create new category.
   *
   * If `data.parentId` is supplied, we look the parent up, copy its
   * `ancestors` chain, and append the parent's id. This is the heart of the
   * materialised-path tree: a child stores the full chain so we can answer
   * subtree queries without recursion.
   */
  async createCategory(
    data: ICreateCategoryBody & { parentId?: string | null; sortOrder?: number },
    imageUrl?: string,
  ) {
    const id = generateId('cat');
    const slug = generateSlug(data.name);
    const created_at = new Date().toISOString();

    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      throw new ConflictError('Category with this name already exists');
    }

    // Resolve ancestor chain from the parent (if any).
    let ancestors: string[] = [];
    let depth = 0;
    let parentId: string | null = null;
    if (data.parentId) {
      const parent = await Category.findOne({ id: data.parentId }).lean();
      if (!parent) throw new NotFoundError('Parent category not found');
      ancestors = [...(parent.ancestors || []), parent.id];
      depth = ancestors.length;
      parentId = parent.id;
    }

    const categoryData = {
      id,
      ...data,
      slug,
      imageUrl: imageUrl || null,
      parentId,
      ancestors,
      depth,
      sortOrder: data.sortOrder ?? 0,
      created_at,
    };

    const category = await Category.create(categoryData);
    return category.toObject({ versionKey: false, transform: (_doc, ret) => {
      delete (ret as any)._id;
      return ret;
    }});
  }

  /**
   * Update category. Supports re-parenting, which is the tricky case: when a
   * category's parent changes, every descendant's `ancestors` chain must be
   * rewritten too. We do that in a single bulk update by replacing the old
   * prefix segment with the new one.
   *
   * Re-parenting is rejected if the target parent is the category itself or
   * one of its descendants (would create a cycle).
   */
  async updateCategory(
    id: string,
    data: Partial<ICreateCategoryBody> & { parentId?: string | null; sortOrder?: number },
    imageUrl?: string,
  ) {
    const category = await Category.findOne({ id });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Slug regen on rename.
    if (data.name && data.name !== category.name) {
      const newSlug = generateSlug(data.name);
      const existingCategory = await Category.findOne({ slug: newSlug, id: { $ne: id } });
      if (existingCategory) {
        throw new ConflictError('Category with this name already exists');
      }
      (data as any).slug = newSlug;
    }

    if (imageUrl) {
      (data as any).imageUrl = imageUrl;
    }

    // Re-parenting?  parentId === null means "move to root".
    const isReparenting = data.parentId !== undefined && data.parentId !== category.parentId;
    const oldAncestors: string[] = [...(category.ancestors || [])];

    let newAncestors: string[] | undefined;
    let newDepth: number | undefined;

    if (isReparenting) {
      if (data.parentId) {
        if (data.parentId === id) {
          throw new ConflictError('Category cannot be its own parent');
        }
        const target = await Category.findOne({ id: data.parentId }).lean();
        if (!target) throw new NotFoundError('Parent category not found');
        if ((target.ancestors || []).includes(id)) {
          throw new ConflictError('Cannot move category under one of its descendants');
        }
        newAncestors = [...(target.ancestors || []), target.id];
      } else {
        newAncestors = [];
      }
      newDepth = newAncestors.length;
    }

    Object.assign(category, data);
    if (newAncestors !== undefined) {
      category.ancestors = newAncestors;
      category.depth = newDepth!;
      category.parentId = data.parentId ?? null;
    }
    await category.save();

    // Cascade ancestor rewrite to every descendant.
    // Each descendant's chain currently looks like:
    //     [...oldAncestors, id, ...subTail]
    // After re-parenting we want it to look like:
    //     [...newAncestors!, id, ...subTail]
    // i.e. replace the prefix up-to-and-including this category's id.
    if (isReparenting && newAncestors) {
      const descendants = await Category.find({ ancestors: id }).select('id ancestors depth -_id');
      const prefixLen = oldAncestors.length + 1; // +1 for `id` itself
      for (const desc of descendants) {
        const subTail = (desc.ancestors || []).slice(prefixLen);
        const nextChain = [...newAncestors, id, ...subTail];
        desc.ancestors = nextChain;
        desc.depth = nextChain.length;
        await desc.save();
      }
    }

    return category.toObject({ versionKey: false, transform: (_doc, ret) => {
      delete (ret as any)._id;
      return ret;
    }});
  }

  /**
   * Return the entire category tree as a nested structure, sorted by
   * `sortOrder` then name at every level. Good for an admin sidebar or a
   * storefront mega-menu. Active filter is optional so the admin UI can show
   * archived nodes too.
   */
  async getCategoryTree(opts: { activeOnly?: boolean } = {}) {
    const filter: any = {};
    if (opts.activeOnly) filter.isActive = true;
    const all = await Category.find(filter)
      .sort({ depth: 1, sortOrder: 1, name: 1 })
      .lean()
      .select('-_id -__v');

    const byId = new Map<string, any>();
    const roots: any[] = [];
    for (const c of all) byId.set(c.id, { ...c, children: [] });
    for (const c of all) {
      const node = byId.get(c.id);
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  /**
   * All descendants (any depth) of a given category. Useful for "products in
   * category X or any of its sub-categories" queries downstream.
   */
  async getDescendants(id: string) {
    const exists = await Category.exists({ id });
    if (!exists) throw new NotFoundError('Category not found');
    const list = await Category.find({ ancestors: id })
      .sort({ depth: 1, sortOrder: 1, name: 1 })
      .lean()
      .select('-_id -__v');
    return Array.isArray(list) ? list : [];
  }

  /**
   * Direct children of a category (or roots, when parentId is null).
   */
  async getChildren(parentId: string | null) {
    const list = await Category.find({ parentId })
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .select('-_id -__v');
    return Array.isArray(list) ? list : [];
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string) {
    const category = await Category.findOne({ id });
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Referential integrity: never orphan products or sub-categories.
    const [productCount, childCount] = await Promise.all([
      Product.countDocuments({ category_id: id }),
      Category.countDocuments({ parentId: id }),
    ]);
    if (productCount > 0) {
      throw new ConflictError(
        `Cannot delete: ${productCount} product${productCount === 1 ? '' : 's'} still belong to this category. Reassign or remove them first.`
      );
    }
    if (childCount > 0) {
      throw new ConflictError(
        `Cannot delete: ${childCount} sub-categor${childCount === 1 ? 'y' : 'ies'} still belong to this category. Remove them first.`
      );
    }

    await Category.deleteOne({ id });
    return { message: 'Category deleted successfully' };
  }

  /**
   * Get active top-level categories (departments only, no sub-categories).
   * Used by the storefront homepage category grid.
   */
  async getActiveCategories() {
    const categories = await Category.find({ isActive: true, parentId: null })
      .sort({ sortOrder: 1 })
      .lean()
      .select('-_id -__v');

    return Array.isArray(categories) ? categories : [];
  }
}

export default new CategoryService();
