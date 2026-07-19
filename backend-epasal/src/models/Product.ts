import mongoose, { Schema, Document } from 'mongoose';
import { IProduct } from '../types';
import { stripHtml } from '../utils/sanitizeHtml';

/**
 * Product model — production-grade catalogue document.
 *
 * Compatibility note:
 *   The legacy top-level fields `price`, `discountPrice`, `hasOffer`,
 *   `imageUrl`, `stock`, and `isActive` are RETAINED so existing data and
 *   call-sites keep working unchanged. The new fields are additive:
 *     - `images[]`        → multiple ordered images (legacy `imageUrl` is
 *                            still the cover image / first image fallback)
 *     - `variants[]`      → SKU-level rows with their own price/stock
 *     - `tags[]`          → free-form tags for filtering
 *     - `attributes`      → free-form key/value spec sheet (Map)
 *     - `seo`             → SEO meta fields
 *     - `status`          → draft / published / archived state machine
 *                            (legacy `isActive` is kept in sync by the
 *                            service layer: published+!archived → true)
 *     - `lowStockThreshold` → product-level low-stock alert threshold;
 *                            variants can override per-row.
 *
 * If `variants[]` is empty, the product is single-SKU and reads use the
 * top-level price/stock fields. If `variants[]` is non-empty, the variants
 * are authoritative and the top-level fields are derived (min price, total
 * stock) by the service for back-compat.
 */

const ProductImageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    order: { type: Number, default: 0 },
    publicId: { type: String, default: null },
  },
  { _id: false },
);

const ProductVariantSchema = new Schema(
  {
    id: { type: String, required: true },
    sku: { type: String, required: true },
    // `options` is a free-form map: { size: 'L', color: 'Red', material: 'cotton', ... }
    // We deliberately use Mixed instead of a fixed shape so retailers can add
    // any axis without a schema migration.
    options: { type: Schema.Types.Mixed, default: {} },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: null },
    imageUrl: { type: String, default: null }, // optional variant-specific image
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const SeoSchema = new Schema(
  {
    metaTitle: { type: String, default: null },
    metaDescription: { type: String, default: null },
    slug: { type: String, default: null, index: true, sparse: true },
    ogImage: { type: String, default: null },
  },
  { _id: false },
);

export interface IProductDocument extends Omit<IProduct, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const ProductSchema = new Schema<IProductDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
      set: stripHtml,
    },
    description: {
      type: String,
      default: null,
      set: stripHtml,
    },

    // ---- Legacy single-SKU pricing (kept for back-compat) -----------------
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 },
    hasOffer: { type: Boolean, default: false, index: true },
    // ---- Optional per-product sale scheduling ----------------------------
    // When set, the offer is only "active" within this window (enforced at read
    // time by the product service). Null dates mean the offer is always on while
    // hasOffer is true.
    saleStartDate: { type: String, default: null },
    saleEndDate: { type: String, default: null },
    imageUrl: { type: String, default: null }, // cover/legacy image
    stock: { type: Number, default: 0 },

    // ---- New: multi-image gallery ----------------------------------------
    images: { type: [ProductImageSchema], default: [] },

    // ---- New: variants (one row per SKU combination) ---------------------
    variants: { type: [ProductVariantSchema], default: [] },

    // ---- New: classification & search aids -------------------------------
    tags: { type: [String], default: [], index: true },
    attributes: { type: Schema.Types.Mixed, default: {} }, // free-form spec sheet

    // ---- New: SEO metadata ----------------------------------------------
    seo: { type: SeoSchema, default: () => ({}) },

    // ---- New: lifecycle --------------------------------------------------
    // `status` is the source of truth. `isActive` is mirrored from it so
    // existing query paths (filter by isActive) keep working.
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },

    // ---- New: low-stock alert threshold (product-level fallback) ----------
    lowStockThreshold: { type: Number, default: 5 },

    category_id: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

// Compound indexes for the most common admin queries.
ProductSchema.index({ isActive: 1, createdAt: -1 });
ProductSchema.index({ category_id: 1, isActive: 1 });
ProductSchema.index({ hasOffer: 1, isActive: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });
// tags and seo.slug indexes already created by index:true on the field definitions above
ProductSchema.index({ 'variants.sku': 1 }, { sparse: true });
// Full-text search across name + description + tags.
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Product = mongoose.model<IProductDocument>('Product', ProductSchema);
