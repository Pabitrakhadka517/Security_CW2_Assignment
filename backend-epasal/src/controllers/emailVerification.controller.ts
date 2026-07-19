import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { User } from '../models/User';
import { sendSuccess } from '../utils/responseHelper';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import * as auditService from '../services/audit.service';
import { createAuditContext } from '../middlewares/auditLogger';
import {
  generateVerificationToken,
  hashVerificationToken,
  sendVerificationEmail,
  VERIFICATION_TOKEN_TTL_MS,
} from '../services/emailVerification.service';

/**
 * POST /api/v1/auth/verify-email
 * Consumes a verification token (single-use, time-limited). Doesn't
 * distinguish "never existed" from "expired" in the response, same
 * anti-enumeration posture as password reset.
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body || {};
  if (!token) throw new BadRequestError('Token is required');

  const tokenHash = hashVerificationToken(token);
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');

  if (!user) throw new BadRequestError('Invalid or expired verification link');

  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  await auditService.log({
    ...createAuditContext(req),
    userId: user._id.toString(),
    userEmail: user.email,
    userRole: 'user',
    action: 'EMAIL_VERIFIED',
    status: 'SUCCESS',
    riskLevel: 'LOW',
  });

  sendSuccess(res, 200, 'Email verified successfully');
});

/**
 * POST /api/v1/auth/resend-verification
 * Authenticated (login isn't gated on verification, so this is simpler
 * than a public email-lookup endpoint and can't be used to enumerate
 * accounts).
 */
export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('Authentication required');

  const user = await User.findById(userId);
  if (!user) throw new UnauthorizedError('Account not found');

  if (user.emailVerified) {
    sendSuccess(res, 200, 'Your email is already verified');
    return;
  }

  // Abuse protection here comes from the route's rate limiter
  // (accountChangeLimiter) rather than a per-user cooldown field.
  const token = generateVerificationToken();
  user.emailVerificationTokenHash = hashVerificationToken(token);
  user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await user.save();
  await sendVerificationEmail(user.email, token);

  sendSuccess(res, 200, 'Verification email sent');
});
