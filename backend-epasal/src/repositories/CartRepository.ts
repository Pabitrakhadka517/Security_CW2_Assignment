import { Cart, ICart, CartItem } from '../models/Cart';
import { Types } from 'mongoose';

export class CartRepository {
  async create(data: Partial<ICart>): Promise<ICart> {
    const cart = new Cart(data);
    await cart.save();
    return cart;
  }

  async findById(cartId: string): Promise<ICart | null> {
    return Cart.findById(cartId).populate('items.productId', 'name slug');
  }

  async findByUserId(userId: string): Promise<ICart | null> {
    return Cart.findOne({ userId: new Types.ObjectId(userId), status: 'active' });
  }

  async findBySessionId(sessionId: string): Promise<ICart | null> {
    return Cart.findOne({ sessionId, status: 'active', userId: null });
  }

  async findByUserOrSession(userId?: string, sessionId?: string): Promise<ICart | null> {
    if (userId) return this.findByUserId(userId);
    if (sessionId) return this.findBySessionId(sessionId);
    return null;
  }

  async update(cartId: string, data: Partial<ICart>): Promise<ICart | null> {
    return Cart.findByIdAndUpdate(cartId, data, { new: true, runValidators: true });
  }

  async addItem(cartId: string, item: CartItem): Promise<ICart | null> {
    const cart = await this.findById(cartId);
    if (!cart) return null;

    const existingItem = cart.items.find(
      (i) =>
        i.productId.toString() === item.productId.toString() &&
        i.variantId.toString() === item.variantId.toString() &&
        JSON.stringify(i.attributes) === JSON.stringify(item.attributes)
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      cart.items.push({ ...item, _id: new Types.ObjectId(), addedAt: new Date() });
    }

    await cart.save();
    return cart;
  }

  async updateItemQuantity(cartId: string, itemId: string, quantity: number): Promise<ICart | null> {
    if (quantity <= 0) return this.removeItem(cartId, itemId);

    const cart = await Cart.findByIdAndUpdate(
      cartId,
      { $set: { 'items.$[item].quantity': quantity } },
      { arrayFilters: [{ 'item._id': new Types.ObjectId(itemId) }], new: true }
    );

    await cart?.save();
    return cart;
  }

  async removeItem(cartId: string, itemId: string): Promise<ICart | null> {
    const cart = await Cart.findByIdAndUpdate(
      cartId,
      { $pull: { items: { _id: new Types.ObjectId(itemId) } } },
      { new: true }
    );

    await cart?.save();
    return cart;
  }

  async toggleSaveForLater(cartId: string, itemId: string, saveForLater: boolean): Promise<ICart | null> {
    const cart = await Cart.findByIdAndUpdate(
      cartId,
      { $set: { 'items.$[item].saveForLater': saveForLater } },
      { arrayFilters: [{ 'item._id': new Types.ObjectId(itemId) }], new: true }
    );

    await cart?.save();
    return cart;
  }

  async clear(cartId: string): Promise<ICart | null> {
    const cart = await Cart.findByIdAndUpdate(
      cartId,
      { items: [], itemsCount: 0, subtotal: 0 },
      { new: true }
    );

    await cart?.save();
    return cart;
  }

  async delete(cartId: string): Promise<boolean> {
    const result = await Cart.findByIdAndDelete(cartId);
    return !!result;
  }

  async getItemsCount(cartId: string): Promise<number> {
    const cart = await this.findById(cartId);
    return cart?.itemsCount || 0;
  }

  async updateStatus(cartId: string, status: 'active' | 'abandoned' | 'converted'): Promise<ICart | null> {
    return this.update(cartId, { status });
  }
}

export const cartRepository = new CartRepository();
