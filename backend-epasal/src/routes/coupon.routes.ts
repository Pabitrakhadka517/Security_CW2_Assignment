import { Router } from 'express';
import couponController from '../controllers/coupon.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { requireAdmin, optionalAuth } from '../middlewares/authMiddleware';
import { couponLimiter } from '../middlewares/rateLimiter';
import { requirePermission } from '../middlewares/rbac';
import {
  createCouponSchema,
  updateCouponSchema,
  getCouponByCodeSchema,
  deleteCouponSchema,
  getCouponsQuerySchema,
  validateCouponSchema,
} from '../validations/coupon.validation';

const router = Router();

/**
 * @openapi
 * /coupons/:
 *   get:
 *     tags:
 *       - coupons
 *     summary: List coupons (admin)
 *   post:
 *     tags:
 *       - coupons
 *     summary: Create coupon (admin)
 * /coupons/{code}:
 *   get:
 *     tags:
 *       - coupons
 *     summary: Get coupon by code (admin)
 *     parameters:
 *       - name: code
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *   put:
 *     tags:
 *       - coupons
 *     summary: Update coupon (admin)
 *   delete:
 *     tags:
 *       - coupons
 *     summary: Delete coupon (admin)
 * /coupons/validate:
 *   post:
 *     tags:
 *       - coupons
 *     summary: Validate a coupon code (public/optional auth)
 */

/**
 * Public routes
 */
router.get(
  '/active',
  couponController.getActiveCoupons
);

router.post(
  '/validate',
  couponLimiter,
  optionalAuth,
  validateRequest(validateCouponSchema),
  couponController.validateCoupon
);

/**
 * Admin routes
 */
router.get(
  '/',
  requireAdmin,
  validateRequest(getCouponsQuerySchema),
  couponController.getCoupons
);

router.get(
  '/:code/analytics',
  requireAdmin,
  validateRequest(getCouponByCodeSchema),
  couponController.getCouponAnalytics
);

router.get(
  '/:code',
  requireAdmin,
  validateRequest(getCouponByCodeSchema),
  couponController.getCouponByCode
);

router.post(
  '/',
  requireAdmin,
  requirePermission('coupon:create'),
  validateRequest(createCouponSchema),
  couponController.createCoupon
);

router.put(
  '/:code',
  requireAdmin,
  requirePermission('coupon:update:any'),
  validateRequest(updateCouponSchema),
  couponController.updateCoupon
);

router.delete(
  '/:code',
  requireAdmin,
  requirePermission('coupon:delete:any'),
  validateRequest(deleteCouponSchema),
  couponController.deleteCoupon
);

export default router;
