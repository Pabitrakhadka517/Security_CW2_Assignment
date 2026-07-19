import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { authEndpoints } from '@/components/api/userapi';
import { LogoMark } from '@/components/ui/Logo';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This link is missing its verification token. Please use the link from your email.');
      return;
    }

    let cancelled = false;
    authEndpoints.verifyEmail(token)
      .then((res) => {
        if (cancelled) return;
        setStatus('success');
        setMessage(res.data?.message || 'Email verified successfully.');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(err?.response?.data?.message || 'This verification link is invalid or has expired.');
      });
    return () => { cancelled = true; };
  }, [token]);

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
            Confirming your<br />email address
          </h2>
          <p className="text-blue-200/70 text-base leading-relaxed">
            One quick step to confirm this account is really yours.
          </p>
        </div>
        <p className="relative text-blue-200/40 text-xs">© {new Date().getFullYear()} ePasaley. All rights reserved.</p>
      </div>

      {/* Right panel — status */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-linear-to-br from-[#1E293B] to-[#047857] rounded-xl flex items-center justify-center">
              <LogoMark className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">epasal<span className="text-[#047857]">ey</span></span>
          </Link>

          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Email verification</h1>
            <p className="text-gray-500 text-sm mb-8">Confirming your Epasaley account email address.</p>

            {status === 'verifying' && (
              <div role="status" aria-live="polite" className="flex items-center gap-3 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-4 py-3 text-sm">
                <Loader2 size={15} className="shrink-0 animate-spin" />
                <span>Verifying your email…</span>
              </div>
            )}

            {status === 'success' && (
              <div role="status" aria-live="polite" className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {status === 'error' && (
              <div role="alert" aria-live="assertive" className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm animate-shake">
                <AlertCircle size={15} className="shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <p className="text-center mt-6">
              <Link to="/account" className="text-sm text-[#1E293B] hover:text-[#047857] font-medium transition">
                Go to your account →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
