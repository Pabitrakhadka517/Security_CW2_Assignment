import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { User } from '../models/User';
import { sendSuccess } from '../utils/responseHelper';
import { BadRequestError } from '../utils/errors';
import * as auditService from '../services/audit.service';
import { createAuditContext } from '../middlewares/auditLogger';
import * as sessionService from '../services/session.service';
import { validatePasswordComplexity, validatePasswordStrength } from '../services/password.service';
import {
  generateResetToken,
  hashResetToken,
  sendPasswordResetEmail,
  RESET_TOKEN_TTL_MS,
} from '../services/passwordReset.service';

const GENERIC_MESSAGE = 'If an account with that email exists, a password reset link has been sent.';

/**
 * POST /api/v1/auth/forgot-password
 * Always responds with the same generic message regardless of whether the
 * email is registered — an account-existence oracle here would let an
 * attacker enumerate registered emails.
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) throw new BadRequestError('Email is required');

  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    const token = generateResetToken();
    user.resetPasswordTokenHash = hashResetToken(token);
    user.resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    await sendPasswordResetEmail(user.email, token);

    await auditService.log({
      ...createAuditContext(req),
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: 'user',
      action: 'PASSWORD_RESET_REQUESTED',
      status: 'SUCCESS',
      riskLevel: 'MEDIUM',
    });
  }

  sendSuccess(res, 200, GENERIC_MESSAGE);
});

/**
 * POST /api/v1/auth/reset-password
 * Consumes a reset token (single-use, time-limited) to set a new password.
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) throw new BadRequestError('Token and new password are required');

  const tokenHash = hashResetToken(token);
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  }).select('+password +passwordHistory +resetPasswordTokenHash +resetPasswordExpiresAt');

  // Deliberately generic — doesn't distinguish "never existed" from
  // "expired" from "already used", same anti-enumeration posture as
  // forgotPassword above.
  if (!user) throw new BadRequestError('Invalid or expired reset link');

  const complexity = validatePasswordComplexity(newPassword);
  if (!complexity.valid) throw new BadRequestError(complexity.errors.join(', '));

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) throw new BadRequestError(`Password is too weak. ${strength.feedback.join(' ')}`.trim());

  const reused = await user.checkPasswordReuse(newPassword);
  if (reused) throw new BadRequestError('You cannot reuse your last 5 passwords');

  user.password = newPassword;
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();
  await user.updatePasswordHistory(user.password as string);

  await auditService.log({
    ...createAuditContext(req),
    userId: user._id.toString(),
    userEmail: user.email,
    userRole: 'user',
    action: 'PASSWORD_RESET_COMPLETED',
    status: 'SUCCESS',
    riskLevel: 'MEDIUM',
  });

  const revokedCount = await sessionService.revokeAllUserSessions(user._id.toString(), 'password_reset');
  if (revokedCount > 0) {
    await auditService.log({
      ...createAuditContext(req),
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: 'user',
      action: 'LOGOUT',
      status: 'SUCCESS',
      riskLevel: 'LOW',
      metadata: { reason: 'password_reset', revokedSessions: revokedCount },
    });
  }

  sendSuccess(res, 200, 'Password reset successful. Please log in with your new password.');
});
