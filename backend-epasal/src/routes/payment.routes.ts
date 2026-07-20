import { Router } from 'express';
import paymentController from '../controllers/payment.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { optionalAuth } from '../middlewares/authMiddleware';
import { initiateEsewaPaymentSchema, esewaCallbackSchema } from '../validations/payment.validation';
import { esewaInitiateLimiter, esewaCallbackLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * @openapi
 * /payments/esewa/initiate:
 *   post:
 *     tags:
 *       - payments
 *     summary: Get signed eSewa form fields for an order (PUBLIC — guest checkout allowed)
 * /payments/esewa/callback:
 *   get:
 *     tags:
 *       - payments
 *     summary: eSewa success/failure redirect target (PUBLIC — called by the shopper's browser)
 */

// PUBLIC — guest checkout is allowed elsewhere in this app, so payment must
// be too. optionalAuth attaches the verified user (if any) purely so a
// logged-in user can't initiate payment on someone else's order — see
// payment.service#assertCanPayFor.
router.post(
  '/esewa/initiate',
  esewaInitiateLimiter,
  optionalAuth,
  validateRequest(initiateEsewaPaymentSchema),
  paymentController.initiateEsewa
);

// PUBLIC, no auth — this is eSewa redirecting the shopper's own browser back,
// not an authenticated API call.
router.get(
  '/esewa/callback',
  esewaCallbackLimiter,
  validateRequest(esewaCallbackSchema),
  paymentController.esewaCallback
);

export default router;
