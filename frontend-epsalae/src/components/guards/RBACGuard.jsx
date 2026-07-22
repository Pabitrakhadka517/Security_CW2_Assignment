import { Navigate } from 'react-router-dom'
import { useAdminAuth, useUserAuth } from '@/components/store/authstore'
import { decodeJwt, isTokenExpired } from '@/utils/jwt'

/**
 * Route guard that derives role from the decoded JWT payload — not from a
 * separately stored role string — so a tampered localStorage value alone
 * can't grant access to UI it shouldn't see. Real authorization is still
 * enforced server-side; this only prevents the client from rendering
 * admin/user-only UI it has no valid token for.
 *
 * Props:
 *  - requiredRole: 'admin' | 'user'
 *  - fallback?: ReactNode rendered instead of the default redirect
 */
export default function RBACGuard({ requiredRole, children, fallback }) {
  const admin = useAdminAuth()
  const user = useUserAuth()

  const hasHydrated =
    (useAdminAuth.persist?.hasHydrated?.() ?? true) &&
    (useUserAuth.persist?.hasHydrated?.() ?? true)
  if (!hasHydrated) return null

  const token = requiredRole === 'admin' ? admin.adminToken : user.userToken
  const storeSaysAuthed = requiredRole === 'admin' ? admin.isAdmin : user.isUser

  if (!storeSaysAuthed || !token) {
    if (fallback) return fallback
    return <Navigate to={requiredRole === 'admin' ? '/admin/login' : '/login'} replace />
  }

  const payload = decodeJwt(token)
  // Admin JWTs now carry the underlying Admin document's real role — 'admin'
  // or 'super_admin' — see backend auth.controller#issueAdminSession and
  // rbac.ts PERMISSIONS.super_admin (a strict superset of admin). So a
  // super_admin token must still satisfy requiredRole="admin" here; the
  // finer-grained split between the two happens server-side per-endpoint.
  const roleMatches = requiredRole === 'admin'
    ? payload?.role === 'admin' || payload?.role === 'super_admin'
    : payload?.role === 'user'

  if (!payload || isTokenExpired(token) || !roleMatches) {
    // Tampered, expired, or wrong-role token — don't trust the store's
    // cached isAdmin/isUser flag over it. Drop the session.
    if (requiredRole === 'admin') admin.logoutAdmin()
    else user.logoutUser()

    if (fallback) return fallback
    return <Navigate to="/403" replace />
  }

  return children
}
