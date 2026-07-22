import { useQuery } from '@tanstack/react-query';
import { profileEndpoints } from '@/components/api/userapi';
import { useUserAuth } from '@/components/store/authstore';

/**
 * Shared by the account-security page section and the global reminder
 * banner, so both read the same cached verification status instead of
 * issuing their own /user/profile fetch.
 */
export function useEmailVerificationStatus() {
  const { isUser } = useUserAuth();

  const query = useQuery({
    queryKey: ['email-verification-status'],
    queryFn: async () => {
      const res = await profileEndpoints.me();
      const data = res.data?.data || res.data || {};
      return !!data.emailVerified;
    },
    enabled: isUser,
    staleTime: 5 * 60 * 1000,
  });

  return {
    checking: isUser && query.isLoading,
    verified: query.data ?? true,
    refetch: query.refetch,
  };
}
