// src/api/productApi.js
import api from './base';

// Helper to convert base64 to File
const base64ToFile = (base64String, fileName) => {
  if (!base64String.includes('data:image')) {
    return null; // Not a data URL
  }
  
  const arr = base64String.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new File([u8arr], fileName, { type: mime });
};

export const productApi = {
  /**
   * Get all products with pagination and filters
   */
  getAll: (params) => {
    // Contract: camelCase query params — page, limit, search, categoryId,
    // hasOffer, minPrice, maxPrice, sortBy, order, includeInactive (admin).
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page);
    if (params?.limit) queryParams.append('limit', params.limit);
    if (params?.search) queryParams.append('search', params.search);
    const categoryId = params?.categoryId || params?.category_id;
    if (categoryId) queryParams.append('categoryId', categoryId);
    if (params?.minPrice !== undefined) queryParams.append('minPrice', params.minPrice);
    if (params?.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice);
    if (params?.hasOffer !== undefined) queryParams.append('hasOffer', params.hasOffer);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.order) queryParams.append('order', params.order);
    if (params?.includeInactive) queryParams.append('includeInactive', 'true');

    return api.get(`/products?${queryParams.toString()}`);
  },

  /**
   * Get product by ID
   */
  getById: (id) => api.get(`/products/${id}`),

  /**
   * Get products by category
   */
  getByCategory: (categoryId, params) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page);
    if (params?.limit) queryParams.append('limit', params.limit);
    if (params?.search) queryParams.append('search', params.search);

    return api.get(`/products/category/${categoryId}?${queryParams.toString()}`);
  },

  /**
   * Get products with offers
   */
  getWithOffers: (params) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page);
    if (params?.limit) queryParams.append('limit', params.limit);

    return api.get(`/products/offers?${queryParams.toString()}`);
  },

  /**
   * Create product (admin)
   */
  create: (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('price', data.price.toString());
    formData.append('category_id', data.category_id);
    
    if (data.description) formData.append('description', data.description);
    if (data.stock !== undefined) formData.append('stock', data.stock.toString());
    if (data.discountPrice !== undefined && data.discountPrice > 0) formData.append('discountPrice', data.discountPrice.toString());
    if (data.hasOffer !== undefined) formData.append('hasOffer', data.hasOffer);
    if (data.isActive !== undefined) formData.append('isActive', data.isActive);

    // Convert base64 to File if present
    if (data.imageUrl && data.imageUrl.includes('data:image')) {
      const file = base64ToFile(data.imageUrl, 'product-image.png');
      if (file) {
        formData.append('image', file); // Backend expects 'image' field name
      }
    }

    return api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Update product (admin)
   */
  update: (id, data) => {
    const formData = new FormData();
    
    if (data.name) formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.price !== undefined) formData.append('price', data.price.toString());
    if (data.stock !== undefined) formData.append('stock', data.stock.toString());
    if (data.category_id) formData.append('category_id', data.category_id);
    if (data.discountPrice !== undefined) formData.append('discountPrice', data.discountPrice.toString());
    if (data.hasOffer !== undefined) formData.append('hasOffer', data.hasOffer.toString());
    if (data.isActive !== undefined) formData.append('isActive', data.isActive.toString());

    // Handle image - either new base64 upload or existing URL
    if (data.imageUrl) {
      if (data.imageUrl.includes('data:image')) {
        // New image uploaded as base64 - convert to file
        const file = base64ToFile(data.imageUrl, 'product-image.png');
        if (file) {
          formData.append('image', file);
        }
      } else if (data.imageUrl.startsWith('http')) {
        // Existing Cloudinary URL - pass it to backend to preserve
        formData.append('imageUrl', data.imageUrl);
      }
    }

    return api.put(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Delete product (admin)
   */
  remove: (id) => {
    return api.delete(`/products/${id}`);
  },
};
