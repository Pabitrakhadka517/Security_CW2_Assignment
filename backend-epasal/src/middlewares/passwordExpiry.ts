import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Admin } from '../models/Admin';
import * as auditService from '../services/audit.service';
import { createAuditContext } from './auditLogger';

/**
 * Blocks access to protected routes once a password has expired (90-day
 * policy) or an account has been flagged with `mustChangePassword`. Must run
 * after `requireAuth`/`requireAuthAny` (needs `req.user`) and must NOT be
 * applied to the change-password route itself, or an expired account could
 * never fix it.
 *
 * Applies to both 'user' and 'admin'/'super_admin' roles — each model tracks
 * its own passwordExpiresAt/mustChangePassword fields.
 */
export const checkPasswordExpiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next();
      return;
    }

    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    const account = isAdmin
      ? await Admin.findById(req.user.id).select('passwordExpiresAt mustChangePassword')
      : await User.findById(req.user.id).select('passwordExpiresAt mustChangePassword');

    if (!account) {
      next();
      return;
    }

    const isExpired = account.mustChangePassword || account.passwordExpiresAt.getTime() < Date.now();
    if (isExpired) {
      await auditService.log({
        ...createAuditContext(req),
        action: 'PASSWORD_EXPIRED',
        status: 'BLOCKED',
        riskLevel: 'LOW',
        metadata: { mustChangePassword: account.mustChangePassword },
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
