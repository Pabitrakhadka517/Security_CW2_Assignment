import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as adminUserService from '../services/adminUser.service';
import * as auditService from '../services/audit.service';
import { createAuditContext } from '../middlewares/auditLogger';
import { sendSuccess, sendPaginatedResponse } from '../utils/responseHelper';

/**
 * GET /api/v1/admin/users
 */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminUserService.listUsers(req.query as any);
  sendPaginatedResponse(
    res,
    result.users,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
    'Users retrieved successfully'
  );
});

/**
 * GET /api/v1/admin/users/:id
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const detail = await adminUserService.getUserDetail(id);

  await auditService.log({
    ...createAuditContext(req),
    action: 'ADMIN_USER_VIEWED',
    status: 'SUCCESS',
    riskLevel: 'LOW',
    metadata: { targetUserId: id },
  });

  sendSuccess(res, 200, 'User retrieved successfully', detail);
});

/**
 * PATCH /api/v1/admin/users/:id/lock
 */
export const lockUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, durationMinutes } = req.body;

  const result = await adminUserService.lockUser(id, req.user?.id, durationMinutes);

  await auditService.log({
    ...createAuditContext(req),
    action: 'ADMIN_USER_LOCKED',
    status: 'SUCCESS',
    riskLevel: 'HIGH',
    metadata: { targetUserId: id, reason, lockUntil: result.lockUntil, revokedSessions: result.revokedSessions },
  });

  sendSuccess(res, 200, 'User account locked', result);
});

/**
 * PATCH /api/v1/admin/users/:id/unlock
 */
export const unlockUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await adminUserService.unlockUser(id);

  await auditService.log({
    ...createAuditContext(req),
    action: 'ADMIN_USER_UNLOCKED',
    status: 'SUCCESS',
    riskLevel: 'MEDIUM',
    metadata: { targetUserId: id },
  });

  sendSuccess(res, 200, 'User account unlocked', result);
});

/**
 * PATCH /api/v1/admin/users/:id/status
 */
export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isActive, reason } = req.body;

  const result = await adminUserService.setUserStatus(id, isActive, req.user?.id);

  await auditService.log({
    ...createAuditContext(req),
    action: isActive ? 'ADMIN_USER_ACTIVATED' : 'ADMIN_USER_DEACTIVATED',
    status: 'SUCCESS',
    riskLevel: 'HIGH',
    metadata: { targetUserId: id, reason, revokedSessions: result.revokedSessions },
  });

  sendSuccess(res, 200, isActive ? 'User account activated' : 'User account deactivated', result);
});

/**
 * POST /api/v1/admin/users/:id/revoke-sessions
 */
export const revokeSessions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await adminUserService.revokeUserSessions(id);

  await auditService.log({
    ...createAuditContext(req),
    action: 'ADMIN_SESSIONS_REVOKED',
    status: 'SUCCESS',
    riskLevel: 'HIGH',
    metadata: { targetUserId: id, revokedSessions: result.revokedSessions },
  });

  sendSuccess(res, 200, 'User sessions revoked', result);
});

/**
 * DELETE /api/v1/admin/users/:id
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await adminUserService.softDeleteUser(id, req.user?.id);

  await auditService.log({
    ...createAuditContext(req),
    action: 'ADMIN_USER_DELETED',
    status: 'SUCCESS',
    riskLevel: 'CRITICAL',
    metadata: { targetUserId: id, revokedSessions: result.revokedSessions },
  });

  sendSuccess(res, 200, 'User account deleted', result);
});
