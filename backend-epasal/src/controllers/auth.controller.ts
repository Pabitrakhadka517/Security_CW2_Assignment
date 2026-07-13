import { Request, Response } from 'express';
import crypto from 'crypto';
import { Admin } from '../models/Admin';
import { generateAccessToken, generateRefreshToken, decodeToken, verifyRefreshToken } from '../utils/tokenGenerator';
import { BadRequestError, UnauthorizedError, LockedError } from '../utils/errors';
import { asyncHandler } from '../middlewares/asyncHandler';
import { RefreshToken } from '../models/RefreshToken';
import { refreshCookieOptions } from '../utils/cookieOptions';
import * as auditService from '../services/audit.service';
import { createAuditContext } from '../middlewares/auditLogger';
import { sendSuccess } from '../utils/responseHelper';

/**
 * LOGIN ENDPOINT - Get JWT token with Email + Password
 *
 * @route POST /api/v1/auth/login
 * @param {string} email - Admin email (e.g., "admin@epasaley.com")
 * @param {string} password - Admin password
 * @returns {Object} - { token, admin: { id, adminId, name, email, role } }
 */
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const ctx = createAuditContext(req);

  // Validation
  if (!email || !password) {
    throw new BadRequestError('Email and password are required');
  }

  // Find admin by email (with password field selected)
  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin) {
    await auditService.log({ ...ctx, userEmail: email, userRole: 'admin', action: 'ADMIN_LOGIN_FAILED', status: 'FAILURE', riskLevel: 'MEDIUM', metadata: { reason: 'no_such_account' } });
    await auditService.detectSuspiciousActivity(ctx.ipAddress);
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!admin.isActive) {
    await auditService.log({ ...ctx, userId: admin._id.toString(), userEmail: email, userRole: 'admin', action: 'ADMIN_LOGIN_FAILED', status: 'FAILURE', riskLevel: 'MEDIUM', metadata: { reason: 'inactive_account' } });
    await auditService.detectSuspiciousActivity(ctx.ipAddress, admin._id.toString());
    throw new UnauthorizedError('Admin account is inactive');
  }

  if (admin.isLocked) {
    const remainingTime = Math.ceil(((admin.lockUntil as Date).getTime() - Date.now()) / 60000);
    await auditService.log({ ...ctx, userId: admin._id.toString(), userEmail: email, userRole: 'admin', action: 'LOGIN_BLOCKED_LOCKOUT', status: 'BLOCKED', riskLevel: 'HIGH', metadata: { lockUntil: admin.lockUntil } });
    await auditService.detectSuspiciousActivity(ctx.ipAddress, admin._id.toString());
    throw new LockedError('Account locked. Try again after 15 minutes.', { remainingTime });
  }

  // Compare password
  const isPasswordValid = await admin.comparePassword(password);
  if (!isPasswordValid) {
    await admin.incrementLoginAttempts();
    await auditService.log({ ...ctx, userId: admin._id.toString(), userEmail: email, userRole: 'admin', action: 'ADMIN_LOGIN_FAILED', status: 'FAILURE', riskLevel: 'MEDIUM', metadata: { reason: 'bad_password', attemptNumber: admin.loginAttempts } });
    await auditService.detectSuspiciousActivity(ctx.ipAddress, admin._id.toString());
    throw new UnauthorizedError('Invalid email or password');
  }

  await admin.resetLoginAttempts();

  // Update last login
  admin.lastLogin = new Date();
  await admin.save();

  await auditService.log({ ...ctx, userId: admin._id.toString(), userEmail: admin.email, userRole: admin.role as any, action: 'ADMIN_LOGIN_SUCCESS', status: 'SUCCESS', riskLevel: 'LOW' });
  await auditService.detectSuspiciousActivity(ctx.ipAddress, admin._id.toString());

  // Generate access and refresh tokens
  const payload = {
    id: admin._id.toString(),
    email: admin.email,
    role: 'admin' as const,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store hashed refresh token in DB
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const decoded: any = decodeToken(refreshToken) || {};
  const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    tokenHash: hash,
    userId: admin._id.toString(),
    role: 'admin',
    expiresAt,
    revoked: false,
  });

  // Set httpOnly cookie for refresh token
  const maxAge = expiresAt.getTime() - Date.now();
  res.cookie('refreshToken', refreshToken, refreshCookieOptions(maxAge));

  // Return access token to client
  // NOTE: `token` and `accessToken` are both included for backward compatibility.
  // Prefer `token` going forward (matches FRONTEND_API_GUIDE.txt).
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token: accessToken,
      accessToken,
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    },
  });
});

/**
 * Refresh access token using refresh token cookie
 * POST /api/v1/auth/refresh
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const ctx = createAuditContext(req);
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) {
    await auditService.log({ ...ctx, action: 'TOKEN_REFRESH_FAILED', status: 'FAILURE', riskLevel: 'LOW', metadata: { reason: 'no_token_provided' } });
    throw new UnauthorizedError('No refresh token provided');
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const existing = await RefreshToken.findOne({ tokenHash: hash });
  if (!existing || existing.revoked || (existing.expiresAt && existing.expiresAt < new Date())) {
    await auditService.log({ ...ctx, action: 'TOKEN_REFRESH_FAILED', status: 'FAILURE', riskLevel: 'MEDIUM', metadata: { reason: 'invalid_or_expired_token' } });
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Derive role from the stored record so we verify against the correct secret.
  // Falls back to 'user' for legacy rows that pre-date the role column.
  const storedRole: 'admin' | 'user' = existing.role === 'admin' ? 'admin' : 'user';
  const isAdmin = storedRole === 'admin';

  // Verify JWT refresh token using the matching secret
  const payload = verifyRefreshToken(token, isAdmin);

  // Use the stored role as the source of truth; the JWT payload role is a hint.
  const effectiveRole: 'admin' | 'user' = (payload.role as any) || storedRole;

  // Rotate: create new refresh token and revoke old one
  const newRefreshToken = generateRefreshToken({ id: payload.id, email: payload.email, role: effectiveRole });
  const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const newDecoded: any = decodeToken(newRefreshToken) || {};
  const newExpiresAt = newDecoded.exp ? new Date(newDecoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  existing.revoked = true;
  existing.replacedBy = newHash;
  await existing.save();

  await RefreshToken.create({
    tokenHash: newHash,
    userId: payload.id,
    role: storedRole,
    expiresAt: newExpiresAt,
    revoked: false,
  });

  // Issue new access token
  const accessToken = generateAccessToken({ id: payload.id, email: payload.email, role: effectiveRole });

  // Set cookie
  const maxAge = newExpiresAt.getTime() - Date.now();
  res.cookie('refreshToken', newRefreshToken, refreshCookieOptions(maxAge));

  await auditService.log({ ...ctx, userId: payload.id, userEmail: payload.email, userRole: effectiveRole, action: 'TOKEN_REFRESH', status: 'SUCCESS', riskLevel: 'LOW' });

  // Return both `token` and `accessToken` for backward compatibility.
  res.json({ success: true, data: { token: accessToken, accessToken } });
});

/**
 * Get current admin profile
 * GET /api/v1/auth/admin/me
 */
export const getAdminProfile = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  if (!adminId) throw new UnauthorizedError('Authentication required');

  const admin = await Admin.findById(adminId).select('-password -__v');
  if (!admin) throw new UnauthorizedError('Admin not found');

  res.json({ success: true, data: { id: admin._id, adminId: admin.adminId, name: admin.name, email: admin.email, role: admin.role } });
});

/**
 * Update admin profile (name / email)
 * PUT /api/v1/auth/admin/profile
 */
export const updateAdminProfile = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  if (!adminId) throw new UnauthorizedError('Authentication required');

  const { name, email, currentPassword } = req.body || {};
  const admin = await Admin.findById(adminId).select('+password');
  if (!admin) throw new UnauthorizedError('Admin not found');

  if (name && name.trim()) admin.name = name.trim();
  if (email && email.trim() && email.toLowerCase() !== admin.email) {
    // Changing the login email is account-takeover-adjacent — require the
    // current password even though the caller already holds a valid access
    // token, the same way changePassword does.
    if (!currentPassword) throw new BadRequestError('Current password is required to change email');
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) throw new BadRequestError('Current password is incorrect');

    const existing = await Admin.findOne({ email: email.toLowerCase(), _id: { $ne: adminId } });
    if (existing) throw new BadRequestError('Email already in use');
    const previousEmail = admin.email;
    admin.email = email.toLowerCase().trim();
    await admin.save();
    await auditService.log({ ...createAuditContext(req), userId: adminId, userEmail: admin.email, userRole: 'admin', action: 'PROFILE_UPDATED', status: 'SUCCESS', riskLevel: 'MEDIUM', metadata: { from: previousEmail, to: admin.email } });
    res.json({ success: true, message: 'Profile updated', data: { id: admin._id, name: admin.name, email: admin.email } });
    return;
  }

  await admin.save();
  res.json({ success: true, message: 'Profile updated', data: { id: admin._id, name: admin.name, email: admin.email } });
});

/**
 * Change admin password
 * PUT /api/v1/auth/admin/password
 */
export const changeAdminPassword = asyncHandler(async (req: Request, res: Response) => {
  const adminId = req.user?.id;
  if (!adminId) throw new UnauthorizedError('Authentication required');

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) throw new BadRequestError('Current and new password are required');
  if (newPassword.length < 6) throw new BadRequestError('New password must be at least 6 characters');

  const admin = await Admin.findById(adminId).select('+password');
  if (!admin) throw new UnauthorizedError('Admin not found');

  const isMatch = await admin.comparePassword(currentPassword);
  if (!isMatch) {
    await auditService.log({ ...createAuditContext(req), userId: adminId, userEmail: admin.email, userRole: 'admin', action: 'PASSWORD_CHANGE_FAILED', status: 'FAILURE', riskLevel: 'MEDIUM', metadata: { reason: 'incorrect_current_password' } });
    throw new BadRequestError('Current password is incorrect');
  }

  admin.password = newPassword;
  await admin.save();
  await auditService.log({ ...createAuditContext(req), userId: adminId, userEmail: admin.email, userRole: 'admin', action: 'PASSWORD_CHANGED', status: 'SUCCESS', riskLevel: 'MEDIUM' });
  res.json({ success: true, message: 'Password changed successfully' });
});

/**
 * Logout - revoke refresh token
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (token) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const existing = await RefreshToken.findOne({ tokenHash: hash });
    if (existing) {
      existing.revoked = true;
      await existing.save();
      await auditService.log({
        ...createAuditContext(req),
        userId: existing.userId,
        userRole: existing.role === 'admin' ? 'admin' : 'user',
        action: 'LOGOUT',
        status: 'SUCCESS',
        riskLevel: 'LOW',
      });
    }
  }

  // Clear cookie
  res.clearCookie('refreshToken', refreshCookieOptions());
  res.json({ success: true, message: 'Logged out' });
});

/**
 * GET /api/v1/auth/me/activity
 * Returns the logged-in user's own recent security activity — never another
 * user's, since userId always comes from the verified access token (req.user),
 * never a client-supplied value.
 */
export const getMyActivity = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('Authentication required');

  const logs = await auditService.getRecentActivity(userId, 20);
  const safeLogs = logs.map((entry: any) => ({
    action: entry.action,
    status: entry.status,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    timestamp: entry.timestamp,
    metadata: entry.metadata,
  }));

  sendSuccess(res, 200, 'Activity retrieved', safeLogs);
});
