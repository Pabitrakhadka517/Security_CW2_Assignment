import { Router } from 'express';
import Joi from 'joi';
import * as mfaController from '../controllers/mfa.controller';
import { requireAuthAny } from '../middlewares/authMiddleware';
import { checkPasswordExpiry } from '../middlewares/passwordExpiry';
import { validateRequest } from '../middlewares/validateRequest';
import { accountChangeLimiter, loginLimiter, emailOtpLimiter } from '../middlewares/rateLimiter';

const router = Router();

const totpTokenSchema = Joi.string().pattern(/^[0-9]{6,10}$/).required().messages({
  'string.pattern.base': 'Verification code must be 6-10 digits',
});

// requireAuthAny (not requireAuth) — both regular users and admins manage
// their own MFA here, and the two roles verify against different JWT secrets.
router.post('/setup', requireAuthAny, checkPasswordExpiry, accountChangeLimiter, validateRequest({
  body: Joi.object({ method: Joi.string().valid('totp', 'email').optional() }),
}), mfaController.setupMFA);

router.post('/verify-setup', requireAuthAny, checkPasswordExpiry, accountChangeLimiter, validateRequest({
  body: Joi.object({ token: totpTokenSchema }),
}), mfaController.verifySetup);

router.post('/disable', requireAuthAny, checkPasswordExpiry, accountChangeLimiter, validateRequest({
  body: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().required(),
  }),
}), mfaController.disableMFA);

router.post('/disable/request-code', requireAuthAny, checkPasswordExpiry, accountChangeLimiter, mfaController.requestDisableCode);

router.get('/status', requireAuthAny, checkPasswordExpiry, mfaController.getMFAStatus);

// Auth here is the mfa-pending token verified inside the controller, not a
// normal access token — deliberately not behind requireAuth.
router.post('/challenge', loginLimiter, validateRequest({
  body: Joi.object({
    token: Joi.string().required(),
    useBackupCode: Joi.boolean().optional(),
  }),
}), mfaController.mfaChallenge);

router.post('/challenge/resend', emailOtpLimiter, mfaController.resendChallengeCode);

export default router;
