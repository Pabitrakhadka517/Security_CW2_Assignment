import { Coupon } from '../models/Coupon';
import { CouponUsage, buildUserKey } from '../models/CouponUsage';
import { ICreateCouponBody } from '../types';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { safePagination, buildPaginationMeta } from '../utils/pagination';

export interface ICouponValidationContext {
  cartTotal?: number;
  productIds?: string[];
  categoryIds?: string[];
  // Identity used for per-user limit enforcement
  userId?: string | null;
  email?: string | null;
  phone?: string | number | null;
}

export class CouponService {
  /** Attach computed usage fields (remaining global usage) to a coupon object. */
  private decorate(coupon: any) {
    const usage_limit = coupon.usage_limit ?? null;
    const usage_count = coupon.usage_count ?? 0;
    const remaining = usage_limit === null ? null : Math.max(0, usage_limit - usage_count);
    return { ...coupon, remaining };
  }

  async getCoupons(query: any) {
    const { sortBy = 'created_at', order = 'desc' } = query;
    const { page, limit, skip } = safePagination({ page: query.page, limit: query.limit });
    const sortOrder = order === 'asc' ? 1 : -1;
    const [coupons, total] = await Promise.all([
      Coupon.find().sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean().select('-_id -__v'),
      Coupon.countDocuments(),
    ]);
    const decorated = (Array.isArray(coupons) ? coupons : []).map((c) => this.decorate(c));
    return { coupons: decorated, pagination: buildPaginationMeta(page, limit, total) };
  }

  async getCouponByCode(code: string) {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() }).lean().select('-_id -__v');
    if (!coupon) throw new NotFoundError('Coupon not found');
    return this.decorate(coupon);
  }

  async createCoupon(data: ICreateCouponBody) {
    const existing = await Coupon.findOne({ code: data.code.toUpperCase() });
    if (existing) throw new ConflictError('Coupon code already exists');
    const validFrom = new Date(data.validFrom);
    const validTo = new Date(data.validTo);
    if (validTo <= validFrom) throw new BadRequestError('Valid to date must be after valid from date');

    const coupon = await Coupon.create({
      ...data,
      code: data.code.toUpperCase(),
      discount_type: data.discount_type || 'fixed',
      apply_on: data.apply_on || 'cart',
      applicable_products: data.applicable_products || [],
      applicable_categories: data.applicable_categories || [],
      usage_count: 0,
      per_user_limit: data.per_user_limit === undefined ? null : data.per_user_limit,
      created_at: new Date().toISOString(),
    });
    return coupon.toObject({ versionKey: false, transform: (_doc, ret) => { delete (ret as any)._id; return ret; } });
  }

  async updateCoupon(code: string, data: Partial<ICreateCouponBody>) {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) throw new NotFoundError('Coupon not found');
    if (data.code && data.code.toUpperCase() !== code.toUpperCase()) {
      const exists = await Coupon.findOne({ code: data.code.toUpperCase() });
      if (exists) throw new ConflictError('Coupon code already exists');
      data.code = data.code.toUpperCase();
    }
    if (data.validFrom || data.validTo) {
      const vf = new Date(data.validFrom || coupon.validFrom);
      const vt = new Date(data.validTo || coupon.validTo);
      if (vt <= vf) throw new BadRequestError('Valid to must be after valid from');
    }
    Object.assign(coupon, data);
    await coupon.save();
    return coupon.toObject({ versionKey: false, transform: (_doc, ret) => { delete (ret as any)._id; return ret; } });
  }

  async deleteCoupon(code: string) {
    const coupon = await Coupon.findOneAndDelete({ code: code.toUpperCase() });
    if (!coupon) throw new NotFoundError('Coupon not found');
    // Clean up usage records so re-created codes start fresh.
    await CouponUsage.deleteMany({ code: code.toUpperCase() });
    return { message: 'Coupon deleted successfully' };
  }

  /**
   * How many times a given user (by userKey) has redeemed this coupon.
   */
  async getUserUsageCount(code: string, userKey: string): Promise<number> {
    if (!userKey) return 0;
    return CouponUsage.countDocuments({ code: code.toUpperCase(), userKey });
  }

  /**
   * Validate coupon with full context. Checks (in order):
   *  - existence, active status
   *  - expiry window (validFrom / validTo)
   *  - global usage limit (usage_count vs usage_limit)
   *  - per-user usage limit (CouponUsage count vs per_user_limit)
   *  - minimum purchase amount
   *  - product / category scope
   * Returns the computed discount amount plus per-user usage info.
   */
  async validateCoupon(code: string, context?: ICouponValidationContext) {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() }).lean();
    if (!coupon) throw new NotFoundError('Coupon not found');
    if (!coupon.isActive) throw new BadRequestError('Coupon is not active');

    const now = new Date();
    if (now < new Date(coupon.validFrom)) throw new BadRequestError('Coupon is not yet valid');
    if (now > new Date(coupon.validTo)) throw new BadRequestError('Coupon has expired');

    // Global usage limit
    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && coupon.usage_count >= coupon.usage_limit) {
      throw new BadRequestError('Coupon usage limit reached');
    }

    // Per-user usage limit
    const userKey = buildUserKey({
      userId: context?.userId ?? null,
      email: context?.email ?? null,
      phone: context?.phone ?? null,
    });
    let userUsage = 0;
    const perUserLimit = coupon.per_user_limit ?? null;
    if (perUserLimit !== null) {
      if (!userKey) {
        // Coupon restricted per user but we cannot identify the customer — require sign-in / contact info.
        throw new BadRequestError('Please sign in or provide your email to use this coupon');
      }
      userUsage = await this.getUserUsageCount(coupon.code, userKey);
      if (userUsage >= perUserLimit) {
        throw new BadRequestError(
          perUserLimit === 1
            ? 'You have already used this coupon'
            : `You have reached the usage limit (${perUserLimit}) for this coupon`
        );
      }
    }

    const cartTotal = context?.cartTotal || 0;
    if (coupon.min_order_amount && cartTotal < coupon.min_order_amount) {
      throw new BadRequestError(`Minimum order amount of Rs. ${coupon.min_order_amount} required`);
    }

    // Scope check
    if (coupon.apply_on === 'product') {
      const productIds = context?.productIds || [];
      const applicable = coupon.applicable_products || [];
      if (applicable.length && !productIds.some(id => applicable.includes(id))) {
        throw new BadRequestError('This coupon is not applicable to your cart products');
      }
    }
    if (coupon.apply_on === 'category') {
      const categoryIds = context?.categoryIds || [];
      const applicable = coupon.applicable_categories || [];
      if (applicable.length && !categoryIds.some(id => applicable.includes(id))) {
        throw new BadRequestError('This coupon is not applicable to your cart categories');
      }
    }

    // Compute discount amount (respecting max_discount_cap for percentage coupons)
    let discountAmount: number;
    const maxCap = (coupon as any).max_discount_cap ?? null;
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.round(cartTotal * coupon.discount_value / 100);
      if (maxCap !== null && maxCap > 0) discountAmount = Math.min(discountAmount, maxCap);
    } else {
      discountAmount = coupon.discount_value;
    }
    if (cartTotal > 0 && discountAmount > cartTotal) discountAmount = cartTotal;

    return {
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_discount_cap: maxCap,
      discountAmount,
      apply_on: coupon.apply_on,
      applicable_products: coupon.applicable_products ?? [],
      applicable_categories: coupon.applicable_categories ?? [],
      per_user_limit: perUserLimit,
      user_usage_count: userUsage,
      user_remaining: perUserLimit === null ? null : Math.max(0, perUserLimit - userUsage),
    };
  }

  /**
   * Record a successful redemption: writes a CouponUsage row and increments the
   * global counter atomically. Idempotent per (code, orderId) via the unique index,
   * so retries / duplicate calls for the same order never double-count.
   */
  async recordUsage(
    code: string,
    info: { userId?: string | null; email?: string | null; phone?: string | number | null; orderId: string; discountAmount: number }
  ) {
    const upperCode = code.toUpperCase();
    const userKey = buildUserKey({ userId: info.userId ?? null, email: info.email ?? null, phone: info.phone ?? null }) || 'anon';
    try {
      await CouponUsage.create({
        code: upperCode,
        userKey,
        userId: info.userId ?? null,
        email: info.email ? String(info.email).toLowerCase() : null,
        phone: info.phone !== undefined && info.phone !== null ? String(info.phone) : null,
        orderId: info.orderId,
        discountAmount: info.discountAmount || 0,
        used_at: new Date().toISOString(),
      });
    } catch (err: any) {
      // Duplicate (code, orderId) — already recorded, do not increment again.
      if (err?.code === 11000) return;
      throw err;
    }
    await Coupon.updateOne({ code: upperCode }, { $inc: { usage_count: 1 } });
  }

  /** Legacy helper kept for backwards compatibility (no per-user tracking). */
  async incrementUsage(code: string) {
    await Coupon.updateOne({ code: code.toUpperCase() }, { $inc: { usage_count: 1 } });
  }

  /**
   * Analytics for a single coupon: global usage, remaining, unique users,
   * total discount given, and recent redemptions.
   */
  async getCouponAnalytics(code: string) {
    const upperCode = code.toUpperCase();
    const coupon = await Coupon.findOne({ code: upperCode }).lean().select('-_id -__v');
    if (!coupon) throw new NotFoundError('Coupon not found');

    const [totals, uniqueUsers, recent] = await Promise.all([
      CouponUsage.aggregate([
        { $match: { code: upperCode } },
        { $group: { _id: null, totalDiscount: { $sum: '$discountAmount' }, redemptions: { $sum: 1 } } },
      ]),
      CouponUsage.distinct('userKey', { code: upperCode }),
      CouponUsage.find({ code: upperCode }).sort({ used_at: -1 }).limit(10).lean().select('-_id -__v'),
    ]);

    const agg = totals[0] || { totalDiscount: 0, redemptions: 0 };
    const usage_limit = coupon.usage_limit ?? null;
    return {
      code: coupon.code,
      isActive: coupon.isActive,
      usage_limit,
      usage_count: coupon.usage_count ?? 0,
      remaining: usage_limit === null ? null : Math.max(0, usage_limit - (coupon.usage_count ?? 0)),
      per_user_limit: coupon.per_user_limit ?? null,
      total_redemptions: agg.redemptions,
      unique_users: uniqueUsers.length,
      total_discount_given: agg.totalDiscount,
      recent_redemptions: recent,
    };
  }

  async getActiveCoupons() {
    const now = new Date().toISOString();
    const coupons = await Coupon.find({ isActive: true, validFrom: { $lte: now }, validTo: { $gte: now } })
      .sort({ created_at: -1 }).lean().select('-_id -__v');
    return Array.isArray(coupons) ? coupons.map((c) => this.decorate(c)) : [];
  }
}

export default new CouponService();
