import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  ShieldCheck, ShieldAlert, ShieldOff, AlertTriangle, LogOut, UserPlus,
  RefreshCw, KeyRound, Lock, Clock, User, Image as ImageIcon, MapPin,
  ShoppingBag, Flame, Info, Loader2,
} from 'lucide-react'
import { useAuditStore } from '@/store/auditStore'

dayjs.extend(relativeTime)

// action → { icon, color, label }
const ACTION_META = {
  LOGIN_SUCCESS: { icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50', label: 'Signed in successfully' },
  LOGIN_FAILED: { icon: AlertTriangle, color: 'text-red-600 bg-red-50', label: 'Failed sign-in attempt' },
  LOGIN_BLOCKED_LOCKOUT: { icon: Lock, color: 'text-red-600 bg-red-50', label: 'Sign-in blocked (account locked)' },
  LOGIN_BLOCKED_RATE_LIMIT: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-50', label: 'Sign-in blocked (too many attempts)' },
  LOGOUT: { icon: LogOut, color: 'text-slate-500 bg-slate-100', label: 'Signed out' },
  REGISTER: { icon: UserPlus, color: 'text-blue-600 bg-blue-50', label: 'Account created' },
  TOKEN_REFRESH: { icon: RefreshCw, color: 'text-slate-500 bg-slate-100', label: 'Session refreshed' },
  TOKEN_REFRESH_FAILED: { icon: RefreshCw, color: 'text-red-600 bg-red-50', label: 'Session refresh failed' },
  MFA_ENABLED: { icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50', label: 'Two-factor authentication enabled' },
  MFA_DISABLED: { icon: ShieldOff, color: 'text-amber-600 bg-amber-50', label: 'Two-factor authentication disabled' },
  MFA_CHALLENGE_SUCCESS: { icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50', label: 'Two-factor code verified' },
  MFA_CHALLENGE_FAILED: { icon: ShieldAlert, color: 'text-red-600 bg-red-50', label: 'Failed two-factor code' },
  MFA_BACKUP_CODE_USED: { icon: KeyRound, color: 'text-amber-600 bg-amber-50', label: 'Backup code used' },
  PASSWORD_CHANGED: { icon: Lock, color: 'text-blue-600 bg-blue-50', label: 'Password changed' },
  PASSWORD_CHANGE_FAILED: { icon: Lock, color: 'text-red-600 bg-red-50', label: 'Password change failed' },
  PASSWORD_EXPIRED: { icon: Clock, color: 'text-amber-600 bg-amber-50', label: 'Password expired' },
  PASSWORD_RESET_REQUESTED: { icon: Clock, color: 'text-blue-600 bg-blue-50', label: 'Password reset requested' },
  PROFILE_UPDATED: { icon: User, color: 'text-slate-500 bg-slate-100', label: 'Profile updated' },
  AVATAR_UPDATED: { icon: ImageIcon, color: 'text-slate-500 bg-slate-100', label: 'Profile photo updated' },
  ADDRESS_ADDED: { icon: MapPin, color: 'text-slate-500 bg-slate-100', label: 'Address added' },
  ADDRESS_DELETED: { icon: MapPin, color: 'text-slate-500 bg-slate-100', label: 'Address removed' },
  ORDER_CREATED: { icon: ShoppingBag, color: 'text-slate-500 bg-slate-100', label: 'Order placed' },
  ORDER_CANCELLED: { icon: ShoppingBag, color: 'text-red-600 bg-red-50', label: 'Order cancelled' },
  SUSPICIOUS_ACTIVITY: { icon: Flame, color: 'text-red-700 bg-red-100', label: 'Suspicious activity detected' },
}

const DEFAULT_META = { icon: Info, color: 'text-slate-500 bg-slate-100', label: null }

function humanizeAction(action) {
  if (!action) return 'Activity'
  return action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, ' ')
}

// Minimal UA parse — good enough for "Chrome on Windows" style display without
// pulling in a full user-agent-parsing dependency for one label per row.
function parseUserAgent(ua) {
  if (!ua) return 'Unknown device'
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\//.test(ua) ? 'Opera' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua) ? 'Safari' : 'Unknown browser'
  const os =
    /Windows/.test(ua) ? 'Windows' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Linux/.test(ua) ? 'Linux' : 'Unknown OS'
  return `${browser} on ${os}`
}

function SecureAccountModal({ onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Secure your account</h3>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          If this sign-in wasn't you, change your password now and consider enabling two-factor authentication.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition">
            Change password
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AccountActivity() {
  const navigate = useNavigate()
  const { activityLog, isLoading, error, fetchActivityLog } = useAuditStore()
  const [modalFor, setModalFor] = useState(null)

  useEffect(() => { fetchActivityLog() }, [fetchActivityLog])

  // "Usual" IP = the most frequently seen IP in this log. Any LOGIN_SUCCESS
  // from a different IP is flagged as unfamiliar.
  const usualIp = useMemo(() => {
    const counts = {}
    activityLog.forEach((e) => { if (e.ipAddress) counts[e.ipAddress] = (counts[e.ipAddress] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  }, [activityLog])

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Account Activity</h3>
          <p className="text-sm text-slate-500">Recent security events on your account.</p>
        </div>
      </div>

      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {!isLoading && !error && activityLog.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-sm">No activity recorded yet.</div>
        )}

        {!isLoading && !error && activityLog.length > 0 && (
          <ul className="space-y-1">
            {activityLog.map((entry, i) => {
              const meta = ACTION_META[entry.action] || DEFAULT_META
              const Icon = meta.icon
              const label = meta.label || humanizeAction(entry.action)
              const isUnfamiliarLogin = entry.action === 'LOGIN_SUCCESS' && usualIp && entry.ipAddress && entry.ipAddress !== usualIp

              return (
                <li key={i} className="flex items-start gap-4 py-4 border-b border-slate-50 last:border-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-medium text-slate-900">{label}</p>
                      <p className="text-xs text-slate-400 whitespace-nowrap" title={entry.timestamp ? dayjs(entry.timestamp).format('MMM D, YYYY h:mm A') : ''}>
                        {entry.timestamp ? dayjs(entry.timestamp).fromNow() : '—'}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {entry.ipAddress || 'Unknown IP'} &middot; {parseUserAgent(entry.userAgent)}
                    </p>
                    {isUnfamiliarLogin && (
                      <button
                        onClick={() => setModalFor(entry)}
                        className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700 transition"
                      >
                        This wasn't me
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {modalFor && (
        <SecureAccountModal
          onClose={() => setModalFor(null)}
          onConfirm={() => { setModalFor(null); navigate('/account/security') }}
        />
      )}
    </div>
  )
}
