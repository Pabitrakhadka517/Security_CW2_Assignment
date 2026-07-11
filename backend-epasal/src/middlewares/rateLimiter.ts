import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

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

/** Coupon validation / order-total preview — throttle coupon-code guessing. */
export const couponLimiter = rateLimit({
  ...baseOptions,
  windowMs: 10 * 60 * 1000,
  limit: 30,
});
