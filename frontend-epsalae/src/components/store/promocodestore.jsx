// src/components/store/promocodestore.jsx
import { create } from 'zustand';
import { couponApi } from '../api/promocode';

export const useCouponStore = create((set) => ({
  coupons: [],
  loading: false,
  error: null,
  validatedCoupon: null,

  fetchCoupons: async () => {
    set({ loading: true, error: null });
    try {
      const res = await couponApi.getAll();
      const data = res.data?.data || res.data || [];
      const coupons = Array.isArray(data) ? data : [];
      console.log('🎟️ Coupons fetched:', { count: coupons.length });
      set({ coupons });
    } catch (err) {
      console.error('❌ Error fetching coupons:', err);
      set({ error: err.response?.data?.message || 'Failed to load coupons' });
    } finally {
      set({ loading: false });
    }
  },

  validateCoupon: async (code, context = {}) => {
    set({ loading: true });
    try {
      const res = await couponApi.validate(code, context);
      const coupon = res.data?.data || res.data;
      set({ validatedCoupon: coupon });
      return coupon;
    } catch (err) {
      console.error('❌ Coupon validation failed:', err);
      set({ validatedCoupon: null, error: err.response?.data?.message || 'Invalid coupon' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // Admin: fetch usage analytics for a single coupon.
  fetchCouponAnalytics: async (code) => {
    const res = await couponApi.analytics(code);
    return res.data?.data || res.data;
  },

  addCoupon: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await couponApi.create(data);
      const newCoupon = res.data?.data || res.data;
      set((state) => ({
        coupons: Array.isArray(state.coupons) ? [...state.coupons, newCoupon] : [newCoupon],
      }));
      return newCoupon;
    } catch (err) {
      console.error('❌ Error adding coupon:', err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateCoupon: async (code, data) => {
    set({ loading: true, error: null });
    try {
      const res = await couponApi.update(code, data);
      const updatedCoupon = res.data?.data || res.data;
      set((state) => ({
        coupons: state.coupons.map((c) => (c.code === code ? updatedCoupon : c)),
      }));
      return updatedCoupon;
    } catch (err) {
      console.error('❌ Error updating coupon:', err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteCoupon: async (code) => {
    set({ loading: true, error: null });
    try {
      await couponApi.remove(code);
      set((state) => ({ coupons: state.coupons.filter((c) => c.code !== code) }));
    } catch (err) {
      console.error('❌ Error deleting coupon:', err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));