import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { authEndpoints } from '@/components/api/userapi';
import { useUserAuth } from '@/components/store/authstore';

function getStrength(p: string) {
  if (!p) return null;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  if (s < 2) return { label: 'Weak',   color: 'bg-red-500',     w: 'w-1/4' };
  if (s < 3) return { label: 'Fair',   color: 'bg-yellow-500',  w: 'w-2/4' };
  if (s < 4) return { label: 'Good',   color: 'bg-blue-500',    w: 'w-3/4' };
  return       { label: 'Strong', color: 'bg-emerald-500', w: 'w-full' };
}

const inputCls = (err?: string) =>
  `w-full py-2.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-50 ${
    err
      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
      : 'border-gray-200 focus:ring-[#1A3C8A]/10 focus:border-[#1A3C8A]/40'
  }`;

interface FormData { firstName: string; lastName: string; email: string; phone: string; password: string; confirmPassword: string; }
type FormErrors = Partial<FormData & { api: string }>;

const RegisterPage: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isUser, loginUser } = useUserAuth();
  const returnTo: string = (location.state as any)?.returnTo || '/account';

  const [form, setForm]           = useState<FormData>({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPwd, setShowPwd]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState<FormErrors>({});
  const [success, setSuccess]     = useState(false);

  useEffect(() => { if (isUser) navigate(returnTo, { replace: true }); }, [isUser, navigate, returnTo]);

  const setField = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: '', api: '' }));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.firstName.trim() || form.firstName.trim().length < 2) e.firstName = 'At least 2 characters';
    if (!form.lastName.trim()  || form.lastName.trim().length  < 2) e.lastName  = 'At least 2 characters';
    if (!form.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone) e.phone = 'Phone is required';
    else if (!/^[0-9\-\+\(\)\s]{7,15}$/.test(form.phone)) e.phone = '7–15 digit phone number';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'At least 6 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authEndpoints.register({
        name:     `${form.firstName.trim()} ${form.lastName.trim()}`,
        email:    form.email.trim().toLowerCase(),
        phone:    form.phone.trim(),
        password: form.password,
      });
      setSuccess(true);
      toast.success('Account created! Please sign in.');
      setTimeout(() => navigate('/login', { state: { returnTo } }), 1800);
    } catch (err: any) {
      setErrors(p => ({ ...p, api: err?.response?.data?.message || 'Registration failed. Try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    try {
      const res  = await authEndpoints.google(credentialResponse.credential);
      const data = res.data?.data || res.data || {};
      const token = data.token || data.accessToken;
      if (!token) throw new Error(data?.message || 'Google sign-in failed');
      loginUser(token, data.user);
      toast.success('Welcome!');
      navigate(returnTo, { replace: true });
    } catch (err: any) {
      setErrors(p => ({ ...p, api: err?.response?.data?.message || err?.message || 'Google sign-in failed. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const strength  = getStrength(form.password);
  const isDisabled = loading || success;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-linear-to-br from-[#0B1A3E] via-[#1A3C8A] to-[#1e50c8] flex-col justify-between p-12 relative overflow-hidden">
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
            Join thousands of<br />happy shoppers
          </h2>
          <p className="text-blue-200/70 text-base leading-relaxed">
            Create your free account and start shopping from Nepal's most trusted online store. Fast delivery, easy returns.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: '✓', text: 'Order tracking & history' },
              { icon: '✓', text: 'Save favourites & wishlists' },
              { icon: '✓', text: 'Exclusive member discounts' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/80 text-sm">
                <span className="w-5 h-5 bg-white/15 rounded-full flex items-center justify-center text-xs font-bold">{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-blue-200/40 text-xs">© {new Date().getFullYear()} ePasaley. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 bg-linear-to-br from-[#1A3C8A] to-[#FF6B35] rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">epasal<span className="text-[#FF6B35]">ey</span></span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
          <p className="text-gray-500 text-sm mb-6">Free forever. No credit card required.</p>

          {success ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Account created!</h3>
              <p className="text-gray-500 text-sm">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              {errors.api && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errors.api}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'firstName', label: 'First name', placeholder: 'Ram',   key: 'firstName' as const, ac: 'given-name' },
                    { id: 'lastName',  label: 'Last name',  placeholder: 'Sharma', key: 'lastName'  as const, ac: 'family-name' },
                  ].map(({ id, label, placeholder, key, ac }) => (
                    <div key={id}>
                      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input id={id} value={form[key]} onChange={setField(key)} placeholder={placeholder}
                          disabled={isDisabled} autoComplete={ac}
                          className={`${inputCls(errors[key])} pl-9 pr-3`} />
                      </div>
                      {errors[key] && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>}
                    </div>
                  ))}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input id="email" type="email" value={form.email} onChange={setField('email')}
                      placeholder="you@example.com" disabled={isDisabled} autoComplete="email"
                      className={`${inputCls(errors.email)} pl-9 pr-4`} />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input id="phone" type="tel" value={form.phone} onChange={setField('phone')}
                      placeholder="98XXXXXXXX" disabled={isDisabled} autoComplete="tel"
                      className={`${inputCls(errors.phone)} pl-9 pr-4`} />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input id="password" type={showPwd ? 'text' : 'password'} value={form.password}
                      onChange={setField('password')} placeholder="Min. 6 characters"
                      disabled={isDisabled} autoComplete="new-password"
                      className={`${inputCls(errors.password)} pl-9 pr-10`} />
                    <button type="button" onClick={() => setShowPwd(v => !v)} disabled={isDisabled}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                  {strength && !errors.password && (
                    <div className="mt-1.5">
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${strength.color} ${strength.w}`} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{strength.label} password</p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input id="confirm" type={showConf ? 'text' : 'password'} value={form.confirmPassword}
                      onChange={setField('confirmPassword')} placeholder="Re-enter password"
                      disabled={isDisabled} autoComplete="new-password"
                      className={`${inputCls(errors.confirmPassword)} pl-9 pr-10`} />
                    <button type="button" onClick={() => setShowConf(v => !v)} disabled={isDisabled}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                      {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
                </div>

                <button type="submit" disabled={isDisabled}
                  className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 bg-[#1A3C8A] hover:bg-[#142f6e] text-white font-semibold rounded-xl text-sm transition shadow-md shadow-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account…</>
                  ) : (
                    <>Create Account <ArrowRight size={15} /></>
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
                  onError={() => setErrors(p => ({ ...p, api: 'Google sign-in failed. Please try again.' }))}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="signup_with"
                  width="384"
                />
              </div>

              <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" state={{ returnTo }} className="text-[#FF6B35] hover:text-orange-600 font-semibold transition">
                    Sign in
                  </Link>
                </p>
              </div>

              <p className="text-center mt-3">
                <Link to="/products" className="text-xs text-gray-400 hover:text-gray-600 transition">
                  ← Continue shopping without signing in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
