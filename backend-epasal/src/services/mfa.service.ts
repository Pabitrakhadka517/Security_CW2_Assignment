import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendMail, getTransporter } from '../utils/mailer';
import { logger } from '../utils/logger';

const BACKUP_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_LENGTH = 10;

export const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
export const EMAIL_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;

export const generateMFASecret = (userEmail: string): { secret: string; otpauthUrl: string } => {
  // speakeasy.generateSecret() silently drops an `issuer` option — it never
  // reaches the otpauth_url it returns — so build the URI ourselves via
  // otpauthURL() to get a spec-compliant `issuer=` query param. Without it,
  // most authenticator apps still work by parsing "Issuer:Account" out of
  // the label, but stricter ones (Microsoft Authenticator, some Google
  // Authenticator versions) expect the explicit param.
  const generated = speakeasy.generateSecret({ length: 20 });
  const label = `Epasaley:${userEmail}`;
  const otpauthUrl = speakeasy.otpauthURL({
    secret: generated.ascii,
    label,
    issuer: 'Epasaley',
    encoding: 'ascii',
  });
  return { secret: generated.base32, otpauthUrl };
};

export const generateQRCode = async (otpauthUrl: string): Promise<string> => {
  return qrcode.toDataURL(otpauthUrl);
};

export const verifyTOTP = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
};

export const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    let code = '';
    for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
      code += BACKUP_CODE_ALPHABET[crypto.randomInt(BACKUP_CODE_ALPHABET.length)];
    }
    codes.push(code);
  }
  return codes;
};

export const hashBackupCode = (code: string): string => {
  return bcrypt.hashSync(code, 10);
};

export const verifyBackupCode = async (plain: string, hashed: string[]): Promise<number> => {
  for (let i = 0; i < hashed.length; i++) {
    const match = await bcrypt.compare(plain, hashed[i]);
    if (match) return i;
  }
  return -1;
};

export const generateEmailOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const hashEmailOtp = (code: string): string => {
  return bcrypt.hashSync(code, 10);
};

export const verifyEmailOtp = async (plain: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

type MFAEmailPurpose = 'setup' | 'login' | 'disable';

const MFA_EMAIL_SUBJECT: Record<MFAEmailPurpose, string> = {
  setup: 'Confirm your email verification code — Epasaley',
  login: 'Your sign-in verification code — Epasaley',
  disable: 'Confirm disabling two-factor authentication — Epasaley',
};

const renderMFAEmailHtml = (code: string, purpose: MFAEmailPurpose): string => `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
    <div style="background:#0f172a;color:#fff;padding:16px 20px;font-size:18px;font-weight:bold;">
      Epasaley Verification Code
    </div>
    <div style="padding:20px;border:1px solid #e2e2e2;border-top:none;">
      <p>Use the code below to ${purpose === 'disable' ? 'confirm disabling two-factor authentication' : 'complete your sign-in verification'}:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px;text-align:center;margin:20px 0;">${code}</p>
      <p style="color:#666;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>`;

/**
 * Sends an MFA email-OTP code. In non-production environments, if SMTP
 * isn't configured, logs the code at debug level so local dev works without
 * real SMTP — this fallback must never run in production (OTP codes must
 * never be logged there).
 */
export const sendMFAEmailOtp = async (email: string, code: string, purpose: MFAEmailPurpose): Promise<void> => {
  const sent = await sendMail({
    to: email,
    subject: MFA_EMAIL_SUBJECT[purpose],
    html: renderMFAEmailHtml(code, purpose),
  });

  if (!sent && !getTransporter() && process.env.NODE_ENV !== 'production') {
    logger.debug('[MFA] SMTP not configured — dev-mode OTP fallback', { email, purpose, code });
  }
};
