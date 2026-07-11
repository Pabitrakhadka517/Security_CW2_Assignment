import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../store/authstore';
import api from '../api/base';
import { UploadCloud,
  LayoutDashboard, Package, ShoppingCart, Tag, Percent,
  Image, LogOut, ExternalLink, X, BadgePercent,
  Heart, ShoppingBag, ChevronRight, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import logo from '../../assets/weblogo.png';

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
          fixed left-0 top-0 h-screen w-64 z-30 flex flex-col
          bg-white border-r border-gray-100
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* ── Logo ─────────────────────────────────────────────── */}
        <div className="h-[70px] flex items-center justify-between px-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="ePasaley"
              className="h-9 w-auto object-contain"
            />
            <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Admin Panel</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 select-none">
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
                          ? 'bg-orange-50 text-[#FF6B35] border-l-[3px] border-[#FF6B35] pl-[calc(0.75rem-3px)]'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive ? 'bg-orange-100' : 'bg-gray-100 group-hover:bg-gray-200'
                        }`}>
                          <Icon size={15} className={isActive ? 'text-[#FF6B35]' : 'text-gray-500'} />
                        </div>
                        <span className="flex-1">{label}</span>
                        {isActive && <ChevronRight size={13} className="shrink-0 text-[#FF6B35]/60" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Admin chip ──────────────────────────────────────── */}
        <div className="mx-3 mb-3 p-3 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#FF6B35] to-amber-400 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow shadow-orange-200">
            {adminInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-gray-900 text-sm font-semibold truncate leading-none">{adminName}</p>
            <p className="text-gray-400 text-[11px] truncate mt-0.5">{adminEmail}</p>
          </div>
        </div>

        {/* ── Bottom actions ───────────────────────────────────── */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-3 space-y-0.5 shrink-0">
          <NavLink to="/" onClick={handleNav}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <ExternalLink size={14} className="text-gray-500" />
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
