import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authEndpoints } from '@/components/api/userapi';
import { LogoMark } from '@/components/ui/Logo';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';
import PasswordRules from '@/components/ui/PasswordRules';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [fieldErrors, setFieldErrors]     = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const validate = () => {
    const errs: { newPassword?: string; confirmPassword?: string } = {};
    if (!newPassword) errs.newPassword = 'New password is required';
    else if (newPassword.length < 12) errs.newPassword = 'Minimum 12 characters';
    if (confirmPassword !== newPassword) errs.confirmPassword = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is missing its token — please use the link from your email.');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      await authEndpoints.resetPassword({ token, newPassword });
      toast.success('Password reset successful. Please sign in with your new password.');
      navigate('/login?reason=password_changed', { replace: true });
    } catch (err: any) {
      const data = err?.response?.data;
      const detailErrors = data?.details?.errors;
      const messages = Array.isArray(detailErrors) && detailErrors.length ? detailErrors : [data?.message || 'Failed to reset password'];
      setError(messages[0]);
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
            Choose a new<br />password
          </h2>
          <p className="text-blue-200/70 text-base leading-relaxed">
            Make it strong — at least 12 characters with a mix of letters, numbers, and symbols.
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Set a new password</h1>
            <p className="text-gray-500 text-sm mb-8">Choose a strong password you haven't used before.</p>

            {!token && (
              <div role="alert" className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 mb-5 text-sm">
                <AlertCircle size={15} className="shrink-0" />
                <span>This link is missing its reset token. Please use the link from your email, or request a new one.</span>
              </div>
            )}

            {error && (
              <div role="alert" aria-live="assertive" className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm animate-shake">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                  <input
                    id="newPassword" type={showPassword ? 'text' : 'password'} value={newPassword} disabled={loading} autoFocus
                    onChange={e => { setNewPassword(e.target.value); setFieldErrors(p => ({ ...p, newPassword: undefined })); setError(''); }}
                    placeholder="Min. 12 characters" autoComplete="new-password"
                    aria-invalid={!!fieldErrors.newPassword}
                    aria-describedby={fieldErrors.newPassword ? 'newPassword-error' : undefined}
                    className={`w-full pl-10 pr-11 py-2.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-50 ${
                      fieldErrors.newPassword
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
                {fieldErrors.newPassword && <p id="newPassword-error" role="alert" className="mt-1.5 text-xs text-red-500">{fieldErrors.newPassword}</p>}
                <PasswordStrengthMeter password={newPassword} />
                <PasswordRules password={newPassword} />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                  <input
                    id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} disabled={loading}
                    onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: undefined })); setError(''); }}
                    placeholder="Re-enter new password" autoComplete="new-password"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 text-sm transition focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-50 ${
                      fieldErrors.confirmPassword
                        ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                        : 'border-gray-200 focus:ring-[#1E293B]/10 focus:border-[#1E293B]/40'
                    }`}
                  />
                </div>
                {fieldErrors.confirmPassword && <p id="confirmPassword-error" role="alert" className="mt-1.5 text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
              </div>

              <button type="submit" disabled={loading || !token}
                className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 bg-[#1E293B] hover:bg-[#0B1220] text-white font-semibold rounded-xl text-sm transition shadow-md shadow-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resetting…</>
                ) : (
                  <>Reset password <ArrowRight size={15} /></>
                )}
              </button>
            </form>

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

export default ResetPasswordPage;
