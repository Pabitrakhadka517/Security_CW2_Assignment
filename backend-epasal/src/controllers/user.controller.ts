import { Request, Response } from 'express';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { User, IUser } from '../models/User';
import { generateAccessToken, generateRefreshToken, decodeToken, generateMFAPendingToken } from '../utils/tokenGenerator';
import { BadRequestError, UnauthorizedError, LockedError } from '../utils/errors';
import { asyncHandler } from '../middlewares/asyncHandler';
import { RefreshToken } from '../models/RefreshToken';
import { refreshCookieOptions } from '../utils/cookieOptions';
import { recordAuditEvent } from '../services/auditLog.service';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Issue access/refresh tokens and the standard login response for a user
 * whose credentials (and MFA, if enabled) have already been verified.
 * Shared by the normal login path and the post-MFA-challenge path so token
 * issuance logic lives in exactly one place.
 */
export const issueUserSession = async (_req: Request, res: Response, user: IUser): Promise<void> => {
  const payload = { id: user._id.toString(), email: user.email, role: 'user' as const };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const decoded: any = decodeToken(refreshToken) || {};
  const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    tokenHash: hash,
    userId: user._id.toString(),
    role: 'user',
    expiresAt,
    revoked: false,
  });

  res.cookie('refreshToken', refreshToken, refreshCookieOptions(expiresAt.getTime() - Date.now()));

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

  const userData: any = { name, email, password };
  if (phone) userData.phone = phone;

  const user = await User.create(userData);
  await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: user.email, action: 'user.register', success: true, targetType: 'user', targetId: user._id.toString() });

  res.status(201).json({ success: true, message: 'User registered', data: { id: user._id, name: user.name, email: user.email } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new BadRequestError('Email and password are required');

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    await recordAuditEvent({ req, actorType: 'user', actorEmail: email, action: 'user.login_failed', success: false, metadata: { reason: 'no_such_account' } });
    throw new UnauthorizedError('Invalid credentials');
  }
  if (!user.isActive) {
    await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: email, action: 'user.login_failed', success: false, metadata: { reason: 'inactive_account' } });
    throw new UnauthorizedError('User account inactive');
  }

  if (user.isLocked) {
    const remainingTime = Math.ceil(((user.lockUntil as Date).getTime() - Date.now()) / 60000);
    await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: email, action: 'user.login_failed', success: false, metadata: { reason: 'account_locked' } });
    throw new LockedError('Account locked. Try again after 15 minutes.', { remainingTime });
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    await user.incrementLoginAttempts();
    await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: email, action: 'user.login_failed', success: false, metadata: { reason: 'bad_password' } });
    throw new UnauthorizedError('Invalid credentials');
  }

  await user.resetLoginAttempts();

  // MFA-enabled accounts don't get an access token yet — only a short-lived
  // pending token that's only good for the /auth/mfa/challenge step.
  if (user.mfaEnabled) {
    await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: user.email, action: 'user.login_mfa_pending', success: true });
    const mfaPendingToken = generateMFAPendingToken(user._id.toString());
    res.status(200).json({
      success: true,
      message: 'MFA verification required',
      requiresMFA: true,
      data: { requiresMFA: true, mfaPendingToken },
    });
    return;
  }

  await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: user.email, action: 'user.login_success', success: true });

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
      await user.save();
    } else {
      user = await User.create({ name, email, googleId, authProvider: 'google', isActive: true });
      await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: user.email, action: 'user.register', success: true, targetType: 'user', targetId: user._id.toString(), metadata: { provider: 'google' } });
    }
  }

  if (!user.isActive) throw new UnauthorizedError('User account inactive');

  await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: user.email, action: 'user.login_success', success: true, metadata: { provider: 'google' } });

  await issueUserSession(req, res, user);
});
