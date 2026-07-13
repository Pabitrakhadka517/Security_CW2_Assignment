import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';
import { RefreshToken } from '../models/RefreshToken';
import * as sessionService from '../services/session.service';
import * as auditService from '../services/audit.service';
import { createAuditContext } from '../middlewares/auditLogger';
import { sendSuccess } from '../utils/responseHelper';

const requireUserId = (req: Request): string => {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError('Authentication required');
  return id;
};

/**
 * GET /api/v1/auth/sessions
 * Lists the caller's own active sessions across devices.
 */
export const listMySessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const sessions = await sessionService.getUserActiveSessions(userId, req);
  sendSuccess(res, 200, 'Active sessions retrieved', sessions);
});

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 * Revoke a single session — must belong to the caller.
 */
export const revokeMySession = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { sessionId } = req.params;

  const session = await RefreshToken.findById(sessionId);
  if (!session) throw new NotFoundError('Session not found');
  if (session.userId !== userId) {
    // Someone probing another user's session ids — same shape as an IDOR
    // attempt elsewhere in this app, so it gets flagged the same way.
    await auditService.log({
      ...createAuditContext(req),
      userId,
      action: 'IDOR_ATTEMPT',
      status: 'BLOCKED',
      riskLevel: 'HIGH',
      metadata: { targetSessionId: sessionId, targetUserId: session.userId },
    });
    throw new ForbiddenError('You do not have access to this session');
  }

  await sessionService.revokeSession(sessionId, 'logout');
  await auditService.log({
    ...createAuditContext(req),
    userId,
    action: 'LOGOUT',
    status: 'SUCCESS',
    riskLevel: 'LOW',
    metadata: { revokedRemotely: true, sessionId },
  });

  sendSuccess(res, 200, 'Session terminated');
});

/**
 * DELETE /api/v1/auth/sessions
 * "Log out all other devices" — revokes every active session except the one
 * making this request.
 */
export const revokeOtherSessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const currentSessionId = await sessionService.resolveCurrentSessionId(req, userId);
  const revokedCount = await sessionService.revokeAllUserSessions(userId, 'logout', currentSessionId);

  await auditService.log({
    ...createAuditContext(req),
    userId,
    action: 'LOGOUT',
    status: 'SUCCESS',
    riskLevel: 'LOW',
    metadata: { reason: 'logout_all_other_devices', revokedSessions: revokedCount },
  });

  sendSuccess(res, 200, 'Other sessions terminated', { revokedSessions: revokedCount });
});

/**
 * GET /api/v1/admin/sessions/:userId
 * Admin visibility into any user's active sessions.
 */
export const adminListUserSessions = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId) throw new BadRequestError('userId is required');

  await auditService.log({
    ...createAuditContext(req),
    action: 'ADMIN_USER_VIEWED',
    status: 'SUCCESS',
    riskLevel: 'LOW',
    metadata: { viewedUserId: userId, view: 'sessions' },
  });

  const sessions = await sessionService.getUserActiveSessions(userId);
  sendSuccess(res, 200, 'User sessions retrieved', sessions);
});

/**
 * DELETE /api/v1/admin/sessions/:userId
 * Force-revoke every active session for a user (e.g. suspected compromise).
 */
export const adminRevokeUserSessions = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId) throw new BadRequestError('userId is required');

  const revokedCount = await sessionService.revokeAllUserSessions(userId, 'admin_revoked');

  await auditService.log({
    ...createAuditContext(req),
    action: 'ADMIN_USER_VIEWED',
    status: 'SUCCESS',
    riskLevel: 'MEDIUM',
    metadata: { targetUserId: userId, action: 'force_revoke_sessions', revokedSessions: revokedCount },
  });

  sendSuccess(res, 200, 'User sessions revoked', { revokedSessions: revokedCount });
});
