import axios from 'axios';
import { Request } from 'express';

export interface CaptchaVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Lets automated tests skip real hCaptcha verification: either the process
 * is running under Jest (NODE_ENV=test) or the caller presents the shared
 * bypass secret via header. The header path only works when the secret is
 * actually configured, so an empty/unset CAPTCHA_BYPASS_KEY never matches.
 */
export function isCaptchaBypassed(req: Request): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  const bypassKey = process.env.CAPTCHA_BYPASS_KEY;
  return !!bypassKey && req.headers['x-captcha-bypass'] === bypassKey;
}

/**
 * Verifies an hCaptcha response token against hCaptcha's siteverify endpoint.
 * Never throws — a network/API failure is reported as a failed verification
 * rather than propagated, so callers can treat this as a plain boolean check.
 */
export async function verifyCaptcha(token: string, remoteIp?: string): Promise<CaptchaVerificationResult> {
  try {
    const params = new URLSearchParams();
    params.append('secret', process.env.HCAPTCHA_SECRET_KEY || '');
    params.append('response', token);
    if (remoteIp) params.append('remoteip', remoteIp);

    const verifyUrl = process.env.HCAPTCHA_VERIFY_URL || 'https://hcaptcha.com/siteverify';
    const { data } = await axios.post(verifyUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (data.success) return { success: true };

    return { success: false, error: data['error-codes']?.[0] ?? 'captcha-failed' };
  } catch {
    return { success: false, error: 'captcha-verification-failed' };
  }
}
