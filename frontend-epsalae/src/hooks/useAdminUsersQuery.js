import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { adminUserApi } from '@/components/api/adminUserApi';
import { queryKeys } from '@/lib/queryClient';

/**
 * TanStack Query hooks for the Admin User Management screen
 * (components/admin/usercrud.jsx). Mirrors the pattern in useProductsQuery.js:
 * queries own the server cache, mutations invalidate it on success so the
 * table/detail view always reflect the latest state after an admin action.
 */
export function useAdminUsers(params = {}) {
  return useQuery({
    queryKey: queryKeys.adminUsers(params),
    queryFn: async () => {
      const res = await adminUserApi.list(params);
      return { users: res?.data?.data ?? [], pagination: res?.data?.pagination ?? null };
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id) {
  return useQuery({
    queryKey: queryKeys.adminUser(id),
    queryFn: async () => {
      const res = await adminUserApi.getById(id);
      return res?.data?.data ?? null;
    },
    enabled: !!id,
  });
}

/** Every mutation below invalidates the whole 'admin-users' family (list + detail) on success. */
function useAdminUserMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useLockUser() {
  return useAdminUserMutation(({ id, reason, durationMinutes }) => adminUserApi.lock(id, { reason, durationMinutes }));
}

export function useUnlockUser() {
  return useAdminUserMutation(({ id }) => adminUserApi.unlock(id));
}

export function useSetUserStatus() {
  return useAdminUserMutation(({ id, isActive, reason }) => adminUserApi.setStatus(id, { isActive, reason }));
}

export function useRevokeUserSessions() {
  return useAdminUserMutation(({ id }) => adminUserApi.revokeSessions(id));
}

export function useDeleteUser() {
  return useAdminUserMutation(({ id }) => adminUserApi.remove(id));
}
