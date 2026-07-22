// src/components/api/adminUserApi.jsx
// Admin-scoped client for customer account management (components/admin/usercrud.jsx).
import api from './base';

export const adminUserApi = {
  list: (params) => api.get('/admin/users', { params }),
  getById: (id) => api.get(`/admin/users/${id}`),
  lock: (id, payload) => api.patch(`/admin/users/${id}/lock`, payload),
  unlock: (id) => api.patch(`/admin/users/${id}/unlock`),
  setStatus: (id, payload) => api.patch(`/admin/users/${id}/status`, payload),
  revokeSessions: (id) => api.post(`/admin/users/${id}/revoke-sessions`),
  remove: (id) => api.delete(`/admin/users/${id}`),
};

export default adminUserApi;
