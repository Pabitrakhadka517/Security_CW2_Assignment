import { useState } from 'react'
import { Eye, EyeOff, Lock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { profileEndpoints } from '@/components/api/userapi'

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
      </div>
    </div>
  )
}
