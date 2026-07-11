import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized TanStack Query client.
 *
 * Server data (products, orders, categories, coupons, analytics, …) should be
 * fetched through React Query hooks rather than stored in Zustand. Zustand stays
 * for client/UI state (auth, cart, wishlist, theme, modals).
 *
 * Defaults below give a good production baseline:
 *  - staleTime: data is considered fresh for 60s → fewer duplicate refetches
 *  - gcTime: cache kept 5 min after last use
 *  - retry: 2 attempts with exponential backoff (but not for 4xx)
 *  - refetchOnWindowFocus off (storefront data doesn't need aggressive refetch)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        // Don't retry client errors (validation, auth, not-found).
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Stable query keys — one place to define them so invalidation stays consistent.
 */
export const queryKeys = {
  products: (params = {}) => ['products', params],
  product: (id) => ['product', id],
  categories: (params = {}) => ['categories', params],
  orders: (params = {}) => ['orders', params],
  coupons: (params = {}) => ['coupons', params],
  saleCategories: (params = {}) => ['sale-categories', params],
};
