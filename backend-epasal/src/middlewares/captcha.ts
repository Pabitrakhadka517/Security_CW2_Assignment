import { Request, Response, NextFunction } from 'express';
import { verifyCaptcha, isCaptchaBypassed } from '../services/captcha.service';
import * as auditService from '../services/audit.service';
import { createAuditContext } from './auditLogger';

/**
 * Always-required CAPTCHA gate — used on registration, where every attempt
 * (not just suspicious ones) should be challenged.
 */
export const requireCaptcha = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (isCaptchaBypassed(req)) {
    delete req.body.captchaToken;
    next();
    return;
  }

  const { captchaToken } = req.body;
  if (!captchaToken) {
    res.status(400).json({ success: false, message: 'CAPTCHA verification required' });
    return;
  }

  const result = await verifyCaptcha(captchaToken, req.ip);
  if (!result.success) {
    await auditService.log({
      ...createAuditContext(req),
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
