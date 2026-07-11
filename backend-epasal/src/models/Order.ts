import mongoose, { Schema, Document } from 'mongoose';
import { IOrder, IOrderItem } from '../types';

export interface IOrderDocument extends Omit<IOrder, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    imageUrl: {
      type: String,
      default: null, // products without an image must not block checkout
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrderDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user_id: {
      type: String,
      default: null,
      index: true,
    },
    first_name: {
      type: String,
      default: null,
    },
    last_name: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'khalti', 'esewa', 'card', 'bank_transfer'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    phone: {
      type: Schema.Types.Mixed,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    couponCode: {
      type: String,
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    vatAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'sent', 'on_the_way', 'out_for_delivery', 'shipped', 'delivered', 'received', 'reached', 'cancelled'],
      default: 'pending',
      index: true,
    },
    statusHistory: {
      type: [
        {
          status: { type: String, required: true },
          note: { type: String, default: null },
          location: { type: String, default: null },
          timestamp: { type: String, required: true },
        },
      ],
      default: [],
    },
    created_at: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound indexes for efficient queries
OrderSchema.index({ status: 1, created_at: -1 });
OrderSchema.index({ user_id: 1, created_at: -1 });
OrderSchema.index({ user_id: 1, status: 1 });

export const Order = mongoose.model<IOrderDocument>('Order', OrderSchema);
