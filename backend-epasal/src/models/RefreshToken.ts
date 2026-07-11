import mongoose, { Schema, Document } from 'mongoose';

export type RefreshTokenRole = 'admin' | 'user';

export interface IRefreshToken extends Document {
  tokenHash: string;
  userId: string;
  role: RefreshTokenRole;
  revoked: boolean;
  replacedBy?: string | null;
  expiresAt?: Date;
  createdAt?: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    tokenHash: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['admin', 'user'], required: true, default: 'user', index: true },
    revoked: { type: Boolean, default: false },
    replacedBy: { type: String, default: null },
    expiresAt: { type: Date, required: false },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
