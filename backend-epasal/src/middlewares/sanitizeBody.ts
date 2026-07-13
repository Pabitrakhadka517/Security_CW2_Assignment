import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/audit.service';
import { createAuditContext } from './auditLogger';

export const USER_PROTECTED_FIELDS = [
  'role',
  'isAdmin',
  'loginAttempts',
  'lockUntil',
  'mfaSecret',
  'mfaBackupCodes',
  'passwordHistory',
  'passwordExpiresAt',
  'mustChangePassword',
  'createdAt',
  '_id',
  'id',
];

/**
 * Strips fields a client must never be able to set directly (role,
 * lockout/MFA state, etc.) from a self-service update body before it
 * reaches validation/the controller.
 *
 * Deliberately runs BEFORE `validateRequest`: the Joi schemas for these
 * routes reject unknown keys outright, so stripping first (rather than
 * letting Joi 400 the whole request) lets a legitimate update with an
 * illegitimate extra field still succeed on its legitimate fields — the
 * behaviour a mass-assignment attempt should see is "field silently
 * ignored", not "here's exactly which field we reject" or "your whole
 * request failed".
 */
export function preventMassAssignment(protectedFields: string[] = USER_PROTECTED_FIELDS) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.body || typeof req.body !== 'object') {
      next();
      return;
    }

    const violations = protectedFields.filter((field) => field in req.body);

    if (violations.length > 0) {
      void auditService.log({
        ...createAuditContext(req),
        action: 'PRIVILEGE_ESCALATION_ATTEMPT',
        status: 'BLOCKED',
        riskLevel: 'HIGH',
        metadata: {
          type: 'mass_assignment',
          attemptedFields: violations,
        },
      });

      violations.forEach((field) => {
        delete req.body[field];
      });
    }

    next();
  };
}
