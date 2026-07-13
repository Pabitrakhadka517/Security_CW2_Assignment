import mongoose, { Schema, Document } from 'mongoose';
import { IOrder, IOrderItem } from '../types';
import { encryptionService } from '../services/encryption.service';
import * as auditService from '../services/audit.service';

function reportDecryptionFailure(orderId: unknown, field: string): void {
  void auditService.log({
    userId: null,
    action: 'SUSPICIOUS_ACTIVITY',
    status: 'FAILURE',
    ipAddress: 'internal',
    riskLevel: 'CRITICAL',
    metadata: { type: 'decryption_failure', field, orderId: orderId ? String(orderId) : null },
  });
}

// Decrypts encrypted PII fields (phone, shipping address) on an Order
// doc/lean-object in place. district/city/order id/status/amounts stay
// plaintext — they're needed for admin filtering and aren't PII on their own.
function decryptOrderFields(doc: any): void {
  if (!doc) return;

  if (doc.phone && encryptionService.isEncrypted(String(doc.phone))) {
    try {
      doc.phone = encryptionService.decrypt(doc.phone);
    } catch {
      doc.phone = '[DECRYPTION_FAILED]';
      reportDecryptionFailure(doc.id, 'phone');
    }
  }

  if (doc.address && encryptionService.isEncrypted(doc.address)) {
    try {
      doc.address = encryptionService.decrypt(doc.address);
    } catch {
      doc.address = '[DECRYPTION_FAILED]';
      reportDecryptionFailure(doc.id, 'address');
    }
  }
}

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

// Encrypt PII fields (AES-256-GCM) before they hit MongoDB.
// district/city are left plaintext — order queries filter on status/user_id/
// date only (never phone/address), so no query behavior depends on this.
OrderSchema.pre('save', function (next) {
  const order = this as unknown as IOrderDocument;

  if (order.isModified('phone') && order.phone != null) {
    order.phone = encryptionService.encryptIfNotEncrypted(String(order.phone));
  }

  if (order.isModified('address') && order.address) {
    order.address = encryptionService.encryptIfNotEncrypted(order.address);
  }

  next();
});

// Decrypt PII fields on read (see decryptOrderFields above).
OrderSchema.post('findOne', decryptOrderFields);
OrderSchema.post('find', function (docs: any[]) {
  docs.forEach(decryptOrderFields);
});
OrderSchema.post('save', decryptOrderFields);

export const Order = mongoose.model<IOrderDocument>('Order', OrderSchema);
