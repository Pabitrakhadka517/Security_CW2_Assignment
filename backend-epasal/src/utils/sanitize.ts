/**
 * Strips credential-shaped values out of arbitrary objects before they're
 * persisted (e.g. into AuditLog.metadata). Applied recursively so a nested
 * `{ user: { password: '...' } }` is caught too.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'mfasecret',
  'backupcode',
  'authorization',
  'cookie',
  'hash',
  'key',
  'apikey',
  'cardnumber',
  'cvv',
  'ssn',
]);

const REDACTED = '[REDACTED]';

export function sanitizeForLog(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLog(item));
  }

  if (obj instanceof Date) return obj;

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = REDACTED;
      } else {
        result[key] = sanitizeForLog(value);
      }
    }
    return result;
  }

  return obj;
}
