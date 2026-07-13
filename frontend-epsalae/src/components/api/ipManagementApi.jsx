// src/components/api/ipManagementApi.jsx
// Admin-scoped client for the IP allow/block list (components/admin/IPManagement.jsx).
import api from './base';

export const ipManagementApi = {
  getStats: () => api.get('/admin/ip/stats'),
  getBlocked: () => api.get('/admin/ip/blocked'),
  getAllowed: () => api.get('/admin/ip/allowed'),
  blockIP: (payload) => api.post('/admin/ip/block', payload),
  allowIP: (payload) => api.post('/admin/ip/allow', payload),
  unblockIP: (ip) => api.delete(`/admin/ip/block/${encodeURIComponent(ip)}`),
  removeFromAllowList: (ip) => api.delete(`/admin/ip/allow/${encodeURIComponent(ip)}`),
  refreshCache: () => api.post('/admin/ip/refresh-cache'),
};

export default ipManagementApi;
