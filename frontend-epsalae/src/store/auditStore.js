// src/store/auditStore.js
import { create } from 'zustand';
import { auditApi } from '@/components/api/auditapi';

export const useAuditStore = create((set) => ({
  activityLog: [],
  securitySummary: null,
  auditLogs: [],
  auditLogsTotal: 0,
  isLoading: false,
  error: null,

  fetchActivityLog: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await auditApi.getMyActivity();
      const data = res.data?.data || res.data || [];
      set({ activityLog: Array.isArray(data) ? data : [] });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load activity log' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSecuritySummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await auditApi.getSummary();
      set({ securitySummary: res.data?.data || null });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load security summary' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAuditLogs: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await auditApi.getLogs(filters);
      const data = res.data?.data || res.data || {};
      set({ auditLogs: Array.isArray(data.logs) ? data.logs : [], auditLogsTotal: data.total || 0 });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load audit logs' });
    } finally {
      set({ isLoading: false });
    }
  },
}));
