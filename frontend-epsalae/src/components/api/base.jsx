// src/components/api/base.jsx
// Admin-scoped axios client. Attaches the adminToken header, and on a 401
// tries one silent /auth/refresh before bailing out. Cookies are sent so the
// refresh httpOnly cookie reaches the backend.
import axios from 'axios';
import { API_URL } from '@/config';
import { getRoleFromToken } from '@/utils/jwt';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send refreshToken cookie on /auth/refresh
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Attach admin token on every request, plus a client-read role header. The
// server never trusts X-Client-Role for authorization (it re-derives role
// from the verified JWT on every request) — this only shows up in
// server-side logs so a request whose claimed role doesn't match what the
// token actually verifies to stands out.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    const role = getRoleFromToken(token);
    if (role) config.headers['X-Client-Role'] = role;
  }
  return config;
});

// --- Single-flight refresh: dedupe concurrent 401s ---
let refreshPromise = null;
const refreshAdminToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const data = res.data?.data || res.data || {};
        const newToken = data.token || data.accessToken;
        if (newToken) {
          localStorage.setItem('adminToken', newToken);
        }
        return newToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

const isAdminPath = () => {
  try { return window.location.pathname.startsWith('/admin'); } catch (e) { return false; }
};

// Try refresh once on 401; only redirect to /admin/login when we're actually
// on an admin page (so a stray 401 from a public call doesn't kick a normal
// shopper out of the storefront).
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;

    if (status === 401 && !original._retried) {
      original._retried = true;
      // Don't try to refresh on the refresh endpoint itself
      if (!String(original.url || '').includes('/auth/refresh')) {
        try {
          const newToken = await refreshAdminToken();
          if (newToken) {
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${newToken}`;
            return api(original);
          }
        } catch (e) { /* fallthrough to logout */ }
      }

      // Refresh failed — clear admin session
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin');
      try { localStorage.removeItem('admin-auth-storage'); } catch (e) {}

      if (isAdminPath()) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
