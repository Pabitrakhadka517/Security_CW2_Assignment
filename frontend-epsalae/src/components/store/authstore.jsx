import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useFavoritesStore } from '@/store/favoritesstore';
import { useCart } from '@/store/cartstore';

/**
 * Two separate auth slices so an admin login can't grant user-route access
 * and vice-versa. Each persists under its own key in localStorage.
 *
 * For role-aware gating use `useAdminAuth` or `useUserAuth` directly.
 * `useAuthStore` is kept as a backward-compatibility view: it exposes the
 * currently-active session and routes its mutating actions to the user slice
 * (since the public site is the main caller). Admin code should switch to
 * `useAdminAuth` explicitly.
 */

export const useAdminAuth = create(
  persist(
    (set) => ({
      adminToken: null,
      admin: null,
      isAdmin: false,

      loginAdmin: (token, admin) => {
        if (token) {
          try { localStorage.setItem('adminToken', token); } catch (e) {}
        }
        set({ adminToken: token, admin, isAdmin: !!token });
      },

      logoutAdmin: () => {
        try {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('admin');
        } catch (e) {}
        set({ adminToken: null, admin: null, isAdmin: false });
      },
    }),
    { name: 'admin-auth-storage' }
  )
);

export const useUserAuth = create(
  persist(
    (set) => ({
      userToken: null,
      user: null,
      isUser: false,

      loginUser: (token, user) => {
        if (token) {
          try { localStorage.setItem('userToken', token); } catch (e) {}
        }
        set({ userToken: token, user, isUser: !!token });
      },

      logoutUser: () => {
        try { localStorage.removeItem('userToken'); } catch (e) {}
        set({ userToken: null, user: null, isUser: false });
        // Reset favorites AND cart so the next identity on this browser (a
        // guest, or a different account) starts fresh instead of inheriting
        // this session's items. Without this, the cart-merge-on-login in
        // LoginPage's completeLogin() would fold whatever was left in the
        // local cart into the NEXT account's saved server cart — visibly
        // leaking one user's/guest's cart contents into another account.
        useFavoritesStore.getState().reset();
        useCart.getState().clearCart();
      },

      patchUser: (patch) => set((s) => ({ user: { ...(s.user || {}), ...patch } })),
    }),
    { name: 'user-auth-storage' }
  )
);

/**
 * Compatibility hook for code that still imports `useAuthStore`.
 * - Reads represent the "currently active" session (user-first, admin fallback).
 * - `login`/`logout`/`setToken` act on the USER slice by default.
 * - Admin pages should call `loginAdmin`/`logoutAdmin` explicitly.
 */
export const useAuthStore = () => {
  const a = useAdminAuth();
  const u = useUserAuth();

  return {
    // Current-session view
    token: u.userToken || a.adminToken || null,
    user: u.user || a.admin || null,
    isLoggedIn: !!(u.isUser || a.isAdmin),

    // Role-specific reads (preferred)
    adminToken: a.adminToken,
    admin: a.admin,
    isAdmin: a.isAdmin,
    userToken: u.userToken,
    isUser: u.isUser,

    // Back-compat mutators — act on USER slice
    login: u.loginUser,
    logout: () => { u.logoutUser(); a.logoutAdmin(); },
    setToken: (t) => u.loginUser(t, u.user),

    // Explicit accessors
    loginUser: u.loginUser,
    logoutUser: u.logoutUser,
    loginAdmin: a.loginAdmin,
    logoutAdmin: a.logoutAdmin,
    patchUser: u.patchUser,
  };
};
