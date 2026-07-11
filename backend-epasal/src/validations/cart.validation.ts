import Joi from 'joi';

export const addToCartSchema = Joi.object({
  productId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'Invalid product ID format',
    'any.required': 'Product ID is required',
  }),
  variantId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'Invalid variant ID format',
    'any.required': 'Variant ID is required',
  }),
  name: Joi.string().required().trim().min(1).max(500),
  sku: Joi.string().required().trim().min(1).max(100),
  price: Joi.number().required().min(0).messages({
    'number.min': 'Price cannot be negative',
    'any.required': 'Price is required',
  }),
  quantity: Joi.number().required().integer().min(1).max(9999).messages({
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required',
  }),
  image: Joi.string().optional().uri(),
  attributes: Joi.object().optional().pattern(Joi.string(), Joi.string()),
}).unknown(false);

export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().required().integer().min(1).max(9999).messages({
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required',
  }),
}).unknown(false);

export const mergeCartsSchema = Joi.object({
  guestSessionId: Joi.string().required().trim().min(1).messages({
    'string.empty': 'Guest session ID is required',
    'any.required': 'Guest session ID is required',
  }),
}).unknown(false);

export const cartQuerySchema = Joi.object({
  cartId: Joi.string().optional().pattern(/^[0-9a-fA-F]{24}$/),
}).unknown(true);

export const cartItemParamSchema = Joi.object({
  itemId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'Invalid item ID format',
    'any.required': 'Item ID is required',
  }),
}).unknown(false);
