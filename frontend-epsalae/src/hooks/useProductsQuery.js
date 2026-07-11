import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { productApi } from '@/components/api/productapi';
import { queryKeys } from '@/lib/queryClient';

/**
 * React Query hooks for product server-data.
 *
 * This is the reference pattern for migrating server data off Zustand onto
 * React Query: declarative caching, retry, background refetch and pagination
 * come for free. Other domains (orders, categories, coupons, analytics) can be
 * migrated the same way.
 *
 * Usage:
 *   const { data, isLoading, isError, refetch } = useProducts({ limit: 24 })
 *   const products = data?.products ?? []
 */
const unwrap = (res) => {
  const payload = res?.data?.data ?? res?.data ?? {};
  // The list endpoint returns { data: [...], pagination } or { products: [...] }.
  const list = Array.isArray(payload) ? payload : (payload.products ?? payload.items ?? []);
  const pagination = res?.data?.pagination ?? payload.pagination ?? null;
  return { products: Array.isArray(list) ? list : [], pagination };
};

export function useProducts(params = {}) {
  return useQuery({
    queryKey: queryKeys.products(params),
    queryFn: async () => unwrap(await productApi.getAll(params)),
    placeholderData: keepPreviousData, // smooth pagination — keep old page while next loads
  });
}

export function useProduct(id) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: async () => {
      const res = await productApi.getById(id);
      return res?.data?.data ?? res?.data ?? null;
    },
    enabled: !!id, // don't run until we have an id
  });
}

export function useProductsWithOffers(params = {}) {
  return useQuery({
    queryKey: queryKeys.products({ ...params, hasOffer: true }),
    queryFn: async () => unwrap(await productApi.getWithOffers(params)),
  });
}
