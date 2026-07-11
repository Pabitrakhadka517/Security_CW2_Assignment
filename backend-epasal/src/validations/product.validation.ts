import Joi from 'joi';

// Shared numeric constraints
const PRICE_MAX = 100_000_000; // Rs. 10 crore
const STOCK_MAX = 1_000_000;

// Product Validation
export const createProductSchema = {
  body: Joi.object({
    name: Joi.string().required().trim().min(3).max(200),
    description: Joi.string().allow(null, '').optional(),
    price: Joi.number().required().greater(0).max(PRICE_MAX).messages({
      'number.greater': 'Product price must be greater than 0',
      'number.max': `Product price cannot exceed Rs. ${PRICE_MAX.toLocaleString()}`,
      'number.base': 'Product price must be a valid number',
    }),
    discountPrice: Joi.number().min(0).max(PRICE_MAX).optional().messages({
      'number.min': 'Discount price cannot be negative',
      'number.max': `Discount price cannot exceed Rs. ${PRICE_MAX.toLocaleString()}`,
      'number.base': 'Discount price must be a valid number',
    }),
    hasOffer: Joi.boolean().optional(),
    saleStartDate: Joi.string().allow(null, '').optional(),
    saleEndDate: Joi.string().allow(null, '').optional(),
    stock: Joi.number().integer().min(0).max(STOCK_MAX).allow(null).optional().messages({
      'number.integer': 'Stock must be a whole number',
      'number.min': 'Stock cannot be negative',
      'number.max': `Stock cannot exceed ${STOCK_MAX.toLocaleString()}`,
      'number.base': 'Stock must be a valid number',
    }),
    category_id: Joi.string().required(),
    imageUrl: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
  }),
};

export const updateProductSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(3).max(200).optional(),
    description: Joi.string().allow(null, '').optional(),
    price: Joi.number().greater(0).max(PRICE_MAX).optional().messages({
      'number.greater': 'Product price must be greater than 0',
      'number.max': `Product price cannot exceed Rs. ${PRICE_MAX.toLocaleString()}`,
      'number.base': 'Product price must be a valid number',
    }),
    discountPrice: Joi.number().min(0).max(PRICE_MAX).optional().messages({
      'number.min': 'Discount price cannot be negative',
      'number.max': `Discount price cannot exceed Rs. ${PRICE_MAX.toLocaleString()}`,
      'number.base': 'Discount price must be a valid number',
    }),
    hasOffer: Joi.boolean().optional(),
    saleStartDate: Joi.string().allow(null, '').optional(),
    saleEndDate: Joi.string().allow(null, '').optional(),
    stock: Joi.number().integer().min(0).max(STOCK_MAX).allow(null).optional().messages({
      'number.integer': 'Stock must be a whole number',
      'number.min': 'Stock cannot be negative',
      'number.max': `Stock cannot exceed ${STOCK_MAX.toLocaleString()}`,
      'number.base': 'Stock must be a valid number',
    }),
    category_id: Joi.string().optional(),
    // Allow the frontend to echo the existing image URL back on update so an
    // edit that keeps the current image doesn't fail validation.
    imageUrl: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

export const getProductByIdSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

export const deleteProductSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

export const getProductsQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().optional(),
    categoryId: Joi.string().optional(),
    sectionId: Joi.string().optional(),
    hasOffer: Joi.boolean().optional(),
    minPrice: Joi.number().min(0).max(PRICE_MAX).optional(),
    maxPrice: Joi.number().min(0).max(PRICE_MAX).optional(),
    isActive: Joi.boolean().optional(),
    includeInactive: Joi.boolean().optional(),
    sortBy: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').optional(),
  }),
};
