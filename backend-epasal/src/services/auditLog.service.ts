import { Request } from 'express';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

interface RecordAuditEventInput {
  req?: Request;
  actorType: 'user' | 'admin' | 'guest' | 'system';
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort audit trail write. Never throws — a logging failure must not
 * break the request it's observing (the caller has already done the thing
 * being logged by the time this runs).
 */
export const recordAuditEvent = async (input: RecordAuditEventInput): Promise<void> => {
  try {
    await AuditLog.create({
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      success: input.success,
      ip: input.req?.ip ?? null,
      userAgent: input.req?.get('user-agent') ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    logger.error('Failed to record audit event', {
      action: input.action,
      error: err instanceof Error ? err.message : err,
    });
  }
};
