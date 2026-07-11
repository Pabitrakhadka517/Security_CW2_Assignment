import mongoose, { Schema, Document } from 'mongoose';

export type SaleSeason = 'dashain' | 'tihar' | 'new_year' | 'summer' | 'winter';

export interface ISaleCategoryProduct {
  product_id: string;
  discount_percentage: number;
  display_order: number;
  stock_limit: number | null;
  badge_label: string | null;
}

export interface ISaleCategory {
  id: string;
  title: string;
  slug: string;
  banner: string | null;
  description: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;             // higher = shown first on the homepage
  cta_label: string | null;     // call-to-action button text
  cta_url: string | null;       // redirect URL for the CTA
  products: ISaleCategoryProduct[];
  season: SaleSeason | null;
  badge_label: string | null;   // e.g. "DASHAIN OFFER"
  badge_color: string | null;   // e.g. "#E85D04"
  created_at: string;
}

export interface ISaleCategoryDocument extends Document {
  _id: mongoose.Types.ObjectId;
  id: string;
  title: string;
  slug: string;
  banner: string | null;
  description: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  cta_label: string | null;
  cta_url: string | null;
  products: ISaleCategoryProduct[];
  season: SaleSeason | null;
  badge_label: string | null;
  badge_color: string | null;
  created_at: string;
}

const SaleCategorySchema = new Schema<ISaleCategoryDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    banner: { type: String, default: null },
    description: { type: String, default: null },
    is_active: { type: Boolean, default: true, index: true },
    start_date: { type: String, default: null },
    end_date: { type: String, default: null },
    priority: { type: Number, default: 0, index: true },
    cta_label: { type: String, default: null },
    cta_url: { type: String, default: null },
    products: {
      type: [
        {
          product_id: { type: String, required: true },
          discount_percentage: { type: Number, required: true, min: 0, max: 100 },
          display_order: { type: Number, default: 0 },
          stock_limit: { type: Number, default: null },
          badge_label: { type: String, default: null },
        },
      ],
      default: [],
    },
    season: {
      type: String,
      enum: ['dashain', 'tihar', 'new_year', 'summer', 'winter', null],
      default: null,
      index: true,
    },
    badge_label: { type: String, default: null },
    badge_color: { type: String, default: null },
    created_at: { type: String, required: true },
  },
  { timestamps: false, versionKey: false }
);

SaleCategorySchema.index({ is_active: 1, start_date: 1, end_date: 1 });
SaleCategorySchema.index({ is_active: 1, priority: -1 });
SaleCategorySchema.index({ season: 1, is_active: 1 });

export const SaleCategory = mongoose.model<ISaleCategoryDocument>('SaleCategory', SaleCategorySchema);
