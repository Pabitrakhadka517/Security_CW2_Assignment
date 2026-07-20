// src/components/api/orderapi.jsx
import api from './base';          // admin client (adminToken)
import userApi from './userapi';   // user client (userToken when logged in)
import publicApi from './publicapi';

export const orderApi = {
  // ── Admin ────────────────────────────────────────────────────────────────
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  getStats: () => api.get('/orders/stats'),
  updateStatus: (id, status, meta) =>
    api.put(`/orders/${id}/status`, { status, ...(meta || {}) }),

  // ── Customer / guest ─────────────────────────────────────────────────────
  // Contract: items carry ONLY { productId, quantity } — the server resolves
  // prices. Sent through the user client so a logged-in user's JWT attaches
  // and the order lands in their history; guests simply send no token.
  create: (data) => userApi.post('/orders', data),

  // Public tracking — requires the phone number used on the order.
  trackById: (orderId, phone) =>
    publicApi.get(`/orders/track/${encodeURIComponent(orderId)}`, { params: { phone } }),
};

export const paymentApi = {
  // Returns { gatewayUrl, fields } — fields must be submitted as a real HTML
  // form POST to gatewayUrl (see submitEsewaForm in Checkout.jsx), not read
  // as JSON data — eSewa serves an HTML payment page, not an API response.
  initiateEsewa: (orderId) => userApi.post('/payments/esewa/initiate', { orderId }),
};
