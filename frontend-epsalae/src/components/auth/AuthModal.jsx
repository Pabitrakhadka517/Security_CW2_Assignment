import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authEndpoints, profileEndpoints } from '../api/userapi'
import { useUserAuth } from '@/components/store/authstore'
import { useCart } from '@/store/cartstore'

const MAX_LOGIN_ATTEMPTS = 5

const formatCountdown = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [authError, setAuthError] = useState(null)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const lockoutIntervalRef = useRef(null)
  const { loginUser } = useUserAuth()
  const { cart } = useCart()
  const navigate = useNavigate()

  // MFA challenge (step 2 of login). The pending token lives ONLY in this
  // component's state — never localStorage/sessionStorage — since it's a
  // short-lived, single-purpose credential that grants nothing on its own.
  const [mfaPendingToken, setMfaPendingToken] = useState(null)
  const [mfaCode, setMfaCode] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [mfaError, setMfaError] = useState(null)
  const [mfaAttemptsUsed, setMfaAttemptsUsed] = useState(0)

  useEffect(() => {
    return () => {
      if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current)
    }
  }, [])

  const startLockoutCountdown = (remainingMinutes) => {
    if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current)
    setLockoutSeconds(Math.max(0, Math.round(remainingMinutes * 60)))
    lockoutIntervalRef.current = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(lockoutIntervalRef.current)
          lockoutIntervalRef.current = null
          setAuthError(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const switchMode = (nextMode) => {
    setAuthError(null)
    setMode(nextMode)
  }

  if (!open) return null

  // Shared tail-end of a successful login, whether it came straight from
  // credentials or after clearing the MFA challenge.
  const completeLogin = async (data, rawRes) => {
    const token = data.token || data.accessToken || rawRes?.data?.accessToken || rawRes?.data?.token
    const user = data.user || rawRes?.data?.user
    const needsOnboarding = data.needsOnboarding ?? rawRes?.data?.needsOnboarding

    if (!token) {
      toast.error(rawRes?.data?.message || 'Login failed')
      return
    }

    loginUser(token, user)
    setFailedAttempts(0)
    setMfaPendingToken(null)
    setMfaCode('')
    setMfaError(null)
    setMfaAttemptsUsed(0)

    // Merge guest cart on backend (best-effort)
    try {
      if (Array.isArray(cart) && cart.length) {
        await profileEndpoints.cart.merge({ items: cart })
      }
    } catch (e) { /* silent */ }

    toast.success('Login successful')
    onSuccess && onSuccess({ needsOnboarding })
    if (needsOnboarding) {
      navigate('/profile-setup')
    }
  }

  const doLogin = async () => {
    setLoading(true)
    setAuthError(null)
    try {
      const res = await authEndpoints.login({ email, password })
      // Backend now returns: { success, message, data: { token, accessToken, user, needsOnboarding } }
      // or, when MFA is enabled: { success, requiresMFA, data: { requiresMFA, mfaPendingToken } }
      const data = res.data?.data || res.data || {}

      if (data.requiresMFA) {
        setMfaPendingToken(data.mfaPendingToken)
        setMode('mfa-challenge')
        return
      }

      await completeLogin(data, res)
    } catch (err) {
      const status = err.response?.status

      if (status === 423) {
        const remainingTime = err.response?.data?.details?.remainingTime ?? 15
        setAuthError(`Your account is locked. Please try again in ${remainingTime} minutes.`)
        startLockoutCountdown(remainingTime)
      } else if (status === 429) {
        setAuthError('Too many login attempts. Please wait 15 minutes.')
      } else {
        setAuthError(err.response?.data?.message || 'Invalid credentials')
        setFailedAttempts((prev) => Math.min(prev + 1, MAX_LOGIN_ATTEMPTS))
      }
    } finally {
      setLoading(false)
    }
  }

  const backToCredentials = () => {
    setMode('login')
    setMfaPendingToken(null)
    setMfaCode('')
    setUseBackupCode(false)
    setMfaError(null)
    setMfaAttemptsUsed(0)
  }

  const doMfaChallenge = async () => {
    if (!mfaCode) return
    setLoading(true)
    setMfaError(null)
    try {
      const res = await authEndpoints.mfaChallenge(
        { token: mfaCode, useBackupCode },
        mfaPendingToken
      )
      const data = res.data?.data || res.data || {}
      await completeLogin(data, res)
    } catch (err) {
      const status = err.response?.status
      if (status === 423) {
        const remainingTime = err.response?.data?.details?.remainingTime ?? 15
        setMfaError(`Your account is locked. Please try again in ${remainingTime} minutes.`)
      } else {
        const attemptsUsed = Math.min(mfaAttemptsUsed + 1, MAX_LOGIN_ATTEMPTS)
        setMfaAttemptsUsed(attemptsUsed)
        const remaining = Math.max(MAX_LOGIN_ATTEMPTS - attemptsUsed, 0)
        setMfaError(`Incorrect code. ${remaining} attempts remaining.`)
      }
    } finally {
      setLoading(false)
    }
  }

  const doRegister = async () => {
    setLoading(true)
    try {
      await authEndpoints.register({ name, email, password })
      toast.success('Registration successful. Please login.')
      setMode('login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md p-6 bg-white rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {mode === 'login' ? 'Sign in' : mode === 'mfa-challenge' ? 'Enter your authentication code' : 'Create account'}
          </h3>
          <button onClick={onClose} className="text-gray-500" disabled={loading}>Close</button>
        </div>
        {mode === 'mfa-challenge' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {useBackupCode
                ? 'Enter one of your unused backup codes.'
                : 'Open your authenticator app and enter the 6-digit code.'}
            </p>

            <input
              autoFocus
              type="text"
              inputMode={useBackupCode ? 'text' : 'numeric'}
              maxLength={useBackupCode ? undefined : 6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder={useBackupCode ? 'Backup code' : '000000'}
              disabled={loading}
              className="w-full p-3 border rounded text-center text-lg tracking-[0.4em] font-mono disabled:opacity-60"
            />

            {mfaError && (
              <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                {mfaError}
              </div>
            )}

            <button
              onClick={doMfaChallenge}
              disabled={loading || !mfaCode}
              className="w-full px-4 py-3 flex items-center justify-center gap-2 text-white bg-blue-700 rounded disabled:opacity-60"
            >
              {loading && (
                <span aria-hidden="true" className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Verifying…' : 'Verify'}
            </button>

            <button
              type="button"
              onClick={() => { setUseBackupCode((v) => !v); setMfaCode(''); setMfaError(null) }}
              className="w-full text-sm text-blue-600 text-center"
            >
              {useBackupCode ? 'Use authenticator code instead' : 'Use a backup code instead'}
            </button>

            <button type="button" onClick={backToCredentials} className="w-full text-sm text-gray-500 text-center">
              ← Back
            </button>
          </div>
        ) : mode === 'login' ? (
          <div className="space-y-4">
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded" />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded" />

            {authError && (
              <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                {authError}
              </div>
            )}

            {failedAttempts > 0 && lockoutSeconds === 0 && (
              <p className="text-xs text-amber-600">
                {failedAttempts} of {MAX_LOGIN_ATTEMPTS} attempts used. Account locks after {MAX_LOGIN_ATTEMPTS} failures.
              </p>
            )}

            <button
              onClick={doLogin}
              disabled={loading || lockoutSeconds > 0}
              className="w-full px-4 py-3 flex items-center justify-center gap-2 text-white bg-blue-700 rounded disabled:opacity-60"
            >
              {loading && (
                <span
                  aria-hidden="true"
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                />
              )}
              {lockoutSeconds > 0
                ? `Try again in ${formatCountdown(lockoutSeconds)}`
                : loading ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="text-sm text-center">Don't have an account? <button onClick={()=>switchMode('register')} className="text-blue-600">Register</button></p>
          </div>
        ) : (
          <div className="space-y-4">
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full name" className="w-full p-3 border rounded" />
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded" />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded" />
            <button onClick={doRegister} disabled={loading} className="w-full px-4 py-3 text-white bg-green-600 rounded disabled:opacity-60">{loading ? 'Creating account…' : 'Create account'}</button>
            <p className="text-sm text-center">Already have an account? <button onClick={()=>switchMode('login')} className="text-blue-600">Sign in</button></p>
          </div>
        )}
      </div>
    </div>
  )
}
