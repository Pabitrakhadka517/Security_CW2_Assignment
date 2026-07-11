// src/components/store/orderstore.jsx
import { create } from 'zustand';
import { orderApi } from '../api/orderapi';

export const useOrderStore = create((set) => ({
  orders: [],
  pagination: null,
  stats: null,
  loading: false,
  error: null,

  // Server-computed statistics (GET /orders/stats) — covers ALL orders, not
  // just the page currently loaded.
  fetchStats: async () => {
    try {
      const res = await orderApi.getStats();
      set({ stats: res.data?.data || null });
    } catch (err) {
      set({ stats: null });
    }
  },

  createOrder: async (orderData) => {
    set({ loading: true, error: null });
    try {
      const res = await orderApi.create(orderData);
      const newOrder = res.data?.data || res.data;
      set((state) => ({
        orders: Array.isArray(state.orders) ? [...state.orders, newOrder] : [newOrder],
      }));
      return newOrder;
    } catch (err) {
      console.error('❌ Error creating order:', err);
      set({ error: err.response?.data?.message || 'Failed to create order' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchOrders: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await orderApi.getAll(params);
      const data = res.data?.data || res.data || [];
      const orders = Array.isArray(data) ? data : [];
      set({ orders, pagination: res.data?.meta || null });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load orders' });
    } finally {
      set({ loading: false });
    }
  },

  updateOrderStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      const res = await orderApi.updateStatus(id, status);
      const updatedOrder = res.data?.data || res.data;
      set((state) => ({
        orders: state.orders.map((o) => ((o.id || o._id) === (id.id || id._id || id) ? updatedOrder : o)),
      }));
      return updatedOrder;
    } catch (err) {
      console.error('❌ Error updating order status:', err);
      set({ error: err.response?.data?.message || 'Failed to update order' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));