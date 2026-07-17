import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAdmin extends Document {
  adminId: string; // Unique admin ID (e.g., "ADMIN001")
  email: string;
  password: string; // Hashed password
  name: string;
  role: 'admin' | 'super_admin';
  isActive: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil: Date | null;
  readonly isLocked: boolean;
  mfaSecret?: string;
  mfaEnabled: boolean;
  mfaBackupCodes?: string[];
  passwordHistory?: string[];
  passwordChangedAt: Date;
  passwordExpiresAt: Date;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  checkPasswordReuse(newPassword: string): Promise<boolean>;
  updatePasswordHistory(newHash: string): Promise<void>;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const PASSWORD_HISTORY_LIMIT = 5;

const AdminSchema = new Schema<IAdmin>(
  {
    adminId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Don't include password in queries by default
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'super_admin'],
      default: 'admin',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    mfaSecret: {
      type: String,
      select: false,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaBackupCodes: {
      type: [String],
      select: false,
    },
    // Last 5 password hashes (most recent last), kept to block password reuse.
    passwordHistory: {
      type: [String],
      select: false,
      default: [],
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
    passwordExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + PASSWORD_EXPIRY_MS),
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

AdminSchema.virtual('isLocked').get(function (this: IAdmin) {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
});

// Hash password before saving
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
AdminSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

AdminSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  const admin = this as unknown as IAdmin;
  admin.loginAttempts += 1;
  if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    admin.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
  }
  await admin.save();
};

AdminSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  const admin = this as unknown as IAdmin;
  admin.loginAttempts = 0;
  admin.lockUntil = null;
  await admin.save();
};

AdminSchema.methods.checkPasswordReuse = async function (newPassword: string): Promise<boolean> {
  const admin = this as unknown as IAdmin;
  const history = admin.passwordHistory || [];
  for (const oldHash of history) {
    if (await bcrypt.compare(newPassword, oldHash)) return true;
  }
  return false;
};

AdminSchema.methods.updatePasswordHistory = async function (newHash: string): Promise<void> {
  const admin = this as unknown as IAdmin;
  const history = admin.passwordHistory || [];
  admin.passwordHistory = [...history, newHash].slice(-PASSWORD_HISTORY_LIMIT);
  admin.passwordChangedAt = new Date();
  admin.passwordExpiresAt = new Date(Date.now() + PASSWORD_EXPIRY_MS);
  admin.mustChangePassword = false;
  await admin.save();
};

// Index for faster queries
AdminSchema.index({ isActive: 1 });

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
