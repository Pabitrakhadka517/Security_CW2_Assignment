import { AuditLog, AuditAction, AuditStatus, AuditRiskLevel, AuditUserRole, IAuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';
import { sanitizeForLog } from '../utils/sanitize';
import { alertService } from './alert.service';

export interface AuditLogEntry {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: AuditUserRole;
  action: AuditAction;
  status: AuditStatus;
  ipAddress: string;
  userAgent?: string | null;
  requestId?: string | null;
  endpoint?: string | null;
  method?: string | null;
  metadata?: Record<string, unknown>;
  riskLevel?: AuditRiskLevel;
}

export interface SecurityEventFilters {
  userId?: string;
  action?: string;
  riskLevel?: string;
  from?: Date;
  to?: Date;
  ipAddress?: string;
}

export interface FailedLoginSummary {
  hours: number;
  totalFailed: number;
  topIps: Array<{ ipAddress: string; count: number; lastSeen: Date }>;
}

/**
 * Writes one audit event. Never throws — an audit write failure (e.g. Mongo
 * briefly unreachable) must never break the request it's observing, so any
 * error here is swallowed and logged instead of propagated.
 */
export const log = async (entry: AuditLogEntry): Promise<void> => {
  try {
    await AuditLog.create({
      userId: entry.userId || null,
      userEmail: entry.userEmail || null,
      userRole: entry.userRole || 'guest',
      action: entry.action,
      status: entry.status,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent ?? null,
      requestId: entry.requestId ?? null,
      endpoint: entry.endpoint ?? null,
      method: entry.method ?? null,
      metadata: sanitizeForLog(entry.metadata || {}),
      riskLevel: entry.riskLevel || 'LOW',
    });
  } catch (err) {
    logger.error('Failed to write audit log', {
      action: entry.action,
      error: err instanceof Error ? err.message : err,
    });
  }
};

export const getRecentActivity = async (userId: string, limit: number = 20): Promise<IAuditLog[]> => {
  return AuditLog.find({ userId }).sort({ timestamp: -1 }).limit(limit).lean() as unknown as IAuditLog[];
};

export const getSecurityEvents = async (
  filters: SecurityEventFilters,
  page: number = 1,
  limit: number = 50
): Promise<{ logs: IAuditLog[]; total: number }> => {
  const query: Record<string, unknown> = {};
  if (filters.userId) query.userId = filters.userId;
  if (filters.action) query.action = filters.action;
  if (filters.riskLevel) query.riskLevel = filters.riskLevel;
  if (filters.ipAddress) query.ipAddress = filters.ipAddress;
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = filters.from;
    if (filters.to) range.$lte = filters.to;
    query.timestamp = range;
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(200, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(safeLimit).lean(),
    AuditLog.countDocuments(query),
  ]);

  return { logs: logs as unknown as IAuditLog[], total };
};

/**
 * Runs three heuristics against the last 5-15 minutes of login activity for
 * the given IP (and, for the third check, the given user). Call after every
 * login attempt — success or failure — so brute force, credential stuffing,
 * and "succeeded after a burst of failures elsewhere" all get flagged.
 */
export const detectSuspiciousActivity = async (ipAddress: string, userId?: string | null): Promise<void> => {
  try {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 1. Brute force: 10+ failed logins from this IP in 15 minutes.
    const failedFromIp = await AuditLog.countDocuments({
      ipAddress,
      action: 'LOGIN_FAILED',
      timestamp: { $gte: fifteenMinAgo },
    });
    if (failedFromIp >= 10) {
      await log({
        userId: userId || null,
        action: 'SUSPICIOUS_ACTIVITY',
        status: 'BLOCKED',
        ipAddress,
        riskLevel: 'CRITICAL',
        metadata: { reason: 'brute_force', failedAttempts: failedFromIp, windowMinutes: 15 },
      });
      await alertService.triggerAlert({
        type: 'BRUTE_FORCE_DETECTED',
        riskLevel: 'CRITICAL',
        message: `${failedFromIp} failed logins from IP in 15 minutes`,
        ipAddress,
        userId: userId || undefined,
        metadata: { failedCount: failedFromIp },
        timestamp: new Date(),
      });
    }

    // 2. Credential stuffing: 3+ distinct accounts targeted from this IP in 5 minutes.
    const distinctEmails = await AuditLog.distinct('userEmail', {
      ipAddress,
      action: 'LOGIN_FAILED',
      timestamp: { $gte: fiveMinAgo },
    });
    const distinctCount = distinctEmails.filter(Boolean).length;
    if (distinctCount >= 3) {
      await log({
        userId: userId || null,
        action: 'SUSPICIOUS_ACTIVITY',
        status: 'BLOCKED',
        ipAddress,
        riskLevel: 'HIGH',
        metadata: { reason: 'credential_stuffing', distinctAccounts: distinctCount, windowMinutes: 5 },
      });
      await alertService.triggerAlert({
        type: 'CREDENTIAL_STUFFING_DETECTED',
        riskLevel: 'CRITICAL',
        message: `${distinctCount} different accounts targeted from same IP`,
        ipAddress,
        userId: userId || undefined,
        metadata: { uniqueTargets: distinctCount },
        timestamp: new Date(),
      });
    }

    // 3. This login succeeded from `ipAddress`, but the same account racked up
    // 5+ failures from a *different* IP in the last 15 minutes — flag the
    // account takeover risk even though the login itself was valid.
    if (userId) {
      const recentFailures = await AuditLog.find({
        userId,
        action: 'LOGIN_FAILED',
        timestamp: { $gte: fifteenMinAgo },
      })
        .select('ipAddress')
        .lean();

      const failuresFromOtherIps = recentFailures.filter((f) => f.ipAddress && f.ipAddress !== ipAddress);
      if (failuresFromOtherIps.length >= 5) {
        await log({
          userId,
          action: 'SUSPICIOUS_ACTIVITY',
          status: 'SUCCESS',
          ipAddress,
          riskLevel: 'HIGH',
          metadata: {
            reason: 'login_success_after_failed_attempts_different_ip',
            failedAttempts: failuresFromOtherIps.length,
          },
        });
        await alertService.triggerAlert({
          type: 'ACCOUNT_TAKEOVER_ATTEMPT',
          riskLevel: 'HIGH',
          message: 'Successful login after multiple failures from a different IP',
          ipAddress,
          userId,
          metadata: { previousFailures: failuresFromOtherIps.length },
          timestamp: new Date(),
        });
      }
    }
  } catch (err) {
    logger.error('detectSuspiciousActivity failed', { error: err instanceof Error ? err.message : err });
  }
};

export const getFailedLoginSummary = async (hours: number = 24): Promise<FailedLoginSummary> => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [grouped, totalFailed] = await Promise.all([
    AuditLog.aggregate([
      { $match: { action: 'LOGIN_FAILED', timestamp: { $gte: since } } },
      { $group: { _id: '$ipAddress', count: { $sum: 1 }, lastSeen: { $max: '$timestamp' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    AuditLog.countDocuments({ action: 'LOGIN_FAILED', timestamp: { $gte: since } }),
  ]);

  return {
    hours,
    totalFailed,
    topIps: grouped.map((g) => ({ ipAddress: g._id, count: g.count, lastSeen: g.lastSeen })),
  };
};

/**
 * Aggregates everything the admin Security Dashboard summary card row needs:
 * 24h counts (with a trend vs. the previous 24h), a breakdown by action type,
 * the most recent high/critical-risk events, and the top-offending IPs.
 */
export const getAuditSummary = async () => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const prev24h = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const countIn = (match: Record<string, unknown>, from: Date, to?: Date) =>
    AuditLog.countDocuments({ ...match, timestamp: to ? { $gte: from, $lt: to } : { $gte: from } });

  const [
    loginAttempts,
    loginAttemptsPrev,
    failedLogins,
    failedLoginsPrev,
    blockedAccounts,
    blockedAccountsPrev,
    suspiciousIps,
    suspiciousIpsPrev,
    actionCounts,
    topRiskEvents,
    failedLoginSummary,
  ] = await Promise.all([
    countIn({ action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] } }, since24h),
    countIn({ action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] } }, prev24h, since24h),
    countIn({ action: 'LOGIN_FAILED' }, since24h),
    countIn({ action: 'LOGIN_FAILED' }, prev24h, since24h),
    countIn({ action: 'LOGIN_BLOCKED_LOCKOUT' }, since24h),
    countIn({ action: 'LOGIN_BLOCKED_LOCKOUT' }, prev24h, since24h),
    AuditLog.distinct('ipAddress', { action: 'SUSPICIOUS_ACTIVITY', timestamp: { $gte: since24h } }),
    AuditLog.distinct('ipAddress', { action: 'SUSPICIOUS_ACTIVITY', timestamp: { $gte: prev24h, $lt: since24h } }),
    AuditLog.aggregate([
      { $match: { timestamp: { $gte: since24h } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    AuditLog.find({ riskLevel: { $in: ['HIGH', 'CRITICAL'] }, timestamp: { $gte: since24h } })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean(),
    getFailedLoginSummary(24),
  ]);

  return {
    summary: {
      totalLoginAttempts: { count: loginAttempts, previousCount: loginAttemptsPrev },
      failedLogins: { count: failedLogins, previousCount: failedLoginsPrev },
      blockedAccounts: { count: blockedAccounts, previousCount: blockedAccountsPrev },
      suspiciousIps: { count: suspiciousIps.length, previousCount: suspiciousIpsPrev.length },
    },
    actionCounts: actionCounts.map((a: any) => ({ action: a._id, count: a.count })),
    topRiskEvents,
    topSuspiciousIps: failedLoginSummary.topIps,
    failedLoginSummary,
  };
};

export default { log, getRecentActivity, getSecurityEvents, detectSuspiciousActivity, getFailedLoginSummary, getAuditSummary };
