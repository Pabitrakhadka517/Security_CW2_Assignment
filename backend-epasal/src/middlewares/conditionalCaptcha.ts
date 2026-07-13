import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { verifyCaptcha, isCaptchaBypassed } from '../services/captcha.service';
import * as auditService from '../services/audit.service';
import { createAuditContext } from './auditLogger';

const FAILED_ATTEMPTS_BEFORE_CAPTCHA = 2;
const IP_FAILED_ATTEMPTS_THRESHOLD = 5;
const IP_FAILED_ATTEMPTS_WINDOW_MS = 15 * 60 * 1000;

/**
 * Gates login behind CAPTCHA only once there's a real signal of brute force —
 * an always-on CAPTCHA here would hurt UX for the common case of a user just
 * typing their password correctly. Required once the target account has a
 * couple of failed attempts (ahead of the 5-attempt lockout), once the
 * calling IP has been noisy across any accounts, or when the frontend asks
 * for it explicitly.
 */
export const conditionalCaptcha = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (isCaptchaBypassed(req)) {
    delete req.body.captchaToken;
    next();
    return;
  }

  const { email, forceCaptcha } = req.body;
  const ctx = createAuditContext(req);

  let required = forceCaptcha === true;

  if (!required && email) {
    const user = await User.findOne({ email }).select('loginAttempts');
    if (user && user.loginAttempts >= FAILED_ATTEMPTS_BEFORE_CAPTCHA) {
      required = true;
    }
  }

  if (!required) {
    const since = new Date(Date.now() - IP_FAILED_ATTEMPTS_WINDOW_MS);
    const ipFailedCount = await AuditLog.countDocuments({
      ipAddress: ctx.ipAddress,
      action: 'LOGIN_FAILED',
      timestamp: { $gte: since },
    });
    if (ipFailedCount >= IP_FAILED_ATTEMPTS_THRESHOLD) required = true;
  }

  if (!required) {
    next();
    return;
  }

  const { captchaToken } = req.body;
  if (!captchaToken) {
    res.status(400).json({ success: false, message: 'CAPTCHA required', requiresCaptcha: true });
    return;
  }

  const result = await verifyCaptcha(captchaToken, req.ip);
  if (!result.success) {
    await auditService.log({
      ...ctx,
      userEmail: email ?? null,
      action: 'SUSPICIOUS_ACTIVITY',
      status: 'BLOCKED',
      riskLevel: 'MEDIUM',
      metadata: { reason: 'captcha_failed', error: result.error },
    });
    res.status(400).json({ success: false, message: 'CAPTCHA verification failed. Please try again.' });
    return;
  }

  delete req.body.captchaToken;
  next();
};
