import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Lock, ShieldCheck, ShieldOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { profileEndpoints, mfaEndpoints } from '@/components/api/userapi'

function MFASection() {
  const [checking, setChecking] = useState(true)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [showDisable, setShowDisable] = useState(false)
  const [disableForm, setDisableForm] = useState({ password: '', token: '' })
  const [disabling, setDisabling] = useState(false)
  const [disableError, setDisableError] = useState(null)

  useEffect(() => {
    let cancelled = false
    mfaEndpoints.status()
      .then((res) => {
        if (cancelled) return
        setMfaEnabled(!!(res.data?.data?.mfaEnabled ?? res.data?.mfaEnabled))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [])

  const handleDisable = async (e) => {
    e.preventDefault()
    setDisableError(null)
    if (!disableForm.password || !disableForm.token) {
      setDisableError('Password and verification code are required')
      return
    }
    setDisabling(true)
    try {
      await mfaEndpoints.disable(disableForm)
      setMfaEnabled(false)
      setShowDisable(false)
      setDisableForm({ password: '', token: '' })
      toast.success('MFA disabled successfully')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to disable MFA'
      setDisableError(msg)
    } finally {
      setDisabling(false)
    }
  }

  return (
    <div className="mt-10 max-w-md border-t border-slate-100 pt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-slate-700" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-900">Two-Factor Authentication</h4>
          <p className="text-xs text-slate-500">Use an authenticator app for extra login security.</p>
        </div>
      </div>

      {checking ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : mfaEnabled ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
            <ShieldCheck size={16} className="shrink-0" />
            <span>MFA is active on your account.</span>
          </div>

          {!showDisable ? (
            <button
              onClick={() => setShowDisable(true)}
              className="w-full py-3 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl text-sm transition"
            >
              Disable MFA
            </button>
          ) : (
            <form onSubmit={handleDisable} className="space-y-3">
              {disableError && (
                <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  {disableError}
                </div>
              )}
              <input
                type="password"
                placeholder="Current password"
                value={disableForm.password}
                onChange={(e) => setDisableForm((f) => ({ ...f, password: e.target.value }))}
                disabled={disabling}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 disabled:opacity-50"
              />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit authenticator code"
                value={disableForm.token}
                onChange={(e) => setDisableForm((f) => ({ ...f, token: e.target.value }))}
                disabled={disabling}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 disabled:opacity-50"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDisable(false); setDisableError(null) }}
                  disabled={disabling}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disabling}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <ShieldOff size={14} />
                  {disabling ? 'Disabling…' : 'Confirm Disable'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <Link
          to="/account/security/mfa-setup"
          className="block w-full text-center py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition"
        >
          Enable MFA
        </Link>
      )}
    </div>
  )
}

export default function SecurityPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow] = useState({ current: false, newPwd: false, confirm: false })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(p => ({ ...p, [k]: '', api: '' }))
    setDone(false)
  }

  const toggle = (k) => setShow(s => ({ ...s, [k]: !s[k] }))

  const strengthInfo = (p) => {
    if (!p) return null
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^a-zA-Z0-9]/.test(p)) s++
    const map = [
      { label: 'Weak', color: 'bg-red-500', w: 'w-1/4' },
      { label: 'Weak', color: 'bg-red-500', w: 'w-1/4' },
      { label: 'Fair', color: 'bg-yellow-500', w: 'w-2/4' },
      { label: 'Good', color: 'bg-blue-500', w: 'w-3/4' },
      { label: 'Strong', color: 'bg-emerald-500', w: 'w-full' },
    ]
    return map[s]
  }

  const validate = () => {
    const e = {}
    if (!form.currentPassword) e.currentPassword = 'Required'
    if (!form.newPassword) e.newPassword = 'Required'
    else if (form.newPassword.length < 6) e.newPassword = 'At least 6 characters'
    if (!form.confirmPassword) e.confirmPassword = 'Required'
    else if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword)
      e.newPassword = 'New password must be different from current'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await profileEndpoints.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      setDone(true)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password changed successfully!')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to change password'
      setErrors(p => ({ ...p, api: msg }))
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const strength = strengthInfo(form.newPassword)

  const PwdField = ({ id, label, value, onChange, error, show: visible, onToggle, placeholder }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange}
          placeholder={placeholder} disabled={loading}
          className={`w-full pl-10 pr-11 py-3 border rounded-xl text-slate-900 text-sm transition focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 disabled:opacity-50 ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`} />
        <button type="button" onClick={onToggle} disabled={loading}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Security Settings</h3>
          <p className="text-sm text-slate-500">Update your password to keep your account secure.</p>
        </div>
      </div>

      <div className="mt-8 max-w-md">
        {done && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Password changed successfully.</span>
          </div>
        )}

        {errors.api && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errors.api}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <PwdField id="currentPassword" label="Current password" value={form.currentPassword}
            onChange={set('currentPassword')} error={errors.currentPassword}
            show={show.current} onToggle={() => toggle('current')} placeholder="Enter current password" />

          <div>
            <PwdField id="newPassword" label="New password" value={form.newPassword}
              onChange={set('newPassword')} error={errors.newPassword}
              show={show.newPwd} onToggle={() => toggle('newPwd')} placeholder="Min. 6 characters" />
            {strength && !errors.newPassword && (
              <div className="mt-2">
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color} ${strength.w}`} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{strength.label} password</p>
              </div>
            )}
          </div>

          <PwdField id="confirmPassword" label="Confirm new password" value={form.confirmPassword}
            onChange={set('confirmPassword')} error={errors.confirmPassword}
            show={show.confirm} onToggle={() => toggle('confirm')} placeholder="Re-enter new password" />

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Changing password...
              </span>
            ) : 'Change Password'}
          </button>
        </form>

        <MFASection />
      </div>
    </div>
  )
}
