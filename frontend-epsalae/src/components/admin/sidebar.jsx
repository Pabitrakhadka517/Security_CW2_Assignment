import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../store/authstore';
import api from '../api/base';
import { UploadCloud,
  LayoutDashboard, Package, ShoppingCart, Tag, Percent,
  Image, LogOut, ExternalLink, X, BadgePercent,
  Heart, ShoppingBag, ChevronRight, ChevronDown, ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { LogoMark } from '../ui/Logo';

const NAV_SECTIONS = [
  {
    title: 'Main Menu',
    items: [
      { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Sales',
    items: [
      { path: '/admin/ordercrud',      label: 'Orders',          icon: ShoppingCart },
      { path: '/admin/saleproducts',   label: 'Sale Products',   icon: ShoppingBag },
      { path: '/admin/salecrud',       label: 'Sale Categories', icon: BadgePercent },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { path: '/admin/productcrud',  label: 'Products',   icon: Package },
      { path: '/admin/categorycrud', label: 'Categories', icon: Tag },
      { path: '/admin/bulk-upload',  label: 'Bulk Upload', icon: UploadCloud },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { path: '/admin/promocodecrud', label: 'Promo Codes', icon: Percent },
      { path: '/admin/bannercrud',    label: 'Banners',     icon: Image },
    ],
  },
  {
    title: 'Customers',
    items: [
      { path: '/admin/wishlists', label: 'Wishlists', icon: Heart },
    ],
  },
  {
    title: 'Security',
    items: [
      { path: '/admin/security', label: 'Security Dashboard', icon: ShieldAlert },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const navigate  = useNavigate();
  const { admin, logoutAdmin } = useAdminAuth();
  const adminName    = admin?.name || admin?.firstName || 'Admin';
  const adminEmail   = admin?.email || 'admin@epasaley.com';
  const adminInitial = adminName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logoutAdmin();
    navigate('/');
  };

  const handleNav = () => { if (window.innerWidth < 1024) onClose?.(); };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          ds-page fixed left-0 top-0 h-screen w-64 z-30 flex flex-col
          bg-(--ds-card) border-r border-(--ds-border)
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* ── Logo ─────────────────────────────────────────────── */}
        <div className="h-[70px] flex items-center justify-between px-5 border-b border-(--ds-border) shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-linear-to-br from-[#1E293B] to-[#10B981] shrink-0">
              <LogoMark className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-(--ds-text) leading-none">
                epasal<span className="text-[#10B981]">ey</span>
              </p>
              <p className="mt-1 text-[10px] text-(--ds-text-faint) font-semibold tracking-wider uppercase">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-(--ds-text-faint) hover:text-(--ds-text) hover:bg-(--ds-card-muted) transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-(--ds-text-faint) select-none">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ path, label, icon: Icon, exact }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={exact}
                    onClick={handleNav}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-emerald-50 text-[#10B981] border-l-[3px] border-[#10B981] pl-[calc(0.75rem-3px)]'
                          : 'text-(--ds-text-muted) hover:bg-(--ds-card-muted) hover:text-(--ds-text) border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive ? 'bg-emerald-100' : 'bg-(--ds-card-muted) group-hover:bg-(--ds-border)'
                        }`}>
                          <Icon size={15} className={isActive ? 'text-[#10B981]' : 'text-(--ds-text-muted)'} />
                        </div>
                        <span className="flex-1">{label}</span>
                        {isActive && <ChevronRight size={13} className="shrink-0 text-[#10B981]/60" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Admin chip ──────────────────────────────────────── */}
        <div className="mx-3 mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#10B981] to-amber-400 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow shadow-emerald-200">
            {adminInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-(--ds-text) text-sm font-semibold truncate leading-none">{adminName}</p>
            <p className="text-(--ds-text-faint) text-[11px] truncate mt-0.5">{adminEmail}</p>
          </div>
        </div>

        {/* ── Bottom actions ───────────────────────────────────── */}
        <div className="px-3 pb-4 border-t border-(--ds-border) pt-3 space-y-0.5 shrink-0">
          <NavLink to="/" onClick={handleNav}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-(--ds-text-muted) hover:text-(--ds-text) hover:bg-(--ds-card-muted) transition-all border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]">
            <div className="w-8 h-8 rounded-lg bg-(--ds-card-muted) flex items-center justify-center shrink-0">
              <ExternalLink size={14} className="text-(--ds-text-muted)" />
            </div>
            View Store
          </NavLink>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <LogOut size={14} className="text-red-500" />
            </div>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
