import mongoose, { Schema, Document } from 'mongoose';
import { IBanner } from '../types';
import { stripHtml } from '../utils/sanitizeHtml';

export interface IBannerDocument extends Omit<IBanner, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const BannerSchema = new Schema<IBannerDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      set: stripHtml,
    },
    subtitle: {
      type: String,
      default: null,
      set: stripHtml,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    // Optional click-through target for the banner
    linkUrl: {
      type: String,
      default: null,
    },
    // Where the banner renders on the storefront
    position: {
      type: String,
      enum: ['hero', 'promo', 'strip'],
      default: 'hero',
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

// Compound index
BannerSchema.index({ isActive: 1, created_at: -1 });

export const Banner = mongoose.model<IBannerDocument>('Banner', BannerSchema);
