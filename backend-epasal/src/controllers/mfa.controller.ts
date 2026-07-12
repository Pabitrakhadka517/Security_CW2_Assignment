import { Request, Response } from 'express';
import { User } from '../models/User';
import { asyncHandler } from '../middlewares/asyncHandler';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { verifyMFAPendingToken } from '../utils/tokenGenerator';
import { recordAuditEvent } from '../services/auditLog.service';
import { issueUserSession } from './user.controller';
import {
  generateMFASecret,
  generateQRCode,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from '../services/mfa.service';

const requireUserId = (req: Request): string => {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError('Authentication required');
  return id;
};

/**
 * POST /api/v1/auth/mfa/setup
 * Generates a new TOTP secret and stores it (not yet enabled) so the client
 * can render the QR code and confirm possession via /verify-setup.
 */
export const setupMFA = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const user = await User.findById(userId);
  if (!user) throw new UnauthorizedError('User not found');

  const { secret, otpauthUrl } = generateMFASecret(user.email);
  user.mfaSecret = secret;
  await user.save();

  const qrCode = await generateQRCode(otpauthUrl);

  res.json({ success: true, data: { qrCode, secret } });
});

/**
 * POST /api/v1/auth/mfa/verify-setup
 * Confirms the user actually holds the secret (via a live TOTP code) before
 * flipping mfaEnabled on, then issues one-time backup codes.
 */
export const verifySetup = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { token } = req.body || {};
  if (!token) throw new BadRequestError('Verification code is required');

  const user = await User.findById(userId).select('+mfaSecret');
  if (!user || !user.mfaSecret) throw new BadRequestError('MFA setup has not been started');

  if (!verifyTOTP(user.mfaSecret, token)) {
    throw new BadRequestError('Invalid verification code');
  }

  const backupCodes = generateBackupCodes();
  user.mfaEnabled = true;
  user.mfaBackupCodes = backupCodes.map(hashBackupCode);
  await user.save();

  await recordAuditEvent({ req, actorType: 'user', actorId: userId, actorEmail: user.email, action: 'user.mfa_enabled', success: true });

  res.json({ success: true, message: 'MFA enabled successfully', data: { backupCodes } });
});

/**
 * POST /api/v1/auth/mfa/disable
 * Requires both the current password and a live TOTP code — either alone
 * isn't enough to turn off a second factor.
 */
export const disableMFA = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { token, password } = req.body || {};
  if (!token || !password) throw new BadRequestError('Password and verification code are required');

  const user = await User.findById(userId).select('+password +mfaSecret');
  if (!user) throw new UnauthorizedError('User not found');

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) throw new UnauthorizedError('Incorrect password');

  if (!user.mfaEnabled || !user.mfaSecret || !verifyTOTP(user.mfaSecret, token)) {
    throw new BadRequestError('Invalid verification code');
  }

  user.mfaEnabled = false;
  user.mfaSecret = undefined;
  user.mfaBackupCodes = [];
  await user.save();

  await recordAuditEvent({ req, actorType: 'user', actorId: userId, actorEmail: user.email, action: 'user.mfa_disabled', success: true });

  res.json({ success: true, message: 'MFA disabled successfully' });
});

/**
 * GET /api/v1/auth/mfa/status
 */
export const getMFAStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const user = await User.findById(userId).select('mfaEnabled');
  if (!user) throw new UnauthorizedError('User not found');

  res.json({ success: true, data: { mfaEnabled: user.mfaEnabled } });
});

/**
 * POST /api/v1/auth/mfa/challenge
 * Step 2 of login. Auth here is the mfa-pending token (not a normal access
 * token), so this route is deliberately NOT behind requireAuth — it verifies
 * the pending token itself against MFA_PENDING_SECRET.
 */
export const mfaChallenge = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('MFA session token required');
  }
  const pendingToken = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyMFAPendingToken(pendingToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired MFA session');
  }

  const { token, useBackupCode } = req.body || {};
  if (!token) throw new BadRequestError('Verification code is required');

  const user = await User.findById(decoded.userId).select('+mfaSecret +mfaBackupCodes');
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    throw new UnauthorizedError('MFA not enabled for this account');
  }

  let verified = false;

  if (useBackupCode) {
    const index = await verifyBackupCode(token, user.mfaBackupCodes || []);
    if (index !== -1) {
      verified = true;
      user.mfaBackupCodes = (user.mfaBackupCodes || []).filter((_, i) => i !== index);
    }
  } else {
    verified = verifyTOTP(user.mfaSecret, token);
  }

  if (!verified) {
    await user.incrementLoginAttempts();
    await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: user.email, action: 'user.mfa_challenge_failed', success: false });
    throw new UnauthorizedError('Invalid MFA code');
  }

  await user.resetLoginAttempts();
  await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: user.email, action: 'user.login_success', success: true, metadata: { mfa: true, usedBackupCode: !!useBackupCode } });

  await issueUserSession(req, res, user);
});
