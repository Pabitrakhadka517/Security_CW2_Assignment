import { Request } from 'express';
import crypto from 'crypto';
import { RefreshToken, IRefreshToken, RefreshTokenRole, RevokedReason } from '../models/RefreshToken';
import { User } from '../models/User';
import { decodeToken } from '../utils/tokenGenerator';
import { generateDeviceId, parseDeviceName, isSameDevice } from './deviceFingerprint.service';
import * as auditService from './audit.service';
import { createAuditContext } from '../middlewares/auditLogger';

const MAX_SESSIONS_PER_USER = Number(process.env.MAX_SESSIONS_PER_USER) || 3;
const ENABLE_DEVICE_BINDING = process.env.ENABLE_DEVICE_BINDING === 'true';
// Hard ceiling on a session's total lifetime, independent of activity/rotation.
const ABSOLUTE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export interface ValidateSessionResult {
  valid: boolean;
  reason?: string;
  session?: IRefreshToken;
  deviceMismatch?: boolean;
}

export interface SessionInfo {
  sessionId: string;
  deviceName: string;
  ipAddress: string;
  lastUsedAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

/**
 * Issues a new tracked session for a freshly-authenticated user/admin.
 * Enforces MAX_SESSIONS_PER_USER by evicting the oldest active session
 * (by last activity) once the cap is reached, so login doesn't sit in a
 * blocked/queued state — it just quietly retires the least-recently-used
 * device.
 */
export const createSession = async (
  userId: string,
  role: RefreshTokenRole,
  req: Request,
  refreshToken: string
): Promise<IRefreshToken> => {
  const ctx = createAuditContext(req);
  const deviceId = generateDeviceId(req);
  const deviceName = parseDeviceName(req.headers['user-agent'] as string | undefined);

  const activeCount = await RefreshToken.countDocuments({ userId, revoked: false });
  if (activeCount >= MAX_SESSIONS_PER_USER) {
    const oldest = await RefreshToken.findOne({ userId, revoked: false }).sort({ lastUsedAt: 1 });
    if (oldest) {
      oldest.revoked = true;
      oldest.revokedAt = new Date();
      oldest.revokedReason = 'new_login_limit';
      // Only validate the fields actually being changed — legacy rows that
      // predate ipAddress/deviceId being required must still be revocable.
      await oldest.save({ validateModifiedOnly: true });

      await auditService.log({
        ...ctx,
        userId,
        userRole: role,
        action: 'LOGOUT',
        status: 'SUCCESS',
        riskLevel: 'LOW',
        metadata: { reason: 'session_limit_exceeded', revokedSessionId: oldest._id.toString() },
      });
    }
  }

  const hash = hashToken(refreshToken);
  const decoded: any = decodeToken(refreshToken) || {};
  const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + ABSOLUTE_SESSION_MS);

  const session = await RefreshToken.create({
    tokenHash: hash,
    userId,
    role,
    expiresAt,
    revoked: false,
    deviceId,
    deviceName,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    lastUsedAt: new Date(),
    absoluteExpiry: new Date(Date.now() + ABSOLUTE_SESSION_MS),
  });

  return session;
};

/**
 * Validates a refresh token against session state (not just JWT signature/
 * exp — callers should still verify the JWT itself). Checks revocation, the
 * absolute 7-day ceiling, and whether the account's password changed after
 * this session was created. Never auto-revokes on a device fingerprint
 * mismatch (VPNs/browser updates change it legitimately) — it only flags it.
 */
export const validateSession = async (refreshToken: string, req: Request): Promise<ValidateSessionResult> => {
  const hash = hashToken(refreshToken);
  const session = await RefreshToken.findOne({ tokenHash: hash });

  if (!session) return { valid: false, reason: 'not_found' };
  if (session.revoked) return { valid: false, reason: 'revoked' };

  const now = new Date();

  if (session.absoluteExpiry && session.absoluteExpiry < now) {
    session.revoked = true;
    session.revokedAt = now;
    session.revokedReason = 'session_expired';
    await session.save({ validateModifiedOnly: true });
    return { valid: false, reason: 'session_expired' };
  }

  if (session.expiresAt && session.expiresAt < now) {
    return { valid: false, reason: 'session_expired' };
  }

  // Admin accounts don't track passwordChangedAt today, so this check only
  // applies to regular users.
  if (session.role === 'user') {
    const user = await User.findById(session.userId).select('passwordChangedAt');
    if (user?.passwordChangedAt && session.createdAt && user.passwordChangedAt > session.createdAt) {
      session.revoked = true;
      session.revokedAt = now;
      session.revokedReason = 'password_changed';
      await session.save({ validateModifiedOnly: true });
      return { valid: false, reason: 'password_changed' };
    }
  }

  let deviceMismatch = false;
  if (ENABLE_DEVICE_BINDING && session.deviceId && !isSameDevice(req, session.deviceId)) {
    deviceMismatch = true;
    const ctx = createAuditContext(req);
    await auditService.log({
      ...ctx,
      userId: session.userId,
      userRole: session.role,
      action: 'SUSPICIOUS_ACTIVITY',
      status: 'SUCCESS',
      riskLevel: 'HIGH',
      metadata: { reason: 'device_mismatch', expectedDevice: session.deviceName },
    });
  }

  session.lastUsedAt = now;
  await session.save({ validateModifiedOnly: true });

  return { valid: true, session, deviceMismatch };
};

export const revokeSession = async (sessionId: string, reason: RevokedReason | string): Promise<void> => {
  const session = await RefreshToken.findById(sessionId);
  if (!session) return;
  session.revoked = true;
  session.revokedAt = new Date();
  session.revokedReason = reason as RevokedReason;
  await session.save({ validateModifiedOnly: true });
};

export const revokeAllUserSessions = async (
  userId: string,
  reason: RevokedReason | string,
  exceptSessionId?: string | null
): Promise<number> => {
  const filter: Record<string, unknown> = { userId, revoked: false };
  if (exceptSessionId) filter._id = { $ne: exceptSessionId };

  const result = await RefreshToken.updateMany(filter, {
    $set: { revoked: true, revokedAt: new Date(), revokedReason: reason },
  });

  return result.modifiedCount ?? 0;
};

export const getUserActiveSessions = async (userId: string, req?: Request): Promise<SessionInfo[]> => {
  const currentDeviceId = req ? generateDeviceId(req) : null;
  const sessions = await RefreshToken.find({
    userId,
    revoked: false,
    $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }],
  })
    .sort({ lastUsedAt: -1 })
    .lean();

  return sessions.map((s) => ({
    sessionId: s._id.toString(),
    deviceName: s.deviceName || 'Unknown Device',
    ipAddress: s.ipAddress,
    lastUsedAt: s.lastUsedAt,
    createdAt: (s as any).createdAt,
    isCurrent: !!(currentDeviceId && s.deviceId && s.deviceId === currentDeviceId),
  }));
};

/**
 * Best-effort lookup of the RefreshToken document backing the caller's
 * current session, used so a state-changing action (password change) can
 * revoke every OTHER session while leaving the caller logged in.
 *
 * The refresh-token cookie is scoped to `/api/v1/auth` (see cookieOptions.ts),
 * so it isn't sent on requests to e.g. `/api/v1/user/profile/password` — in
 * that case we fall back to matching by device fingerprint, which is looser
 * but keeps the caller's own session alive rather than logging everyone out
 * indiscriminately.
 */
export const resolveCurrentSessionId = async (req: Request, userId: string): Promise<string | null> => {
  const token = req.cookies?.refreshToken;
  if (token) {
    const session = await RefreshToken.findOne({ tokenHash: hashToken(token), userId });
    if (session) return session._id.toString();
  }

  const deviceId = generateDeviceId(req);
  const session = await RefreshToken.findOne({ userId, deviceId, revoked: false }).sort({ lastUsedAt: -1 });
  return session ? session._id.toString() : null;
};

export default {
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions,
  getUserActiveSessions,
  resolveCurrentSessionId,
};
