import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  favorites: string[];
  phone?: string;
  address?: {
    addressLine?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  avatarUrl?: string | null;
  savedAddresses?: Array<{
    label?: string;
    addressLine?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
  }>;
  isFirstLogin?: boolean;
  savedCart?: Array<any>;
  loginAttempts: number;
  lockUntil: Date | null;
  readonly isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { type: String, required: true, minlength: 6, select: false },
    isActive: { type: Boolean, default: true },
      favorites: { type: [String], default: [], index: true },
  },
  { timestamps: true }
);

// default fields
UserSchema.add({
  favorites: { type: [String], default: [] },
  phone: { type: String, default: null },
  address: { type: Object, default: null },
  avatarUrl: { type: String, default: null },
  savedAddresses: { type: Array, default: [] },
  isFirstLogin: { type: Boolean, default: true },
  savedCart: { type: Array, default: [] },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
});

UserSchema.virtual('isLocked').get(function (this: IUser) {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  const user = this as unknown as IUser;
  // if password not modified, continue
  if (typeof user.isModified === 'function' && !user.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const user = this as unknown as IUser;
  return bcrypt.compare(password, user.password);
};

UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  const user = this as unknown as IUser;
  user.loginAttempts += 1;
  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
  }
  await user.save();
};

UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  const user = this as unknown as IUser;
  user.loginAttempts = 0;
  user.lockUntil = null;
  await user.save();
};

// email index is already created by unique:true on the field above

export const User = mongoose.model<IUser>('User', UserSchema);
