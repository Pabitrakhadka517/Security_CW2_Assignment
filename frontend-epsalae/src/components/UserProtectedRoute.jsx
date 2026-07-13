import { Navigate, useLocation } from 'react-router-dom'
import { useUserAuth } from '@/components/store/authstore'
import RBACGuard from './guards/RBACGuard'

export default function UserProtectedRoute({ children }) {
  const { isUser } = useUserAuth()
  const location = useLocation()
  // Wait for Zustand persist to rehydrate from localStorage before deciding
  const hasHydrated = useUserAuth.persist?.hasHydrated?.() ?? true

  if (!hasHydrated) return null

  const loginRedirect = (
    <Navigate
      to="/login"
      replace
      state={{ returnTo: location.pathname + location.search }}
    />
  )

  if (!isUser) {
    return loginRedirect
  }

  // Defense-in-depth: also verify the stored userToken actually decodes to
  // role 'user' and isn't expired.
  return (
    <RBACGuard requiredRole="user" fallback={loginRedirect}>
      {children}
    </RBACGuard>
  )
}
