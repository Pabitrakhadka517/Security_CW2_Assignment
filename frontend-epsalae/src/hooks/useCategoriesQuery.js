import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '@/components/api/categoryai';
import { queryKeys } from '@/lib/queryClient';

/**
 * React Query hook for categories — second domain migrated off Zustand,
 * following the same pattern as useProducts. Categories change rarely, so a
 * longer stale time keeps them cached and avoids repeat fetches across pages.
 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: async () => {
      const res = await categoryApi.getAll();
      const payload = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(payload) ? payload : (payload.categories ?? payload.items ?? []);
      return Array.isArray(list) ? list : [];
    },
    staleTime: 5 * 60 * 1000, // categories are fairly static
  });
}
