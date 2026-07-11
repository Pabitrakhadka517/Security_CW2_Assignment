// src/components/api/bannerapi.jsx
import api from './base';

const convertBase64ToFile = (base64, filename) => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new File([u8arr], filename, { type: mime });
};

export const bannerApi = {
  getAll: async () => {
    const res = await api.get('/banners/');
    return res;
  },

  // Public storefront — active banners only
  getActive: async () => {
    const res = await api.get('/banners/active');
    return res;
  },

  getById: async (id) => {
    const res = await api.get(`/banners/${id}`);
    return res;
  },

  create: async (data) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('subtitle', data.subtitle || '');
    formData.append('isActive', data.isActive !== undefined ? data.isActive : true);

    if (data.imageUrl && data.imageUrl.startsWith('data:')) {
      const file = convertBase64ToFile(data.imageUrl, `banner_${Date.now()}.jpg`);
      formData.append('image', file);
    } else if (data.imageUrl) {
      formData.append('imageUrl', data.imageUrl);
    }

    const res = await api.post('/banners/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res;
  },

  update: async (id, data) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('subtitle', data.subtitle || '');
    formData.append('isActive', data.isActive !== undefined ? data.isActive : true);

    if (data.imageUrl && data.imageUrl.startsWith('data:')) {
      const file = convertBase64ToFile(data.imageUrl, `banner_${Date.now()}.jpg`);
      formData.append('image', file);
    } else if (data.imageUrl && !data.imageUrl.includes('/uploads/')) {
      formData.append('imageUrl', data.imageUrl);
    }

    const res = await api.put(`/banners/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res;
  },

  remove: async (id) => {
    const res = await api.delete(`/banners/${id}`);
    return res;
  },
};