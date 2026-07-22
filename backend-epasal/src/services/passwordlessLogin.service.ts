import crypto from 'crypto';
import { sendMail, getTransporter } from '../utils/mailer';
import { logger } from '../utils/logger';

// Deliberately short-lived — unlike a password reset link, this token logs
// someone straight in, so it gets a tighter window than RESET_TOKEN_TTL_MS.
export const PASSWORDLESS_TOKEN_TTL_MS = 15 * 60 * 1000;

export const generatePasswordlessToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashPasswordlessToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const renderPasswordlessEmailHtml = (loginUrl: string): string => `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
    <div style="background:#0f172a;color:#fff;padding:16px 20px;font-size:18px;font-weight:bold;">
      Your Epasaley login link
    </div>
    <div style="padding:20px;border:1px solid #e2e2e2;border-top:none;">
      <p>Click the button below to sign in without a password:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${loginUrl}" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Log In</a>
      </p>
      <p style="color:#666;font-size:13px;">This link expires in 15 minutes and can only be used once. If you didn't request this, you can safely ignore this email — no one can log in without clicking it.</p>
      <p style="color:#999;font-size:12px;word-break:break-all;">Or paste this link into your browser: ${loginUrl}</p>
    </div>
  </div>`;

/**
 * Sends the magic-link login email. Mirrors sendPasswordResetEmail's
 * dev-mode fallback (log the link when SMTP isn't configured, never in prod).
 */
export const sendPasswordlessLoginEmail = async (email: string, token: string): Promise<void> => {
  const loginUrl = `${process.env.FRONTEND_URL}/passwordless-login?token=${token}`;

  const sent = await sendMail({
    to: email,
    subject: 'Your Epasaley login link',
    html: renderPasswordlessEmailHtml(loginUrl),
  });

  if (!sent && !getTransporter() && process.env.NODE_ENV !== 'production') {
    logger.debug('[PasswordlessLogin] SMTP not configured — dev-mode login link fallback', { email, loginUrl });
  }
};
