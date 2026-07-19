import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../components/store/authstore';
import { authEndpoints } from '../components/api/userapi';
import toast from 'react-hot-toast';
import { Loader2, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { API_URL } from '@/config';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { loginAdmin, isAdmin } = useAdminAuth();

  // MFA challenge (step 2 of login). Kept in component state only — never
  // localStorage/sessionStorage — since it's a short-lived, single-purpose
  // credential that grants nothing on its own.
  const [mfaPendingToken, setMfaPendingToken] = useState(null);
  const [mfaMethod, setMfaMethod]             = useState('totp');
  const [mfaCode, setMfaCode]                 = useState('');
  const [useBackupCode, setUseBackupCode]     = useState(false);
  const [mfaResendCooldown, setMfaResendCooldown] = useState(0);
  const [mfaResending, setMfaResending]       = useState(false);

  useEffect(() => {
    if (isAdmin) navigate('/admin');
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (mfaResendCooldown <= 0) return;
    const t = setTimeout(() => setMfaResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [mfaResendCooldown]);

  const handleResendMfaCode = async () => {
    if (!mfaPendingToken) return;
    setMfaResending(true);
    try {
      await authEndpoints.mfaResendChallenge(mfaPendingToken);
      setMfaResendCooldown(60);
      toast.success('A new code has been sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend code');
    } finally {
      setMfaResending(false);
    }
  };

  const completeLogin = (data) => {
    const token = data.data?.token || data.token || data.accessToken;
    const admin = data.data?.admin || data.data?.user || data.user || data.admin;

    if (!token) return toast.error('No token received from server');

    if (admin) {
      try { localStorage.setItem('admin', JSON.stringify(admin)); } catch (_) {}
    }

    loginAdmin(token, admin);
    toast.success('Welcome back!', { duration: 2000 });
    setTimeout(() => navigate('/admin'), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill all fields');

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // store the httpOnly refresh cookie — without
                                // this every admin session dies at token expiry
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) return toast.error(data.message || 'Login failed');

      if (data.requiresMFA || data.data?.requiresMFA) {
        const method = data.data?.mfaMethod || data.mfaMethod;
        setMfaPendingToken(data.data?.mfaPendingToken || data.mfaPendingToken);
        setMfaMethod(method === 'email' ? 'email' : 'totp');
        if (method === 'email') setMfaResendCooldown(60);
        return;
      }

      completeLogin(data);
    } catch (error) {
      toast.error('Login error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!mfaCode || !mfaPendingToken) return;

    setLoading(true);
    try {
      const res = await authEndpoints.mfaChallenge({ token: mfaCode, useBackupCode }, mfaPendingToken);
      const data = res.data?.data || res.data || {};
      completeLogin({ data });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-(--ds-bg)">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-[20%] h-[480px] w-[480px] rounded-full bg-[#1E293B]/10 blur-[130px]" />
        <div className="absolute -bottom-20 right-[15%] h-[380px] w-[380px] rounded-full bg-[#10B981]/14 blur-[110px]" />
        <div className="absolute top-1/2 left-1/2 h-[260px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1E293B]/5 blur-[80px]" />
      </div>

      {/* Subtle dot-grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Thin top accent line */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#10B981]/40 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] px-5"
      >
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-[#1E293B] to-[#10B981] blur-[18px] opacity-60" />
            <div className="relative flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-linear-to-br from-[#1E293B] to-[#10B981] shadow-[0_20px_40px_-12px_rgba(16,185,129,0.45)]">
              <ShieldCheck className="h-7 w-7 text-white" strokeWidth={1.8} />
            </div>
          </div>
          <h1 className="text-[1.625rem] font-bold tracking-tight text-(--ds-text)">ePasaley Admin</h1>
          <p className="mt-1.5 text-sm text-(--ds-text-muted)">Secure access to your store control center</p>
        </div>

        {/* Card */}
        <div className="ds-card rounded-3xl p-8 shadow-xl">
          {mfaPendingToken ? (
            <form onSubmit={handleMfaSubmit} className="space-y-5">
              <p className="text-center text-sm text-(--ds-text-muted)">
                {useBackupCode
                  ? 'Enter one of your unused backup codes.'
                  : mfaMethod === 'email'
                    ? 'We emailed you a 6-digit code. Enter it below.'
                    : 'Enter the 6-digit code from your authenticator app.'}
              </p>

              <div>
                <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-widest text-(--ds-text-muted)">
                  {useBackupCode ? 'Backup Code' : 'Verification Code'}
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--ds-text-faint)" />
                  <input
                    type="text"
                    inputMode={useBackupCode ? 'text' : 'numeric'}
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder={useBackupCode ? 'XXXXXXXXXX' : '123456'}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full rounded-xl border border-(--ds-border-strong) bg-(--ds-card) py-3 pl-10 pr-4 text-sm tracking-widest text-(--ds-text) placeholder:text-(--ds-text-faint) transition-all duration-200 focus:border-[#10B981]/50 focus:outline-none focus:ring-2 focus:ring-[#10B981]/15"
                  />
                </div>
              </div>

              {!useBackupCode && mfaMethod === 'email' && (
                <button
                  type="button"
                  onClick={handleResendMfaCode}
                  disabled={mfaResending || mfaResendCooldown > 0}
                  className="text-xs text-(--ds-text-muted) transition-colors hover:text-[#10B981] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mfaResendCooldown > 0 ? `Resend code (${mfaResendCooldown}s)` : 'Resend code'}
                </button>
              )}

              <button
                type="button"
                onClick={() => { setUseBackupCode(!useBackupCode); setMfaCode(''); }}
                className="text-xs text-(--ds-text-muted) transition-colors hover:text-[#10B981]"
              >
                {useBackupCode ? (mfaMethod === 'email' ? 'Use email code instead' : 'Use authenticator code instead') : 'Use a backup code instead'}
              </button>

              <button
                type="submit"
                disabled={loading || !mfaCode}
                className="group mt-1 flex w-full items-center justify-center gap-2.5 rounded-xl bg-linear-to-r from-[#1E293B] to-[#10B981] py-3.5 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(16,185,129,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-8px_rgba(16,185,129,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    Verify & Sign In
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMfaPendingToken(null); setMfaCode(''); setUseBackupCode(false); setMfaResendCooldown(0); }}
                className="w-full text-center text-xs text-(--ds-text-muted) transition-colors hover:text-(--ds-text)"
              >
                Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email field */}
              <div>
                <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-widest text-(--ds-text-muted)">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--ds-text-faint)" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="admin@epasaley.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-(--ds-border-strong) bg-(--ds-card) py-3 pl-10 pr-4 text-sm text-(--ds-text) placeholder:text-(--ds-text-faint) transition-all duration-200 focus:border-[#10B981]/50 focus:outline-none focus:ring-2 focus:ring-[#10B981]/15"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-widest text-(--ds-text-muted)">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--ds-text-faint)" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-(--ds-border-strong) bg-(--ds-card) py-3 pl-10 pr-11 text-sm text-(--ds-text) placeholder:text-(--ds-text-faint) transition-all duration-200 focus:border-[#10B981]/50 focus:outline-none focus:ring-2 focus:ring-[#10B981]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--ds-text-faint) transition-colors hover:text-(--ds-text-muted)"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot row */}
              <div className="flex items-center justify-end pt-0.5">
                <button type="button" className="text-xs text-(--ds-text-muted) transition-colors hover:text-[#10B981]">
                  Forgot password?
                </button>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="group mt-1 flex w-full items-center justify-center gap-2.5 rounded-xl bg-linear-to-r from-[#1E293B] to-[#10B981] py-3.5 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(16,185,129,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-8px_rgba(16,185,129,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in to Dashboard
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-(--ds-border)" />
            <span className="text-[0.7rem] text-(--ds-text-faint) uppercase tracking-widest">Protected</span>
            <div className="flex-1 border-t border-(--ds-border)" />
          </div>

          {/* Security notice */}
          <p className="text-center text-[0.72rem] leading-relaxed text-(--ds-text-faint)">
            Restricted to authorized personnel only.
            <br />All login attempts are logged and monitored.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-7 text-center text-[0.7rem] text-(--ds-text-faint)">
          © 2025 ePasaley · All rights reserved
        </p>
      </motion.div>
    </div>
  );
}
