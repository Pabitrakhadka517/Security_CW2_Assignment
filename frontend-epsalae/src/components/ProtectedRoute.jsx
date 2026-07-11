import { useAdminAuth } from '../components/store/authstore';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const { isAdmin } = useAdminAuth();
  // Wait for Zustand persist to rehydrate from localStorage before deciding
  const hasHydrated = useAdminAuth.persist?.hasHydrated?.() ?? true;

  if (!hasHydrated) return null;

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
