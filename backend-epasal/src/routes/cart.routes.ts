import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { sessionMiddleware } from '../middlewares/session.middleware';
import { requireAuth } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import {
  addToCartSchema,
  updateCartItemSchema,
  mergeCartsSchema,
  cartQuerySchema,
  cartItemParamSchema,
} from '../validations/cart.validation';

const router = Router();

// Apply session middleware to all cart routes (handles guest tracking)
router.use(sessionMiddleware);

// GET /api/cart
router.get('/', validateRequest({ query: cartQuerySchema }), (req, res, next) =>
  cartController.getCart(req, res, next)
);

// POST /api/cart/items
router.post('/items', validateRequest({ body: addToCartSchema }), (req, res, next) =>
  cartController.addToCart(req, res, next)
);

// PATCH /api/cart/items/:itemId
router.patch(
  '/items/:itemId',
  validateRequest({ params: cartItemParamSchema, body: updateCartItemSchema }),
  (req, res, next) => cartController.updateCartItem(req, res, next)
);

// DELETE /api/cart/items/:itemId
router.delete(
  '/items/:itemId',
  validateRequest({ params: cartItemParamSchema }),
  (req, res, next) => cartController.removeFromCart(req, res, next)
);

// PATCH /api/cart/items/:itemId/save-for-later
router.patch(
  '/items/:itemId/save-for-later',
  validateRequest({ params: cartItemParamSchema }),
  (req, res, next) => cartController.toggleSaveForLater(req, res, next)
);

// GET /api/cart/saved-for-later
router.get('/saved-for-later', (req, res, next) =>
  cartController.getSavedForLaterItems(req, res, next)
);

// GET /api/cart/count
router.get('/count', (req, res, next) => cartController.getCartCount(req, res, next));

// DELETE /api/cart
router.delete('/', (req, res, next) => cartController.clearCart(req, res, next));

// POST /api/cart/merge (requires auth)
router.post(
  '/merge',
  requireAuth,
  validateRequest({ body: mergeCartsSchema }),
  (req, res, next) => cartController.mergeGuestCart(req, res, next)
);

export default router;
