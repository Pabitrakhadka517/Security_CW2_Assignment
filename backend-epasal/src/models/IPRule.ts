import mongoose, { Schema, Document } from 'mongoose';

export interface IIPRule extends Document {
  ip: string;
  type: 'block' | 'allow';
  reason: string;
  addedBy: mongoose.Types.ObjectId | null;
  addedByType: 'admin' | 'system';
  permanent: boolean;
  expiresAt: Date | null;
  autoBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IPRuleSchema = new Schema<IIPRule>(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['block', 'allow'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    addedByType: {
      type: String,
      enum: ['admin', 'system'],
      default: 'system',
    },
    permanent: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    autoBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB auto-deletes documents once expiresAt passes. Permanent rules
// (expiresAt: null) are excluded via the partial filter, not just skipped.
IPRuleSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $ne: null } },
  }
);

IPRuleSchema.index({ type: 1, ip: 1 });

export const IPRule = mongoose.model<IIPRule>('IPRule', IPRuleSchema);
