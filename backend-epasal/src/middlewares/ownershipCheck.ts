import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/audit.service';
import { createAuditContext } from './auditLogger';
import { alertService } from '../services/alert.service';

/**
 * Generic IDOR guard for routes where a URL param directly names the
 * resource owner's user id (e.g. `/user/:id`). Admins bypass the check —
 * they legitimately access any resource.
 *
 * Most routes in this app avoid the need for this by scoping the DB query
 * itself to `req.user.id` (see order.service#getMyOrderById) rather than
 * trusting a route param, which also avoids leaking existence via a 403 vs
 * 404 oracle. Use this middleware only where the param genuinely IS the
 * owner's user id.
 */
export function requireOwnership(paramName: string = 'id', resourceType: string = 'resource') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestedId = req.params[paramName];
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (requesterRole === 'admin') {
      next();
      return;
    }

    if (!requesterId || requestedId !== requesterId) {
      void auditService.log({
        ...createAuditContext(req),
        action: 'IDOR_ATTEMPT',
        status: 'BLOCKED',
        riskLevel: 'HIGH',
        metadata: {
          requestedResourceId: requestedId,
          requesterId: requesterId ?? null,
          resourceType,
          endpoint: req.path,
          method: req.method,
        },
      });

      void alertService.triggerAlert({
        type: 'IDOR_ATTEMPT',
        riskLevel: 'HIGH',
        message: `User attempted to access another user's ${resourceType}`,
        ipAddress: req.ip || 'unknown',
        userId: requesterId,
        metadata: { requestedId: requestedId, endpoint: req.path },
        timestamp: new Date(),
      });

      res.status(403).json({
        success: false,
        message: `Access denied — you can only access your own ${resourceType}`,
      });
      return;
    }

    next();
  };
}
