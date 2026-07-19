import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { authEndpoints, profileEndpoints } from '@/components/api/userapi';
import { useUserAuth } from '@/components/store/authstore';
import { useCart } from '@/store/cartstore';
import CaptchaWidget from '@/components/ui/CaptchaWidget';
import { LogoMark } from '@/components/ui/Logo';

const MAX_MFA_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 5;
const CAPTCHA_AFTER_ATTEMPTS = 2;
const MFA_RESEND_COOLDOWN_SECONDS = 60;

const LoginPage: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { loginUser, isUser } = useUserAuth();
  const { cart }   = useCart();

  const returnTo: string = (location.state as any)?.returnTo || '/account';

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [fieldErrors, setFieldErrors]   = useState<{ email?: string; password?: string }>({});

  // CAPTCHA — required once the backend (or the local failed-attempt count)
  // signals a brute-force risk. Token lives in component state only; hCaptcha
  // tokens are single-use so the widget is reset after every submit attempt.
  const [captchaToken, setCaptchaToken]     = useState<string | null>(null);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [loginAttempts, setLoginAttempts]   = useState(0);
  const captchaRef = useRef<any>(null);
  const resetCaptcha = () => {
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
  };

  // MFA challenge (step 2 of login). Kept in component state only — never
  // localStorage/sessionStorage — since it's a short-lived, single-purpose
  // credential that grants nothing on its own.
  const [mfaPendingToken, setMfaPendingToken] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod]             = useState<'totp' | 'email'>('totp');
  const [mfaCode, setMfaCode]                 = useState('');
  const [useBackupCode, setUseBackupCode]     = useState(false);
  const [mfaError, setMfaError]               = useState('');
  const [mfaAttemptsUsed, setMfaAttemptsUsed] = useState(0);
  const [mfaResendCooldown, setMfaResendCooldown] = useState(0);
  const [mfaResending, setMfaResending]       = useState(false);

  useEffect(() => {
    if (mfaResendCooldown <= 0) return;
    const t = setTimeout(() => setMfaResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [mfaResendCooldown]);

  const [capsLockOn, setCapsLockOn] = useState(false);
  const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const reason = new URLSearchParams(location.search).get('reason');
  const showExpiredBanner = reason === 'expired';

  const REASON_MESSAGES: Record<string, string> = {
    session_expired: 'Your session has expired. Please sign in again.',
    idle_timeout: 'You were logged out due to inactivity.',
    password_changed: 'Password changed. Please sign in with your new password.',
    mfa_changed: 'MFA settings changed. Please sign in again.',
  };
  const reasonMessage = reason ? REASON_MESSAGES[reason] : undefined;

  useEffect(() => {
    if (isUser) navigate(returnTo, { replace: true });
  }, [isUser, navigate, returnTo]);

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'At least 6 characters';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const completeLogin = async (data: any) => {
    const token = data.token || data.accessToken;
    const user  = data.user;
    if (!token) throw new Error(data?.message || 'Login failed');
    loginUser(token, user);
    setLoginAttempts(0);
    setRequiresCaptcha(false);
    resetCaptcha();
    setMfaPendingToken(null);
    setMfaCode('');
    setMfaError('');
    setMfaAttemptsUsed(0);
    setMfaResendCooldown(0);
    try {
      // Two-way cart sync: pull the cart saved on the server, merge it into
      // the local cart, then push the merged result back.
      const saved = await profileEndpoints.cart.get();
      const savedItems = saved.data?.data || [];
      useCart.getState().mergeServerCart(savedItems);
      const merged = useCart.getState().cart;
      if (Array.isArray(merged) && merged.length) {
        await profileEndpoints.cart.merge({ items: merged });
      }
    } catch (_) {}
    toast.success('Welcome back!');
    navigate(returnTo, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const payload = requiresCaptcha ? { email, password, captchaToken } : { email, password };
      const res  = await authEndpoints.login(payload);
      const data = res.data?.data || res.data || {};

      // Credentials (and CAPTCHA, if it was required) passed.
      setRequiresCaptcha(false);
      resetCaptcha();

      if (data.requiresMFA) {
        setMfaPendingToken(data.mfaPendingToken);
        setMfaMethod(data.mfaMethod === 'email' ? 'email' : 'totp');
        if (data.mfaMethod === 'email') setMfaResendCooldown(MFA_RESEND_COOLDOWN_SECONDS);
        return;
      }

      await completeLogin(data);
    } catch (err: any) {
      const status = err?.response?.status;
      const body    = err?.response?.data;

      if (status === 423) {
        const remainingTime = body?.details?.remainingTime ?? 15;
        setError(`Your account is locked. Please try again in ${remainingTime} minutes.`);
      } else if (status === 429) {
        setError('Too many login attempts. Please wait 15 minutes.');
      } else if (body?.requiresCaptcha) {
        setRequiresCaptcha(true);
        setError(body?.message || 'Please complete the verification below to continue signing in.');
      } else {
        setError(body?.message || err?.message || 'Incorrect email or password');
        setLoginAttempts(prev => {
          const next = Math.min(prev + 1, MAX_LOGIN_ATTEMPTS);
          if (next >= CAPTCHA_AFTER_ATTEMPTS) setRequiresCaptcha(true);
          return next;
        });
      }

      // hCaptcha tokens are single-use — always reset after any submission attempt.
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setMfaPendingToken(null);
    setMfaCode('');
    setUseBackupCode(false);
    setMfaError('');
    setMfaAttemptsUsed(0);
    setMfaResendCooldown(0);
  };

  const handleResendMfaCode = async () => {
    if (!mfaPendingToken) return;
    setMfaResending(true);
    setMfaError('');
    try {
      await authEndpoints.mfaResendChallenge(mfaPendingToken);
      setMfaResendCooldown(MFA_RESEND_COOLDOWN_SECONDS);
      toast.success('A new code has been sent to your email');
    } catch (err: any) {
      setMfaError(err?.response?.data?.message || 'Failed to resend code');
    } finally {
      setMfaResending(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setError('');
    try {
      const res  = await authEndpoints.google(credentialResponse.credential);
      const data = res.data?.data || res.data || {};
      await completeLogin(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || !mfaPendingToken) return;
    setLoading(true);
    setMfaError('');
    try {
      const res = await authEndpoints.mfaChallenge({ token: mfaCode, useBackupCode }, mfaPendingToken);
      const data = res.data?.data || res.data || {};
      await completeLogin(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 423) {
        const remainingTime = err?.response?.data?.details?.remainingTime ?? 15;
        setMfaError(`Your account is locked. Please try again in ${remainingTime} minutes.`);
      } else {
        const attemptsUsed = Math.min(mfaAttemptsUsed + 1, MAX_MFA_ATTEMPTS);
        setMfaAttemptsUsed(attemptsUsed);
        const remaining = Math.max(MAX_MFA_ATTEMPTS - attemptsUsed, 0);
        setMfaError(`Incorrect code. ${remaining} attempts remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-[#0B1220] via-[#1E293B] to-[#334155] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#10B981]/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <Link to="/" className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur">
            <LogoMark className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            epasal<span className="text-[#10B981]">ey</span>
          </span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Nepal's trusted<br />online marketplace
          </h2>
          <p className="text-blue-200/70 text-base leading-relaxed">
            Shop thousands of products with fast delivery across Nepal, secure payments, and genuine customer support.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {['Fast Delivery', 'Secure Payment', 'Easy Returns'].map(t => (
              <span key={t} className="px-4 py-2 bg-white/10 backdrop-blur rounded-full text-white/80 text-sm font-medium border border-white/15">
                {t}
              </span>
            ))}
          </div>
        </div>
        <p className="relative text-blue-200/40 text-xs">© {new Date().getFullYear()} ePasaley. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-linear-to-br from-[#1E293B] to-[#10B981] rounded-xl flex items-center justify-center">
              <LogoMark className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">epasal<span className="text-[#10B981]">ey</span></span>
          </Link>

          {mfaPendingToken ? (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Enter your authentication code</h1>
              <p className="text-gray-500 text-sm mb-8">
                {useBackupCode
                  ? 'Enter one of your unused backup codes.'
                  : mfaMethod === 'email'
                    ? 'We emailed you a 6-digit code. Enter it below.'
                    : 'Open your authenticator app and enter the 6-digit code.'}
              </p>

              {mfaError && (
                <div id="mfa-error" role="alert" aria-live="assertive" className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm animate-shake">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{mfaError}</span>
                </div>
              )}

              <form onSubmit={handleMfaSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {useBackupCode ? 'Backup code' : 'Authentication code'}
                  </label>
                  <div className="relative">
                    <ShieldCheck size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input
                      id="mfaCode" type="text" inputMode={useBackupCode ? 'text' : 'numeric'}
                      maxLength={useBackupCode ? undefined : 6} autoFocus autoComplete="one-time-code"
                      value={mfaCode} disabled={loading}
                      aria-invalid={!!mfaError}
                      aria-describedby={mfaError ? 'mfa-error' : undefined}
                      onChange={e => { setMfaCode(e.target.value); setMfaError(''); }}
                      placeholder={useBackupCode ? 'Backup code' : '000000'}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm text-center tracking-[0.4em] font-mono transition focus:outline-none focus:ring-2 focus:ring-[#1E293B]/10 focus:border-[#1E293B]/40 focus:bg-white disabled:opacity-50"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading || !mfaCode}
                  className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 bg-[#1E293B] hover:bg-[#0B1220] text-white font-semibold rounded-xl text-sm transition shadow-md shadow-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                  ) : (
                    <>Verify <ArrowRight size={15} /></>
                  )}
                </button>

                {!useBackupCode && mfaMethod === 'email' && (
                  <button
                    type="button"
                    onClick={handleResendMfaCode}
                    disabled={mfaResending || mfaResendCooldown > 0}
                    className="w-full text-sm text-[#1E293B] hover:text-[#10B981] transition font-medium text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {mfaResendCooldown > 0 ? `Resend code (${mfaResendCooldown}s)` : 'Resend code'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { setUseBackupCode(v => !v); setMfaCode(''); setMfaError(''); }}
                  className="w-full text-sm text-[#1E293B] hover:text-[#10B981] transition font-medium text-center"
                >
                  {useBackupCode ? (mfaMethod === 'email' ? 'Use email code instead' : 'Use authenticator code instead') : 'Use a backup code instead'}
                </button>

                <button type="button" onClick={backToCredentials} className="w-full text-sm text-gray-500 hover:text-gray-700 transition text-center">
                  ← Back
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
              <p className="text-gray-500 text-sm mb-8">Welcome back! Enter your credentials to continue.</p>

              {showExpiredBanner && (
                <div role="status" aria-live="polite" className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>Your password has expired. Please log in and update your password.</span>
                </div>
              )}

              {!showExpiredBanner && reasonMessage && (
                <div role="status" aria-live="polite" className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{reasonMessage}</span>
                </div>
              )}

              {error && (
                <div role="alert" aria-live="assertive" className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm animate-shake">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input
                      id="email" type="email" value={email} disabled={loading} autoFocus
                      onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); setError(''); }}
                      placeholder="you@example.com" autoComplete="email"
                      aria-invalid={!!fieldErrors.email}
                      aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                      className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-50 ${
                        fieldErrors.email
                          ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                          : 'border-gray-200 focus:ring-[#1E293B]/10 focus:border-[#1E293B]/40'
                      }`}
                    />
                  </div>
                  {fieldErrors.email && <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-500">{fieldErrors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                    <Link to="/forgot-password" className="text-xs text-[#1E293B] hover:text-[#10B981] transition font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input
                      id="password" type={showPassword ? 'text' : 'password'} value={password} disabled={loading}
                      onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); setError(''); }}
                      onKeyDown={handlePasswordKeyEvent} onKeyUp={handlePasswordKeyEvent}
                      placeholder="Your password" autoComplete="current-password"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? 'password-error' : capsLockOn ? 'password-capslock' : undefined}
                      className={`w-full pl-10 pr-11 py-2.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-50 ${
                        fieldErrors.password
                          ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                          : 'border-gray-200 focus:ring-[#1E293B]/10 focus:border-[#1E293B]/40'
                      }`}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} disabled={loading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {fieldErrors.password && <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>}
                  {!fieldErrors.password && capsLockOn && (
                    <p id="password-capslock" className="mt-1.5 text-xs text-amber-600 animate-fade-in">Caps Lock is on</p>
                  )}
                </div>

                {loginAttempts > 0 && loginAttempts < MAX_LOGIN_ATTEMPTS && (
                  <p className="text-xs text-amber-600">
                    {loginAttempts} of {MAX_LOGIN_ATTEMPTS} attempts used. Account locks after {MAX_LOGIN_ATTEMPTS} failures.
                  </p>
                )}

                {requiresCaptcha && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Please complete the verification below to continue signing in.
                    </p>
                    <CaptchaWidget
                      ref={captchaRef}
                      onVerify={(token: string) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
                    />
                  </div>
                )}

                <button type="submit" disabled={loading || (requiresCaptcha && !captchaToken)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 bg-[#1E293B] hover:bg-[#0B1220] text-white font-semibold rounded-xl text-sm transition shadow-md shadow-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
                  ) : (
                    <>Sign In <ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">OR</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="mt-4 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed. Please try again.')}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="signin_with"
                  width="384"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Don't have an account?{' '}
                  <Link to="/register" state={{ returnTo }} className="text-[#10B981] hover:text-emerald-600 font-semibold transition">
                    Create one free
                  </Link>
                </p>
              </div>

              <p className="text-center mt-4">
                <Link to="/products" className="text-xs text-gray-400 hover:text-gray-600 transition">
                  ← Continue shopping without signing in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
