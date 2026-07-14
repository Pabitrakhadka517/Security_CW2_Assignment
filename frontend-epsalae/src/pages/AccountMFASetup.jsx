import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ShieldCheck, ShieldAlert, AlertTriangle, Loader2, KeyRound, Copy, Check, Download } from 'lucide-react'
import { mfaEndpoints } from '@/components/api/userapi'

const SETUP_STEPS = [
  { id: 1, label: 'Set up' },
  { id: 2, label: 'Verify' },
  { id: 3, label: 'Backup codes' },
]
const STEP_NUMBER_OF = { status: 1, qr: 2, 'backup-codes': 3 }

function SetupStepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {SETUP_STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              currentStep > s.id
                ? 'bg-green-600 text-white'
                : currentStep === s.id
                  ? 'bg-green-800 text-white'
                  : 'bg-gray-100 text-gray-400'
            }`}>
              {currentStep > s.id ? <Check className="w-4 h-4" /> : s.id}
            </div>
            <span className={`text-xs font-medium ${currentStep === s.id ? 'text-green-800' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < SETUP_STEPS.length - 1 && (
            <div className={`h-0.5 w-16 mx-2 mb-4 transition-colors ${currentStep > s.id ? 'bg-green-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function AccountMFASetup() {
  const navigate = useNavigate()
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [step, setStep] = useState('status') // status | qr | backup-codes
  const [qrCode, setQrCode] = useState(null)
  const [secret, setSecret] = useState(null)
  const [backupCodes, setBackupCodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasConfirmedBackup, setHasConfirmedBackup] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ defaultValues: { token: '' } })

  useEffect(() => {
    let cancelled = false
    mfaEndpoints.status()
      .then((res) => {
        if (cancelled) return
        const enabled = !!(res.data?.data?.mfaEnabled ?? res.data?.mfaEnabled)
        setMfaEnabled(enabled)
      })
      .catch(() => toast.error('Could not load MFA status'))
      .finally(() => { if (!cancelled) setCheckingStatus(false) })
    return () => { cancelled = true }
  }, [])

  const startSetup = async () => {
    setLoading(true)
    try {
      const res = await mfaEndpoints.setup()
      const data = res.data?.data || res.data || {}
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setStep('qr')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start MFA setup')
    } finally {
      setLoading(false)
    }
  }

  const onVerify = async ({ token }) => {
    setLoading(true)
    try {
      const res = await mfaEndpoints.verifySetup({ token })
      const data = res.data?.data || res.data || {}
      setBackupCodes(data.backupCodes || [])
      setMfaEnabled(true)
      setStep('backup-codes')
      reset()
      toast.success('MFA enabled successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) { /* clipboard unavailable */ }
  }

  if (checkingStatus) {
    return (
      <div className="rounded-4xl bg-white p-8 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="rounded-4xl bg-white p-5 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Two-Factor Authentication</h3>
          <p className="text-sm text-slate-500">Protect your account with an authenticator app.</p>
        </div>
      </div>

      <div className="mt-8 max-w-md">
        {(!mfaEnabled || step !== 'status') && (
          <SetupStepIndicator currentStep={STEP_NUMBER_OF[step]} />
        )}

        {step === 'status' && (
          mfaEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                <ShieldCheck size={16} className="shrink-0" />
                <span>MFA is active on your account.</span>
              </div>
              <button
                onClick={() => navigate('/account/security')}
                className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition"
              >
                Manage / Disable MFA
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Add an extra layer of security. Once enabled, you'll need a 6-digit code from
                Google Authenticator or Authy to sign in.
              </p>
              <button
                onClick={startSetup}
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
              >
                {loading ? 'Starting setup…' : 'Enable MFA'}
              </button>
            </div>
          )
        )}

        {step === 'qr' && (
          <div className="space-y-5">
            <p className="text-sm text-slate-500">
              Scan this with Google Authenticator or Authy.
            </p>
            {qrCode && (
              <div className="flex justify-center">
                <img src={qrCode} alt="MFA QR code" className="w-48 h-48 rounded-xl border border-slate-200" />
              </div>
            )}
            {secret && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Can't scan? Type this key into your authenticator app instead
                  (look for "Enter a setup key" when adding an account) — do not type it below.
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <code className="flex-1 text-sm font-mono text-slate-900 break-all">{secret}</code>
                  <button type="button" onClick={copySecret} className="text-slate-400 hover:text-slate-600 shrink-0">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onVerify)} className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Enter the 6-digit code shown in your authenticator app
                </label>
                {(() => {
                  const tokenField = register('token', {
                    required: 'Enter the 6-digit code',
                    pattern: { value: /^\d{6}$/, message: 'Code must be 6 digits' },
                  });
                  return (
                    <input
                      id="token"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      disabled={loading}
                      className={`w-full px-4 py-3 border rounded-xl text-slate-900 text-center text-lg tracking-[0.5em] font-mono transition focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 disabled:opacity-50 ${errors.token ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      {...tokenField}
                      onChange={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        tokenField.onChange(e);
                      }}
                    />
                  );
                })()}
                {errors.token && <p className="mt-1.5 text-xs text-red-500">{errors.token.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
              >
                {loading ? 'Verifying…' : 'Verify & Enable'}
              </button>
            </form>
          </div>
        )}

        {step === 'backup-codes' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
              <ShieldAlert size={16} className="shrink-0" />
              <span>Save these codes somewhere safe. Each can only be used once.</span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join('\n'))
                  toast.success('Codes copied to clipboard')
                }}
                className="flex items-center gap-2 text-sm border border-slate-200 rounded-xl px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
              >
                <Copy className="w-4 h-4" />
                Copy all codes
              </button>

              <button
                type="button"
                onClick={() => {
                  const content = 'Epasaley — MFA Backup Codes\n\n' +
                    backupCodes.join('\n') +
                    '\n\nSave these somewhere safe. Each code can only be used once.'
                  const blob = new Blob([content], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'epasaley-backup-codes.txt'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex items-center gap-2 text-sm border border-slate-200 rounded-xl px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
              >
                <Download className="w-4 h-4" />
                Download codes
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code) => (
                <div key={code} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <KeyRound size={14} className="text-slate-400 shrink-0" />
                  <code className="text-sm font-mono text-slate-900">{code}</code>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800 font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                These codes cannot be shown again
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasConfirmedBackup}
                  onChange={(e) => setHasConfirmedBackup(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-green-700 border-amber-300 focus:ring-green-600"
                />
                <span className="text-sm text-amber-700">
                  I have saved my backup codes in a safe place. I understand they cannot be recovered if lost.
                </span>
              </label>
            </div>

            <button
              disabled={!hasConfirmedBackup}
              onClick={() => navigate('/account/security')}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finish setup
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
