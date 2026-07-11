import { Router } from 'express';
import Joi from 'joi';
import * as userProfileController from '../controllers/user.profile.controller';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { uploadSingle } from '../middlewares/upload';
import { accountChangeLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.get('/profile', requireAuth, userProfileController.getProfile);
router.put('/profile', requireAuth, accountChangeLimiter, validateRequest({ body: Joi.object({
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
}) }), userProfileController.updateProfile);

router.post('/profile/avatar', requireAuth, uploadSingle, userProfileController.uploadAvatar);

router.put('/profile/password', requireAuth, accountChangeLimiter, validateRequest({ body: Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
}) }), userProfileController.changePassword);

router.get('/orders', requireAuth, userProfileController.getMyOrders);

router.get('/favorites', requireAuth, userProfileController.getFavorites);
router.post('/favorites', requireAuth, validateRequest({ body: Joi.object({ productId: Joi.string().required() }) }), userProfileController.addFavorite);
router.delete('/favorites', requireAuth, validateRequest({ body: Joi.object({ productId: Joi.string().required() }) }), userProfileController.removeFavorite);

// Addresses
router.get('/addresses', requireAuth, userProfileController.getSavedAddresses);
router.post('/addresses', requireAuth, validateRequest({ body: Joi.object({ label: Joi.string().optional(), addressLine: Joi.string().required(), city: Joi.string().required(), postalCode: Joi.string().required(), country: Joi.string().required(), phone: Joi.string().optional() }) }), userProfileController.addSavedAddress);
router.delete('/addresses/:index', requireAuth, validateRequest({ params: Joi.object({ index: Joi.number().integer().min(0).required() }) }), userProfileController.removeSavedAddress);

// Cart merge
router.post('/cart/merge', requireAuth, validateRequest({ body: Joi.object({ items: Joi.array().items(Joi.object()).required() }) }), userProfileController.mergeCart);
router.get('/cart', requireAuth, userProfileController.getSavedCart);

// Admin
router.get('/admin/wishlists', requireAdmin, userProfileController.adminGetAllWishlists);

export default router;
