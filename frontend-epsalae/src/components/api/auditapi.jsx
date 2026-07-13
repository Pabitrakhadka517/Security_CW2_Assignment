// src/components/api/auditapi.jsx
import api from './base';          // admin client (adminToken)
import userApi from './userapi';   // user client (userToken)

export const auditApi = {
  // ── Admin (Security Dashboard) ─────────────────────────────────────────
  getLogs: (filters = {}) => api.get('/admin/audit/logs', { params: filters }),
  getSummary: () => api.get('/admin/audit/summary'),
  getUserLogs: (userId) => api.get(`/admin/audit/user/${userId}`),

  // ── Logged-in user's own activity ──────────────────────────────────────
  getMyActivity: () => userApi.get('/auth/me/activity'),
};

export default auditApi;
