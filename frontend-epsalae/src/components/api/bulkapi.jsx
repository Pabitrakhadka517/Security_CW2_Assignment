// src/components/api/bulkapi.jsx
// Admin bulk upload API — CSV/XLSX/JSON file + optional images ZIP.
import api from './base';

export const BULK_ENTITIES = [
  { key: 'categories',     label: 'Categories' },
  { key: 'products',       label: 'Products' },
  { key: 'banners',        label: 'Banners' },
  { key: 'seasonal-sales', label: 'Seasonal Sales' },
];

export const bulkApi = {
  /** POST the data file (+ optional zip). Returns the bulk report. */
  upload: (entity, file, zipFile, onProgress) => {
    const fd = new FormData();
    fd.append('file', file);
    if (zipFile) fd.append('images', zipFile);
    return api.post(`/admin/bulk/${entity}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
  },

  /** Download the sample template (csv/xlsx/json) with the admin token attached. */
  downloadTemplate: async (entity, format = 'csv') => {
    const res = await api.get(`/admin/bulk/templates/${entity}`, {
      params: { format },
      responseType: 'blob',
    });
    const ext = format === 'xlsx' ? 'xlsx' : format === 'json' ? 'json' : 'csv';
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity}-template.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
