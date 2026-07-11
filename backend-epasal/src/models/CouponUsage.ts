import mongoose, { Schema, Document } from 'mongoose';

/**
 * CouponUsage
 * One document per successful coupon redemption. This is the source of truth
 * for per-user usage limits, usage analytics, and abuse prevention.
 *
 * `userKey` is a stable, normalized identifier for the redeeming customer:
 *   - the authenticated user id when available, otherwise
 *   - the normalized email, otherwise
 *   - the normalized phone number.
 * Keying on this lets us enforce per-user limits even for guest checkouts.
 */
export interface ICouponUsageDocument extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  userKey: string;
  userId: string | null;
  email: string | null;
  phone: string | null;
  orderId: string;
  discountAmount: number;
  used_at: string;
}

const CouponUsageSchema = new Schema<ICouponUsageDocument>(
  {
    code: { type: String, required: true, uppercase: true, trim: true, index: true },
    userKey: { type: String, required: true, index: true },
    userId: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    orderId: { type: String, required: true },
    discountAmount: { type: Number, default: 0 },
    used_at: { type: String, required: true },
  },
  { timestamps: false, versionKey: false }
);

// Fast per-user limit lookups (how many times has this userKey used this code).
CouponUsageSchema.index({ code: 1, userKey: 1 });
// Prevent the same order from being counted twice (idempotent redemption / abuse guard).
CouponUsageSchema.index({ code: 1, orderId: 1 }, { unique: true });

export const CouponUsage = mongoose.model<ICouponUsageDocument>('CouponUsage', CouponUsageSchema);

/**
 * Build the stable per-user key from the best identifier available.
 * Returns null when no identifier can be derived (then per-user limits can't apply).
 */
export function buildUserKey(input: {
  userId?: string | null;
  user_id?: string | null;
  email?: string | null;
  phone?: string | number | null;
}): string | null {
  const userId = input.userId || input.user_id;
  if (userId && String(userId).trim()) return `uid:${String(userId).trim()}`;
  if (input.email && String(input.email).trim()) return `email:${String(input.email).trim().toLowerCase()}`;
  if (input.phone !== undefined && input.phone !== null && String(input.phone).trim()) {
    return `phone:${String(input.phone).replace(/\D/g, '')}`;
  }
  return null;
}
