import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import * as auditService from '../services/audit.service';
import { createAuditContext } from './auditLogger';

/**
 * Blocks access to protected user routes once a password has expired (90-day
 * policy) or an admin has flagged the account with `mustChangePassword`.
 * Must run after `requireAuth` (needs `req.user`) and must NOT be applied to
 * the change-password route itself, or an expired user could never fix it.
 *
 * Admin accounts don't carry this policy (no passwordExpiresAt field on the
 * Admin model), so this only acts on the 'user' role.
 */
export const checkPasswordExpiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'user') {
      next();
      return;
    }

    const user = await User.findById(req.user.id).select('passwordExpiresAt mustChangePassword');
    if (!user) {
      next();
      return;
    }

    const isExpired = user.mustChangePassword || user.passwordExpiresAt.getTime() < Date.now();
    if (isExpired) {
      await auditService.log({
        ...createAuditContext(req),
        action: 'PASSWORD_EXPIRED',
        status: 'BLOCKED',
        riskLevel: 'LOW',
        metadata: { mustChangePassword: user.mustChangePassword },
      });
      res.status(403).json({
        success: false,
        code: 'PASSWORD_EXPIRED',
        message: 'Your password has expired. Please update it to continue.',
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
};
