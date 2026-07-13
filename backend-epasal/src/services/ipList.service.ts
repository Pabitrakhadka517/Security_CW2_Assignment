import mongoose from 'mongoose';
import { IPRule, IIPRule } from '../models/IPRule';
import * as auditService from './audit.service';
import { alertService } from './alert.service';
import { logger } from '../utils/logger';

// ── In-memory cache ───────────────────────────────────────────────────────
// Avoids a DB roundtrip on every single request. Refreshed every 5 minutes,
// or immediately after any write through this service.
interface IPCache {
  blocked: Set<string>;
  allowed: Set<string>;
  loadedAt: Date | null;
}

const cache: IPCache = {
  blocked: new Set(),
  allowed: new Set(),
  loadedAt: null,
};

const CACHE_TTL_MS = 5 * 60 * 1000;

function isCacheStale(): boolean {
  if (!cache.loadedAt) return true;
  return Date.now() - cache.loadedAt.getTime() > CACHE_TTL_MS;
}

async function refreshCache(): Promise<void> {
  try {
    const rules = await IPRule.find({
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).lean();

    const blocked = new Set<string>();
    const allowed = new Set<string>();

    rules.forEach((rule) => {
      if (rule.type === 'block') blocked.add(rule.ip);
      else allowed.add(rule.ip);
    });

    const envAllowList = (process.env.IP_ALLOWLIST ?? '')
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
    const envBlockList = (process.env.IP_BLOCKLIST ?? '')
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    envAllowList.forEach((ip) => allowed.add(ip));
    envBlockList.forEach((ip) => blocked.add(ip));

    cache.blocked = blocked;
    cache.allowed = allowed;
    cache.loadedAt = new Date();
  } catch (err) {
    // Keep serving the stale (or empty) cache rather than throwing — a
    // transient Mongo blip must never take down request handling.
    logger.error('[IPList] Cache refresh failed', { error: err instanceof Error ? err.message : err });
  }
}

async function ensureCache(): Promise<void> {
  if (isCacheStale()) {
    await refreshCache();
  }
}

export interface BlockIPOptions {
  ip: string;
  reason: string;
  adminId?: string;
  permanent?: boolean;
  expiresInHours?: number;
  autoBlocked?: boolean;
}

export interface AllowIPOptions {
  ip: string;
  reason: string;
  adminId: string;
}

export interface AutoBlockIPOptions {
  ip: string;
  reason: string;
  userId?: string | null;
  userEmail?: string | null;
}

export interface IPListStats {
  totalBlocked: number;
  totalAllowed: number;
  autoBlocked: number;
  permanentBlocked: number;
  expiringIn24h: number;
}

async function isBlocked(ip: string): Promise<boolean> {
  await ensureCache();
  // Allow-listed IPs can never be blocked, regardless of what's in the block list.
  if (cache.allowed.has(ip)) return false;
  return cache.blocked.has(ip);
}

async function isAllowed(ip: string): Promise<boolean> {
  await ensureCache();
  return cache.allowed.has(ip);
}

async function blockIP(options: BlockIPOptions): Promise<IIPRule> {
  const { ip, reason, adminId, permanent = false, expiresInHours, autoBlocked = false } = options;

  let expiresAt: Date | null = null;
  if (!permanent) {
    const hours = expiresInHours ?? parseInt(process.env.IP_AUTO_BLOCK_HOURS ?? '24', 10);
    expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  const rule = await IPRule.findOneAndUpdate(
    { ip },
    {
      $set: {
        ip,
        type: 'block',
        reason,
        addedBy: adminId ? new mongoose.Types.ObjectId(adminId) : null,
        addedByType: adminId ? 'admin' : 'system',
        permanent,
        expiresAt,
        autoBlocked,
      },
    },
    { upsert: true, new: true }
  );

  cache.blocked.add(ip);
  cache.allowed.delete(ip);

  await auditService.log({
    userId: adminId ?? null,
    action: 'SUSPICIOUS_ACTIVITY',
    status: 'BLOCKED',
    riskLevel: 'HIGH',
    ipAddress: ip,
    metadata: {
      type: 'ip_blocked',
      reason,
      permanent,
      expiresAt: expiresAt?.toISOString() ?? null,
      autoBlocked,
      addedBy: adminId ?? 'system',
    },
  });

  return rule as IIPRule;
}

async function allowIP(options: AllowIPOptions): Promise<IIPRule> {
  const { ip, reason, adminId } = options;

  const rule = await IPRule.findOneAndUpdate(
    { ip },
    {
      $set: {
        ip,
        type: 'allow',
        reason,
        addedBy: new mongoose.Types.ObjectId(adminId),
        addedByType: 'admin',
        permanent: true,
        expiresAt: null,
        autoBlocked: false,
      },
    },
    { upsert: true, new: true }
  );

  cache.allowed.add(ip);
  cache.blocked.delete(ip);

  await auditService.log({
    userId: adminId,
    action: 'SUSPICIOUS_ACTIVITY',
    status: 'SUCCESS',
    riskLevel: 'LOW',
    ipAddress: ip,
    metadata: { type: 'ip_allowed', reason, addedBy: adminId },
  });

  return rule as IIPRule;
}

async function unblockIP(ip: string): Promise<boolean> {
  const result = await IPRule.deleteOne({ ip, type: 'block' });
  cache.blocked.delete(ip);
  return result.deletedCount > 0;
}

async function removeFromAllowList(ip: string): Promise<boolean> {
  const result = await IPRule.deleteOne({ ip, type: 'allow' });
  cache.allowed.delete(ip);
  return result.deletedCount > 0;
}

/**
 * Called from detectSuspiciousActivity() after a CRITICAL brute-force /
 * credential-stuffing detection. Never blocks an allow-listed IP, and is a
 * no-op if the IP is already blocked (avoids resetting the expiry on every
 * subsequent failed attempt).
 */
async function autoBlockIP(options: AutoBlockIPOptions): Promise<void> {
  const { ip, reason, userId, userEmail } = options;

  await ensureCache();
  if (cache.allowed.has(ip)) {
    logger.info('[IPList] Skipping auto-block of allow-listed IP', { ip });
    return;
  }
  if (cache.blocked.has(ip)) {
    return;
  }

  const hours = parseInt(process.env.IP_AUTO_BLOCK_HOURS ?? '24', 10);

  await blockIP({
    ip,
    reason,
    autoBlocked: true,
    permanent: false,
    expiresInHours: hours,
  });

  await alertService.triggerAlert({
    type: 'IP_AUTO_BLOCKED',
    riskLevel: 'HIGH',
    message: `IP ${ip} automatically blocked: ${reason}`,
    ipAddress: ip,
    userId: userId ?? undefined,
    userEmail: userEmail ?? undefined,
    metadata: { reason, blockDurationHours: hours },
    timestamp: new Date(),
  });
}

async function getBlockedIPs(): Promise<IIPRule[]> {
  return IPRule.find({ type: 'block' }).sort({ createdAt: -1 }).lean() as unknown as IIPRule[];
}

async function getAllowedIPs(): Promise<IIPRule[]> {
  return IPRule.find({ type: 'allow' }).sort({ createdAt: -1 }).lean() as unknown as IIPRule[];
}

async function getStats(): Promise<IPListStats> {
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [totalBlocked, totalAllowed, autoBlocked, permanentBlocked, expiringIn24h] = await Promise.all([
    IPRule.countDocuments({ type: 'block' }),
    IPRule.countDocuments({ type: 'allow' }),
    IPRule.countDocuments({ type: 'block', autoBlocked: true }),
    IPRule.countDocuments({ type: 'block', permanent: true }),
    IPRule.countDocuments({ type: 'block', expiresAt: { $gt: new Date(), $lt: in24h } }),
  ]);

  return { totalBlocked, totalAllowed, autoBlocked, permanentBlocked, expiringIn24h };
}

/** Force an immediate cache refresh — call after bulk/out-of-band DB writes. */
async function invalidateCache(): Promise<void> {
  cache.loadedAt = null;
  await refreshCache();
}

export const ipListService = {
  isBlocked,
  isAllowed,
  blockIP,
  allowIP,
  unblockIP,
  removeFromAllowList,
  autoBlockIP,
  getBlockedIPs,
  getAllowedIPs,
  getStats,
  invalidateCache,
};

export default ipListService;
