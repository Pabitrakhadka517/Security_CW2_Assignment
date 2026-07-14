import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Monitor, Smartphone, ShieldCheck, LogOut, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { sessionEndpoints } from '@/components/api/userapi'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

dayjs.extend(relativeTime)

function deviceIcon(deviceName) {
  if (/iOS|Android/i.test(deviceName || '')) return Smartphone
  return Monitor
}

export default function AccountSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revokingId, setRevokingId] = useState(null)
  const [revokingOthers, setRevokingOthers] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null) // session object or 'all' or null

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await sessionEndpoints.list()
      setSessions(res.data?.data || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleRevoke = async (sessionId) => {
    setRevokingId(sessionId)
    try {
      await sessionEndpoints.revoke(sessionId)
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
      toast.success('Session terminated')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to terminate session')
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeOthers = async () => {
    setRevokingOthers(true)
    try {
      const res = await sessionEndpoints.revokeOthers()
      const count = res.data?.data?.revokedSessions ?? 0
      toast.success(`${count} other session${count === 1 ? '' : 's'} terminated`)
      await fetchSessions()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to terminate other sessions')
    } finally {
      setRevokingOthers(false)
    }
  }

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length

  return (
    <div className="rounded-card bg-white p-5 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">Active Sessions</h3>
            <p className="text-sm text-slate-500">Devices currently signed in to your account.</p>
          </div>
        </div>

        <button
          onClick={() => setConfirmTarget('all')}
          disabled={revokingOthers || otherSessionsCount === 0}
          className="flex items-center gap-2 py-2.5 px-4 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {revokingOthers ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          Log out all other devices
        </button>
      </div>

      <div className="mt-8">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-sm">No active sessions found.</div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <ul className="space-y-1">
            {sessions.map((s) => {
              const Icon = deviceIcon(s.deviceName)
              return (
                <li key={s.sessionId} className="flex items-start gap-4 py-4 border-b border-slate-50 last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-slate-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-medium text-slate-900">{s.deviceName}</p>
                      {s.isCurrent && (
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          Current session
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {s.ipAddress || 'Unknown IP'} &middot; Last active {s.lastUsedAt ? dayjs(s.lastUsedAt).fromNow() : '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmTarget(s)}
                    disabled={s.isCurrent || revokingId === s.sessionId}
                    aria-label={`Revoke session on ${s.deviceName || 'this device'}`}
                    className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {revokingId === s.sessionId ? 'Revoking…' : 'Revoke'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmTarget}
        title={confirmTarget === 'all' ? 'Log out all other devices?' : 'Revoke this session?'}
        description={confirmTarget === 'all'
          ? "This will immediately sign out every device except this one."
          : `This will immediately sign out the session on ${confirmTarget?.deviceName || 'this device'}.`}
        confirmLabel={confirmTarget === 'all' ? 'Log out all' : 'Revoke'}
        variant="danger"
        onConfirm={() => {
          if (confirmTarget === 'all') {
            handleRevokeOthers()
          } else if (confirmTarget) {
            handleRevoke(confirmTarget.sessionId)
          }
          setConfirmTarget(null)
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  )
}
