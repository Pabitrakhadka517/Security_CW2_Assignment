import { Link } from 'react-router-dom'
import { ShieldAlert, X } from 'lucide-react'
import { useSessionAlertStore } from '@/components/store/sessionAlertStore'

/**
 * Persistent (until dismissed) banner shown when a refresh response flagged
 * `deviceMismatch: true` — see userApi's response interceptor. Only ever a
 * warning, never a forced logout, since device fingerprints legitimately
 * change across VPNs/browser updates (see backend session.service).
 */
export default function DeviceMismatchBanner() {
  const { deviceMismatch, deviceMismatchAt, setDeviceMismatch } = useSessionAlertStore()

  if (!deviceMismatch) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-90 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2.5 text-sm font-medium text-white"
    >
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span>
        Your account was accessed from a new device or location
        {deviceMismatchAt && ` (detected ${new Date(deviceMismatchAt).toLocaleString()})`}.
        If this wasn't you, secure your account now.
      </span>
      <Link
        to="/account/sessions"
        onClick={() => setDeviceMismatch(false)}
        className="shrink-0 underline underline-offset-2 hover:no-underline"
      >
        Review Sessions
      </Link>
      <button
        onClick={() => setDeviceMismatch(false)}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 hover:bg-white/20 transition"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
