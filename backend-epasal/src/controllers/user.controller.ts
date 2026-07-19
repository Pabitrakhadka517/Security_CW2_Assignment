import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { User, IUser } from '../models/User';
import { generateAccessToken, generateRefreshToken, generateMFAPendingToken } from '../utils/tokenGenerator';
import { generateEmailOtp, hashEmailOtp, sendMFAEmailOtp, EMAIL_OTP_TTL_MS } from '../services/mfa.service';
import { BadRequestError, UnauthorizedError, LockedError } from '../utils/errors';
import { asyncHandler } from '../middlewares/asyncHandler';
import { refreshCookieOptions, csrfCookieOptions } from '../utils/cookieOptions';
import { generateCsrfToken } from '../utils/csrf';
import * as auditService from '../services/audit.service';
import { createAuditContext } from '../middlewares/auditLogger';
import { validatePasswordComplexity } from '../services/password.service';
import * as sessionService from '../services/session.service';
import { alertService } from '../services/alert.service';
import { logger } from '../utils/logger';
import {
  generateVerificationToken,
  hashVerificationToken,
  sendVerificationEmail,
  VERIFICATION_TOKEN_TTL_MS,
} from '../services/emailVerification.service';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Issue access/refresh tokens and the standard login response for a user
 * whose credentials (and MFA, if enabled) have already been verified.
 * Shared by the normal login path and the post-MFA-challenge path so token
 * issuance logic lives in exactly one place.
 */
export const issueUserSession = async (req: Request, res: Response, user: IUser): Promise<void> => {
  const payload = { id: user._id.toString(), email: user.email, role: 'user' as const };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const session = await sessionService.createSession(user._id.toString(), 'user', req, refreshToken);

  const maxAge = (session.expiresAt as Date).getTime() - Date.now();
  res.cookie('refreshToken', refreshToken, refreshCookieOptions(maxAge));
  res.cookie('csrfToken', generateCsrfToken(), csrfCookieOptions(maxAge));

  const needsOnboarding = !!(user.isFirstLogin || !user.name || !user.email || !user.address || !user.phone);

  if (user.isFirstLogin) {
    user.isFirstLogin = false;
    await user.save();
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token: accessToken,
      accessToken,
      user: { id: user._id, name: user.name, email: user.email },
      needsOnboarding,
    },
  });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw new BadRequestError('Name, email and password are required');

  const exists = await User.findOne({ email });
  if (exists) throw new BadRequestError('Email already registered');

  const complexity = validatePasswordComplexity(password);
  if (!complexity.valid) throw new BadRequestError('Password does not meet complexity requirements', { errors: complexity.errors });

  const userData: any = { name, email, password };
  if (phone) userData.phone = phone;

  const user = await User.create(userData);
  // Seed password history with the hash the pre-save hook just produced,
  // so the very first change-password call can already check reuse against it.
  await user.updatePasswordHistory(user.password as string);
  await auditService.log({ ...createAuditContext(req), userId: user._id.toString(), userEmail: user.email, userRole: 'user', action: 'REGISTER', status: 'SUCCESS', riskLevel: 'LOW' });

  // Verification is informational only — the account works immediately
  // either way (see emailVerification.controller.ts) — so a send failure
  // here shouldn't fail an otherwise-successful registration.
  try {
    const token = generateVerificationToken();
    user.emailVerificationTokenHash = hashVerificationToken(token);
    user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    await user.save();
    await sendVerificationEmail(user.email, token);
  } catch (err) {
    logger.warn('Failed to send verification email during registration', { userId: user._id.toString(), error: err instanceof Error ? err.message : err });
  }

  res.status(201).json({ success: true, message: 'User registered', data: { id: user._id, name: user.name, email: user.email } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new BadRequestError('Email and password are required');
  const ctx = createAuditContext(req);

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    await auditService.log({ ...ctx, userEmail: email, userRole: 'user', action: 'LOGIN_FAILED', status: 'FAILURE', riskLevel: 'MEDIUM', metadata: { reason: 'no_such_account' } });
    await auditService.detectSuspiciousActivity(ctx.ipAddress);
    throw new UnauthorizedError('Invalid credentials');
  }
  if (!user.isActive) {
    await auditService.log({ ...ctx, userId: user._id.toString(), userEmail: email, userRole: 'user', action: 'LOGIN_FAILED', status: 'FAILURE', riskLevel: 'MEDIUM', metadata: { reason: 'inactive_account' } });
    await auditService.detectSuspiciousActivity(ctx.ipAddress, user._id.toString());
    throw new UnauthorizedError('User account inactive');
  }

  if (user.isLocked) {
    const remainingTime = Math.ceil(((user.lockUntil as Date).getTime() - Date.now()) / 60000);
    await auditService.log({ ...ctx, userId: user._id.toString(), userEmail: email, userRole: 'user', action: 'LOGIN_BLOCKED_LOCKOUT', status: 'BLOCKED', riskLevel: 'HIGH', metadata: { lockUntil: user.lockUntil } });
    await auditService.detectSuspiciousActivity(ctx.ipAddress, user._id.toString());
    await alertService.triggerAlert({
      type: 'ACCOUNT_LOCKED',
      riskLevel: 'HIGH',
      message: 'Account locked after repeated failed login attempts',
      ipAddress: ctx.ipAddress,
      userId: user._id.toString(),
      userEmail: email,
      metadata: { lockUntil: user.lockUntil },
      timestamp: new Date(),
    });
    throw new LockedError('Account locked. Try again after 15 minutes.', { remainingTime });
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    await user.incrementLoginAttempts();
    await auditService.log({ ...ctx, userId: user._id.toString(), userEmail: email, userRole: 'user', action: 'LOGIN_FAILED', status: 'FAILURE', riskLevel: 'MEDIUM', metadata: { reason: 'bad_password', attemptNumber: user.loginAttempts } });
    await auditService.detectSuspiciousActivity(ctx.ipAddress, user._id.toString());
    throw new UnauthorizedError('Invalid credentials');
  }

  await user.resetLoginAttempts();

  // MFA-enabled accounts don't get an access token yet — only a short-lived
  // pending token that's only good for the /auth/mfa/challenge step.
  if (user.mfaEnabled) {
    if (user.mfaMethod === 'email') {
      const code = generateEmailOtp();
      user.mfaEmailOtpHash = hashEmailOtp(code);
      user.mfaEmailOtpExpiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);
      user.mfaEmailOtpAttempts = 0;
      user.mfaEmailOtpSentAt = new Date();
      await user.save();
      await sendMFAEmailOtp(user.email, code, 'login');
    }

    const mfaPendingToken = generateMFAPendingToken(user._id.toString());
    res.status(200).json({
      success: true,
      message: 'MFA verification required',
      requiresMFA: true,
      data: { requiresMFA: true, mfaPendingToken, mfaMethod: user.mfaMethod },
    });
    return;
  }

  await auditService.log({ ...ctx, userId: user._id.toString(), userEmail: user.email, userRole: 'user', action: 'LOGIN_SUCCESS', status: 'SUCCESS', riskLevel: 'LOW', metadata: { loginMethod: 'email_password' } });
  await auditService.detectSuspiciousActivity(ctx.ipAddress, user._id.toString());

  await issueUserSession(req, res, user);
});

/**
 * POST /api/v1/auth/google
 * Body: { credential } — the ID token returned by Google Identity Services.
 * No client secret/redirect flow needed: the token is a signed JWT we can
 * verify directly against Google's public keys.
 *
 * Google has already verified the user's identity here, so MFA is
 * intentionally NOT enforced on this path — it's a separate, opt-in
 * account-security layer on top of password login, by design choice.
 */
export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) throw new BadRequestError('Google credential is required');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new UnauthorizedError('Invalid Google credential');
  }

  if (!payload?.email) throw new UnauthorizedError('Invalid Google credential');
  if (!payload.email_verified) throw new UnauthorizedError('Google account email is not verified');

  const googleId = payload.sub;
  const email = payload.email.toLowerCase();
  const name = payload.name || email.split('@')[0];

  let user = await User.findOne({ googleId });

  if (!user) {
    // Not linked yet — Google has already verified ownership of this email,
    // so it's safe to link it to a matching local-password account instead
    // of erroring out or creating a duplicate.
    user = await User.findOne({ email });
    if (user) {
      user.googleId = googleId;
      // Google just proved ownership of this email address.
      user.emailVerified = true;
      await user.save();
    } else {
      user = await User.create({ name, email, googleId, authProvider: 'google', isActive: true, emailVerified: true });
      await auditService.log({ ...createAuditContext(req), userId: user._id.toString(), userEmail: user.email, userRole: 'user', action: 'REGISTER', status: 'SUCCESS', riskLevel: 'LOW', metadata: { provider: 'google' } });
    }
  }

  if (!user.isActive) throw new UnauthorizedError('User account inactive');

  const ctx = createAuditContext(req);
  await auditService.log({ ...ctx, userId: user._id.toString(), userEmail: user.email, userRole: 'user', action: 'LOGIN_SUCCESS', status: 'SUCCESS', riskLevel: 'LOW', metadata: { loginMethod: 'google' } });
  await auditService.detectSuspiciousActivity(ctx.ipAddress, user._id.toString());

  await issueUserSession(req, res, user);
});
