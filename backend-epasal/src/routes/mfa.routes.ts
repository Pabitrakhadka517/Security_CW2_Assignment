import { Router } from 'express';
import Joi from 'joi';
import * as mfaController from '../controllers/mfa.controller';
import { requireAuth } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { accountChangeLimiter, loginLimiter } from '../middlewares/rateLimiter';

const router = Router();

const totpTokenSchema = Joi.string().pattern(/^[0-9]{6,10}$/).required().messages({
  'string.pattern.base': 'Verification code must be 6-10 digits',
});

router.post('/setup', requireAuth, accountChangeLimiter, mfaController.setupMFA);

router.post('/verify-setup', requireAuth, accountChangeLimiter, validateRequest({
  body: Joi.object({ token: totpTokenSchema }),
}), mfaController.verifySetup);

router.post('/disable', requireAuth, accountChangeLimiter, validateRequest({
  body: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().required(),
  }),
}), mfaController.disableMFA);

router.get('/status', requireAuth, mfaController.getMFAStatus);

// Auth here is the mfa-pending token verified inside the controller, not a
// normal access token — deliberately not behind requireAuth.
router.post('/challenge', loginLimiter, validateRequest({
  body: Joi.object({
    token: Joi.string().required(),
    useBackupCode: Joi.boolean().optional(),
  }),
}), mfaController.mfaChallenge);

export default router;
