import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/audit.service';
import { createAuditContext } from './auditLogger';
import { alertService } from '../services/alert.service';

/**
 * Permission matrix — the single source of truth for what each role may do.
 * `req.user.role` comes only from a verified JWT (see authMiddleware), so
 * this can't be spoofed by a client-supplied field. The admin JWT now carries
 * the Admin document's real `role` field (see auth.controller#issueAdminSession),
 * so `super_admin` can appear here and is deliberately a strict superset of
 * `admin` (spread below) plus the handful of permissions gating the more
 * destructive security controls (IP allow/block-list mutation).
 */
const USER_PERMISSIONS = [
  'profile:read:own',
  'profile:update:own',
  'profile:delete:own',
  'profile:import:own',
  'order:read:own',
  'order:create',
  'order:cancel:own',
  'cart:read:own',
  'cart:update:own',
  'address:read:own',
  'address:create:own',
  'address:update:own',
  'address:delete:own',
  'wishlist:read:own',
  'wishlist:update:own',
  'product:read',
  'category:read',
  'coupon:validate',
  'mfa:manage:own',
  'password:change:own',
  'activity:read:own',
] as const;

const ADMIN_PERMISSIONS = [
  'profile:read:any',
  'profile:update:any',
  'order:read:any',
  'order:update:any',
  'order:cancel:any',
  'product:create',
  'product:update:any',
  'product:delete:any',
  'category:create',
  'category:update:any',
  'category:delete:any',
  'banner:create',
  'banner:update:any',
  'banner:delete:any',
  'coupon:create',
  'coupon:update:any',
  'coupon:delete:any',
  'user:read:any',
  'user:update:any',
  'user:delete:any',
  'audit:read:any',
  'security:read:any',
] as const;

// super_admin is a strict superset of admin, plus the ability to mutate the
// system-wide IP allow/block list (regular admins can only read it — see
// ipManagement.routes.ts).
const SUPER_ADMIN_PERMISSIONS = [...ADMIN_PERMISSIONS, 'security:manage:any'] as const;

export const PERMISSIONS = {
  user: USER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  super_admin: SUPER_ADMIN_PERMISSIONS,
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS][number];

/**
 * Requires the authenticated caller's role to be granted `permission` in
 * PERMISSIONS. Must run after `requireAuth`/`requireAdmin` so `req.user` is
 * populated — a missing/unrecognized role fails closed (403).
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as keyof typeof PERMISSIONS | undefined;

    if (!userRole || !PERMISSIONS[userRole]) {
      res.status(403).json({
        success: false,
        message: 'Access denied — no role assigned',
      });
      return;
    }

    const allowed = (PERMISSIONS[userRole] as readonly string[]).includes(permission);

    if (!allowed) {
      void auditService.log({
        ...createAuditContext(req),
        action: 'PRIVILEGE_ESCALATION_ATTEMPT',
        status: 'BLOCKED',
        riskLevel: 'HIGH',
        metadata: {
          requiredPermission: permission,
          userRole,
          endpoint: req.path,
          method: req.method,
        },
      });

      void alertService.triggerAlert({
        type: 'PRIVILEGE_ESCALATION',
        riskLevel: 'CRITICAL',
        message: 'User attempted to access a restricted resource',
        ipAddress: req.ip || 'unknown',
        userId: req.user?.id,
        metadata: { permission, endpoint: req.path },
        timestamp: new Date(),
      });

      res.status(403).json({
        success: false,
        message: 'Access denied — insufficient permissions',
      });
      return;
    }

    next();
  };
}
