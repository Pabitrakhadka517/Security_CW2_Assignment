import { NavLink, Routes, Route, useNavigate } from 'react-router-dom'
import ProfileSetup from './ProfileSetup'
import OrdersPage from './AccountOrders'
import AddressesPage from './AccountAddresses'
import WishlistPage from './AccountWishlist'
import SecurityPage from './AccountSecurity'
import MFASetupPage from './AccountMFASetup'
import ActivityPage from './AccountActivity'
import SessionsPage from './AccountSessions'
import OrderInvoice from './OrderInvoice'
import { User, ShoppingBag, MapPin, Heart, LogOut, Lock, Activity, Monitor } from 'lucide-react'
import { useUserAuth } from '@/components/store/authstore'
import { authEndpoints } from '@/components/api/userapi'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/account', end: true, icon: User, label: 'My Profile' },
  { to: '/account/orders', icon: ShoppingBag, label: 'Purchase History' },
  { to: '/account/addresses', icon: MapPin, label: 'Saved Addresses' },
  { to: '/account/wishlist', icon: Heart, label: 'Wishlist' },
  { to: '/account/security', icon: Lock, label: 'Security' },
  { to: '/account/sessions', icon: Monitor, label: 'Sessions' },
  { to: '/account/activity', icon: Activity, label: 'Activity Log' },
]

const linkCls = ({ isActive }) =>
  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
    isActive
      ? 'bg-slate-900 text-white shadow-sm'
      : 'text-slate-700 hover:bg-slate-50'
  }`

function Sidebar() {
  const { logoutUser } = useUserAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authEndpoints.logout() } catch (_) {}
    logoutUser()
    toast.success('Logged out')
    navigate('/')
  }

  return (
    <aside className="rounded-4xl bg-white p-4 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] lg:sticky lg:top-8">
      <div className="rounded-3xl bg-[linear-gradient(135deg,rgba(26,60,138,0.08),rgba(255,107,53,0.08))] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Account</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">Dashboard</h2>
      </div>

      <nav className="mt-3 space-y-1">
        {navItems.map(({ to, end, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={end} className={linkCls}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 shrink-0" /> Logout
        </button>
      </nav>
    </aside>
  )
}

export default function AccountDashboard() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_52%,#eef3ff_100%)] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
          <Sidebar />
          <main>
            <Routes>
              <Route index element={<ProfileSetup />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderId" element={<OrderInvoice />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="security" element={<SecurityPage />} />
              <Route path="security/mfa-setup" element={<MFASetupPage />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="activity" element={<ActivityPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}
