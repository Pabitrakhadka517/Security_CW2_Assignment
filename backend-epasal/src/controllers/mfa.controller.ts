import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { Admin, IAdmin } from '../models/Admin';
import { asyncHandler } from '../middlewares/asyncHandler';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { verifyMFAPendingToken } from '../utils/tokenGenerator';
import * as auditService from '../services/audit.service';
import { createAuditContext } from '../middlewares/auditLogger';
import { issueUserSession } from './user.controller';
import { issueAdminSession } from './auth.controller';
import * as sessionService from '../services/session.service';
import {
  generateMFASecret,
  generateQRCode,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  generateEmailOtp,
  hashEmailOtp,
  verifyEmailOtp,
  sendMFAEmailOtp,
  EMAIL_OTP_TTL_MS,
  EMAIL_OTP_RESEND_COOLDOWN_MS,
  EMAIL_OTP_MAX_ATTEMPTS,
} from '../services/mfa.service';

type MFARole = 'user' | 'admin';
type MFAAccount = IUser | IAdmin;

/**
 * Both User and Admin models carry the same MFA fields (mfaSecret,
 * mfaEnabled, mfaBackupCodes) and lockout methods, so every handler below
 * operates on whichever model matches the caller's verified role instead of
 * duplicating each handler per role.
 */
const findAccount = (id: string, role: MFARole, select = ''): Promise<MFAAccount | null> => {
  return role === 'admin' ? Admin.findById(id).select(select) : User.findById(id).select(select);
};

const requireAccountContext = (req: Request): { id: string; role: MFARole } => {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError('Authentication required');
  const role: MFARole = req.user?.role === 'admin' || req.user?.role === 'super_admin' ? 'admin' : 'user';
  return { id, role };
};

/**
 * POST /api/v1/auth/mfa/setup
 * method 'totp' (default): generates a new TOTP secret and stores it (not
 * yet enabled) so the client can render the QR code and confirm possession
 * via /verify-setup.
 * method 'email': generates and emails an OTP (not yet enabled) so the
 * client can confirm possession of the inbox via /verify-setup. Calling
 * this again while method is 'email' re-sends a fresh code (resend), gated
 * by a cooldown.
 */
export const setupMFA = asyncHandler(async (req: Request, res: Response) => {
  const { id, role } = requireAccountContext(req);
  const method: 'totp' | 'email' = req.body?.method === 'email' ? 'email' : 'totp';

  if (method === 'email') {
    const account = await findAccount(id, role, '+mfaEmailOtpSentAt');
    if (!account) throw new UnauthorizedError('Account not found');

    if (account.mfaEmailOtpSentAt && Date.now() - account.mfaEmailOtpSentAt.getTime() < EMAIL_OTP_RESEND_COOLDOWN_MS) {
      throw new BadRequestError('Please wait before requesting another code');
    }

    const code = generateEmailOtp();
    account.mfaMethod = 'email';
    account.mfaEmailOtpHash = hashEmailOtp(code);
    account.mfaEmailOtpExpiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);
    account.mfaEmailOtpAttempts = 0;
    account.mfaEmailOtpSentAt = new Date();
    await account.save();

    await sendMFAEmailOtp(account.email, code, 'setup');

    res.json({ success: true, data: { method: 'email' } });
    return;
  }

  const account = await findAccount(id, role);
  if (!account) throw new UnauthorizedError('Account not found');

  const { secret, otpauthUrl } = generateMFASecret(account.email);
  account.mfaSecret = secret;
  account.mfaMethod = 'totp';
  await account.save();

  const qrCode = await generateQRCode(otpauthUrl);

  res.json({ success: true, data: { method: 'totp', qrCode, secret } });
});

/**
 * POST /api/v1/auth/mfa/verify-setup
 * Confirms the caller actually holds the secret/inbox (via a live TOTP code
 * or emailed OTP, depending on account.mfaMethod) before flipping
 * mfaEnabled on, then issues one-time backup codes.
 */
export const verifySetup = asyncHandler(async (req: Request, res: Response) => {
  const { id, role } = requireAccountContext(req);
  const { token } = req.body || {};
  if (!token) throw new BadRequestError('Verification code is required');

  const account = await findAccount(id, role, '+mfaSecret +mfaEmailOtpHash +mfaEmailOtpExpiresAt +mfaEmailOtpAttempts');
  if (!account) throw new UnauthorizedError('Account not found');

  if (account.mfaMethod === 'email') {
    if (!account.mfaEmailOtpHash || !account.mfaEmailOtpExpiresAt) {
      throw new BadRequestError('MFA setup has not been started');
    }
    if (account.mfaEmailOtpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestError('Verification code has expired — request a new one');
    }
    if ((account.mfaEmailOtpAttempts ?? 0) >= EMAIL_OTP_MAX_ATTEMPTS) {
      throw new BadRequestError('Too many attempts — request a new code');
    }
    if (!(await verifyEmailOtp(token, account.mfaEmailOtpHash))) {
      account.mfaEmailOtpAttempts = (account.mfaEmailOtpAttempts ?? 0) + 1;
      await account.save();
      throw new BadRequestError('Invalid verification code');
    }
    account.mfaEmailOtpHash = undefined;
    account.mfaEmailOtpExpiresAt = undefined;
    account.mfaEmailOtpAttempts = 0;
    account.mfaEmailOtpSentAt = undefined;
  } else {
    if (!account.mfaSecret) throw new BadRequestError('MFA setup has not been started');
    if (!verifyTOTP(account.mfaSecret, token)) {
      throw new BadRequestError('Invalid verification code');
    }
  }

  const backupCodes = generateBackupCodes();
  account.mfaEnabled = true;
  account.mfaBackupCodes = backupCodes.map(hashBackupCode);
  await account.save();

  await auditService.log({ ...createAuditContext(req), userId: id, userEmail: account.email, userRole: role, action: 'MFA_ENABLED', status: 'SUCCESS', riskLevel: 'LOW', metadata: { method: account.mfaMethod } });

  // Force re-login everywhere (including this device) — a stolen access
  // token from before MFA was enabled must not survive the change.
  const revokedCount = await sessionService.revokeAllUserSessions(id, 'mfa_changed');
  if (revokedCount > 0) {
    await auditService.log({ ...createAuditContext(req), userId: id, userEmail: account.email, userRole: role, action: 'LOGOUT', status: 'SUCCESS', riskLevel: 'LOW', metadata: { reason: 'mfa_changed', revokedSessions: revokedCount } });
  }

  res.json({ success: true, message: 'MFA enabled successfully', data: { backupCodes } });
});

/**
 * POST /api/v1/auth/mfa/disable
 * Requires both the current password and a live verification code — either
 * alone isn't enough to turn off a second factor. For email-method
 * accounts, call /disable/request-code first to get a code emailed.
 */
export const disableMFA = asyncHandler(async (req: Request, res: Response) => {
  const { id, role } = requireAccountContext(req);
  const { token, password } = req.body || {};
  if (!token || !password) throw new BadRequestError('Password and verification code are required');

  const account = await findAccount(id, role, '+password +mfaSecret +mfaEmailOtpHash +mfaEmailOtpExpiresAt +mfaEmailOtpAttempts');
  if (!account) throw new UnauthorizedError('Account not found');

  const isPasswordValid = await account.comparePassword(password);
  if (!isPasswordValid) throw new UnauthorizedError('Incorrect password');

  if (!account.mfaEnabled) {
    throw new BadRequestError('Invalid verification code');
  }

  if (account.mfaMethod === 'email') {
    const expired = !account.mfaEmailOtpHash || !account.mfaEmailOtpExpiresAt || account.mfaEmailOtpExpiresAt.getTime() < Date.now();
    const tooManyAttempts = (account.mfaEmailOtpAttempts ?? 0) >= EMAIL_OTP_MAX_ATTEMPTS;
    if (expired || tooManyAttempts || !(await verifyEmailOtp(token, account.mfaEmailOtpHash!))) {
      if (!expired && !tooManyAttempts) {
        account.mfaEmailOtpAttempts = (account.mfaEmailOtpAttempts ?? 0) + 1;
        await account.save();
      }
      throw new BadRequestError('Invalid verification code');
    }
  } else if (!account.mfaSecret || !verifyTOTP(account.mfaSecret, token)) {
    throw new BadRequestError('Invalid verification code');
  }

  account.mfaEnabled = false;
  account.mfaSecret = undefined;
  account.mfaBackupCodes = [];
  account.mfaMethod = 'totp';
  account.mfaEmailOtpHash = undefined;
  account.mfaEmailOtpExpiresAt = undefined;
  account.mfaEmailOtpAttempts = 0;
  account.mfaEmailOtpSentAt = undefined;
  await account.save();

  await auditService.log({ ...createAuditContext(req), userId: id, userEmail: account.email, userRole: role, action: 'MFA_DISABLED', status: 'SUCCESS', riskLevel: 'MEDIUM' });

  // Force re-login everywhere — disabling MFA is itself a sensitive change,
  // and any session opened while MFA was on should not silently continue
  // in a now-weaker-auth state.
  const revokedCount = await sessionService.revokeAllUserSessions(id, 'mfa_changed');
  if (revokedCount > 0) {
    await auditService.log({ ...createAuditContext(req), userId: id, userEmail: account.email, userRole: role, action: 'LOGOUT', status: 'SUCCESS', riskLevel: 'LOW', metadata: { reason: 'mfa_changed', revokedSessions: revokedCount } });
  }

  res.json({ success: true, message: 'MFA disabled successfully' });
});

/**
 * POST /api/v1/auth/mfa/disable/request-code
 * Emails a fresh OTP for use with /disable, when the account's MFA method
 * is 'email' (an authenticator-app user already has a live code and
 * doesn't need this step).
 */
export const requestDisableCode = asyncHandler(async (req: Request, res: Response) => {
  const { id, role } = requireAccountContext(req);
  const account = await findAccount(id, role, '+mfaEmailOtpSentAt');
  if (!account) throw new UnauthorizedError('Account not found');

  if (!account.mfaEnabled || account.mfaMethod !== 'email') {
    throw new BadRequestError('Email verification code is not applicable for this account');
  }

  if (account.mfaEmailOtpSentAt && Date.now() - account.mfaEmailOtpSentAt.getTime() < EMAIL_OTP_RESEND_COOLDOWN_MS) {
    throw new BadRequestError('Please wait before requesting another code');
  }

  const code = generateEmailOtp();
  account.mfaEmailOtpHash = hashEmailOtp(code);
  account.mfaEmailOtpExpiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);
  account.mfaEmailOtpAttempts = 0;
  account.mfaEmailOtpSentAt = new Date();
  await account.save();

  await sendMFAEmailOtp(account.email, code, 'disable');

  res.json({ success: true, message: 'Verification code sent to your email' });
});

/**
 * GET /api/v1/auth/mfa/status
 */
export const getMFAStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id, role } = requireAccountContext(req);
  const account = await findAccount(id, role, 'mfaEnabled mfaMethod');
  if (!account) throw new UnauthorizedError('Account not found');

  res.json({ success: true, data: { mfaEnabled: account.mfaEnabled, mfaMethod: account.mfaMethod } });
});

/**
 * Both /challenge and /challenge/resend authenticate via the mfa-pending
 * token rather than requireAuth (a full session doesn't exist yet).
 */
const decodePendingToken = (req: Request): { userId: string; role: MFARole } => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('MFA session token required');
  }
  const pendingToken = authHeader.split(' ')[1];

  try {
    const decoded = verifyMFAPendingToken(pendingToken);
    return { userId: decoded.userId, role: decoded.role === 'admin' ? 'admin' : 'user' };
  } catch {
    throw new UnauthorizedError('Invalid or expired MFA session');
  }
};

/**
 * POST /api/v1/auth/mfa/challenge/resend
 * Re-sends the email OTP mid-login, for accounts whose MFA method is
 * 'email'. Not applicable to TOTP accounts, which already hold a live code
 * in their authenticator app.
 */
export const resendChallengeCode = asyncHandler(async (req: Request, res: Response) => {
  const { userId, role } = decodePendingToken(req);

  const account = await findAccount(userId, role, '+mfaEmailOtpSentAt');
  if (!account || !account.mfaEnabled) throw new UnauthorizedError('MFA not enabled for this account');

  if (account.mfaMethod !== 'email') {
    throw new BadRequestError('Email verification code is not applicable for this account');
  }

  if (account.mfaEmailOtpSentAt && Date.now() - account.mfaEmailOtpSentAt.getTime() < EMAIL_OTP_RESEND_COOLDOWN_MS) {
    throw new BadRequestError('Please wait before requesting another code');
  }

  const code = generateEmailOtp();
  account.mfaEmailOtpHash = hashEmailOtp(code);
  account.mfaEmailOtpExpiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);
  account.mfaEmailOtpAttempts = 0;
  account.mfaEmailOtpSentAt = new Date();
  await account.save();

  await sendMFAEmailOtp(account.email, code, 'login');

  res.json({ success: true, message: 'Verification code sent to your email' });
});

/**
 * POST /api/v1/auth/mfa/challenge
 * Step 2 of login. Auth here is the mfa-pending token (not a normal access
 * token), so this route is deliberately NOT behind requireAuth — it verifies
 * the pending token itself against MFA_PENDING_SECRET. The pending token
 * carries the role it was issued for, so the right collection (User vs
 * Admin) and the right session/token issuance path get used below.
 */
export const mfaChallenge = asyncHandler(async (req: Request, res: Response) => {
  const { userId, role } = decodePendingToken(req);
  const { token, useBackupCode } = req.body || {};
  if (!token) throw new BadRequestError('Verification code is required');

  const account = await findAccount(userId, role, '+mfaSecret +mfaBackupCodes +mfaEmailOtpHash +mfaEmailOtpExpiresAt +mfaEmailOtpAttempts');
  if (!account || !account.mfaEnabled) {
    throw new UnauthorizedError('MFA not enabled for this account');
  }

  let verified = false;

  if (useBackupCode) {
    const index = await verifyBackupCode(token, account.mfaBackupCodes || []);
    if (index !== -1) {
      verified = true;
      account.mfaBackupCodes = (account.mfaBackupCodes || []).filter((_, i) => i !== index);
    }
  } else if (account.mfaMethod === 'email') {
    const expired = !account.mfaEmailOtpHash || !account.mfaEmailOtpExpiresAt || account.mfaEmailOtpExpiresAt.getTime() < Date.now();
    const tooManyAttempts = (account.mfaEmailOtpAttempts ?? 0) >= EMAIL_OTP_MAX_ATTEMPTS;
    if (!expired && !tooManyAttempts && account.mfaEmailOtpHash && (await verifyEmailOtp(token, account.mfaEmailOtpHash))) {
      verified = true;
      account.mfaEmailOtpHash = undefined;
      account.mfaEmailOtpExpiresAt = undefined;
      account.mfaEmailOtpAttempts = 0;
      account.mfaEmailOtpSentAt = undefined;
    } else if (!expired && !tooManyAttempts) {
      account.mfaEmailOtpAttempts = (account.mfaEmailOtpAttempts ?? 0) + 1;
    }
  } else if (account.mfaSecret) {
    verified = verifyTOTP(account.mfaSecret, token);
  }

  const ctx = createAuditContext(req);
  const loginSuccessAction = role === 'admin' ? 'ADMIN_LOGIN_SUCCESS' : 'LOGIN_SUCCESS';

  if (!verified) {
    await account.incrementLoginAttempts();
    await auditService.log({ ...ctx, userId: account._id.toString(), userEmail: account.email, userRole: role, action: 'MFA_CHALLENGE_FAILED', status: 'FAILURE', riskLevel: 'HIGH' });
    await auditService.detectSuspiciousActivity(ctx.ipAddress, account._id.toString());
    throw new UnauthorizedError('Invalid MFA code');
  }

  await account.resetLoginAttempts();
  await auditService.log({ ...ctx, userId: account._id.toString(), userEmail: account.email, userRole: role, action: 'MFA_CHALLENGE_SUCCESS', status: 'SUCCESS', riskLevel: 'LOW', metadata: { usedBackupCode: !!useBackupCode } });
  if (useBackupCode) {
    await auditService.log({ ...ctx, userId: account._id.toString(), userEmail: account.email, userRole: role, action: 'MFA_BACKUP_CODE_USED', status: 'SUCCESS', riskLevel: 'MEDIUM' });
  }
  await auditService.log({ ...ctx, userId: account._id.toString(), userEmail: account.email, userRole: role, action: loginSuccessAction, status: 'SUCCESS', riskLevel: 'LOW', metadata: { loginMethod: 'email_password', mfa: true, usedBackupCode: !!useBackupCode } });
  await auditService.detectSuspiciousActivity(ctx.ipAddress, account._id.toString());

  if (role === 'admin') {
    await issueAdminSession(req, res, account as IAdmin);
  } else {
    await issueUserSession(req, res, account as IUser);
  }
});
