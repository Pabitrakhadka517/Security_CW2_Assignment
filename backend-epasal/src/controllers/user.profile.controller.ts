import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { User } from '../models/User';
import orderService from '../services/order.service';
import { Product } from '../models/Product';
import { sendSuccess } from '../utils/responseHelper';
import { uploadImage } from '../middlewares/upload';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { recordAuditEvent } from '../services/auditLog.service';
import { validatePasswordChange } from '../services/password.service';

/**
 * User-facing profile endpoints.
 *
 * Convention:
 *  - All "not found" / "missing field" cases throw an AppError subclass so
 *    they flow through the global error middleware with a consistent envelope.
 *    Returning a 4xx via `sendSuccess` (the prior pattern) was misleading —
 *    `success: true` with a 4xx body confused frontends.
 *  - Read endpoints always return an array/object, never null, so the
 *    frontend doesn't have to special-case empty users/favorites/carts.
 *  - All controllers go through asyncHandler, so a rejected promise (e.g. DB
 *    down) lands in the global error handler instead of bubbling up to the
 *    process and causing a 500.
 */

const requireUserId = (req: Request): string => {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError('Authentication required');
  return id;
};

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const user = await User.findById(userId).lean().select('-password -__v');
  if (!user) throw new NotFoundError('User not found');
  sendSuccess(res, 200, 'User profile retrieved', user);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { name, email, phone, address, avatarUrl, savedAddresses, currentPassword } = req.body || {};

  const user = await User.findById(userId).select('+password');
  if (!user) throw new NotFoundError('User not found');

  if (name) user.name = name;

  let previousEmail: string | null = null;
  const changingEmail = email && email.toLowerCase() !== user.email;
  if (changingEmail) {
    // Changing the login email is account-takeover-adjacent — require the
    // current password even though the caller already holds a valid access
    // token, the same way changePassword does.
    if (!currentPassword) throw new BadRequestError('Current password is required to change email');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new BadRequestError('Current password is incorrect');

    const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
    if (exists) throw new BadRequestError('Email already in use');
    previousEmail = user.email;
    user.email = email;
  }

  if (phone !== undefined) user.phone = phone;
  if (address) user.address = address;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  if (Array.isArray(savedAddresses)) user.savedAddresses = savedAddresses;
  await user.save();

  if (changingEmail) {
    await recordAuditEvent({ req, actorType: 'user', actorId: userId, actorEmail: user.email, action: 'user.email_changed', success: true, targetType: 'user', targetId: userId, metadata: { from: previousEmail, to: user.email } });
  }

  sendSuccess(res, 200, 'Profile updated', {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    avatarUrl: user.avatarUrl,
  });
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  if (!req.file) throw new BadRequestError('No avatar file provided');

  const avatarUrl = await uploadImage(req.file, 'users/avatars');
  user.avatarUrl = avatarUrl;
  await user.save();

  sendSuccess(res, 200, 'Avatar uploaded', { avatarUrl });
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const result = await orderService.getOrdersByUser(userId, req.query as any);
  // result already has empty-state defaults from order.service.
  sendSuccess(res, 200, 'User orders retrieved', result);
});

export const getFavorites = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const user = await User.findById(userId).lean().select('favorites');
  const favIds = ((user as any)?.favorites || []) as string[];

  // No favorites — return [] without hitting Product.find at all.
  if (favIds.length === 0) {
    sendSuccess(res, 200, 'Favorites retrieved', []);
    return;
  }

  const products = await Product.find({ id: { $in: favIds }, isActive: true })
    .lean()
    .select('-_id -__v');

  sendSuccess(res, 200, 'Favorites retrieved', Array.isArray(products) ? products : []);
});

export const addFavorite = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const productId = req.body?.productId;
  if (!productId || typeof productId !== 'string') {
    throw new BadRequestError('productId is required');
  }

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  if (!Array.isArray(user.favorites)) user.favorites = [];
  if (!user.favorites.includes(productId)) {
    user.favorites.push(productId);
    await user.save();
  }

  sendSuccess(res, 200, 'Added to favorites', { favorites: user.favorites });
});

export const removeFavorite = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const productId = req.body?.productId;
  if (!productId || typeof productId !== 'string') {
    throw new BadRequestError('productId is required');
  }

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  user.favorites = (user.favorites || []).filter((p: string) => p !== productId);
  await user.save();

  sendSuccess(res, 200, 'Removed from favorites', { favorites: user.favorites });
});

export const getSavedAddresses = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const user = await User.findById(userId).lean().select('savedAddresses');
  // Empty-state guarantee: always an array.
  sendSuccess(res, 200, 'Saved addresses', (user as any)?.savedAddresses || []);
});

export const addSavedAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { label, addressLine, city, postalCode, country, phone } = req.body || {};
  if (!addressLine || !city || !postalCode || !country) {
    throw new BadRequestError('addressLine, city, postalCode and country are required');
  }

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  user.savedAddresses = user.savedAddresses || [];
  user.savedAddresses.push({ label, addressLine, city, postalCode, country, phone });
  await user.save();

  sendSuccess(res, 201, 'Address added', { savedAddresses: user.savedAddresses });
});

export const removeSavedAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const index = Number(req.params.index);

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const addresses = user.savedAddresses || [];
  if (!Number.isInteger(index) || index < 0 || index >= addresses.length) {
    throw new BadRequestError('Invalid address index');
  }
  addresses.splice(index, 1);
  user.savedAddresses = addresses;
  user.markModified('savedAddresses');
  await user.save();

  sendSuccess(res, 200, 'Address removed', { savedAddresses: user.savedAddresses });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    throw new BadRequestError('Current password and new password are required');
  }

  const user = await User.findById(userId).select('+password +passwordHistory');
  if (!user) throw new NotFoundError('User not found');

  const validation = await validatePasswordChange(user, currentPassword, newPassword);
  if (!validation.valid) throw new BadRequestError(validation.error);

  user.password = newPassword;
  await user.save();
  await user.updatePasswordHistory(user.password as string);
  await recordAuditEvent({ req, actorType: 'user', actorId: userId, actorEmail: user.email, action: 'user.password_changed', success: true, targetType: 'user', targetId: userId });

  sendSuccess(res, 200, 'Password changed successfully');
});

export const mergeCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  user.savedCart = items;
  await user.save();

  sendSuccess(res, 200, 'Cart merged', { savedCart: user.savedCart });
});

export const getSavedCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const user = await User.findById(userId).lean().select('savedCart');
  sendSuccess(res, 200, 'Saved cart retrieved', (user as any)?.savedCart || []);
});

// ── Admin: get all users with their wishlists (populated) ────────────────────
export const adminGetAllWishlists = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find({ 'favorites.0': { $exists: true } })
    .lean()
    .select('name email avatarUrl favorites createdAt');

  const productIds = [...new Set(users.flatMap((u: any) => u.favorites as string[]))];
  const products = await Product.find({ id: { $in: productIds } })
    .lean()
    .select('id name price imageUrl discountPrice hasOffer');

  const productMap: Record<string, any> = {};
  products.forEach((p: any) => { productMap[String(p.id)] = p; });

  const data = users.map((u: any) => ({
    userId: u._id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
    wishlist: (u.favorites as string[]).map((id) => productMap[id]).filter(Boolean),
  }));

  sendSuccess(res, 200, 'Wishlists retrieved', data);
});
