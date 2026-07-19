import crypto from 'crypto';
import { sendMail, getTransporter } from '../utils/mailer';
import { logger } from '../utils/logger';

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashResetToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const renderResetEmailHtml = (resetUrl: string): string => `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
    <div style="background:#0f172a;color:#fff;padding:16px 20px;font-size:18px;font-weight:bold;">
      Reset your Epasaley password
    </div>
    <div style="padding:20px;border:1px solid #e2e2e2;border-top:none;">
      <p>We received a request to reset your password. Click the button below to choose a new one:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
      </p>
      <p style="color:#666;font-size:13px;">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
      <p style="color:#999;font-size:12px;word-break:break-all;">Or paste this link into your browser: ${resetUrl}</p>
    </div>
  </div>`;

/**
 * Sends the password reset email. In non-production environments, if SMTP
 * isn't configured, logs the link at debug level so local dev works without
 * real SMTP (mirrors sendMFAEmailOtp's fallback) — never runs in production.
 */
export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const sent = await sendMail({
    to: email,
    subject: 'Reset your Epasaley password',
    html: renderResetEmailHtml(resetUrl),
  });

  if (!sent && !getTransporter() && process.env.NODE_ENV !== 'production') {
    logger.debug('[PasswordReset] SMTP not configured — dev-mode reset link fallback', { email, resetUrl });
  }
};
