import { Request } from 'express';
import crypto from 'crypto';

/**
 * Builds a consistent-but-not-cryptographically-binding identifier for the
 * device/browser making the request, from headers that are stable across
 * requests from the same browser install (UA + language + encoding).
 * Not meant to be tamper-proof — a client can trivially forge these headers
 * — it's only used to label sessions and to power the optional, off-by-default
 * device-mismatch warning (see session.service#validateSession).
 */
export const generateDeviceId = (req: Request): string => {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const raw = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
};

/**
 * Turns a User-Agent string into a short human-readable label for the
 * sessions UI, e.g. "Chrome on Windows". Deliberately simple regex matching
 * instead of a full UA-parsing dependency — precision beyond "browser + OS"
 * isn't needed here.
 */
export const parseDeviceName = (userAgent: string | null | undefined): string => {
  if (!userAgent) return 'Unknown Device';
  const ua = userAgent;

  if (/Postman/i.test(ua)) return 'Postman API Client';

  const os =
    /Windows/i.test(ua) ? 'Windows' :
    /Mac OS X|Macintosh/i.test(ua) ? 'macOS' :
    /iPhone|iPad|iPod/i.test(ua) ? 'iOS' :
    /Android/i.test(ua) ? 'Android' :
    /Linux/i.test(ua) ? 'Linux' : null;

  // Order matters: Edge and Opera also match /Chrome/, and Chrome also
  // matches /Safari/, so the more specific tokens must be checked first.
  if (/Edg\//i.test(ua)) return os ? `Edge on ${os}` : 'Edge';
  if (/OPR\//i.test(ua)) return os ? `Opera on ${os}` : 'Opera';
  if (/Chrome\//i.test(ua)) return os ? `Chrome on ${os}` : 'Chrome';
  if (/Firefox\//i.test(ua)) return os ? `Firefox on ${os}` : 'Firefox';
  if (/Safari\//i.test(ua)) return os ? `Safari on ${os}` : 'Safari';

  return 'Unknown Device';
};

/**
 * Recomputes the device id for the current request and compares it against
 * a previously-stored one. Used only for the optional device-binding warning
 * — never as a hard authorization gate, since fingerprints legitimately
 * change across VPNs/browser updates.
 */
export const isSameDevice = (req: Request, storedDeviceId: string | null | undefined): boolean => {
  if (!storedDeviceId) return true;
  return generateDeviceId(req) === storedDeviceId;
};
