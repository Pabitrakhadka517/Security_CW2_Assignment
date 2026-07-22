import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import * as auditService from '../services/audit.service';
import { createAuditContext } from './auditLogger';

/**
 * Rate limiters for sensitive/abusable endpoints.
 *
 * `trust proxy` is already set in app.ts, so req.ip resolves to the real
 * client IP behind Render's proxy rather than the proxy's own address.
 */
const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
  });
};

const baseOptions = {
  standardHeaders: true as const,
  legacyHeaders: false as const,
  handler: rateLimitHandler,
};

/**
 * Login endpoints (admin + user). Only failed attempts count toward the cap
 * (`skipSuccessfulRequests`) so a legitimate user logging in repeatedly never
 * gets locked out — this is purely brute-force throttling.
 */
export const loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    const ctx = createAuditContext(req);
    void auditService.log({
      ...ctx,
      userEmail: req.body?.email ?? null,
      action: 'LOGIN_BLOCKED_RATE_LIMIT',
      status: 'BLOCKED',
      riskLevel: 'HIGH',
      metadata: { path: req.path },
    });
    rateLimitHandler(req, res);
  },
});

/** Registration — cap account-creation spam per IP. */
export const registerLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

/** Refresh-token exchange — generous, since clients call this automatically. */
export const refreshLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

/** Password / email change endpoints — already authenticated, still sensitive. */
export const accountChangeLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 8,
});

/** Forgot-password requests — per-IP cap to prevent email-bombing a victim's inbox. */
export const forgotPasswordLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

/** Reset-password submissions — public, unauthenticated endpoint; cap abuse. */
export const resetPasswordLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 8,
});

/** Email-verification submissions — public, unauthenticated endpoint; cap abuse. */
export const verifyEmailLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 8,
});

/** MFA email-OTP resend (login challenge) — throttle inbox-spamming. */
export const emailOtpLimiter = rateLimit({
  ...baseOptions,
  windowMs: 10 * 60 * 1000,
  limit: 5,
});

/** Coupon validation / order-total preview — throttle coupon-code guessing. */
export const couponLimiter = rateLimit({
  ...baseOptions,
  windowMs: 10 * 60 * 1000,
  limit: 30,
});

/** eSewa payment-form generation — generous (retries after closing the eSewa tab are normal), still capped. */
export const esewaInitiateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

/**
 * eSewa success/failure redirect callback. Called by the shopper's own
 * browser (not eSewa's servers), generally once per payment attempt, but
 * kept generous since a page refresh on the result page re-hits it.
 */
export const esewaCallbackLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

/**
 * Personal data export — max 3 downloads per user per 24h, to prevent
 * using the export endpoint to harvest a compromised account's data
 * repeatedly or to hammer the DB with the aggregate export query.
 * Keyed by user id (not IP) since the route is always authenticated.
 */
export const exportDataLimiter = rateLimit({
  ...baseOptions,
  windowMs: 24 * 60 * 60 * 1000,
  limit: 3,
  keyGenerator: (req: Request) => req.user?.id || ipKeyGenerator(req.ip || 'unknown'),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'You can only export your data 3 times per 24 hours. Please try again later.',
    });
  },
});

/**
 * Personal data import — same rationale/cap as exportDataLimiter. Keyed by
 * user id since the route is always authenticated.
 */
export const importDataLimiter = rateLimit({
  ...baseOptions,
  windowMs: 24 * 60 * 60 * 1000,
  limit: 3,
  keyGenerator: (req: Request) => req.user?.id || ipKeyGenerator(req.ip || 'unknown'),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'You can only import your data 3 times per 24 hours. Please try again later.',
    });
  },
});
