import { Schema, Document, Types, model } from 'mongoose';

export interface CartItem {
  _id?: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image?: string;
  attributes?: Record<string, string>;
  saveForLater?: boolean;
  addedAt: Date;
}

export interface ICart extends Document {
  userId?: Types.ObjectId;
  sessionId?: string;
  items: CartItem[];
  itemsCount: number;
  subtotal: number;
  status: 'active' | 'abandoned' | 'converted';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

const CartItemSchema = new Schema<CartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: Number,
    quantity: { type: Number, required: true, min: 1 },
    image: String,
    attributes: { type: Map, of: String },
    saveForLater: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    sessionId: { type: String, index: true, sparse: true },
    items: { type: [CartItemSchema], default: [] },
    itemsCount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'abandoned', 'converted'],
      default: 'active',
      index: true,
    },
    expiresAt: { type: Date, required: true }, // TTL index set via CartSchema.index below
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// TTL index for automatic expiry
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes
CartSchema.index({ userId: 1, status: 1 });
CartSchema.index({ sessionId: 1, status: 1 });
CartSchema.index({ lastActivityAt: -1 });
CartSchema.index({ createdAt: -1 });

CartSchema.virtual('total').get(function () {
  return this.items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
});

CartSchema.pre('save', function (next) {
  this.lastActivityAt = new Date();

  const now = new Date();
  if (this.userId) {
    this.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  } else {
    this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  this.itemsCount = this.items.length;
  this.subtotal = this.items.reduce(
    (sum: number, item: CartItem) => sum + item.price * item.quantity,
    0
  );

  next();
});

export const Cart = model<ICart>('Cart', CartSchema);
