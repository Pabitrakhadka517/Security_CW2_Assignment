import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authEndpoints, profileEndpoints } from '@/components/api/userapi';
import { useUserAuth } from '@/components/store/authstore';
import { useCart } from '@/store/cartstore';
import { LogoMark } from '@/components/ui/Logo';

/**
 * Landing page for the magic-link URL emailed by
 * POST /auth/passwordless/request (see LoginPage's "Sign in with an email
 * link instead"). Verifies the token exactly once on mount — if the account
 * has MFA enabled, hands off to LoginPage's existing MFA-challenge UI rather
 * than duplicating it here.
 */
const PasswordlessLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginUser } = useUserAuth();
  const [error, setError] = useState('');
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setError('This login link is missing its token.');
      return;
    }

    (async () => {
      try {
        const res = await authEndpoints.passwordlessVerify(token);
        const data = res.data?.data || res.data || {};

        if (data.requiresMFA) {
          navigate('/login', {
            replace: true,
            state: { mfaPendingToken: data.mfaPendingToken, mfaMethod: data.mfaMethod },
          });
          return;
        }

        const accessToken = data.token || data.accessToken;
        if (!accessToken) throw new Error(data?.message || 'Login failed');
        loginUser(accessToken, data.user);

        try {
          const saved = await profileEndpoints.cart.get();
          const savedItems = saved.data?.data || [];
          useCart.getState().mergeServerCart(savedItems);
          const merged = useCart.getState().cart;
          if (Array.isArray(merged) && merged.length) {
            await profileEndpoints.cart.merge({ items: merged });
          }
        } catch (_) {}

        toast.success('Welcome back!');
        navigate('/account', { replace: true });
      } catch (err: any) {
        setError(err?.response?.data?.message || 'This login link is invalid or has expired.');
      }
    })();
  }, [searchParams, navigate, loginUser]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-linear-to-br from-[#1E293B] to-[#047857] rounded-xl flex items-center justify-center">
            <LogoMark className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">epasal<span className="text-[#047857]">ey</span></span>
        </Link>

        {error ? (
          <div className="animate-fade-in">
            <div role="alert" aria-live="assertive" className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm text-left">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
            <Link to="/login" className="text-sm text-[#1E293B] hover:text-[#047857] font-medium transition">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <span className="w-8 h-8 border-2 border-gray-200 border-t-[#1E293B] rounded-full animate-spin" />
            <p className="text-sm">Signing you in…</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordlessLoginPage;
