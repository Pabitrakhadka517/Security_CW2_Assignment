import { Router } from 'express';
import Joi from 'joi';
import * as userProfileController from '../controllers/user.profile.controller';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware';
import { checkPasswordExpiry } from '../middlewares/passwordExpiry';
import { validateRequest } from '../middlewares/validateRequest';
import { uploadSingle } from '../middlewares/upload';
import { accountChangeLimiter, exportDataLimiter } from '../middlewares/rateLimiter';
import { strongPasswordSchema } from '../validations/password.validation';
import { requirePermission } from '../middlewares/rbac';
import { preventMassAssignment } from '../middlewares/sanitizeBody';

const router = Router();

router.get('/profile', requireAuth, requirePermission('profile:read:own'), checkPasswordExpiry, userProfileController.getProfile);
router.put(
	'/profile',
	requireAuth,
	requirePermission('profile:update:own'),
	checkPasswordExpiry,
	accountChangeLimiter,
	// Strip role/lockout/MFA/etc BEFORE Joi validates, so an attacker-added
	// field doesn't just get silently ignored — it's stripped before the
	// schema even sees it, and the rest of a legitimate update still succeeds.
	preventMassAssignment(),
	validateRequest({ body: Joi.object({
		name: Joi.string().optional(),
		email: Joi.string().email().optional(),
		phone: Joi.string().optional(),
		address: Joi.object({
			addressLine: Joi.string().optional().allow(''),
			city: Joi.string().optional().allow(''),
			state: Joi.string().optional().allow(''),
			district: Joi.string().optional().allow(''),
			postalCode: Joi.string().optional().allow(''),
			country: Joi.string().optional().allow(''),
		}).optional(),
		avatarUrl: Joi.string().uri().optional(),
		savedAddresses: Joi.array().optional(),
		currentPassword: Joi.string().when('email', { is: Joi.exist(), then: Joi.required(), otherwise: Joi.optional() })
			.messages({ 'any.required': 'Current password is required to change email' }),
	}) }),
	userProfileController.updateProfile
);

router.post('/profile/avatar', requireAuth, requirePermission('profile:update:own'), checkPasswordExpiry, uploadSingle, userProfileController.uploadAvatar);

// NOTE: deliberately NOT behind checkPasswordExpiry — an expired-password
// user must still be able to reach this endpoint to fix it.
router.put('/profile/password', requireAuth, requirePermission('password:change:own'), accountChangeLimiter, validateRequest({ body: Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: strongPasswordSchema,
}) }), userProfileController.changePassword);

// Data export (GDPR-aligned) — the controller scopes the export to
// req.user.id only, so there's no id param to check ownership against.
router.get('/export-data', requireAuth, requirePermission('profile:read:own'), exportDataLimiter, userProfileController.exportMyData);

router.get('/orders', requireAuth, requirePermission('order:read:own'), checkPasswordExpiry, userProfileController.getMyOrders);

router.get('/favorites', requireAuth, requirePermission('wishlist:read:own'), checkPasswordExpiry, userProfileController.getFavorites);
router.post('/favorites', requireAuth, requirePermission('wishlist:update:own'), checkPasswordExpiry, validateRequest({ body: Joi.object({ productId: Joi.string().required() }) }), userProfileController.addFavorite);
router.delete('/favorites', requireAuth, requirePermission('wishlist:update:own'), checkPasswordExpiry, validateRequest({ body: Joi.object({ productId: Joi.string().required() }) }), userProfileController.removeFavorite);

// Addresses — index-scoped to the caller's own savedAddresses array (see
// user.profile.controller#removeSavedAddress), so there's no separate
// resource id to run requireOwnership against; ownership is inherent in
// looking the array up off req.user.id.
router.get('/addresses', requireAuth, requirePermission('address:read:own'), checkPasswordExpiry, userProfileController.getSavedAddresses);
router.post('/addresses', requireAuth, requirePermission('address:create:own'), checkPasswordExpiry, validateRequest({ body: Joi.object({ label: Joi.string().optional(), addressLine: Joi.string().required(), city: Joi.string().required(), postalCode: Joi.string().required(), country: Joi.string().required(), phone: Joi.string().optional() }) }), userProfileController.addSavedAddress);
router.delete('/addresses/:index', requireAuth, requirePermission('address:delete:own'), checkPasswordExpiry, validateRequest({ params: Joi.object({ index: Joi.number().integer().min(0).required() }) }), userProfileController.removeSavedAddress);

// Cart merge
router.post('/cart/merge', requireAuth, requirePermission('cart:update:own'), checkPasswordExpiry, validateRequest({ body: Joi.object({ items: Joi.array().items(Joi.object()).required() }) }), userProfileController.mergeCart);
router.get('/cart', requireAuth, requirePermission('cart:read:own'), checkPasswordExpiry, userProfileController.getSavedCart);

// Admin
router.get('/admin/wishlists', requireAdmin, requirePermission('user:read:any'), userProfileController.adminGetAllWishlists);

export default router;
