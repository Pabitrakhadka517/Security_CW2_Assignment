import { Router } from 'express';
import Joi from 'joi';
import * as userProfileController from '../controllers/user.profile.controller';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware';
import { checkPasswordExpiry } from '../middlewares/passwordExpiry';
import { validateRequest } from '../middlewares/validateRequest';
import { uploadSingle } from '../middlewares/upload';
import { accountChangeLimiter, exportDataLimiter, importDataLimiter } from '../middlewares/rateLimiter';
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
		// Deliberately NOT required-when-email-present here: the profile form
		// always submits the current email even when it isn't changing, and
		// this schema has no way to know the stored value to tell the two
		// cases apart. updateProfile itself compares against the stored email
		// and enforces currentPassword only when it's an actual change.
		currentPassword: Joi.string().optional(),
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

// Data import (counterpart to export) — accepts the same shape exportMyData
// produces (or a hand-built subset of it). Capped array sizes below guard
// against a huge payload being used to bloat a user document or hammer the
// Product lookup in the controller.
router.post(
	'/import-data',
	requireAuth,
	requirePermission('profile:import:own'),
	checkPasswordExpiry,
	importDataLimiter,
	preventMassAssignment(),
	validateRequest({ body: Joi.object({
		profile: Joi.object({
			name: Joi.string().min(2).max(100).optional(),
			phone: Joi.string().max(20).allow('').optional(),
		}).optional(),
		addresses: Joi.array().max(20).items(Joi.object({
			label: Joi.string().max(50).allow('').optional(),
			addressLine: Joi.string().max(200).required(),
			city: Joi.string().max(100).required(),
			postalCode: Joi.string().max(20).required(),
			country: Joi.string().max(100).required(),
			phone: Joi.string().max(20).allow('').optional(),
		})).optional(),
		wishlist: Joi.array().max(200).items(
			Joi.alternatives().try(
				Joi.string(),
				Joi.object({ productId: Joi.string().required(), name: Joi.string().optional() })
			)
		).optional(),
	}) }),
	userProfileController.importMyData
);

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
router.put('/addresses/:index', requireAuth, requirePermission('address:update:own'), checkPasswordExpiry, validateRequest({
  params: Joi.object({ index: Joi.number().integer().min(0).required() }),
  body: Joi.object({ label: Joi.string().optional(), addressLine: Joi.string().required(), city: Joi.string().required(), postalCode: Joi.string().required(), country: Joi.string().required(), phone: Joi.string().optional() }),
}), userProfileController.updateSavedAddress);
router.delete('/addresses/:index', requireAuth, requirePermission('address:delete:own'), checkPasswordExpiry, validateRequest({ params: Joi.object({ index: Joi.number().integer().min(0).required() }) }), userProfileController.removeSavedAddress);

// Cart merge
router.post('/cart/merge', requireAuth, requirePermission('cart:update:own'), checkPasswordExpiry, validateRequest({ body: Joi.object({ items: Joi.array().items(Joi.object()).required() }) }), userProfileController.mergeCart);
router.get('/cart', requireAuth, requirePermission('cart:read:own'), checkPasswordExpiry, userProfileController.getSavedCart);

// Admin
router.get('/admin/wishlists', requireAdmin, checkPasswordExpiry, requirePermission('user:read:any'), userProfileController.adminGetAllWishlists);

export default router;
