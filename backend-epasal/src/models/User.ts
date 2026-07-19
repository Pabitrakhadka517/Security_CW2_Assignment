import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { encryptionService } from '../services/encryption.service';
import * as auditService from '../services/audit.service';
import { stripHtml } from '../utils/sanitizeHtml';

// Fields encrypted at rest (AES-256-GCM) — PII beyond what's needed for
// login/search. email and name stay plaintext: email is the login lookup
// key (Mongoose can't query an encrypted value) and name is used in search.
const ADDRESS_ENCRYPTED_FIELDS = ['addressLine', 'city', 'postalCode'];
const SAVED_ADDRESS_ENCRYPTED_FIELDS = ['addressLine', 'city', 'postalCode', 'phone'];

function reportDecryptionFailure(userId: unknown, field: string): void {
  void auditService.log({
    userId: userId ? String(userId) : null,
    action: 'SUSPICIOUS_ACTIVITY',
    status: 'FAILURE',
    ipAddress: 'internal',
    riskLevel: 'CRITICAL',
    metadata: { type: 'decryption_failure', field },
  });
}

// Decrypts encrypted PII fields on a User doc/lean-object in place. Safe to
// call on documents that were never encrypted (isEncrypted guards each field).
function decryptUserFields(doc: any): void {
  if (!doc) return;

  if (doc.phone && encryptionService.isEncrypted(doc.phone)) {
    try {
      doc.phone = encryptionService.decrypt(doc.phone);
    } catch {
      doc.phone = '[DECRYPTION_FAILED]';
      reportDecryptionFailure(doc._id, 'phone');
    }
  }

  // mfaSecret is select: false, so it's only present here when a query
  // explicitly asked for it (e.g. findAccount(..., '+mfaSecret')).
  if (doc.mfaSecret && encryptionService.isEncrypted(doc.mfaSecret)) {
    try {
      doc.mfaSecret = encryptionService.decrypt(doc.mfaSecret);
    } catch {
      doc.mfaSecret = '[DECRYPTION_FAILED]';
      reportDecryptionFailure(doc._id, 'mfaSecret');
    }
  }

  if (doc.address) {
    const address = doc.address.toObject ? doc.address.toObject() : { ...doc.address };
    for (const field of ADDRESS_ENCRYPTED_FIELDS) {
      if (address[field] && encryptionService.isEncrypted(address[field])) {
        try {
          address[field] = encryptionService.decrypt(address[field]);
        } catch {
          address[field] = '[DECRYPTION_FAILED]';
          reportDecryptionFailure(doc._id, `address.${field}`);
        }
      }
    }
    doc.address = address;
  }

  if (doc.savedAddresses?.length) {
    doc.savedAddresses = doc.savedAddresses.map((addr: any) => {
      const decrypted = addr.toObject ? addr.toObject() : { ...addr };
      for (const field of SAVED_ADDRESS_ENCRYPTED_FIELDS) {
        if (decrypted[field] && encryptionService.isEncrypted(decrypted[field])) {
          try {
            decrypted[field] = encryptionService.decrypt(decrypted[field]);
          } catch {
            decrypted[field] = '[DECRYPTION_FAILED]';
            reportDecryptionFailure(doc._id, `savedAddresses.${field}`);
          }
        }
      }
      return decrypted;
    });
  }
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  authProvider: 'local' | 'google';
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
  mfaSecret?: string;
  mfaEnabled: boolean;
  mfaBackupCodes?: string[];
  mfaMethod: 'totp' | 'email';
  mfaEmailOtpHash?: string;
  mfaEmailOtpExpiresAt?: Date;
  mfaEmailOtpAttempts?: number;
  mfaEmailOtpSentAt?: Date;
  resetPasswordTokenHash?: string;
  resetPasswordExpiresAt?: Date;
  emailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
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

const PASSWORD_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const PASSWORD_HISTORY_LIMIT = 5;

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, set: stripHtml },
    email: { type: String, required: true, unique: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    // Google-only accounts have no password — Google already verified identity.
    password: {
      type: String,
      minlength: 6,
      select: false,
      required: function (this: IUser) { return !this.googleId; },
    },
    googleId: { type: String, select: false, unique: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
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
  mfaSecret: { type: String, select: false },
  mfaEnabled: { type: Boolean, default: false },
  mfaBackupCodes: { type: [String], select: false },
  mfaMethod: { type: String, enum: ['totp', 'email'], default: 'totp' },
  mfaEmailOtpHash: { type: String, select: false },
  mfaEmailOtpExpiresAt: { type: Date, select: false },
  mfaEmailOtpAttempts: { type: Number, default: 0, select: false },
  mfaEmailOtpSentAt: { type: Date, select: false },
  resetPasswordTokenHash: { type: String, select: false, index: true },
  resetPasswordExpiresAt: { type: Date, select: false },
  emailVerified: { type: Boolean, default: false },
  emailVerificationTokenHash: { type: String, select: false, index: true },
  emailVerificationExpiresAt: { type: Date, select: false },
  // Last 5 password hashes (most recent last), kept to block password reuse.
  passwordHistory: { type: [String], select: false, default: [] },
  passwordChangedAt: { type: Date, default: Date.now },
  passwordExpiresAt: { type: Date, default: () => new Date(Date.now() + PASSWORD_EXPIRY_MS) },
  mustChangePassword: { type: Boolean, default: false },
});

UserSchema.virtual('isLocked').get(function (this: IUser) {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  const user = this as unknown as IUser;
  // if password not modified (or never set, e.g. a Google-only account), continue
  if (typeof user.isModified === 'function' && !user.isModified('password')) return next();
  if (!user.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// Encrypt PII fields (AES-256-GCM) before they hit MongoDB.
// encryptIfNotEncrypted is idempotent, so re-saving an already-encrypted
// value (e.g. a doc round-tripped through decrypt-on-read then saved again
// for an unrelated field) never double-encrypts.
UserSchema.pre('save', function (next) {
  const user = this as unknown as IUser;

  if (user.isModified('phone') && user.phone) {
    user.phone = encryptionService.encryptIfNotEncrypted(user.phone);
  }

  if (user.isModified('mfaSecret') && user.mfaSecret) {
    user.mfaSecret = encryptionService.encryptIfNotEncrypted(user.mfaSecret);
  }

  if (user.isModified('address') && user.address) {
    const address = { ...user.address };
    for (const field of ADDRESS_ENCRYPTED_FIELDS) {
      let value = (address as any)[field];
      if (value) {
        value = stripHtml(value);
        (address as any)[field] = encryptionService.encryptIfNotEncrypted(value as string);
      }
    }
    user.address = address;
  }

  if (user.isModified('savedAddresses') && user.savedAddresses?.length) {
    user.savedAddresses = user.savedAddresses.map((addr) => {
      const encrypted = { ...addr };
      for (const field of SAVED_ADDRESS_ENCRYPTED_FIELDS) {
        let value = (encrypted as any)[field];
        if (value) {
          value = stripHtml(value);
          (encrypted as any)[field] = encryptionService.encryptIfNotEncrypted(value as string);
        }
      }
      return encrypted;
    });
  }

  next();
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const user = this as unknown as IUser;
  // Google-only accounts have no password hash to compare against.
  if (!user.password) return false;
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

UserSchema.methods.checkPasswordReuse = async function (newPassword: string): Promise<boolean> {
  const user = this as unknown as IUser;
  const history = user.passwordHistory || [];
  for (const oldHash of history) {
    if (await bcrypt.compare(newPassword, oldHash)) return true;
  }
  return false;
};

UserSchema.methods.updatePasswordHistory = async function (newHash: string): Promise<void> {
  const user = this as unknown as IUser;
  const history = user.passwordHistory || [];
  user.passwordHistory = [...history, newHash].slice(-PASSWORD_HISTORY_LIMIT);
  user.passwordChangedAt = new Date();
  user.passwordExpiresAt = new Date(Date.now() + PASSWORD_EXPIRY_MS);
  user.mustChangePassword = false;
  await user.save();
};

// Decrypt PII fields on read. Fires for both hydrated documents and
// .lean() plain objects — Mongoose runs query middleware on the result
// either way, which is what most read paths in this codebase use.
UserSchema.post('findOne', decryptUserFields);
UserSchema.post('find', function (docs: any[]) {
  docs.forEach(decryptUserFields);
});
UserSchema.post('save', decryptUserFields);

// email index is already created by unique:true on the field above

export const User = mongoose.model<IUser>('User', UserSchema);
