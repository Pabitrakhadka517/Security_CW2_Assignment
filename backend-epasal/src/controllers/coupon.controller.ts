import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import couponService from '../services/coupon.service';
import { sendSuccess, sendPaginatedResponse } from '../utils/responseHelper';
import * as auditService from '../services/audit.service';
import { createAuditContext } from '../middlewares/auditLogger';

export class CouponController {
  /**
   * Get all coupons
   * GET /api/v1/coupons
   */
  getCoupons = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as any;
    const result = await couponService.getCoupons(query);

    sendPaginatedResponse(
      res,
      result.coupons,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Coupons retrieved successfully'
    );
  });

  /**
   * Get coupon by code
   * GET /api/v1/coupons/:code
   */
  getCouponByCode = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const coupon = await couponService.getCouponByCode(code);

    sendSuccess(res, 200, 'Coupon retrieved successfully', coupon);
  });

  /**
   * Create new coupon
   * POST /api/v1/coupons
   */
  createCoupon = asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.createCoupon(req.body);

    await auditService.log({
      ...createAuditContext(req),
      action: 'ADMIN_COUPON_CREATED',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      metadata: { code: (coupon as any)?.code },
    });

    sendSuccess(res, 201, 'Coupon created successfully', coupon);
  });

  /**
   * Update coupon
   * PUT /api/v1/coupons/:code
   */
  updateCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const coupon = await couponService.updateCoupon(code, req.body);

    sendSuccess(res, 200, 'Coupon updated successfully', coupon);
  });

  /**
   * Delete coupon
   * DELETE /api/v1/coupons/:code
   */
  deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const result = await couponService.deleteCoupon(code);

    sendSuccess(res, 200, result.message);
  });

  /**
   * Validate coupon
   * POST /api/v1/coupons/validate
   */
  validateCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { code, cartTotal, productIds, categoryIds, email, phone } = req.body;
    // Prefer the authenticated identity (optionalAuth) over client-supplied values.
    const result = await couponService.validateCoupon(code, {
      cartTotal,
      productIds,
      categoryIds,
      userId: req.user?.id ?? null,
      email: req.user?.email ?? email ?? null,
      phone: phone ?? null,
    });
    sendSuccess(res, 200, 'Coupon is valid', result);
  });

  /**
   * Get active coupons
   * GET /api/v1/coupons/active
   */
  getActiveCoupons = asyncHandler(async (_req: Request, res: Response) => {
    const coupons = await couponService.getActiveCoupons();

    sendSuccess(res, 200, 'Active coupons retrieved successfully', coupons);
  });

  /**
   * Get coupon analytics (admin)
   * GET /api/v1/coupons/:code/analytics
   */
  getCouponAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const analytics = await couponService.getCouponAnalytics(code);
    sendSuccess(res, 200, 'Coupon analytics retrieved successfully', analytics);
  });
}

export default new CouponController();
