import mongoose, { Schema, Document } from 'mongoose';

export interface ICouponDocument extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  apply_on: 'cart' | 'product' | 'category';
  applicable_products: string[];
  applicable_categories: string[];
  validFrom: string | Date;
  validTo: string | Date;
  usage_limit: number | null;       // Global usage limit (null = unlimited)
  usage_count: number;              // Global redemptions so far
  per_user_limit: number | null;    // Per-user limit: 1 = single use, N = N uses, null = unlimited per user
  max_discount_cap: number | null;  // Rs. ceiling for percentage coupons (null = no cap)
  min_order_amount: number;
  isActive: boolean;
  created_at: string;
}

const CouponSchema = new Schema<ICouponDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: null },
    discount_type: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
    discount_value: { type: Number, required: true, min: 0 },
    apply_on: { type: String, enum: ['cart', 'product', 'category'], default: 'cart' },
    applicable_products: { type: [String], default: [] },
    applicable_categories: { type: [String], default: [] },
    validFrom: { type: Schema.Types.Mixed, required: true },
    validTo: { type: Schema.Types.Mixed, required: true },
    usage_limit: { type: Number, default: null },
    usage_count: { type: Number, default: 0 },
    per_user_limit: { type: Number, default: null },
    max_discount_cap: { type: Number, default: null },
    min_order_amount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    created_at: { type: String, required: true },
  },
  { timestamps: false, versionKey: false }
);

CouponSchema.index({ isActive: 1, validTo: 1 });
CouponSchema.index({ code: 1, isActive: 1 });

export const Coupon = mongoose.model<ICouponDocument>('Coupon', CouponSchema);
