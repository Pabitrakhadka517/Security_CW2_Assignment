import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { SaleCategory } from '../models/SaleCategory';
import { ICreateOrderBody, IOrderQuery } from '../types';
import { generateOrderId } from '../utils/generateId';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { safePagination, buildPaginationMeta } from '../utils/pagination';
import couponService from './coupon.service';
import {
  calculateOrderTotal,
  ResolvedItem,
  CouponDetails,
} from '../utils/priceCalculator';

export class OrderService {
  /**
   * Resolve the unit price for each cart item by checking (in priority order):
   *  1. Active sale category → originalPrice * (1 - discount_percentage / 100)
   *  2. Product-level discount (hasOffer) → discountPrice
   *  3. Original price
   *
   * Returns a ResolvedItem array ready for calculateOrderTotal().
   */
  async resolveItemPrices(
    rawItems: Array<{ productId: string; quantity: number }>
  ): Promise<{ resolved: ResolvedItem[]; productMap: Record<string, any> }> {
    const productIds = rawItems.map(i => i.productId);
    const now = new Date();
    const nowStr = now.toISOString();

    // 1. Fetch products
    const products = await Product.find({ id: { $in: productIds } }).lean();
    const productMap: Record<string, any> = {};
    (products as any[]).forEach(p => { productMap[p.id] = p; });

    // 2. Fetch active sale categories that contain any of these products
    const saleCategories = await SaleCategory.find({
      is_active: true,
      'products.product_id': { $in: productIds },
      $or:  [{ start_date: null }, { start_date: { $lte: nowStr } }],
      $and: [{ $or: [{ end_date: null }, { end_date: { $gte: nowStr } }] }],
    }).lean();

    // Build sale-price map: productId → lowest sale price across all active sales
    const salePriceMap: Record<string, number> = {};
    for (const sc of saleCategories as any[]) {
      for (const sp of sc.products ?? []) {
        if (!productIds.includes(sp.product_id)) continue;
        const prod = productMap[sp.product_id];
        if (!prod) continue;
        const salePrice = Math.round(prod.price * (1 - sp.discount_percentage / 100));
        if (salePriceMap[sp.product_id] === undefined || salePrice < salePriceMap[sp.product_id]) {
          salePriceMap[sp.product_id] = salePrice;
        }
      }
    }

    // 3. Resolve each item
    const resolved: ResolvedItem[] = rawItems.map(it => {
      const p = productMap[it.productId];
      if (!p) throw new BadRequestError(`Product not found: ${it.productId}`);
      if (p.isActive === false) throw new BadRequestError(`Product unavailable: ${p.name || it.productId}`);
      if (!Number.isInteger(it.quantity) || it.quantity < 1) throw new BadRequestError('Invalid quantity');

      const originalPrice = p.price as number;
      let resolvedPrice: number;
      let discountSource: ResolvedItem['discountSource'];

      if (salePriceMap[it.productId] !== undefined) {
        resolvedPrice   = salePriceMap[it.productId];
        discountSource  = 'sale_category';
      } else if (p.hasOffer && p.discountPrice > 0) {
        resolvedPrice   = p.discountPrice as number;
        discountSource  = 'product_discount';
      } else {
        resolvedPrice   = originalPrice;
        discountSource  = 'original';
      }

      return {
        productId:     it.productId,
        name:          p.name || it.productId,
        quantity:      it.quantity,
        originalPrice,
        resolvedPrice,
        discountSource,
        lineTotal:     resolvedPrice * it.quantity,
      };
    });

    return { resolved, productMap };
  }

  /**
   * Preview-only calculation — used by the frontend checkout page.
   * Does NOT create an order, does NOT check stock, does NOT record coupon usage.
   * Per-user coupon limits ARE checked when userId/email are provided.
   */
  async calculateTotal({
    cartItems,
    couponCode,
    userId,
    email,
    phone,
  }: {
    cartItems:  Array<{ productId: string; quantity: number }>;
    couponCode?: string;
    userId?:    string | null;
    email?:     string | null;
    phone?:     string | null;
  }) {
    if (!cartItems?.length) throw new BadRequestError('Cart is empty');

    const { resolved, productMap } = await this.resolveItemPrices(cartItems);
    const subtotal  = resolved.reduce((s, i) => s + i.lineTotal, 0);
    const productIds = cartItems.map(i => i.productId);
    const categoryIds = [
      ...new Set(
        (Object.values(productMap) as any[]).map(p => p.category_id).filter(Boolean)
      ),
    ] as string[];

    let couponDetails: CouponDetails | null = null;
    let couponError: string | null = null;

    if (couponCode?.trim()) {
      try {
        const result = await couponService.validateCoupon(couponCode.trim(), {
          cartTotal:   subtotal,
          productIds,
          categoryIds,
          userId:  userId  ?? null,
          email:   email   ?? null,
          phone:   phone   ?? null,
        });
        couponDetails = {
          code:                   result.code,
          discount_type:          result.discount_type,
          discount_value:         result.discount_value,
          max_discount_cap:       result.max_discount_cap,
          apply_on:               result.apply_on,
          applicable_products:    result.applicable_products,
          applicable_categories:  result.applicable_categories,
        };
      } catch (err: any) {
        couponError = err.message || 'Invalid coupon';
      }
    }

    const breakdown = calculateOrderTotal({ items: resolved, coupon: couponDetails });
    return { ...breakdown, couponError };
  }

  /**
   * Get all orders with pagination and filters
   */
  async getOrders(query: IOrderQuery) {
    const {
      status,
      userId,
      startDate,
      endDate,
      sortBy = 'created_at',
      order = 'desc',
    } = query;

    const { page, limit, skip } = safePagination({ page: query.page, limit: query.limit });

    const filter: any = {};
    if (status)              filter.status    = status;
    if (userId)              filter.user_id   = userId;
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) filter.created_at.$gte = startDate;
      if (endDate)   filter.created_at.$lte = endDate;
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip).limit(limit)
        .lean().select('-_id -__v'),
      Order.countDocuments(filter),
    ]);

    return {
      orders: Array.isArray(orders) ? orders : [],
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  /** Get order by ID */
  async getOrderById(id: string) {
    const order = await Order.findOne({ id }).lean().select('-_id -__v');
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  /**
   * Get a single order owned by the requesting user.
   * 404 (not 403) when the order belongs to someone else, so order ids
   * can't be probed for existence.
   */
  async getMyOrderById(id: string, userId: string) {
    const order = await Order.findOne({ id, user_id: userId }).lean().select('-_id -__v');
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  /**
   * Create a new order.
   * Server-side: re-derives all prices from DB, applies the shared pricing
   * formula, checks stock atomically, validates coupon, records usage.
   */
  /**
   * @param authUserId — the user id from a VERIFIED JWT (optionalAuth), or
   *                     null for guests. Client-supplied `user_id` in the
   *                     body is intentionally ignored: it allowed planting
   *                     orders into another user's history.
   */
  async createOrder(data: ICreateOrderBody, authUserId: string | null = null) {
    const id         = await generateOrderId();
    const created_at = new Date().toISOString();

    if (!data.items?.length) throw new BadRequestError('Order must have at least one item');

    // ── Resolve prices + stock check ──────────────────────────────────────
    const { resolved: resolvedItems, productMap } = await this.resolveItemPrices(data.items);

    for (const it of data.items) {
      const p         = productMap[it.productId];
      const available = typeof p?.stock === 'number' ? p.stock : 0;
      if (available < it.quantity) {
        throw new BadRequestError(
          available <= 0
            ? `${p?.name || 'Product'} is out of stock`
            : `Only ${available} left for ${p?.name || 'product'}`
        );
      }
    }

    // ── Coupon ────────────────────────────────────────────────────────────
    const productIds  = data.items.map(i => i.productId);
    const categoryIds = [
      ...new Set(
        (Object.values(productMap) as any[]).map(p => p.category_id).filter(Boolean)
      ),
    ] as string[];

    let couponDetails:        CouponDetails | null = null;
    let validatedCouponCode:  string | null        = null;

    if (data.couponCode?.trim()) {
      const subtotal = resolvedItems.reduce((s, i) => s + i.lineTotal, 0);
      const result   = await couponService.validateCoupon(data.couponCode, {
        cartTotal:   subtotal,
        productIds,
        categoryIds,
        userId:  authUserId     ?? null,
        email:   data.email     ?? null,
        phone:   data.phone     ?? null,
      });
      couponDetails = {
        code:                   result.code,
        discount_type:          result.discount_type,
        discount_value:         result.discount_value,
        max_discount_cap:       result.max_discount_cap,
        apply_on:               result.apply_on,
        applicable_products:    result.applicable_products,
        applicable_categories:  result.applicable_categories,
      };
      validatedCouponCode = result.code;
    }

    // ── Shared formula ────────────────────────────────────────────────────
    const breakdown = calculateOrderTotal({ items: resolvedItems, coupon: couponDetails });

    // Allow Rs. 1 rounding tolerance between client-sent total and server total
    if (data.totalAmount != null) {
      const diff = Math.abs(data.totalAmount - breakdown.total);
      if (diff > 1) {
        throw new BadRequestError(
          `Total mismatch: expected Rs. ${breakdown.total}, received Rs. ${data.totalAmount}. ` +
          'Please refresh and try again.'
        );
      }
    }
    if (breakdown.total < 0) throw new BadRequestError('Total amount must be ≥ 0');

    // Build the order document EXPLICITLY — never spread the raw client body.
    // Item name/price/image come from the server-resolved catalogue data, so a
    // tampered client can never store fake unit prices on the order.
    const orderData = {
      id,
      user_id:    authUserId ?? null,
      first_name: data.first_name ?? null,
      last_name:  data.last_name ?? null,
      name:       data.name,
      email:      data.email ?? null,
      phone:      data.phone,
      district:   data.district,
      city:       data.city,
      address:    data.address,
      description: data.description,
      // Validated against ['cod', 'esewa'] by createOrderSchema — never trust
      // this beyond what Joi already whitelisted.
      paymentMethod: data.paymentMethod === 'esewa' ? 'esewa' : 'cod',
      paymentStatus: 'pending',
      items: resolvedItems.map(ri => ({
        productId: ri.productId,
        name:      ri.name,
        price:     ri.resolvedPrice,
        quantity:  ri.quantity,
        imageUrl:  productMap[ri.productId]?.imageUrl ?? null,
      })),
      couponCode:     validatedCouponCode,
      discountAmount: breakdown.couponDiscount,
      vatAmount:      breakdown.vatAmount,
      totalAmount:    breakdown.total,
      status:         'pending',
      statusHistory:  [{ status: 'pending', timestamp: created_at }],
      created_at,
    };

    // ── Atomic stock reservation ──────────────────────────────────────────
    const reserved: Array<{ id: string; qty: number }> = [];
    for (const it of data.items) {
      const r = await Product.updateOne(
        { id: it.productId, stock: { $gte: it.quantity } },
        { $inc: { stock: -it.quantity } }
      );
      if (r.modifiedCount === 1) {
        reserved.push({ id: it.productId, qty: it.quantity });
      } else {
        for (const d of reserved) await Product.updateOne({ id: d.id }, { $inc: { stock: d.qty } });
        const p = productMap[it.productId];
        throw new BadRequestError(`${p?.name || 'Product'} is no longer in stock`);
      }
    }

    let order;
    try {
      order = await Order.create(orderData);
    } catch (err) {
      for (const d of reserved) await Product.updateOne({ id: d.id }, { $inc: { stock: d.qty } });
      throw err;
    }

    // Record coupon redemption (idempotent per orderId)
    if (validatedCouponCode) {
      await couponService.recordUsage(validatedCouponCode, {
        // Use the JWT-verified user id (same identity validateCoupon checked),
        // so per-user coupon limits are recorded under the same userKey.
        userId:         authUserId   ?? null,
        email:          data.email   ?? null,
        phone:          data.phone   ?? null,
        orderId:        id,
        discountAmount: breakdown.couponDiscount,
      });
    }

    return order.toObject({
      versionKey: false,
      transform:  (_doc, ret) => { delete (ret as any)._id; return ret; },
    });
  }

  /** Update order status */
  async updateOrderStatus(id: string, status: string, meta?: { note?: string; location?: string }) {
    const validStatuses = [
      'pending', 'confirmed', 'processing', 'sent', 'on_the_way',
      'out_for_delivery', 'shipped', 'delivered', 'received', 'reached', 'cancelled',
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await Order.findOne({ id });
    if (!order) throw new NotFoundError('Order not found');

    const timestamp = new Date().toISOString();
    const entry: any = { status, timestamp };
    if (meta?.note)     entry.note     = meta.note;
    if (meta?.location) entry.location = meta.location;
    if (!(order as any).statusHistory) (order as any).statusHistory = [];
    (order as any).statusHistory.push(entry);

    // Restore inventory when transitioning into cancelled
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const it of ((order as any).items || [])) {
        if (it?.productId && Number(it.quantity) > 0) {
          await Product.updateOne({ id: it.productId }, { $inc: { stock: Number(it.quantity) } });
        }
      }
    }

    order.status = status as any;
    await order.save();

    return order.toObject({
      versionKey: false,
      transform:  (_doc, ret) => { delete (ret as any)._id; return ret; },
    });
  }

  /** Get status history for an order */
  async getOrderStatusHistory(id: string) {
    const order = await Order.findOne({ id }).lean().select('id status statusHistory -_id');
    if (!order) throw new NotFoundError('Order not found');
    return { id: order.id, status: order.status, statusHistory: (order as any).statusHistory || [] };
  }

  async getOrdersByUser(userId: string, query: IOrderQuery) {
    return this.getOrders({ ...query, userId });
  }

  async getOrdersByStatus(status: string, query: IOrderQuery) {
    return this.getOrders({ ...query, status });
  }

  async getOrderStatistics() {
    const [
      totalOrders, pendingOrders, confirmedOrders, processingOrders,
      shippedOrders, deliveredOrders, cancelledOrders, totalRevenue,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'confirmed' }),
      Order.countDocuments({ status: 'processing' }),
      Order.countDocuments({ status: 'shipped' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    return {
      totalOrders, pendingOrders, confirmedOrders, processingOrders,
      shippedOrders, deliveredOrders, cancelledOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    };
  }
}

export default new OrderService();
