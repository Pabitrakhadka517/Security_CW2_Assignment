// src/components/api/promocode.jsx
import api from './base';
import userApi from './userapi';

export const couponApi = {
  // Admin-only operations use the admin api client
  getAll: async () => {
    const res = await api.get('/coupons/');
    return res;
  },

  getById: async (code) => {
    const res = await api.get(`/coupons/${code}`);
    return res;
  },

  create: async (data) => {
    const payload = {
      ...data,
      code: data.code.toUpperCase().trim(),
      discount_value: Number(data.discount_value),
      validFrom: data.validFrom,
      validTo: data.validTo,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    const res = await api.post('/coupons/', payload);
    return res;
  },

  update: async (code, data) => {
    const res = await api.put(`/coupons/${code}`, data);
    return res;
  },

  // validate uses the user client so the logged-in user's token is sent,
  // allowing the backend to enforce per-user usage limits correctly
  validate: async (code, context = {}) => {
    const res = await userApi.post(`/coupons/validate`, { code, ...context });
    return res;
  },

  remove: async (code) => {
    const res = await api.delete(`/coupons/${code}`);
    return res;
  },

  analytics: async (code) => {
    const res = await api.get(`/coupons/${code}/analytics`);
    return res;
  },
};

export const promocode = couponApi;