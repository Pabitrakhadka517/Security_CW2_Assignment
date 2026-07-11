import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authEndpoints, profileEndpoints } from '@/components/api/userapi';
import { useUserAuth } from '@/components/store/authstore';
import { useCart } from '@/store/cartstore';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const res  = await authEndpoints.login({ email, password });
      const data = res.data?.data || res.data || {};
      const token = data.token || data.accessToken;
      const user  = data.user;
      if (!token) throw new Error(res.data?.message || 'Login failed');
      loginUser(token, user);
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
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-[#0B1A3E] via-[#1A3C8A] to-[#1e50c8] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#FF6B35]/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <Link to="/" className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            epasal<span className="text-[#FF6B35]">ey</span>
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
            <div className="w-9 h-9 bg-linear-to-br from-[#1A3C8A] to-[#FF6B35] rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">epasal<span className="text-[#FF6B35]">ey</span></span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
          <p className="text-gray-500 text-sm mb-8">Welcome back! Enter your credentials to continue.</p>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="email" type="email" value={email} disabled={loading}
                  onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); setError(''); }}
                  placeholder="you@example.com" autoComplete="email"
                  className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-50 ${
                    fieldErrors.email
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                      : 'border-gray-200 focus:ring-[#1A3C8A]/10 focus:border-[#1A3C8A]/40'
                  }`}
                />
              </div>
              {fieldErrors.email && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#1A3C8A] hover:text-[#FF6B35] transition font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="password" type={showPassword ? 'text' : 'password'} value={password} disabled={loading}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); setError(''); }}
                  placeholder="Your password" autoComplete="current-password"
                  className={`w-full pl-10 pr-11 py-2.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-50 ${
                    fieldErrors.password
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                      : 'border-gray-200 focus:ring-[#1A3C8A]/10 focus:border-[#1A3C8A]/40'
                  }`}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} disabled={loading}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 bg-[#1A3C8A] hover:bg-[#142f6e] text-white font-semibold rounded-xl text-sm transition shadow-md shadow-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" state={{ returnTo }} className="text-[#FF6B35] hover:text-orange-600 font-semibold transition">
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
      </div>
    </div>
  );
};

export default LoginPage;
