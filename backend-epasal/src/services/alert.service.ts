import { logger } from '../utils/logger';
import { getTransporter } from '../utils/mailer';

/**
 * Real-time delivery for HIGH/CRITICAL security events that
 * detectSuspiciousActivity() and friends already write to the audit log.
 * Email + Slack are fired in parallel and never throw — a delivery failure
 * must never break the request that triggered the alert.
 */

export interface SecurityAlert {
  type: string;
  riskLevel: 'HIGH' | 'CRITICAL';
  message: string;
  ipAddress: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const COOLDOWN_MS = (parseInt(process.env.ALERT_COOLDOWN_MINUTES || '15', 10)) * 60 * 1000;

// In-memory cooldown map to prevent alert floods. Resets on server restart —
// acceptable here since the underlying audit log entry is still persisted;
// only the *notification* is deduped. Use Redis with TTL for multi-instance
// deployments where cooldowns must be shared across processes.
const alertCooldowns = new Map<string, Date>();

function shouldAlert(type: string, ip: string): boolean {
  const key = `${type}:${ip}`;
  const last = alertCooldowns.get(key);

  if (last && Date.now() - last.getTime() < COOLDOWN_MS) {
    return false;
  }

  alertCooldowns.set(key, new Date());
  return true;
}

function renderEmailHtml(alert: SecurityAlert): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #e2e2e2;font-weight:bold;background:#f7f7f7;">${label}</td>
      <td style="padding:8px 12px;border:1px solid #e2e2e2;">${value}</td>
    </tr>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#c0152f;color:#fff;padding:16px 20px;font-size:18px;font-weight:bold;">
        &#9888;&#65039; Security Alert
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        ${row('Alert Type', alert.type)}
        ${row('Risk Level', alert.riskLevel)}
        ${row('IP Address', alert.ipAddress)}
        ${row('User', alert.userEmail || alert.userId || 'Unknown')}
        ${row('Time', alert.timestamp.toISOString())}
        ${row('Message', alert.message)}
        ${row('Details', `<pre style="white-space:pre-wrap;margin:0;">${JSON.stringify(alert.metadata ?? {}, null, 2)}</pre>`)}
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px;">Epasaley Security Monitoring</p>
    </div>`;
}

async function sendEmailAlert(alert: SecurityAlert): Promise<boolean> {
  try {
    const client = getTransporter();
    if (!client) {
      logger.warn('[Alert] Email not configured — skipping email alert', { type: alert.type });
      return false;
    }

    await client.sendMail({
      from: process.env.ALERT_EMAIL_FROM,
      to: process.env.ALERT_EMAIL_TO,
      subject: `[CRITICAL SECURITY ALERT] ${alert.type} — Epasaley`,
      html: renderEmailHtml(alert),
    });
    return true;
  } catch (err) {
    logger.error('[Alert] Email delivery failed', { type: alert.type, error: err instanceof Error ? err.message : err });
    return false;
  }
}

async function sendSlackAlert(alert: SecurityAlert): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return false;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `*\u{1F6A8} ${alert.riskLevel} SECURITY ALERT*`,
        attachments: [
          {
            color: alert.riskLevel === 'CRITICAL' ? 'danger' : 'warning',
            fields: [
              { title: 'Type', value: alert.type, short: true },
              { title: 'IP', value: alert.ipAddress, short: true },
              { title: 'User', value: alert.userEmail || 'Unknown', short: true },
              { title: 'Time', value: alert.timestamp.toISOString(), short: true },
              { title: 'Details', value: JSON.stringify(alert.metadata ?? {}) },
            ],
          },
        ],
      }),
    });
    return res.ok;
  } catch (err) {
    logger.error('[Alert] Slack delivery failed', { type: alert.type, error: err instanceof Error ? err.message : err });
    return false;
  }
}

async function triggerAlert(alert: SecurityAlert): Promise<{ emailSent: boolean; slackSent: boolean }> {
  if (!shouldAlert(alert.type, alert.ipAddress)) {
    logger.info('[Alert] Suppressed (cooldown active)', { type: alert.type, ipAddress: alert.ipAddress });
    return { emailSent: false, slackSent: false };
  }

  const [emailResult, slackResult] = await Promise.allSettled([sendEmailAlert(alert), sendSlackAlert(alert)]);

  const emailSent = emailResult.status === 'fulfilled' && emailResult.value;
  const slackSent = slackResult.status === 'fulfilled' && slackResult.value;

  logger.info(`[ALERT SENT] ${alert.riskLevel}: ${alert.type}`, { ipAddress: alert.ipAddress, emailSent, slackSent });

  return { emailSent, slackSent };
}

export const alertService = { shouldAlert, sendEmailAlert, sendSlackAlert, triggerAlert };
export default alertService;
