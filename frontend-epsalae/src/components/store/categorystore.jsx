// src/store/categoryStore.js
import { create } from 'zustand';
import { categoryApi } from '../api/categoryai';

export const useCategoryStore = create((set) => ({
  categories: [],
  loading: false,
  error: null,

  // Storefront: only active categories
  fetchActiveCategories: async () => {
    set({ loading: true, error: null });
    try {
      const res = await categoryApi.getActive();
      const data = res.data?.data || res.data || [];
      set({ categories: Array.isArray(data) ? data : [] });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to load categories' });
    } finally {
      set({ loading: false });
    }
  },

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const res = await categoryApi.getAll();
      // Handle both direct array and wrapped response
      const data = res.data?.data || res.data || [];
      // Log first category to see the FULL structure
      if (data.length > 0) {
      }
      set({ categories: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('❌ Error fetching categories:', err);
      set({ error: 'Failed to load categories', categories: [] });
    } finally {
      set({ loading: false });
    }
  },

  addCategory: async (data) => {
    set({ loading: true });
    try {
      const res = await categoryApi.create(data);
      // Handle both direct data and wrapped response
      const category = res.data?.data || res.data;
      if (category) {
        set((state) => ({ categories: [...state.categories, category] }));
      }
      return category;
    } catch (err) {
      console.error('❌ Error adding category:', err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateCategory: async (id, data) => {
    // Optimistic update - update UI immediately
    const previousCategories = useCategoryStore.getState().categories;
    
    // Immediately update the UI with new data
    set((state) => ({
      categories: state.categories.map((c) => {
        const catId = c.id || c._id;
        if (catId === id) {
          return { ...c, ...data, id: catId, _id: catId };
        }
        return c;
      }),
    }));

    try {
      const res = await categoryApi.update(id, data);
      // Handle both direct data and wrapped response
      const category = res.data?.data || res.data;
      if (category) {
        // Update with server response
        set((state) => ({
          categories: state.categories.map((c) => {
            const catId = c.id || c._id;
            if (catId === id) {
              return category;
            }
            return c;
          }),
        }));
      }
      return category;
    } catch (err) {
      console.error('❌ Error updating category:', err);
      console.error('❌ Error response:', err.response?.data);
      // Rollback on error
      set({ categories: previousCategories });
      throw err;
    }
  },

  deleteCategory: async (id) => {
    set({ loading: true });
    try {
      const res = await categoryApi.remove(id);
      set((state) => ({ categories: state.categories.filter((c) => (c.id || c._id) !== id) }));
      return res;
    } catch (err) {
      console.error('❌ Error deleting category:', err);
      console.error('❌ Error response:', err.response?.data);
      set({ error: err.response?.data?.message || err.message || 'Failed to delete category' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));