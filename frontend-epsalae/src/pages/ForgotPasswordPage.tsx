import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authEndpoints } from '@/components/api/userapi';
import { LogoMark } from '@/components/ui/Logo';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail]           = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [message, setMessage]       = useState('');

  const validate = () => {
    if (!email) { setFieldError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('Enter a valid email'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authEndpoints.forgotPassword(email);
      setMessage(res.data?.message || 'If an account with that email exists, a password reset link has been sent.');
    } catch (err: any) {
      // Even on error, avoid leaking anything account-specific — show a
      // generic failure only for actual request failures (network/rate-limit).
      if (err?.response?.status === 429) {
        setError('Too many requests. Please wait a while before trying again.');
      } else {
        setError('Something went wrong. Please try again.');
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
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#047857]/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <Link to="/" className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur">
            <LogoMark className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            epasal<span className="text-[#047857]">ey</span>
          </span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Forgot your<br />password?
          </h2>
          <p className="text-blue-200/70 text-base leading-relaxed">
            No worries — enter your email and we'll send you a link to reset it.
          </p>
        </div>
        <p className="relative text-blue-200/40 text-xs">© {new Date().getFullYear()} ePasaley. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-linear-to-br from-[#1E293B] to-[#047857] rounded-xl flex items-center justify-center">
              <LogoMark className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">epasal<span className="text-[#047857]">ey</span></span>
          </Link>

          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h1>
            <p className="text-gray-500 text-sm mb-8">Enter your account email and we'll send you a reset link.</p>

            {error && (
              <div role="alert" aria-live="assertive" className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm animate-shake">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message ? (
              <div role="status" aria-live="polite" className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{message}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input
                      id="email" type="email" value={email} disabled={loading} autoFocus
                      onChange={e => { setEmail(e.target.value); setFieldError(''); setError(''); }}
                      placeholder="you@example.com" autoComplete="email"
                      aria-invalid={!!fieldError}
                      aria-describedby={fieldError ? 'email-error' : undefined}
                      className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-50 ${
                        fieldError
                          ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                          : 'border-gray-200 focus:ring-[#1E293B]/10 focus:border-[#1E293B]/40'
                      }`}
                    />
                  </div>
                  {fieldError && <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-500">{fieldError}</p>}
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 bg-[#1E293B] hover:bg-[#0B1220] text-white font-semibold rounded-xl text-sm transition shadow-md shadow-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                  ) : (
                    <>Send reset link <ArrowRight size={15} /></>
                  )}
                </button>
              </form>
            )}

            <p className="text-center mt-6">
              <Link to="/login" className="text-sm text-[#1E293B] hover:text-[#047857] font-medium transition">
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
