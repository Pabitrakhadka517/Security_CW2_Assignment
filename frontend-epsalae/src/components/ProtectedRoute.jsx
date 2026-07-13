import { useAdminAuth } from '../components/store/authstore';
import { Navigate } from 'react-router-dom';
import RBACGuard from './guards/RBACGuard';

export default function ProtectedRoute({ children }) {
  const { isAdmin } = useAdminAuth();
  // Wait for Zustand persist to rehydrate from localStorage before deciding
  const hasHydrated = useAdminAuth.persist?.hasHydrated?.() ?? true;

  if (!hasHydrated) return null;

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Defense-in-depth: also verify the stored adminToken actually decodes to
  // role 'admin' and isn't expired, so a stale/tampered token can't keep
  // rendering the admin shell after the store's isAdmin flag goes stale.
  return (
    <RBACGuard requiredRole="admin" fallback={<Navigate to="/admin/login" replace />}>
      {children}
    </RBACGuard>
  );
}
