import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../components/store/authstore';
import toast from 'react-hot-toast';
import { Loader2, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { API_URL } from '@/config';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(false);
  const navigate = useNavigate();
  const { loginAdmin, isAdmin } = useAdminAuth();

  useEffect(() => {
    if (isAdmin) navigate('/admin');
  }, [isAdmin, navigate]);

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

      const token = data.data?.token || data.token || data.accessToken;
      const admin = data.data?.admin || data.data?.user || data.user || data.admin;

      if (!token) return toast.error('No token received from server');

      if (admin) {
        try { localStorage.setItem('admin', JSON.stringify(admin)); } catch (_) {}
      }

      loginAdmin(token, admin);
      toast.success('Welcome back!', { duration: 2000 });
      setTimeout(() => navigate('/admin'), 500);
    } catch (error) {
      toast.error('Login error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#060d1a]">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-[20%] h-[480px] w-[480px] rounded-full bg-[#1A3C8A]/25 blur-[130px]" />
        <div className="absolute bottom-[-80px] right-[15%] h-[380px] w-[380px] rounded-full bg-[#FF6B35]/18 blur-[110px]" />
        <div className="absolute top-1/2 left-1/2 h-[260px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1A3C8A]/8 blur-[80px]" />
      </div>

      {/* Subtle dot-grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Thin top accent line */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF6B35]/40 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] px-5"
      >
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#1A3C8A] to-[#FF6B35] blur-[18px] opacity-60" />
            <div className="relative flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A3C8A] to-[#FF6B35] shadow-[0_20px_40px_-12px_rgba(255,107,53,0.45)]">
              <ShieldCheck className="h-7 w-7 text-white" strokeWidth={1.8} />
            </div>
          </div>
          <h1 className="text-[1.625rem] font-bold tracking-tight text-white">ePasaley Admin</h1>
          <p className="mt-1.5 text-sm text-white/38">Secure access to your store control center</p>
        </div>

        {/* Card */}
        <div
          className="rounded-[1.5rem] border border-white/[0.08] p-8"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', boxShadow: '0 32px 80px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email field */}
            <div>
              <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/45">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="admin@epasaley.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.06] py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/20 transition-all duration-200 focus:border-[#FF6B35]/50 focus:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/45">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.06] py-3 pl-10 pr-11 text-sm text-white placeholder:text-white/20 transition-all duration-200 focus:border-[#FF6B35]/50 focus:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 transition-colors hover:text-white/55"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot row */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 bg-white/10 accent-[#FF6B35]"
                />
                <span className="text-xs text-white/38">Remember me</span>
              </label>
              <button type="button" className="text-xs text-white/38 transition-colors hover:text-[#FF6B35]">
                Forgot password?
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="group mt-1 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#1A3C8A] via-[#2550b7] to-[#FF6B35] py-3.5 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(255,107,53,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-8px_rgba(255,107,53,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-white/[0.07]" />
            <span className="text-[0.7rem] text-white/25 uppercase tracking-widest">Protected</span>
            <div className="flex-1 border-t border-white/[0.07]" />
          </div>

          {/* Security notice */}
          <p className="text-center text-[0.72rem] leading-relaxed text-white/28">
            Restricted to authorized personnel only.
            <br />All login attempts are logged and monitored.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-7 text-center text-[0.7rem] text-white/18">
          © 2025 ePasaley · All rights reserved
        </p>
      </motion.div>
    </div>
  );
}
