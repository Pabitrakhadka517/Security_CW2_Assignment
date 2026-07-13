import { Router } from 'express';
import Joi from 'joi';
import * as sessionController from '../controllers/session.controller';
import { requireAdmin } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

router.use(requireAdmin);

const userIdParam = validateRequest({ params: Joi.object({ userId: Joi.string().required() }) });

/**
 * GET /api/v1/admin/sessions/:userId
 * DELETE /api/v1/admin/sessions/:userId
 */
router.get('/:userId', userIdParam, sessionController.adminListUserSessions);
router.delete('/:userId', userIdParam, sessionController.adminRevokeUserSessions);

export default router;
