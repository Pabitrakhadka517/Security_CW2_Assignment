// User-scoped axios client. Sends Authorization: Bearer <userToken>, sends
// cookies for the refresh endpoint, and silently retries one /auth/refresh
// on a 401 before propagating the error.
import axios from 'axios';
import { API_URL } from '@/config';
import { useUserAuth } from '@/components/store/authstore';
import { useSessionAlertStore } from '@/components/store/sessionAlertStore';
import { getRoleFromToken } from '@/utils/jwt';

const userApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

userApi.interceptors.request.use((config) => {
  // Don't clobber a caller-supplied Authorization header (e.g. the MFA
  // challenge endpoint, which authenticates with a one-off mfaPendingToken
  // instead of the stored session token).
  if (config.headers.Authorization) return config;
  const token = localStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Client-read role, for server-side log correlation only — the server
    // always re-derives the real role from the verified token itself.
    const role = getRoleFromToken(token);
    if (role) config.headers['X-Client-Role'] = role;
  }
  return config;
});

// --- Single-flight refresh ---
let refreshPromise = null;
const refreshUserToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const data = res.data?.data || res.data || {};
        const newToken = data.token || data.accessToken;
        if (newToken) {
          localStorage.setItem('userToken', newToken);
        }
        return newToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

userApi.interceptors.response.use(
  (resp) => {
    // The refresh endpoint (and any other) may flag that this session was
    // just used from a device fingerprint that doesn't match the one that
    // created it. Never auto-revoked server-side — just surfaced as a
    // persistent banner (see DeviceMismatchBanner) so the user can review
    // /account/sessions themselves.
    if (resp?.data?.data?.deviceMismatch) {
      try { useSessionAlertStore.getState().setDeviceMismatch(true); } catch (e) {}
    }
    return resp;
  },
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const code = error.response?.data?.code;

    // Password has expired (90-day policy) — no amount of retrying fixes
    // this, so drop the session immediately and send the user to log back
    // in and set a new password.
    if (status === 403 && code === 'PASSWORD_EXPIRED') {
      try { useUserAuth.getState().logoutUser(); } catch (e) {}
      try {
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?reason=expired';
        }
      } catch (e) {}
      return Promise.reject(error);
    }

    // 401 with code TOKEN_EXPIRED means the access token itself expired —
    // worth a silent refresh. A plain 401 (e.g. bad credentials on some
    // other endpoint) also falls through to the same retry-once attempt for
    // backward compatibility with servers that don't send `code` yet.
    if (status === 401 && !original._retried && !original.skipAuthRetry) {
      original._retried = true;
      if (!String(original.url || '').includes('/auth/refresh')) {
        try {
          const newToken = await refreshUserToken();
          if (newToken) {
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${newToken}`;
            return userApi(original);
          }
        } catch (e) { /* fallthrough */ }
      }

      // Refresh failed — drop the user session in both localStorage AND the
      // live Zustand state. Clearing localStorage alone left `isUser` stale
      // in memory, so UserProtectedRoute never noticed the session had died
      // and pages like the wishlist just rendered an empty/stuck state with
      // no redirect to login. Deliberately NOT forcing a hard redirect here
      // (userApi is called from public pages too) — UserProtectedRoute
      // already soft-redirects any protected page once `isUser` flips false.
      try {
        useUserAuth.getState().logoutUser();
      } catch (e) {}
    }
    return Promise.reject(error);
  }
);

export const authEndpoints = {
  login: (payload) => userApi.post('/auth/user/login', payload),
  register: (payload) => userApi.post('/auth/register', payload),
  logout: () => userApi.post('/auth/logout'),
  // MFA challenge (step 2 of login) authenticates with the short-lived
  // mfaPendingToken, not the normal Bearer session — pass it explicitly
  // rather than relying on the request interceptor's stored userToken.
  mfaChallenge: (payload, mfaPendingToken) => userApi.post('/auth/mfa/challenge', payload, {
    headers: { Authorization: `Bearer ${mfaPendingToken}` },
    skipAuthRetry: true,
  }),
  // Google Sign-In — `credential` is the ID token from Google Identity
  // Services, verified server-side. Bypasses MFA by design (see backend).
  google: (credential) => userApi.post('/auth/google', { credential }),
};

export const sessionEndpoints = {
  list: () => userApi.get('/auth/sessions'),
  revoke: (sessionId) => userApi.delete(`/auth/sessions/${sessionId}`),
  revokeOthers: () => userApi.delete('/auth/sessions'),
};

export const mfaEndpoints = {
  status: () => userApi.get('/auth/mfa/status'),
  setup: () => userApi.post('/auth/mfa/setup'),
  verifySetup: (payload) => userApi.post('/auth/mfa/verify-setup', payload),
  disable: (payload) => userApi.post('/auth/mfa/disable', payload),
};

export const profileEndpoints = {
  me: () => userApi.get('/user/profile'),
  update: (payload) => userApi.put('/user/profile', payload),
  uploadAvatar: (formData) => userApi.post('/user/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  addresses: {
    list: () => userApi.get('/user/addresses'),
    add: (payload) => userApi.post('/user/addresses', payload),
    remove: (index) => userApi.delete(`/user/addresses/${index}`),
  },
  cart: {
    merge: (payload) => userApi.post('/user/cart/merge', payload),
    get: () => userApi.get('/user/cart'),
  },
  favorites: {
    list: () => userApi.get('/user/favorites'),
    add: (productId) => userApi.post('/user/favorites', { productId }),
    remove: (productId) => userApi.delete('/user/favorites', { data: { productId } }),
  },
  orders: (q) => userApi.get('/user/orders', { params: q }),
  changePassword: (payload) => userApi.put('/user/profile/password', payload),
  exportData: () => userApi.get('/user/export-data'),
};

export default userApi;
