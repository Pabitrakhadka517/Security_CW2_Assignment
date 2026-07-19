import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, ShieldCheck, ShieldOff, CheckCircle2, AlertCircle, Loader2, Download, Info, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { profileEndpoints, mfaEndpoints, authEndpoints } from '@/components/api/userapi'
import { useUserAuth } from '@/components/store/authstore'
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter'
import PasswordRules from '@/components/ui/PasswordRules'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'Minimum 12 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const DISABLE_RESEND_COOLDOWN_SECONDS = 60

function MFASection() {
  const [checking, setChecking] = useState(true)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaMethod, setMfaMethod] = useState('totp')
  const [showDisable, setShowDisable] = useState(false)
  const [disableForm, setDisableForm] = useState({ password: '', token: '' })
  const [disabling, setDisabling] = useState(false)
  const [disableError, setDisableError] = useState(null)
  const [showDisablePwd, setShowDisablePwd] = useState(false)
  const [emailCodeSent, setEmailCodeSent] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    let cancelled = false
    mfaEndpoints.status()
      .then((res) => {
        if (cancelled) return
        const data = res.data?.data || res.data || {}
        setMfaEnabled(!!data.mfaEnabled)
        setMfaMethod(data.mfaMethod || 'totp')
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const sendDisableCode = async () => {
    setSendingCode(true)
    setDisableError(null)
    try {
      await mfaEndpoints.requestDisableCode()
      setEmailCodeSent(true)
      setResendCooldown(DISABLE_RESEND_COOLDOWN_SECONDS)
      toast.success('Verification code sent to your email')
    } catch (err) {
      setDisableError(err?.response?.data?.message || 'Failed to send verification code')
    } finally {
      setSendingCode(false)
    }
  }

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
      setEmailCodeSent(false)
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
          ) : mfaMethod === 'email' && !emailCodeSent ? (
            <div className="space-y-3">
              {disableError && (
                <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  {disableError}
                </div>
              )}
              <p className="text-sm text-slate-500">We'll email you a code to confirm disabling MFA.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDisable(false); setDisableError(null) }}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendDisableCode}
                  disabled={sendingCode}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
                >
                  {sendingCode ? 'Sending…' : 'Send code to my email'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDisable} className="space-y-3">
              {disableError && (
                <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  {disableError}
                </div>
              )}
              <div className="relative">
                <input
                  type={showDisablePwd ? 'text' : 'password'}
                  placeholder="Current password"
                  value={disableForm.password}
                  onChange={(e) => setDisableForm((f) => ({ ...f, password: e.target.value }))}
                  disabled={disabling}
                  className="w-full px-4 py-3 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowDisablePwd((p) => !p)}
                  aria-label={showDisablePwd ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 rounded"
                >
                  {showDisablePwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={mfaMethod === 'email' ? '6-digit email code' : '6-digit authenticator code'}
                value={disableForm.token}
                onChange={(e) => setDisableForm((f) => ({ ...f, token: e.target.value }))}
                disabled={disabling}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 disabled:opacity-50"
              />
              {mfaMethod === 'email' && (
                <button
                  type="button"
                  onClick={sendDisableCode}
                  disabled={sendingCode || resendCooldown > 0}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDisable(false); setDisableError(null); setEmailCodeSent(false) }}
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

function EmailVerificationSection() {
  const [checking, setChecking] = useState(true)
  const [verified, setVerified] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let cancelled = false
    profileEndpoints.me()
      .then((res) => {
        if (cancelled) return
        const data = res.data?.data || res.data || {}
        setVerified(!!data.emailVerified)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [])

  const handleResend = async () => {
    setSending(true)
    try {
      const res = await authEndpoints.resendVerification()
      toast.success(res.data?.message || 'Verification email sent')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send verification email')
    } finally {
      setSending(false)
    }
  }

  if (checking || verified) return null

  return (
    <div className="mt-10 max-w-md border-t border-slate-100 pt-8">
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
        <Mail size={16} className="shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Please verify your email address</p>
          <p className="text-xs text-amber-700 mt-0.5">Check your inbox for a verification link, or resend one below.</p>
        </div>
      </div>
      <button
        onClick={handleResend}
        disabled={sending}
        className="mt-3 w-full py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition disabled:opacity-60"
      >
        {sending ? 'Sending…' : 'Resend verification email'}
      </button>
    </div>
  )
}

function DataExportSection() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await profileEndpoints.exportData()
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-epasaley-data.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Your data export has started downloading')
    } catch (err) {
      if (err?.response?.status === 429) {
        toast.error('You can only export your data 3 times per day')
      } else {
        toast.error(err?.response?.data?.message || 'Failed to export data')
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mt-10 max-w-md border-t border-slate-100 pt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <Download className="w-4 h-4 text-slate-700" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-900">Download My Data</h4>
          <p className="text-xs text-slate-500">Export a copy of your profile, orders, addresses and wishlist as JSON.</p>
        </div>
      </div>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {exporting ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Preparing export...
          </>
        ) : (
          <>
            <Download size={14} /> Download My Data
          </>
        )}
      </button>
      <p className="mt-2 text-[11px] text-slate-400">Limited to 3 exports per 24 hours. Never includes your password or MFA secrets.</p>
    </div>
  )
}

export default function SecurityPage() {
  const navigate = useNavigate()
  const { logoutUser } = useUserAuth()
  const [show, setShow] = useState({ current: false, newPwd: false, confirm: false })
  const [apiErrors, setApiErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const newPassword = watch('newPassword')

  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }))

  const onSubmit = async (values) => {
    setLoading(true)
    setApiErrors([])
    setDone(false)
    try {
      await profileEndpoints.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      setDone(true)
      reset()
      toast.success('Password updated successfully')
      // Force re-login with the new password — the old access token stays
      // valid until it expires, but the session no longer matches reality.
      logoutUser()
      navigate('/login?reason=password_changed')
    } catch (err) {
      const status = err?.response?.status
      const data = err?.response?.data
      if (status === 403 && data?.code === 'PASSWORD_EXPIRED') {
        navigate('/login?reason=expired')
        return
      }
      const detailErrors = data?.details?.errors
      const messages = Array.isArray(detailErrors) && detailErrors.length
        ? detailErrors
        : [data?.message || 'Failed to change password']
      setApiErrors(messages)
      toast.error(messages[0])
    } finally {
      setLoading(false)
    }
  }

  const PwdField = ({ id, label, error, show: visible, onToggle, placeholder, fieldProps }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input id={id} type={visible ? 'text' : 'password'}
          placeholder={placeholder} disabled={loading}
          className={`w-full pl-10 pr-11 py-3 border rounded-xl text-slate-900 text-sm transition focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 disabled:opacity-50 ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          {...fieldProps} />
        <button type="button" onClick={onToggle} disabled={loading}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )

  return (
    <div className="rounded-4xl bg-white p-5 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-8">
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

        {apiErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <div className="flex items-center gap-3 mb-1">
              <AlertCircle size={16} className="shrink-0" />
              <span className="font-medium">Could not change password</span>
            </div>
            <ul className="ml-7 list-disc space-y-0.5">
              {apiErrors.map((msg) => <li key={msg}>{msg}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <PwdField id="currentPassword" label="Current password"
            error={errors.currentPassword?.message}
            show={show.current} onToggle={() => toggle('current')} placeholder="Enter current password"
            fieldProps={register('currentPassword')} />

          <div>
            <PwdField id="newPassword" label="New password"
              error={errors.newPassword?.message}
              show={show.newPwd} onToggle={() => toggle('newPwd')} placeholder="Min. 12 characters"
              fieldProps={register('newPassword')} />
            <PasswordStrengthMeter password={newPassword} />
            <PasswordRules password={newPassword} />
          </div>

          <PwdField id="confirmPassword" label="Confirm new password"
            error={errors.confirmPassword?.message}
            show={show.confirm} onToggle={() => toggle('confirm')} placeholder="Re-enter new password"
            fieldProps={register('confirmPassword')} />

          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Changing your password will sign you out of all other devices for security.
              You'll need to sign in again on this device.
            </p>
          </div>

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

        <EmailVerificationSection />
        <MFASection />
        <DataExportSection />
      </div>
    </div>
  )
}
