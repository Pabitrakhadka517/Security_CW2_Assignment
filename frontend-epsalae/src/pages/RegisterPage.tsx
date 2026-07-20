import React, { useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { authEndpoints, profileEndpoints } from '@/components/api/userapi';
import { useUserAuth } from '@/components/store/authstore';
import { useCart } from '@/store/cartstore';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';
import PasswordRules from '@/components/ui/PasswordRules';
import CaptchaWidget from '@/components/ui/CaptchaWidget';
import { LogoMark } from '@/components/ui/Logo';

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'At least 2 characters'),
    lastName: z.string().trim().min(2, 'At least 2 characters'),
    email: z.string().trim().email('Enter a valid email'),
    phone: z.string().regex(/^[0-9\-\+\(\)\s]{7,15}$/, '7–15 digit phone number'),
    password: z
      .string()
      .min(12, 'Minimum 12 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const inputCls = (err?: string) =>
  `w-full py-2.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-50 ${
    err
      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
      : 'border-gray-200 focus:ring-[#1E293B]/10 focus:border-[#1E293B]/40'
  }`;

const RegisterPage: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isUser, loginUser } = useUserAuth();
  const returnTo: string = (location.state as any)?.returnTo || '/account';

  const [showPwd, setShowPwd]   = React.useState(false);
  const [showConf, setShowConf] = React.useState(false);
  const [loading, setLoading]   = React.useState(false);
  const [apiError, setApiError] = React.useState('');
  const [success, setSuccess]   = React.useState(false);
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null);
  const captchaRef = React.useRef<any>(null);
  const resetCaptcha = () => {
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  const [capsLockOn, setCapsLockOn] = React.useState(false);
  const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  useEffect(() => { if (isUser) navigate(returnTo, { replace: true }); }, [isUser, navigate, returnTo]);

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setApiError('');
    try {
      await authEndpoints.register({
        name:     `${values.firstName.trim()} ${values.lastName.trim()}`,
        email:    values.email.trim().toLowerCase(),
        phone:    values.phone.trim(),
        password: values.password,
        captchaToken,
      });
      setSuccess(true);
      toast.success('Account created! Please sign in.');
      setTimeout(() => navigate('/login', { state: { returnTo } }), 1800);
    } catch (err: any) {
      const details = err?.response?.data?.details?.errors;
      const message = Array.isArray(details) && details.length
        ? details.join(', ')
        : err?.response?.data?.message || 'Registration failed. Try again.';
      setApiError(message);
      resetCaptcha();
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
      try {
        // Same cart sync as LoginPage's completeLogin — a guest cart built
        // right before signing up with Google should carry into the new
        // account, and get persisted server-side from that point on.
        const saved = await profileEndpoints.cart.get();
        const savedItems = saved.data?.data || [];
        useCart.getState().mergeServerCart(savedItems);
        const merged = useCart.getState().cart;
        if (Array.isArray(merged) && merged.length) {
          await profileEndpoints.cart.merge({ items: merged });
        }
      } catch (_) {}
      toast.success('Welcome!');
      navigate(returnTo, { replace: true });
    } catch (err: any) {
      setApiError(err?.response?.data?.message || err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || success;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left branding panel */}
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
            <div className="w-9 h-9 bg-linear-to-br from-[#1E293B] to-[#047857] rounded-xl flex items-center justify-center">
              <LogoMark className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">epasal<span className="text-[#047857]">ey</span></span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
          <p className="text-gray-500 text-sm mb-6">Free forever. No credit card required.</p>

          {success ? (
            <div role="status" aria-live="polite" className="py-12 text-center animate-fade-in">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Account created!</h3>
              <p className="text-gray-500 text-sm">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              {apiError && (
                <div role="alert" aria-live="assertive" className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm animate-shake">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                      <input id="firstName" placeholder="Ram" disabled={isDisabled} autoComplete="given-name" autoFocus
                        aria-invalid={!!errors.firstName} aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                        className={`${inputCls(errors.firstName?.message)} pl-9 pr-3`} {...register('firstName')} />
                    </div>
                    {errors.firstName && <p id="firstName-error" role="alert" className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                      <input id="lastName" placeholder="Sharma" disabled={isDisabled} autoComplete="family-name"
                        aria-invalid={!!errors.lastName} aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                        className={`${inputCls(errors.lastName?.message)} pl-9 pr-3`} {...register('lastName')} />
                    </div>
                    {errors.lastName && <p id="lastName-error" role="alert" className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input id="email" type="email" placeholder="you@example.com" disabled={isDisabled} autoComplete="email"
                      aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined}
                      className={`${inputCls(errors.email?.message)} pl-9 pr-4`} {...register('email')} />
                  </div>
                  {errors.email && <p id="email-error" role="alert" className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input id="phone" type="tel" placeholder="98XXXXXXXX" disabled={isDisabled} autoComplete="tel"
                      aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-error' : undefined}
                      className={`${inputCls(errors.phone?.message)} pl-9 pr-4`} {...register('phone')} />
                  </div>
                  {errors.phone && <p id="phone-error" role="alert" className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input id="password" type={showPwd ? 'text' : 'password'}
                      placeholder="Min. 12 characters" disabled={isDisabled} autoComplete="new-password"
                      aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : capsLockOn ? 'password-capslock' : undefined}
                      className={`${inputCls(errors.password?.message)} pl-9 pr-10`}
                      {...register('password')}
                      onKeyDown={handlePasswordKeyEvent} onKeyUp={handlePasswordKeyEvent} />
                    <button type="button" onClick={() => setShowPwd(v => !v)} disabled={isDisabled}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <p id="password-error" role="alert" className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                  {!errors.password && capsLockOn && (
                    <p id="password-capslock" className="mt-1 text-xs text-amber-600 animate-fade-in">Caps Lock is on</p>
                  )}
                  <PasswordStrengthMeter password={password} />
                  <PasswordRules password={password} />
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input id="confirm" type={showConf ? 'text' : 'password'}
                      placeholder="Re-enter password" disabled={isDisabled} autoComplete="new-password"
                      aria-invalid={!!errors.confirmPassword} aria-describedby="confirm-status"
                      className={`${inputCls(errors.confirmPassword?.message)} pl-9 pr-10`} {...register('confirmPassword')} />
                    <button type="button" onClick={() => setShowConf(v => !v)} disabled={isDisabled}
                      aria-label={showConf ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                      {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div id="confirm-status">
                    {confirmPassword ? (
                      password === confirmPassword ? (
                        <p role="status" className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 animate-fade-in">
                          <CheckCircle2 size={13} className="shrink-0" /> Passwords match
                        </p>
                      ) : (
                        <p role="alert" className="mt-1 flex items-center gap-1.5 text-xs text-red-500 animate-fade-in">
                          <X size={13} className="shrink-0" /> Passwords don't match yet
                        </p>
                      )
                    ) : (
                      errors.confirmPassword && <p role="alert" className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <CaptchaWidget
                    ref={captchaRef}
                    onVerify={(token: string) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>

                <button type="submit" disabled={isDisabled || !captchaToken}
                  className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 bg-[#1E293B] hover:bg-[#0B1220] text-white font-semibold rounded-xl text-sm transition shadow-md shadow-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account…</>
                  ) : (
                    <>Create Account <ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-600">OR</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="mt-4 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setApiError('Google sign-in failed. Please try again.')}
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
                  <Link to="/login" state={{ returnTo }} className="text-[#047857] hover:text-emerald-600 font-semibold transition">
                    Sign in
                  </Link>
                </p>
              </div>

              <p className="text-center mt-3">
                <Link to="/products" className="text-xs text-gray-600 hover:text-gray-800 transition">
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
