import nodemailer from 'nodemailer';
import { withRetry } from './asyncResilience';

/**
 * Shared SMTP transporter, reused by anything that sends email (security
 * alerts, MFA email-OTP codes, ...). Returns null when SMTP isn't configured
 * so callers can degrade gracefully instead of throwing.
 */

let transporter: nodemailer.Transporter | null = null;

// Fail fast on a dead/unreachable SMTP host rather than hanging the request
// that triggered the email (registration, password reset, MFA challenge)
// until Node's default socket timeout kicks in.
const SMTP_CONNECTION_TIMEOUT_MS = 8000;
const SMTP_GREETING_TIMEOUT_MS = 8000;
const SMTP_SOCKET_TIMEOUT_MS = 10000;

export function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });

  return transporter;
}

// Auth/config errors (bad credentials, rejected sender) will never succeed
// on a retry -- only retry connection-level failures (dead host, timeout,
// transient DNS/network blip).
const RETRYABLE_SMTP_CODES = new Set(['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS']);

function isRetryableSmtpError(err: unknown): boolean {
  const code = (err as { code?: string } | undefined)?.code;
  return !!code && RETRYABLE_SMTP_CODES.has(code);
}

export async function sendMail(options: { to: string; subject: string; html: string; from?: string }): Promise<boolean> {
  const client = getTransporter();
  if (!client) return false;

  await withRetry(
    () => client.sendMail({
      from: options.from || process.env.ALERT_EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
    { attempts: 2, delayMs: 500, label: 'SMTP send', isRetryable: isRetryableSmtpError }
  );
  return true;
}
