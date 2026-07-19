import crypto from 'crypto';
import { sendMail, getTransporter } from '../utils/mailer';
import { logger } from '../utils/logger';

// Longer-lived than the password-reset token (30 min) -- a stale
// verification link is far lower-stakes than a stale password-reset link.
export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashVerificationToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const renderVerificationEmailHtml = (verifyUrl: string): string => `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
    <div style="background:#0f172a;color:#fff;padding:16px 20px;font-size:18px;font-weight:bold;">
      Verify your Epasaley email address
    </div>
    <div style="padding:20px;border:1px solid #e2e2e2;border-top:none;">
      <p>Thanks for signing up! Click the button below to verify your email address:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${verifyUrl}" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Verify Email</a>
      </p>
      <p style="color:#666;font-size:13px;">This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
      <p style="color:#999;font-size:12px;word-break:break-all;">Or paste this link into your browser: ${verifyUrl}</p>
    </div>
  </div>`;

/**
 * Sends the email-verification link. In non-production environments, if
 * SMTP isn't configured, logs the link at debug level so local dev works
 * without real SMTP (mirrors sendPasswordResetEmail's fallback) -- never
 * runs in production.
 */
export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const sent = await sendMail({
    to: email,
    subject: 'Verify your Epasaley email address',
    html: renderVerificationEmailHtml(verifyUrl),
  });

  if (!sent && !getTransporter() && process.env.NODE_ENV !== 'production') {
    logger.debug('[EmailVerification] SMTP not configured — dev-mode verification link fallback', { email, verifyUrl });
  }
};
