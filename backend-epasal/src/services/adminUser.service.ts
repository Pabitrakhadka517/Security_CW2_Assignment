import { User, MAX_LOGIN_ATTEMPTS } from '../models/User';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { safePagination, buildPaginationMeta } from '../utils/pagination';
import * as auditService from '../services/audit.service';
import * as sessionService from '../services/session.service';

// Defense in depth: these are already `select: false` on the schema (so a
// plain find already omits them), but the admin endpoints spell it out
// explicitly since leaking any of these would be critical.
const SENSITIVE_FIELDS =
  '-password -mfaSecret -mfaBackupCodes -passwordHistory -resetPasswordTokenHash -emailVerificationTokenHash -mfaEmailOtpHash -googleId';

const DEFAULT_LOCK_MINUTES = 24 * 60; // admin-imposed lock defaults to 24h, distinct from the 15-min auto-lockout

export interface AdminListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'locked' | 'deleted';
  sortBy?: 'createdAt' | 'lastLoginAt';
  order?: 'asc' | 'desc';
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/v1/admin/users
 */
export const listUsers = async (query: AdminListUsersQuery) => {
  const { page, limit, skip } = safePagination({ page: query.page, limit: query.limit });
  const sortBy = query.sortBy === 'lastLoginAt' ? 'lastLoginAt' : 'createdAt';
  const sortOrder = query.order === 'asc' ? 1 : -1;

  // The User collection only ever holds role 'user' — Admin accounts live in
  // a separate collection entirely. A role filter for anything else is a
  // legitimate query that simply matches nothing, not an error.
  if (query.role && query.role !== 'user') {
    return { users: [], pagination: buildPaginationMeta(page, limit, 0) };
  }

  const filter: Record<string, unknown> = {};

  switch (query.status) {
    case 'active':
      filter.isActive = true;
      filter.isDeleted = { $ne: true };
      break;
    case 'inactive':
      filter.isActive = false;
      filter.isDeleted = { $ne: true };
      break;
    case 'locked':
      filter.lockUntil = { $gt: new Date() };
      filter.isDeleted = { $ne: true };
      break;
    case 'deleted':
      filter.isDeleted = true;
      break;
    default:
      // No explicit status requested — hide soft-deleted accounts by default
      // so they don't clutter the normal customer list.
      filter.isDeleted = { $ne: true };
  }

  if (query.search && query.search.trim()) {
    const pattern = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(`name email avatarUrl isActive isDeleted mfaEnabled lastLoginAt loginAttempts lockUntil createdAt`)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const now = Date.now();
  return {
    users: users.map((u: any) => ({
      id: u._id.toString(),
      role: 'user' as const,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl ?? null,
      isActive: u.isActive,
      isDeleted: !!u.isDeleted,
      isLocked: !!(u.lockUntil && new Date(u.lockUntil).getTime() > now),
      mfaEnabled: !!u.mfaEnabled,
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt,
    })),
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const findUserOrThrow = async (id: string) => {
  const user = await User.findById(id).select(SENSITIVE_FIELDS);
  if (!user) throw new NotFoundError('User not found');
  return user;
};

/**
 * GET /api/v1/admin/users/:id
 * Bundles session count + recent security events alongside the profile so
 * the frontend detail view is a single round trip.
 */
export const getUserDetail = async (id: string) => {
  const user = await findUserOrThrow(id);
  const [activeSessions, recentEvents] = await Promise.all([
    sessionService.getUserActiveSessions(id),
    auditService.getRecentActivity(id, 5),
  ]);

  return {
    user: {
      id: user._id.toString(),
      role: 'user' as const,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      authProvider: user.authProvider,
      isActive: user.isActive,
      isDeleted: user.isDeleted,
      deletedAt: user.deletedAt,
      isLocked: user.isLocked,
      loginAttempts: user.loginAttempts,
      lockUntil: user.lockUntil,
      lastLoginAt: user.lastLoginAt,
      mustChangePassword: user.mustChangePassword,
      passwordExpiresAt: user.passwordExpiresAt,
      mfaEnabled: user.mfaEnabled,
      mfaMethod: user.mfaMethod,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    activeSessionCount: activeSessions.length,
    recentEvents,
  };
};

/** Guards every mutating action below against an admin targeting their own account. */
const assertNotSelf = (targetId: string, adminId: string | undefined, action: string): void => {
  if (adminId && targetId === adminId) {
    throw new BadRequestError(`Admins cannot ${action} their own account through user management`);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/lock
 * Manually locks an account outside the normal 5-failed-attempts flow.
 * Also revokes active sessions -- otherwise a still-valid access/refresh
 * token would keep working right up until it naturally expires, silently
 * defeating the lock.
 */
export const lockUser = async (id: string, adminId: string | undefined, durationMinutes?: number) => {
  assertNotSelf(id, adminId, 'lock');
  const user = await findUserOrThrow(id);

  user.loginAttempts = MAX_LOGIN_ATTEMPTS;
  user.lockUntil = new Date(Date.now() + (durationMinutes ?? DEFAULT_LOCK_MINUTES) * 60 * 1000);
  await user.save({ validateModifiedOnly: true });
  const revokedSessions = await sessionService.revokeAllUserSessions(id, 'admin_revoked');

  return { lockUntil: user.lockUntil, revokedSessions };
};

/**
 * PATCH /api/v1/admin/users/:id/unlock
 */
export const unlockUser = async (id: string) => {
  const user = await findUserOrThrow(id);
  await user.resetLoginAttempts();
  return { lockUntil: user.lockUntil };
};

/**
 * PATCH /api/v1/admin/users/:id/status
 */
export const setUserStatus = async (id: string, isActive: boolean, adminId: string | undefined) => {
  if (!isActive) assertNotSelf(id, adminId, 'deactivate');
  const user = await findUserOrThrow(id);

  user.isActive = isActive;
  await user.save({ validateModifiedOnly: true });

  // Deactivation must take effect immediately, not just block the next
  // login -- an already-issued refresh token doesn't check isActive on its
  // own (see session.service#validateSession), so revoke explicitly.
  let revokedSessions = 0;
  if (!isActive) {
    revokedSessions = await sessionService.revokeAllUserSessions(id, 'admin_revoked');
  }

  return { isActive: user.isActive, revokedSessions };
};

/**
 * POST /api/v1/admin/users/:id/revoke-sessions
 */
export const revokeUserSessions = async (id: string) => {
  await findUserOrThrow(id); // 404 before touching sessions for an unknown id
  const revokedSessions = await sessionService.revokeAllUserSessions(id, 'admin_revoked');
  return { revokedSessions };
};

/**
 * DELETE /api/v1/admin/users/:id
 * Soft delete: keeps the document (orders/audit history reference it) but
 * flags it deleted and scrubs PII so it can no longer identify the person.
 */
export const softDeleteUser = async (id: string, adminId: string | undefined) => {
  assertNotSelf(id, adminId, 'delete');
  const user = await findUserOrThrow(id);

  if (user.isDeleted) throw new BadRequestError('User is already deleted');

  user.isDeleted = true;
  user.deletedAt = new Date();
  user.isActive = false;
  user.name = 'Deleted User';
  user.email = `deleted-${user._id.toString()}@deleted.epasaley.local`;
  user.phone = undefined;
  user.address = undefined;
  user.savedAddresses = [];
  user.avatarUrl = null;
  user.favorites = [];
  await user.save({ validateModifiedOnly: true });

  const revokedSessions = await sessionService.revokeAllUserSessions(id, 'admin_revoked');
  return { revokedSessions };
};

export default {
  listUsers,
  getUserDetail,
  lockUser,
  unlockUser,
  setUserStatus,
  revokeUserSessions,
  softDeleteUser,
};
