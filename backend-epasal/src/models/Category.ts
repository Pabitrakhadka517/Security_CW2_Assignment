import mongoose, { Schema, Document } from 'mongoose';
import { ICategory } from '../types';
import { stripHtml } from '../utils/sanitizeHtml';

export interface ICategoryDocument extends Omit<ICategory, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const CategorySchema = new Schema<ICategoryDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
      set: stripHtml,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
      set: stripHtml,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ---- Tree fields (materialised path) ---------------------------------
    // `parentId` is the immediate parent (null at the root). `ancestors` is
    // the full chain from root → parent in order, which lets us answer
    // "find every descendant of X" in a single indexed query:
    //     Category.find({ ancestors: 'cat_X' })
    // instead of walking the tree N times. Both are kept in sync by the
    // service layer on create/update.
    parentId: {
      type: String,
      default: null,
      index: true,
    },
    ancestors: {
      type: [String],
      default: [],
      index: true,
    },
    depth: {
      type: Number,
      default: 0,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
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

CategorySchema.index({ isActive: 1, created_at: -1 });
CategorySchema.index({ parentId: 1, sortOrder: 1 });
CategorySchema.index({ parentId: 1, isActive: 1 });

export const Category = mongoose.model<ICategoryDocument>('Category', CategorySchema);
