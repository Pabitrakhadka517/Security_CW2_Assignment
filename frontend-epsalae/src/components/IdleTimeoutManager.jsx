import { useEffect, useRef, useState, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useUserAuth } from '@/components/store/authstore'
import userApi from '@/components/api/userapi'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes — NIST SP 800-63B recommends
// re-authentication after extended inactivity for session-bound apps.
const WARNING_BEFORE_LOGOUT_MS = 2 * 60 * 1000 // shows the modal 2 min before logout

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

/**
 * Mounted once near the app root. A no-op for guests/admins — only tracks
 * idle time while a storefront user session is active.
 */
export default function IdleTimeoutManager() {
  const { isUser, logoutUser } = useUserAuth()
  const [showWarning, setShowWarning] = useState(false)
  const idleTimerRef = useRef(null)
  const logoutTimerRef = useRef(null)

  const doLogout = useCallback(() => {
    setShowWarning(false)
    try { logoutUser() } catch (e) {}
    window.location.href = '/login?reason=idle_timeout'
  }, [logoutUser])

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
  }, [])

  const resetIdleTimer = useCallback(() => {
    clearTimers()
    setShowWarning(false)
    idleTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      logoutTimerRef.current = setTimeout(doLogout, WARNING_BEFORE_LOGOUT_MS)
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_LOGOUT_MS)
  }, [clearTimers, doLogout])

  useEffect(() => {
    if (!isUser) {
      clearTimers()
      setShowWarning(false)
      return undefined
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetIdleTimer))
    resetIdleTimer()

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetIdleTimer))
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUser])

  const stayLoggedIn = async () => {
    try {
      await userApi.post('/auth/refresh')
    } catch (e) { /* refresh failure will surface on the next real request */ }
    resetIdleTimer()
  }

  if (!isUser || !showWarning) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Still there?</h3>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          You've been inactive for a while. For your security, you'll be signed out in 2 minutes unless you stay logged in.
        </p>
        <div className="flex gap-2">
          <button
            onClick={doLogout}
            className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
          >
            Log out now
          </button>
          <button
            onClick={stayLoggedIn}
            className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition"
          >
            Stay logged in
          </button>
        </div>
      </div>
    </div>
  )
}
