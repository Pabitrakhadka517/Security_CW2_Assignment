import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, ChevronDown, LogOut, Menu, X,
  User, Lock, Eye, EyeOff, Check, Loader2, AlertCircle,
  ShieldCheck, ShieldOff, KeyRound, Copy, AlertTriangle, Download,
} from 'lucide-react';
import { useAdminAuth } from '../store/authstore';
import api, { adminMfaEndpoints } from '../api/base';
import toast from 'react-hot-toast';

const ROUTE_META = {
  '/admin':               { title: 'Dashboard',          sub: 'Welcome to ePasaley admin panel' },
  '/admin/productcrud':   { title: 'Products',           sub: 'Manage your product catalog' },
  '/admin/categorycrud':  { title: 'Categories',         sub: 'Organize your product categories' },
  '/admin/ordercrud':     { title: 'Orders',             sub: 'Track and manage customer orders' },
  '/admin/salecrud':      { title: 'Sale Categories',    sub: 'Manage promotional sale campaigns' },
  '/admin/saleproducts':  { title: 'Sale Products',      sub: 'Products currently in sale categories' },
  '/admin/promocodecrud': { title: 'Promo Codes',        sub: 'Create and manage discount coupons' },
  '/admin/bannercrud':    { title: 'Banners',            sub: 'Manage homepage banner images' },
  '/admin/wishlists':     { title: 'Customer Wishlists', sub: 'View customer saved products' },
};

/* ── Profile slide-over panel ───────────────────────────────── */
function ProfilePanel({ open, onClose, admin, loginAdmin }) {
  const [tab, setTab]             = useState('profile'); // 'profile' | 'password' | 'mfa'
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [saving, setSaving]       = useState(false);

  const [curPwd, setCurPwd]       = useState('');
  const [newPwd, setNewPwd]       = useState('');
  const [confPwd, setConfPwd]     = useState('');
  const [showCur, setShowCur]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [error, setError]         = useState('');

  // MFA tab state
  const [mfaChecking, setMfaChecking]   = useState(true);
  const [mfaEnabled, setMfaEnabled]     = useState(false);
  const [mfaStep, setMfaStep]           = useState('status'); // status | qr | backup-codes
  const [mfaQrCode, setMfaQrCode]       = useState(null);
  const [mfaSecret, setMfaSecret]       = useState(null);
  const [mfaBackupCodes, setMfaBackupCodes] = useState([]);
  const [mfaBusy, setMfaBusy]           = useState(false);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaCopied, setMfaCopied]       = useState(false);
  const [mfaBackupConfirmed, setMfaBackupConfirmed] = useState(false);
  const [showDisableMfa, setShowDisableMfa] = useState(false);
  const [disableMfaPwd, setDisableMfaPwd]   = useState('');
  const [disableMfaCode, setDisableMfaCode] = useState('');
  const [showDisableMfaPwd, setShowDisableMfaPwd] = useState(false);

  // Sync form when panel opens
  useEffect(() => {
    if (open && admin) {
      setName(admin.name || '');
      setEmail(admin.email || '');
      setError('');
      setCurPwd(''); setNewPwd(''); setConfPwd('');
    }
  }, [open, admin]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMfaChecking(true);
    setMfaStep('status');
    adminMfaEndpoints.status()
      .then((res) => {
        if (cancelled) return;
        setMfaEnabled(!!(res.data?.data?.mfaEnabled ?? res.data?.mfaEnabled));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMfaChecking(false); });
    return () => { cancelled = true; };
  }, [open]);

  const startMfaSetup = async () => {
    setMfaBusy(true);
    try {
      const res = await adminMfaEndpoints.setup();
      const data = res.data?.data || res.data || {};
      setMfaQrCode(data.qrCode);
      setMfaSecret(data.secret);
      setMfaStep('qr');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start MFA setup');
    } finally { setMfaBusy(false); }
  };

  const verifyMfaSetup = async (e) => {
    e.preventDefault();
    if (!mfaVerifyCode) return;
    setMfaBusy(true);
    try {
      const res = await adminMfaEndpoints.verifySetup({ token: mfaVerifyCode });
      const data = res.data?.data || res.data || {};
      setMfaBackupCodes(data.backupCodes || []);
      setMfaEnabled(true);
      setMfaStep('backup-codes');
      setMfaVerifyCode('');
      toast.success('MFA enabled successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid verification code');
    } finally { setMfaBusy(false); }
  };

  const copyMfaSecret = async () => {
    try {
      await navigator.clipboard.writeText(mfaSecret);
      setMfaCopied(true);
      setTimeout(() => setMfaCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const handleDisableMfa = async (e) => {
    e.preventDefault();
    setError('');
    if (!disableMfaPwd || !disableMfaCode) return setError('Password and verification code are required');
    setMfaBusy(true);
    try {
      await adminMfaEndpoints.disable({ password: disableMfaPwd, token: disableMfaCode });
      setMfaEnabled(false);
      setShowDisableMfa(false);
      setDisableMfaPwd(''); setDisableMfaCode('');
      setMfaStep('status');
      toast.success('MFA disabled successfully');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to disable MFA');
    } finally { setMfaBusy(false); }
  };

  const saveProfile = async () => {
    if (!name.trim()) return setError('Name cannot be empty');
    setSaving(true); setError('');
    try {
      const res = await api.put('/auth/admin/profile', { name: name.trim(), email: email.trim() });
      const updated = res.data?.data;
      // Update the zustand store so header reflects the new name immediately
      if (updated && loginAdmin) {
        const token = localStorage.getItem('adminToken');
        loginAdmin(token, { ...(admin || {}), name: updated.name, email: updated.email });
      }
      toast.success('Profile updated');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (!curPwd || !newPwd || !confPwd) return setError('All password fields are required');
    if (newPwd.length < 12) return setError('New password must be at least 12 characters and include uppercase, lowercase, a number, and a special character');
    if (newPwd !== confPwd) return setError('Passwords do not match');
    setPwdSaving(true); setError('');
    try {
      await api.put('/auth/admin/password', { currentPassword: curPwd, newPassword: newPwd });
      toast.success('Password changed successfully');
      setCurPwd(''); setNewPwd(''); setConfPwd('');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Password change failed');
    } finally { setPwdSaving(false); }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Slide-over */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#FF6B35] to-amber-400 flex items-center justify-center text-white font-bold text-base shadow shadow-orange-200">
              {(admin?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-none truncate">{admin?.name || 'Admin'}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{admin?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4 pb-0 shrink-0">
          {[
            { id: 'profile',  label: 'Profile',         icon: User },
            { id: 'password', label: 'Change Password',  icon: Lock },
            { id: 'mfa',      label: 'Two-Factor',       icon: ShieldCheck },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id); setError(''); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === id
                  ? 'bg-orange-50 text-[#FF6B35]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 mb-4 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          {tab === 'profile' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                  placeholder="Admin name"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@epasaley.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300 focus:bg-white transition"
                />
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 mb-0.5">Role</p>
                <p className="text-sm font-medium text-gray-800 capitalize">{admin?.role || 'admin'}</p>
              </div>
            </div>
          ) : tab === 'password' ? (
            <div className="space-y-4">
              {[
                { label: 'Current Password', val: curPwd, set: setCurPwd, show: showCur, toggle: () => setShowCur(v => !v) },
                { label: 'New Password',     val: newPwd, set: setNewPwd, show: showNew, toggle: () => setShowNew(v => !v) },
                { label: 'Confirm Password', val: confPwd, set: setConfPwd, show: showConf, toggle: () => setShowConf(v => !v) },
              ].map(({ label, val, set, show, toggle }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'}
                      value={val}
                      onChange={e => { set(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300 focus:bg-white transition"
                    />
                    <button type="button" onClick={toggle}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400">At least 12 characters, with uppercase, lowercase, a number, and a special character.</p>
            </div>
          ) : mfaChecking ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <div className="space-y-4">
              {mfaStep === 'status' && (
                mfaEnabled ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                      <ShieldCheck size={16} className="shrink-0" />
                      <span>MFA is active on your account.</span>
                    </div>

                    {!showDisableMfa ? (
                      <button
                        onClick={() => setShowDisableMfa(true)}
                        className="w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl text-sm transition"
                      >
                        Disable MFA
                      </button>
                    ) : (
                      <form onSubmit={handleDisableMfa} className="space-y-3">
                        <div className="relative">
                          <input
                            type={showDisableMfaPwd ? 'text' : 'password'}
                            placeholder="Current password"
                            value={disableMfaPwd}
                            onChange={(e) => { setDisableMfaPwd(e.target.value); setError(''); }}
                            disabled={mfaBusy}
                            className="w-full px-4 py-2.5 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300 focus:bg-white transition disabled:opacity-50"
                          />
                          <button type="button" onClick={() => setShowDisableMfaPwd((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                            {showDisableMfaPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit authenticator code"
                          value={disableMfaCode}
                          onChange={(e) => { setDisableMfaCode(e.target.value); setError(''); }}
                          disabled={mfaBusy}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300 focus:bg-white transition disabled:opacity-50"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setShowDisableMfa(false); setError(''); }}
                            disabled={mfaBusy}
                            className="flex-1 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl text-sm transition disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={mfaBusy}
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
                          >
                            <ShieldOff size={14} />
                            {mfaBusy ? 'Disabling…' : 'Confirm Disable'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security to your admin account. Once enabled, you'll need a
                      6-digit code from an authenticator app to sign in.
                    </p>
                    <button
                      onClick={startMfaSetup}
                      disabled={mfaBusy}
                      className="w-full py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
                    >
                      {mfaBusy ? 'Starting setup…' : 'Enable MFA'}
                    </button>
                  </div>
                )
              )}

              {mfaStep === 'qr' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Scan this with Google Authenticator or Authy.</p>
                  {mfaQrCode && (
                    <div className="flex justify-center">
                      <img src={mfaQrCode} alt="MFA QR code" className="w-40 h-40 rounded-xl border border-gray-200" />
                    </div>
                  )}
                  {mfaSecret && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Can't scan? Enter this key manually instead.
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <code className="flex-1 text-xs font-mono text-gray-900 break-all">{mfaSecret}</code>
                        <button type="button" onClick={copyMfaSecret} className="text-gray-400 hover:text-gray-600 shrink-0">
                          {mfaCopied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                  <form onSubmit={verifyMfaSetup} className="space-y-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={mfaVerifyCode}
                      onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={mfaBusy}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 text-center text-lg tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={mfaBusy || !mfaVerifyCode}
                      className="w-full py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
                    >
                      {mfaBusy ? 'Verifying…' : 'Verify & Enable'}
                    </button>
                  </form>
                </div>
              )}

              {mfaStep === 'backup-codes' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>Save these codes somewhere safe. Each can only be used once.</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(mfaBackupCodes.join('\n')); toast.success('Codes copied'); }}
                      className="flex-1 flex items-center justify-center gap-2 text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy codes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const content = 'Epasaley Admin — MFA Backup Codes\n\n' + mfaBackupCodes.join('\n') +
                          '\n\nSave these somewhere safe. Each code can only be used once.';
                        const blob = new Blob([content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'epasaley-admin-backup-codes.txt'; a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {mfaBackupCodes.map((code) => (
                      <div key={code} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2">
                        <KeyRound size={12} className="text-gray-400 shrink-0" />
                        <code className="text-xs font-mono text-gray-900">{code}</code>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <input
                      type="checkbox"
                      checked={mfaBackupConfirmed}
                      onChange={(e) => setMfaBackupConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-amber-700 border-amber-300 focus:ring-amber-600"
                    />
                    <span className="text-xs text-amber-800">
                      I have saved my backup codes. I understand they cannot be recovered if lost.
                    </span>
                  </label>

                  <button
                    disabled={!mfaBackupConfirmed}
                    onClick={() => { setMfaStep('status'); setMfaBackupConfirmed(false); setMfaBackupCodes([]); }}
                    className="w-full py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Finish setup
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {tab !== 'mfa' ? (
          <div className="px-5 pb-6 pt-3 border-t border-gray-100 shrink-0 flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              onClick={tab === 'profile' ? saveProfile : savePassword}
              disabled={saving || pwdSaving}
              className="flex-1 py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-orange-200 disabled:opacity-60 flex items-center justify-center gap-2">
              {(saving || pwdSaving)
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Check className="w-4 h-4" /> Save Changes</>
              }
            </button>
          </div>
        ) : (
          <div className="px-5 pb-6 pt-3 border-t border-gray-100 shrink-0">
            <button onClick={onClose}
              className="w-full py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ── AdminHeader ─────────────────────────────────────────────── */
export default function AdminHeader({ onToggleSidebar, sidebarOpen }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { admin, logoutAdmin, loginAdmin } = useAdminAuth();

  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setUserMenuOpen(false); }, [location.pathname]);

  const meta         = ROUTE_META[location.pathname] ?? { title: 'Admin', sub: 'ePasaley admin panel' };
  const adminName    = admin?.name || admin?.firstName || 'Admin';
  const adminEmail   = admin?.email || 'admin@epasaley.com';
  const adminInitial = adminName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logoutAdmin();
    navigate('/');
  };

  const openProfile = () => { setUserMenuOpen(false); setProfileOpen(true); };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 lg:left-64 z-20 h-[70px] bg-white border-b border-gray-100 flex items-center px-5 gap-4">

        {/* Mobile toggle */}
        <button onClick={onToggleSidebar}
          className="p-2 rounded-xl text-gray-500 hover:bg-orange-50 hover:text-[#FF6B35] transition-colors lg:hidden shrink-0">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Page title */}
        <div className="hidden lg:flex flex-col justify-center shrink-0 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 leading-none">{meta.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{meta.sub}</p>
        </div>

        {/* Mobile logo */}
        <Link to="/admin" className="lg:hidden flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#FF6B35] to-orange-400 flex items-center justify-center">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="text-base font-bold text-gray-900">ePasal<span className="text-[#FF6B35]">ey</span></span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-xs mx-4 lg:mx-auto lg:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* User menu */}
        <div className="ml-auto shrink-0 relative" ref={userMenuRef}>
          <button onClick={() => setUserMenuOpen(v => !v)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-orange-50 transition-colors">
            <div className="w-8 h-8 bg-linear-to-br from-[#FF6B35] to-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm shadow shadow-orange-200">
              {adminInitial}
            </div>
            <div className="hidden md:block text-left leading-none">
              <p className="text-sm font-semibold text-gray-800">{adminName}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{admin?.role || 'Administrator'}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 py-1.5 z-50">
              {/* Info */}
              <div className="px-4 py-3 border-b border-gray-50 mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-linear-to-br from-[#FF6B35] to-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {adminInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{adminName}</p>
                    <p className="text-xs text-gray-400 truncate">{adminEmail}</p>
                  </div>
                </div>
              </div>

              {/* Edit Profile */}
              <button onClick={openProfile}
                className="w-[calc(100%-12px)] flex items-center gap-3 mx-1.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#FF6B35] rounded-xl transition-colors">
                <User className="w-4 h-4 shrink-0" /> Edit Profile
              </button>

              {/* Change Password */}
              <button onClick={() => { setUserMenuOpen(false); setProfileOpen(true); }}
                className="w-[calc(100%-12px)] flex items-center gap-3 mx-1.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#FF6B35] rounded-xl transition-colors">
                <Lock className="w-4 h-4 shrink-0" /> Change Password
              </button>

              <div className="border-t border-gray-50 mt-1 pt-1 mx-1.5">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
                  <LogOut className="w-4 h-4 shrink-0" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Profile panel */}
      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        admin={admin}
        loginAdmin={loginAdmin}
      />
    </>
  );
}
