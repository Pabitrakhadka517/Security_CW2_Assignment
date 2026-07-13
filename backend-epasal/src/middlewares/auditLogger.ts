import { Request } from 'express';
import { AuditUserRole } from '../models/AuditLog';

export interface AuditContext {
  userId: string | null;
  userEmail: string | null;
  userRole: AuditUserRole;
  ipAddress: string;
  userAgent: string | null;
  requestId: string | null;
  endpoint: string;
  method: string;
}

/**
 * Builds the WHO/WHERE/HOW fields shared by every audit log entry. Called
 * directly inside controllers (not mounted as middleware) so it can run
 * after the operation's outcome is known and be spread into `auditService.log`.
 */
export const createAuditContext = (req: Request): AuditContext => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress =
    req.ip ||
    (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : forwardedFor?.[0]) ||
    req.socket?.remoteAddress ||
    'unknown';

  return {
    userId: req.user?.id ?? null,
    userEmail: req.user?.email ?? null,
    userRole: (req.user?.role as AuditUserRole) ?? 'guest',
    ipAddress,
    userAgent: req.headers['user-agent'] ?? null,
    requestId: (req.headers['x-request-id'] as string) ?? (req.res?.locals?.requestId as string) ?? null,
    endpoint: req.path,
    method: req.method,
  };
};
