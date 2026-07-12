import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { generateAccessToken, generateRefreshToken, decodeToken } from '../utils/tokenGenerator';
import { BadRequestError, UnauthorizedError, LockedError } from '../utils/errors';
import { asyncHandler } from '../middlewares/asyncHandler';
import { RefreshToken } from '../models/RefreshToken';
import { refreshCookieOptions } from '../utils/cookieOptions';
import { recordAuditEvent } from '../services/auditLog.service';

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

  await recordAuditEvent({ req, actorType: 'user', actorId: user._id.toString(), actorEmail: user.email, action: 'user.login_success', success: true });

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

  // Determine if onboarding is required (first login or missing profile fields)
  const needsOnboarding = !!(user.isFirstLogin || !user.name || !user.email || !user.address || !user.phone);

  // If user was first-login, mark false after issuing tokens
  if (user.isFirstLogin) {
    user.isFirstLogin = false;
    await user.save();
  }

  // Standardized envelope to match admin login. `token` and `accessToken`
  // are both included for backward compatibility.
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
});
