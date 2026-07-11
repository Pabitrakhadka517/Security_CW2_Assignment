import { CartRepository } from '../repositories/CartRepository';
import { ICart, CartItem } from '../models/Cart';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

interface AddToCartDTO {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
  attributes?: Record<string, string>;
}

interface UpdateCartItemDTO {
  quantity: number;
}

export class CartService {
  constructor(private repository: CartRepository) {}

  async getOrCreateCart(userId?: string, sessionId?: string): Promise<ICart> {
    let cart = await this.repository.findByUserOrSession(userId, sessionId);

    if (cart) return cart;

    const cartData: Partial<ICart> = {
      items: [],
      itemsCount: 0,
      subtotal: 0,
      status: 'active',
      expiresAt: new Date(),
    };

    if (userId) {
      cartData.userId = new Types.ObjectId(userId);
    } else if (sessionId) {
      cartData.sessionId = sessionId;
    } else {
      throw new BadRequestError('Either userId or sessionId is required');
    }

    return this.repository.create(cartData);
  }

  async addToCart(cartId: string, itemData: AddToCartDTO): Promise<{ cart: ICart; item: CartItem }> {
    const cart = await this.repository.findById(cartId);
    if (!cart) throw new NotFoundError('Cart not found');

    if (!itemData.quantity || itemData.quantity < 1)
      throw new BadRequestError('Quantity must be at least 1');
    if (itemData.price < 0) throw new BadRequestError('Price cannot be negative');

    const item: CartItem = {
      _id: new Types.ObjectId(),
      productId: new Types.ObjectId(itemData.productId),
      variantId: new Types.ObjectId(itemData.variantId),
      name: itemData.name,
      sku: itemData.sku,
      price: itemData.price,
      quantity: itemData.quantity,
      image: itemData.image,
      attributes: itemData.attributes || {},
      saveForLater: false,
      addedAt: new Date(),
    };

    const existingItemIndex = cart.items.findIndex(
      (i) =>
        i.productId.toString() === item.productId.toString() &&
        i.variantId.toString() === item.variantId.toString() &&
        JSON.stringify(i.attributes) === JSON.stringify(item.attributes) &&
        !i.saveForLater
    );

    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity += item.quantity;
      item.quantity = cart.items[existingItemIndex].quantity;
    } else {
      cart.items.push(item);
    }

    await cart.save();
    return { cart, item };
  }

  async updateCartItem(cartId: string, itemId: string, data: UpdateCartItemDTO): Promise<ICart> {
    const cart = await this.repository.findById(cartId);
    if (!cart) throw new NotFoundError('Cart not found');
    if (data.quantity < 1) throw new BadRequestError('Quantity must be at least 1');

    const updatedCart = await this.repository.updateItemQuantity(cartId, itemId, data.quantity);
    if (!updatedCart) throw new NotFoundError('Cart item not found');
    return updatedCart;
  }

  async removeFromCart(cartId: string, itemId: string): Promise<ICart> {
    const cart = await this.repository.findById(cartId);
    if (!cart) throw new NotFoundError('Cart not found');

    const itemExists = cart.items.some((item) => item._id?.toString() === itemId);
    if (!itemExists) throw new NotFoundError('Cart item not found');

    const updatedCart = await this.repository.removeItem(cartId, itemId);
    if (!updatedCart) throw new NotFoundError('Failed to remove item');
    return updatedCart;
  }

  async toggleSaveForLater(cartId: string, itemId: string): Promise<ICart> {
    const cart = await this.repository.findById(cartId);
    if (!cart) throw new NotFoundError('Cart not found');

    const item = cart.items.find((i) => i._id?.toString() === itemId);
    if (!item) throw new NotFoundError('Cart item not found');

    const updatedCart = await this.repository.toggleSaveForLater(cartId, itemId, !item.saveForLater);
    if (!updatedCart) throw new NotFoundError('Failed to update item');
    return updatedCart;
  }

  async getCart(cartId: string): Promise<ICart> {
    const cart = await this.repository.findById(cartId);
    if (!cart) throw new NotFoundError('Cart not found');
    return cart;
  }

  async getCartByUser(userId: string): Promise<ICart | null> {
    return this.repository.findByUserId(userId);
  }

  async getCartBySession(sessionId: string): Promise<ICart | null> {
    return this.repository.findBySessionId(sessionId);
  }

  async clearCart(cartId: string): Promise<ICart> {
    const cart = await this.repository.clear(cartId);
    if (!cart) throw new NotFoundError('Cart not found');
    return cart;
  }

  async deleteCart(cartId: string): Promise<boolean> {
    return this.repository.delete(cartId);
  }

  async getCartCount(cartId: string): Promise<number> {
    return this.repository.getItemsCount(cartId);
  }

  async mergeGuestCart(guestSessionId: string, userId: string): Promise<ICart> {
    const guestCart = await this.repository.findBySessionId(guestSessionId);
    if (!guestCart) return this.getOrCreateCart(userId);

    let userCart = await this.repository.findByUserId(userId);
    if (!userCart) userCart = await this.getOrCreateCart(userId);

    for (const guestItem of guestCart.items) {
      const existingItemIndex = userCart.items.findIndex(
        (i) =>
          i.productId.toString() === guestItem.productId.toString() &&
          i.variantId.toString() === guestItem.variantId.toString() &&
          JSON.stringify(i.attributes) === JSON.stringify(guestItem.attributes)
      );

      if (existingItemIndex !== -1) {
        userCart.items[existingItemIndex].quantity += guestItem.quantity;
      } else {
        userCart.items.push({ ...guestItem, _id: new Types.ObjectId() });
      }
    }

    await userCart.save();
    await this.repository.delete(guestCart._id.toString());
    return userCart;
  }

  async updateCartItemPrices(cartId: string, priceUpdates: Record<string, number>): Promise<ICart> {
    const cart = await this.repository.findById(cartId);
    if (!cart) throw new NotFoundError('Cart not found');

    for (const item of cart.items) {
      const newPrice = priceUpdates[item.variantId.toString()];
      if (newPrice !== undefined) {
        item.originalPrice = item.price;
        item.price = newPrice;
      }
    }

    await cart.save();
    return cart;
  }

  async getSavedForLaterItems(cartId: string): Promise<CartItem[]> {
    const cart = await this.repository.findById(cartId);
    if (!cart) throw new NotFoundError('Cart not found');
    return cart.items.filter((item) => item.saveForLater);
  }

  async getActiveItems(cartId: string): Promise<CartItem[]> {
    const cart = await this.repository.findById(cartId);
    if (!cart) throw new NotFoundError('Cart not found');
    return cart.items.filter((item) => !item.saveForLater);
  }
}

export const cartService = new CartService(new CartRepository());
