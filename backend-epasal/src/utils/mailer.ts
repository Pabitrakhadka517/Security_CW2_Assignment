import nodemailer from 'nodemailer';

/**
 * Shared SMTP transporter, reused by anything that sends email (security
 * alerts, MFA email-OTP codes, ...). Returns null when SMTP isn't configured
 * so callers can degrade gracefully instead of throwing.
 */

let transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

export async function sendMail(options: { to: string; subject: string; html: string; from?: string }): Promise<boolean> {
  const client = getTransporter();
  if (!client) return false;

  await client.sendMail({
    from: options.from || process.env.ALERT_EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
  return true;
}
