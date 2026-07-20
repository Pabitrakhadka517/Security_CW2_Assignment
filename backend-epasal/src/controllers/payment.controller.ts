import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { createAuditContext } from '../middlewares/auditLogger';
import * as paymentService from '../services/payment.service';
import { sendSuccess } from '../utils/responseHelper';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

export class PaymentController {
  /**
   * POST /api/v1/payments/esewa/initiate
   * Returns the signed form fields the frontend submits (as a real HTML
   * form POST, not fetch/XHR) to eSewa's hosted payment page.
   */
  initiateEsewa = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.body;
    const ctx = createAuditContext(req);

    // Derived from the request rather than a fixed env var so this keeps
    // working across dev/staging/prod without extra config — eSewa only
    // needs to redirect the shopper's own browser back here, never to reach
    // this host directly itself.
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const requester = req.user ? { id: req.user.id, role: req.user.role } : null;
    const result = await paymentService.initiateEsewaPayment(orderId, requester, baseUrl, ctx.ipAddress);

    sendSuccess(res, 200, 'eSewa payment initiated', result);
  });

  /**
   * GET /api/v1/payments/esewa/callback
   * eSewa redirects the shopper's browser here after success or failure/
   * cancellation. Never a JSON API response for the shopper — always ends in
   * a redirect to a frontend page, since this URL is loaded by a real browser
   * navigation, not an XHR call the frontend could read directly.
   */
  esewaCallback = asyncHandler(async (req: Request, res: Response) => {
    const ctx = createAuditContext(req);
    const result = await paymentService.handleEsewaCallback(
      { data: req.query.data as string | undefined, transaction_uuid: req.query.transaction_uuid as string | undefined },
      ctx.ipAddress
    );

    const params = new URLSearchParams({ status: result.paymentStatus });
    if (result.orderId) params.set('orderId', result.orderId);

    res.redirect(302, `${FRONTEND_URL}/payment/esewa/result?${params.toString()}`);
  });
}

export default new PaymentController();
