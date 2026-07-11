import { Router } from 'express';
import orderController from '../controllers/order.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { requireAdmin, requireAuth, optionalAuth } from '../middlewares/authMiddleware';
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
router.get(
  '/my/:id',
  requireAuth,
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
  validateRequest(getOrdersQuerySchema),
  orderController.getOrders
);

router.get(
  '/stats',
  requireAdmin,
  orderController.getOrderStatistics
);

router.get(
  '/status/:status',
  requireAdmin,
  validateRequest(getOrdersQuerySchema),
  orderController.getOrdersByStatus
);

router.get(
  '/user/:userId',
  requireAdmin,
  validateRequest(getOrdersQuerySchema),
  orderController.getOrdersByUser
);

router.get(
  '/:id',
  requireAdmin,
  validateRequest(getOrderByIdSchema),
  orderController.getOrderById
);

router.get(
  '/:id/status',
  requireAdmin,
  validateRequest(getOrderByIdSchema),
  orderController.getOrderStatus
);

router.put(
  '/:id/status',
  requireAdmin,
  validateRequest(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

export default router;
