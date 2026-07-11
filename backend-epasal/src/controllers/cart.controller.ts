import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';
import { sendSuccess } from '../utils/responseHelper';
import { BadRequestError } from '../utils/errors';
import { asyncHandler } from '../middlewares/asyncHandler';

export class CartController {
  /**
   * GET /api/cart
   */
  getCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cartId } = req.query;

    if (!cartId && !req.user && !(req as any).sessionId) {
      throw new BadRequestError('Cart ID, user ID, or session ID is required');
    }

    let cart;

    if (cartId) {
      cart = await cartService.getCart(cartId as string);
    } else if (req.user?.id) {
      cart = await cartService.getCartByUser(req.user.id);
      if (!cart) cart = await cartService.getOrCreateCart(req.user.id);
    } else if ((req as any).sessionId) {
      cart = await cartService.getCartBySession((req as any).sessionId);
      if (!cart) cart = await cartService.getOrCreateCart(undefined, (req as any).sessionId);
    }

    sendSuccess(res, 200, 'Cart retrieved', cart);
  });

  /**
   * POST /api/cart/items
   */
  addToCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    let { cartId } = req.query;
    const { productId, variantId, name, sku, price, quantity, image, attributes } = req.body;

    if (!productId || !variantId || !name || !sku || price === undefined || !quantity) {
      throw new BadRequestError('Missing required fields: productId, variantId, name, sku, price, quantity');
    }

    if (!cartId) {
      let cart;
      if (req.user?.id) {
        cart = await cartService.getOrCreateCart(req.user.id);
      } else if ((req as any).sessionId) {
        cart = await cartService.getOrCreateCart(undefined, (req as any).sessionId);
      } else {
        throw new BadRequestError('User ID or session ID is required');
      }
      cartId = cart._id.toString();
    }

    const { cart } = await cartService.addToCart(cartId as string, {
      productId, variantId, name, sku, price,
      quantity: parseInt(quantity),
      image, attributes,
    });

    sendSuccess(res, 201, 'Item added to cart', { cart, itemsCount: cart.itemsCount, subtotal: cart.subtotal });
  });

  /**
   * PATCH /api/cart/items/:itemId
   */
  updateCartItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cartId } = req.query;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!cartId) throw new BadRequestError('Cart ID is required');
    if (quantity === undefined || quantity < 1) throw new BadRequestError('Quantity must be at least 1');

    const cart = await cartService.updateCartItem(cartId as string, itemId, { quantity: parseInt(quantity) });
    sendSuccess(res, 200, 'Cart item updated', { cart, itemsCount: cart.itemsCount, subtotal: cart.subtotal });
  });

  /**
   * DELETE /api/cart/items/:itemId
   */
  removeFromCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cartId } = req.query;
    const { itemId } = req.params;

    if (!cartId) throw new BadRequestError('Cart ID is required');

    const cart = await cartService.removeFromCart(cartId as string, itemId);
    sendSuccess(res, 200, 'Item removed from cart', { cart, itemsCount: cart.itemsCount, subtotal: cart.subtotal });
  });

  /**
   * PATCH /api/cart/items/:itemId/save-for-later
   */
  toggleSaveForLater = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cartId } = req.query;
    const { itemId } = req.params;

    if (!cartId) throw new BadRequestError('Cart ID is required');

    const cart = await cartService.toggleSaveForLater(cartId as string, itemId);
    sendSuccess(res, 200, 'Item save for later toggled', cart);
  });

  /**
   * GET /api/cart/saved-for-later
   */
  getSavedForLaterItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cartId } = req.query;
    if (!cartId) throw new BadRequestError('Cart ID is required');

    const items = await cartService.getSavedForLaterItems(cartId as string);
    sendSuccess(res, 200, 'Saved for later items retrieved', { items, count: items.length });
  });

  /**
   * DELETE /api/cart
   */
  clearCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cartId } = req.query;
    if (!cartId) throw new BadRequestError('Cart ID is required');

    const cart = await cartService.clearCart(cartId as string);
    sendSuccess(res, 200, 'Cart cleared', cart);
  });

  /**
   * POST /api/cart/merge
   */
  mergeGuestCart = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user?.id) throw new BadRequestError('User must be authenticated');

    const { guestSessionId } = req.body;
    if (!guestSessionId) throw new BadRequestError('Guest session ID is required');

    const cart = await cartService.mergeGuestCart(guestSessionId, req.user.id);
    sendSuccess(res, 200, 'Carts merged successfully', { cart, itemsCount: cart.itemsCount, subtotal: cart.subtotal });
  });

  /**
   * GET /api/cart/count
   */
  getCartCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cartId } = req.query;
    if (!cartId) throw new BadRequestError('Cart ID is required');

    const count = await cartService.getCartCount(cartId as string);
    sendSuccess(res, 200, 'Cart count retrieved', { count });
  });
}

export const cartController = new CartController();
