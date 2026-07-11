import { Navigate, useLocation } from 'react-router-dom'
import { useUserAuth } from '@/components/store/authstore'

export default function UserProtectedRoute({ children }) {
  const { isUser } = useUserAuth()
  const location = useLocation()
  // Wait for Zustand persist to rehydrate from localStorage before deciding
  const hasHydrated = useUserAuth.persist?.hasHydrated?.() ?? true

  if (!hasHydrated) return null

  if (!isUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    )
  }

  return children
}
