import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import orderService from '../services/order.service';
import { sendSuccess, sendPaginatedResponse } from '../utils/responseHelper';
import * as auditService from '../services/audit.service';
import { createAuditContext } from '../middlewares/auditLogger';

export class OrderController {
  /**
   * Get all orders
   * GET /api/v1/orders
   */
  getOrders = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as any;
    const result = await orderService.getOrders(query);

    sendPaginatedResponse(
      res,
      result.orders,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Orders retrieved successfully'
    );
  });

  /**
   * Get order by ID
   * GET /api/v1/orders/:id
   */
  getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);

    sendSuccess(res, 200, 'Order retrieved successfully', order);
  });

  /**
   * Preview total calculation — PUBLIC, no auth required.
   * POST /api/v1/orders/calculate-total
   */
  calculateTotal = asyncHandler(async (req: Request, res: Response) => {
    const { cartItems, couponCode, email, phone } = req.body;
    // Per-user coupon-usage checks must use a verified identity only — a
    // client-supplied `userId` would let anyone probe whether an arbitrary
    // account has already redeemed a given coupon. req.user is set only from
    // a verified JWT via optionalAuth.
    const result = await orderService.calculateTotal({ cartItems, couponCode, userId: req.user?.id ?? null, email, phone });
    sendSuccess(res, 200, 'Calculation successful', result);
  });

  /**
   * Create new order
   * POST /api/v1/orders
   */
  createOrder = asyncHandler(async (req: Request, res: Response) => {
    // user_id comes ONLY from a verified JWT (optionalAuth) — never the body.
    const order = await orderService.createOrder(req.body, req.user?.id ?? null);

    await auditService.log({
      ...createAuditContext(req),
      action: 'ORDER_CREATED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      metadata: { orderId: (order as any)?.id, totalAmount: (order as any)?.totalAmount },
    });

    sendSuccess(res, 201, 'Order created successfully', order);
  });

  /**
   * Update order status
   * PUT /api/v1/orders/:id/status
   */
  updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { status, note, location } = req.body;

    const previousOrder = await orderService.getOrderById(id);
    const order = await orderService.updateOrderStatus(id, status, { note, location });

    await auditService.log({
      ...createAuditContext(req),
      action: status === 'cancelled' ? 'ORDER_CANCELLED' : 'ADMIN_ORDER_STATUS_CHANGED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      metadata: { orderId: id, from: (previousOrder as any)?.status ?? null, to: status, note, location },
    });

    sendSuccess(res, 200, 'Order status updated successfully', order);
  });

  /**
   * Get order status history
   * GET /api/v1/orders/:id/status
   */
  getOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const history = await orderService.getOrderStatusHistory(id);
    sendSuccess(res, 200, 'Order status history retrieved successfully', history);
  });

  /**
   * Get orders by user
   * GET /api/v1/orders/user/:userId
   */
  getOrdersByUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const query = req.query as any;
    
    const result = await orderService.getOrdersByUser(userId, query);

    sendPaginatedResponse(
      res,
      result.orders,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'User orders retrieved successfully'
    );
  });

  /**
   * Get orders by status
   * GET /api/v1/orders/status/:status
   */
  getOrdersByStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.params;
    const query = req.query as any;
    
    const result = await orderService.getOrdersByStatus(status, query);

    sendPaginatedResponse(
      res,
      result.orders,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Orders retrieved successfully'
    );
  });

  /**
   * Get a single order owned by the authenticated user
   * GET /api/v1/orders/my/:id
   */
  getMyOrderById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await orderService.getMyOrderById(id, req.user!.id);
    sendSuccess(res, 200, 'Order retrieved successfully', order);
  });

  /**
   * Get order statistics
   * GET /api/v1/orders/stats
   */
  getOrderStatistics = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await orderService.getOrderStatistics();

    sendSuccess(res, 200, 'Order statistics retrieved successfully', stats);
  });

  /**
   * Track order by ID (PUBLIC - no auth required)
   * GET /api/v1/orders/track/:id
   * Returns limited order info for customer tracking
   */
  trackOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);

    // Order ids are sequential (NP26001, NP26002, ...). Require the phone
    // number used on the order so strangers can't enumerate other people's
    // orders. Compare digits only, ignoring spaces/dashes/country prefix.
    const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
    const given = digits(req.query.phone);
    const actual = digits((order as any).phone);
    const matches =
      given.length >= 7 &&
      (actual === given || actual.endsWith(given) || given.endsWith(actual));
    if (!matches) {
      // Same response as a missing order — no existence oracle.
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Requester already proved they know both the order id and the phone
    // number on file — that's the same two-factor bar every "track my
    // order" flow uses — so it's safe to return the customer's own order
    // details here (not somebody else's). Keep the shape aligned with what
    // the tracking page actually renders: status, delivery info and items.
    const trackingInfo = {
      orderId: order.id,
      status: order.status,
      statusHistory: order.statusHistory,
      customerName: order.name,
      phone: order.phone,
      address: order.address,
      city: order.city,
      district: order.district,
      paymentMethod: order.paymentMethod,
      items: order.items,
      totalAmount: order.totalAmount,
      createdAt: order.created_at,
    };

    sendSuccess(res, 200, 'Order tracking info retrieved successfully', trackingInfo);
  });
}

export default new OrderController();
