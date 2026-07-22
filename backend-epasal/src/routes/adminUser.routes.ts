import { Router } from 'express';
import * as adminUserController from '../controllers/adminUser.controller';
import { requireAdmin } from '../middlewares/authMiddleware';
import { requirePermission } from '../middlewares/rbac';
import { checkPasswordExpiry } from '../middlewares/passwordExpiry';
import { validateRequest } from '../middlewares/validateRequest';
import {
  listUsersSchema,
  objectIdParamSchema,
  lockUserSchema,
  setUserStatusSchema,
} from '../validations/adminUser.validation';

const router = Router();

router.use(requireAdmin, checkPasswordExpiry);

/**
 * GET /api/v1/admin/users
 * GET /api/v1/admin/users/:id
 */
router.get('/', requirePermission('user:read:any'), validateRequest(listUsersSchema), adminUserController.listUsers);
router.get(
  '/:id',
  requirePermission('user:read:any'),
  validateRequest(objectIdParamSchema),
  adminUserController.getUserById
);

/**
 * PATCH /api/v1/admin/users/:id/lock
 * PATCH /api/v1/admin/users/:id/unlock
 * PATCH /api/v1/admin/users/:id/status
 */
router.patch(
  '/:id/lock',
  requirePermission('user:update:any'),
  validateRequest(lockUserSchema),
  adminUserController.lockUser
);
router.patch(
  '/:id/unlock',
  requirePermission('user:update:any'),
  validateRequest(objectIdParamSchema),
  adminUserController.unlockUser
);
router.patch(
  '/:id/status',
  requirePermission('user:update:any'),
  validateRequest(setUserStatusSchema),
  adminUserController.setUserStatus
);

/**
 * POST /api/v1/admin/users/:id/revoke-sessions
 */
router.post(
  '/:id/revoke-sessions',
  requirePermission('user:update:any'),
  validateRequest(objectIdParamSchema),
  adminUserController.revokeSessions
);

/**
 * DELETE /api/v1/admin/users/:id
 */
router.delete(
  '/:id',
  requirePermission('user:delete:any'),
  validateRequest(objectIdParamSchema),
  adminUserController.deleteUser
);

export default router;
