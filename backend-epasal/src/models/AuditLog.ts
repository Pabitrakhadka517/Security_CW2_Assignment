import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorType: 'user' | 'admin' | 'guest' | 'system';
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  success: boolean;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorType: { type: String, enum: ['user', 'admin', 'guest', 'system'], required: true },
    actorId: { type: String, default: null },
    actorEmail: { type: String, default: null },
    action: { type: String, required: true },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    success: { type: Boolean, required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
