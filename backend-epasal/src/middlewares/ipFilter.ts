import { Request, Response, NextFunction } from 'express';
import { ipListService } from '../services/ipList.service';
import * as auditService from '../services/audit.service';
import { createAuditContext } from './auditLogger';
import { logger } from '../utils/logger';

/**
 * IP allow/block enforcement — a separate layer on top of express-rate-limit
 * (see middlewares/rateLimiter.ts). Runs early in app.ts, before rate
 * limiters and routes, so a blocked IP never even consumes a rate-limit slot.
 *
 * `trust proxy` must be enabled in app.ts (it is) for `req.ip` to resolve to
 * the real client IP behind Render's proxy rather than the proxy's address.
 */
export const ipFilter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ctx = createAuditContext(req);
  const clientIP = ctx.ipAddress;

  try {
    // Allow-listed IPs bypass all restrictions — check first.
    if (await ipListService.isAllowed(clientIP)) {
      next();
      return;
    }

    if (await ipListService.isBlocked(clientIP)) {
      // Fire-and-forget so a blocked request still responds fast.
      auditService
        .log({
          ...ctx,
          action: 'SUSPICIOUS_ACTIVITY',
          status: 'BLOCKED',
          riskLevel: 'HIGH',
          metadata: { reason: 'ip_blocklist', path: req.path },
        })
        .catch((err) => logger.error('[ipFilter] audit log failed', { error: err instanceof Error ? err.message : err }));

      res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
      return;
    }

    next();
  } catch (err) {
    // Fail open — a DB outage in the IP-list check must never take down the
    // whole app. detectSuspiciousActivity / rate limiting still apply.
    logger.error('[ipFilter] IP check failed', { error: err instanceof Error ? err.message : err });
    next();
  }
};
