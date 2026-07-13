import { Router } from 'express';
import orderController from '../controllers/order.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { requireAdmin, requireAuth, optionalAuth } from '../middlewares/authMiddleware';
import { checkPasswordExpiry } from '../middlewares/passwordExpiry';
import { requirePermission } from '../middlewares/rbac';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  getOrderByIdSchema,
  getOrdersQuerySchema,
  trackOrderSchema,
  calculateTotalSchema,
} from '../validations/order.validation';
import { couponLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * @openapi
 * /orders/:
 *   post:
 *     tags:
 *       - orders
 *     summary: Create an order (PUBLIC - no auth required)
 *   get:
 *     tags:
 *       - orders
 *     summary: List orders (admin only)
 * /orders/track/{id}:
 *   get:
 *     tags:
 *       - orders
 *     summary: Track order by ID (PUBLIC - no auth required)
 * /orders/{id}:
 *   get:
 *     tags:
 *       - orders
 *     summary: Get order details (admin only)
 * /orders/{id}/status:
 *   put:
 *     tags:
 *       - orders
 *     summary: Update order status (admin only)
 */

/**
 * ========================================
 * PUBLIC ROUTES (No authentication needed)
 * ========================================
 */

// Preview total — PUBLIC (no auth required), but optionalAuth attaches the
// verified user (if any) so per-user coupon-usage checks use a trustworthy
// identity instead of a client-supplied userId.
router.post(
  '/calculate-total',
  couponLimiter,
  optionalAuth,
  validateRequest(calculateTotalSchema),
  orderController.calculateTotal
);

// Create order - PUBLIC (guest checkout allowed). optionalAuth attaches the
// verified user when a token is sent, so the order lands in their history.
router.post(
  '/',
  optionalAuth,
  validateRequest(createOrderSchema),
  orderController.createOrder
);

// Track order by ID - PUBLIC, but requires ?phone= matching the order
router.get(
  '/track/:id',
  validateRequest(trackOrderSchema),
  orderController.trackOrder
);

// Get one of MY orders - AUTHENTICATED USER (owner-checked)
// NOTE: ownership is enforced by scoping the DB query itself to
// `{ id, user_id: req.user.id }` (see order.service#getMyOrderById), not by
// comparing a route param to req.user.id — that also means a mismatched
// order id 404s instead of 403ing, so it can't be used as an existence
// oracle for other people's orders. The controller separately logs an
// IDOR_ATTEMPT audit event when the id exists under a different owner.
router.get(
  '/my/:id',
  requireAuth,
  requirePermission('order:read:own'),
  checkPasswordExpiry,
  validateRequest(getOrderByIdSchema),
  orderController.getMyOrderById
);

/**
 * ========================================
 * ADMIN ROUTES (Authentication required)
 * ========================================
 */

// Get all orders - ADMIN ONLY
router.get(
  '/',
  requireAdmin,
  requirePermission('order:read:any'),
  validateRequest(getOrdersQuerySchema),
  orderController.getOrders
);

router.get(
  '/stats',
  requireAdmin,
  requirePermission('order:read:any'),
  orderController.getOrderStatistics
);

router.get(
  '/status/:status',
  requireAdmin,
  requirePermission('order:read:any'),
  validateRequest(getOrdersQuerySchema),
  orderController.getOrdersByStatus
);

router.get(
  '/user/:userId',
  requireAdmin,
  requirePermission('order:read:any'),
  validateRequest(getOrdersQuerySchema),
  orderController.getOrdersByUser
);

router.get(
  '/:id',
  requireAdmin,
  requirePermission('order:read:any'),
  validateRequest(getOrderByIdSchema),
  orderController.getOrderById
);

router.get(
  '/:id/status',
  requireAdmin,
  requirePermission('order:read:any'),
  validateRequest(getOrderByIdSchema),
  orderController.getOrderStatus
);

router.put(
  '/:id/status',
  requireAdmin,
  requirePermission('order:update:any'),
  validateRequest(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

export default router;
