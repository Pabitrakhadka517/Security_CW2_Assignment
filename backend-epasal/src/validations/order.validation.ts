import Joi from 'joi';

// Order Item Validation
// Contract: clients send ONLY productId + quantity. Prices, names and images
// are resolved server-side from the catalogue. The legacy fields are still
// ACCEPTED (and ignored) so older clients don't break, but never trusted.
const orderItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().required().integer().min(1).messages({ 'number.min': 'Quantity must be at least 1' }),
  name: Joi.string().optional(),
  price: Joi.number().optional(),
  imageUrl: Joi.string().allow('', null).optional(),
});

// Calculate Total (preview) Validation
export const calculateTotalSchema = {
  body: Joi.object({
    cartItems: Joi.array().items(Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
    })).min(1).required(),
    couponCode: Joi.string().allow(null, '').optional().uppercase().trim(),
    // Accepted for backward compatibility but never trusted — the server
    // only uses the verified JWT identity (req.user.id) for per-user coupon
    // checks. See order.controller.ts#calculateTotal.
    userId: Joi.string().allow(null, '').optional(),
    email: Joi.string().email().allow(null, '').optional(),
    phone: Joi.string().allow(null, '').optional(),
  }),
};

// Create Order Validation
export const createOrderSchema = {
  body: Joi.object({
    user_id: Joi.string().allow(null, '').optional(),
    first_name: Joi.string().allow(null, '').optional(),
    last_name: Joi.string().allow(null, '').optional(),
    name: Joi.string().required().trim(),
    email: Joi.string().email().allow(null, '').optional(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required().messages({ 'string.pattern.base': 'Phone number must be digits only and 10-15 characters long' }),
    district: Joi.string().required().trim(),
    city: Joi.string().required().trim(),
    address: Joi.string().required().trim(),
    description: Joi.string().required().trim(),
    items: Joi.array().items(orderItemSchema).min(1).required(),
    couponCode: Joi.string().allow(null, '').optional().uppercase().trim(),
    totalAmount: Joi.number().required().min(0).messages({ 'number.min': 'Total amount must be at least 0' }),
    // COD only — no online payment gateway is integrated. Other values are
    // rejected so an order can never pretend to be "paid online".
    paymentMethod: Joi.string().valid('cod').default('cod'),
  }),
};

// Update Order Status Validation
export const updateOrderStatusSchema = {
  body: Joi.object({
    status: Joi.string()
      .valid('pending', 'confirmed', 'processing', 'sent', 'on_the_way', 'out_for_delivery', 'shipped', 'delivered', 'received', 'reached', 'cancelled')
      .required(),
    note: Joi.string().allow(null, '').optional(),
    location: Joi.string().allow(null, '').optional(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

export const getOrderByIdSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

// Track Order Schema — public, but requires the phone number used on the
// order so sequential order ids can't be enumerated by strangers.
export const trackOrderSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
  query: Joi.object({
    phone: Joi.string().required().messages({ 'any.required': 'Phone number is required to track an order' }),
  }),
};

export const getOrdersQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().optional(),
    userId: Joi.string().optional(),
    startDate: Joi.string().optional(),
    endDate: Joi.string().optional(),
    sortBy: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').optional(),
  }),
};
