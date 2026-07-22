import mongoose, { Schema, Document } from 'mongoose';

export const AUDIT_ACTIONS = [
  // Auth events
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGIN_BLOCKED_LOCKOUT',
  'LOGIN_BLOCKED_RATE_LIMIT',
  'LOGOUT',
  'REGISTER',
  'TOKEN_REFRESH',
  'TOKEN_REFRESH_FAILED',

  // MFA events
  'MFA_ENABLED',
  'MFA_DISABLED',
  'MFA_CHALLENGE_SUCCESS',
  'MFA_CHALLENGE_FAILED',
  'MFA_BACKUP_CODE_USED',

  // Password events
  'PASSWORD_CHANGED',
  'PASSWORD_CHANGE_FAILED',
  'PASSWORD_EXPIRED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'PASSWORDLESS_LOGIN_REQUESTED',
  'EMAIL_VERIFIED',

  // Profile events
  'PROFILE_UPDATED',
  'AVATAR_UPDATED',
  'ADDRESS_ADDED',
  'ADDRESS_UPDATED',
  'ADDRESS_DELETED',
  'DATA_EXPORTED',
  'DATA_IMPORTED',

  // Admin events
  'ADMIN_LOGIN_SUCCESS',
  'ADMIN_LOGIN_FAILED',
  'ADMIN_PRODUCT_CREATED',
  'ADMIN_PRODUCT_UPDATED',
  'ADMIN_PRODUCT_DELETED',
  'ADMIN_ORDER_STATUS_CHANGED',
  'ADMIN_COUPON_CREATED',
  'ADMIN_USER_VIEWED',
  'ADMIN_USER_LOCKED',
  'ADMIN_USER_UNLOCKED',
  'ADMIN_USER_ACTIVATED',
  'ADMIN_USER_DEACTIVATED',
  'ADMIN_SESSIONS_REVOKED',
  'ADMIN_USER_DELETED',

  // Order events
  'ORDER_CREATED',
  'ORDER_CANCELLED',

  // Payment events
  'ORDER_PAYMENT_INITIATED',
  'ORDER_PAYMENT_SUCCESS',
  'ORDER_PAYMENT_FAILED',

  // Security events
  'SUSPICIOUS_ACTIVITY',
  'IDOR_ATTEMPT',
  'PRIVILEGE_ESCALATION_ATTEMPT',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'BLOCKED';
export type AuditRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
// 'super_admin' is included alongside the spec's 'user'/'admin'/'guest' because
// this project's Admin model has a super_admin role that can also trigger audit events.
export type AuditUserRole = 'user' | 'admin' | 'super_admin' | 'guest';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId | string | null;
  userEmail?: string | null;
  userRole: AuditUserRole;
  action: AuditAction;
  status: AuditStatus;
  ipAddress: string;
  userAgent?: string | null;
  requestId?: string | null;
  endpoint?: string | null;
  method?: string | null;
  metadata?: Record<string, unknown>;
  riskLevel: AuditRiskLevel;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    // WHO
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    userEmail: { type: String, default: null },
    userRole: { type: String, enum: ['user', 'admin', 'super_admin', 'guest'], default: 'guest' },

    // WHAT
    action: { type: String, required: true, enum: AUDIT_ACTIONS },

    // RESULT
    status: { type: String, enum: ['SUCCESS', 'FAILURE', 'BLOCKED'], required: true },

    // WHERE / HOW
    ipAddress: { type: String, required: true },
    userAgent: { type: String, default: null },
    requestId: { type: String, default: null },
    endpoint: { type: String, default: null },
    method: { type: String, default: null },

    // DETAILS
    // e.g. { reason: 'wrong_password', attempts: 3 }
    // NEVER store passwords, tokens, or secrets here — always run through sanitizeForLog first.
    metadata: { type: Schema.Types.Mixed, default: {} },

    // RISK
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },

    // WHEN
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

// Indexes for fast querying
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ ipAddress: 1, timestamp: -1 });
AuditLogSchema.index({ riskLevel: 1, timestamp: -1 });

// Auto-delete logs after 90 days.
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
