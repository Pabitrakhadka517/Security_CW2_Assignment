// src/api/categoryApi.js
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

export const categoryApi = {
  // Default limit covers the full department+subcategory tree (currently ~51
  // nodes) — admin screens and the storefront both expect the complete list,
  // not just the first page.
  getAll: () => api.get('/categories/?limit=100'),

  // Public storefront — active categories only
  getActive: () => api.get('/categories/active'),
  
  create: (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('isActive', data.isActive);
    
    // Convert base64 to File if present
    if (data.imageUrl && data.imageUrl.includes('data:image')) {
      const file = base64ToFile(data.imageUrl, 'category-image.png');
      if (file) {
        formData.append('image', file); // Backend expects 'image' field name
      }
    }
    
    return api.post('/categories/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  getById: (id) => api.get(`/categories/${id}`),
  
  update: (id, data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description || '');
    formData.append('isActive', data.isActive?.toString() || 'true');
    
    // Handle image - either new base64/file upload or existing URL
    if (data.imageUrl) {
      if (data.imageUrl.includes('data:image')) {
        // New image uploaded as base64 - convert to file
        const file = base64ToFile(data.imageUrl, 'category-image.png');
        if (file) {
          formData.append('image', file);
        }
      } else if (data.imageUrl.startsWith('http')) {
        // Existing Cloudinary URL - pass it to backend to preserve
        formData.append('imageUrl', data.imageUrl);
      }
    }
    
    return api.put(`/categories/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  remove: (id) => {
    return api.delete(`/categories/${id}`);
  },
};