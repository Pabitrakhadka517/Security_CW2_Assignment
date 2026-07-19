import mongoose, { Schema, Document } from 'mongoose';

export type RefreshTokenRole = 'admin' | 'user';

export const REVOKED_REASONS = [
  'logout',
  'password_changed',
  'mfa_changed',
  'admin_revoked',
  'suspicious_activity',
  'session_expired',
  'new_login_limit',
  'reuse_detected',
] as const;

export type RevokedReason = (typeof REVOKED_REASONS)[number];

export interface IRefreshToken extends Document {
  tokenHash: string;
  userId: string;
  role: RefreshTokenRole;
  // Shared across every token descended from the same login via rotation
  // (carried forward unchanged on each refresh) -- lets a reuse-detected
  // token revoke its entire rotation chain in one call, not just itself.
  familyId: string;
  revoked: boolean;
  replacedBy?: string | null;
  expiresAt?: Date;
  createdAt?: Date;

  // Session-management fields
  deviceId: string | null;
  deviceName: string | null;
  ipAddress: string;
  userAgent: string | null;
  lastUsedAt: Date;
  revokedAt: Date | null;
  revokedReason: RevokedReason | null;
  // Hard ceiling on session lifetime — carried forward unchanged across
  // refresh-token rotation, unlike `expiresAt` (which resets every rotation).
  // A session can never outlive this regardless of how often it's refreshed.
  absoluteExpiry: Date;
  // Whether the user checked "remember me" at login. Carried forward
  // unchanged across rotation so every reissued refresh token in this
  // session's lineage keeps using the longer (30-day) window instead of
  // silently falling back to the 7-day default on the first refresh.
  rememberMe: boolean;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    tokenHash: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['admin', 'user'], required: true, default: 'user', index: true },
    familyId: { type: String, required: true, index: true },
    revoked: { type: Boolean, default: false },
    replacedBy: { type: String, default: null },
    expiresAt: { type: Date, required: false },

    deviceId: { type: String, default: null },
    deviceName: { type: String, default: null },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, default: null },
    lastUsedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: REVOKED_REASONS, default: null },
    absoluteExpiry: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    rememberMe: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ userId: 1, revoked: 1, lastUsedAt: -1 });
RefreshTokenSchema.index({ deviceId: 1 });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
