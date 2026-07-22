import { Routes, Route, Outlet, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'
import Home from './components/homepage/home'
import ProductDetail from './components/product-details/ProductDetail'
import Products from './pages/Products'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import PaymentResult from './pages/PaymentResult'
import TrackOrder from './pages/TrackOrder'
import AdminLogin from './pages/AdminLogin'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import PasswordlessLoginPage from './pages/PasswordlessLoginPage'
import SalePage from './pages/SalePage'
import SalesHub from './pages/SalesHub'
import RegisterPage from './pages/RegisterPage'
import AdminLayout from './components/admin/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import UserProtectedRoute from './components/UserProtectedRoute'
import Navbar from './components/homepage/navbar'
import SearchBar from './components/homepage/SearchBar'
import Footer from './components/homepage/Footer'
import NotFound from './pages/NotFound'
import Forbidden from './pages/403'
import ProfileSetup from './pages/ProfileSetup'
import AccountDashboard from './pages/AccountDashboard'
import IdleTimeoutManager from './components/IdleTimeoutManager'
import DeviceMismatchBanner from './components/DeviceMismatchBanner'
import EmailVerificationBanner from './components/EmailVerificationBanner'

function PublicLayout() {
  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_48%,#eef3ff_100%)] text-slate-900">
      <DeviceMismatchBanner />
      <EmailVerificationBanner />
      <Navbar />
      <SearchBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

// A bare top-level slug (e.g. /wintersale, often used as a sale's CTA link)
// resolves to its sale page. SalePage shows a graceful "Sale not found" if the
// slug isn't a real sale, so this never hard-404s a legitimate sale link.
function SaleSlugRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/sale/${slug}`} replace />
}

function App() {
  return (
    <>
      {/* Global Toast Notifications */}
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 20, right: 20 }}
        toastOptions={{
          duration: 3500,
          // Default base style
          style: {
            fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: '13.5px',
            fontWeight: '500',
            borderRadius: '14px',
            padding: '13px 16px',
            maxWidth: '380px',
            boxShadow: '0 8px 32px -4px rgba(15,23,42,0.18), 0 2px 8px -2px rgba(15,23,42,0.10)',
            border: '1px solid rgba(226,232,240,0.6)',
            background: 'rgba(255,255,255,0.96)',
            color: '#0f172a',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          },
          success: {
            duration: 3000,
            style: {
              fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: '13.5px',
              fontWeight: '500',
              borderRadius: '14px',
              padding: '13px 16px',
              maxWidth: '380px',
              background: 'linear-gradient(135deg, rgba(240,253,244,0.98) 0%, rgba(220,252,231,0.98) 100%)',
              color: '#14532d',
              border: '1px solid rgba(134,239,172,0.5)',
              boxShadow: '0 8px 32px -4px rgba(16,185,129,0.15), 0 2px 8px -2px rgba(16,185,129,0.10)',
            },
            iconTheme: {
              primary: '#16a34a',
              secondary: '#dcfce7',
            },
          },
          error: {
            duration: 4000,
            style: {
              fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: '13.5px',
              fontWeight: '500',
              borderRadius: '14px',
              padding: '13px 16px',
              maxWidth: '380px',
              background: 'linear-gradient(135deg, rgba(255,241,242,0.98) 0%, rgba(254,226,226,0.98) 100%)',
              color: '#7f1d1d',
              border: '1px solid rgba(252,165,165,0.5)',
              boxShadow: '0 8px 32px -4px rgba(239,68,68,0.15), 0 2px 8px -2px rgba(239,68,68,0.10)',
            },
            iconTheme: {
              primary: '#dc2626',
              secondary: '#fee2e2',
            },
          },
          loading: {
            style: {
              fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: '13.5px',
              fontWeight: '500',
              borderRadius: '14px',
              padding: '13px 16px',
              maxWidth: '380px',
              background: 'linear-gradient(135deg, rgba(239,246,255,0.98) 0%, rgba(219,234,254,0.98) 100%)',
              color: '#1e3a8a',
              border: '1px solid rgba(147,197,253,0.5)',
              boxShadow: '0 8px 32px -4px rgba(30,41,59,0.15), 0 2px 8px -2px rgba(30,41,59,0.10)',
            },
            iconTheme: {
              primary: '#1E293B',
              secondary: '#dbeafe',
            },
          },
        }}
      />
      <IdleTimeoutManager />
      <Routes>
        {/* Admin routes - no header/footer */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        } />
        {/* Public routes - layout wraps all children via Outlet */}
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          {/* Checkout requires a logged-in customer. */}
          <Route path="checkout" element={<UserProtectedRoute><Checkout /></UserProtectedRoute>} />
          <Route path="login" element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="passwordless-login" element={<PasswordlessLoginPage />} />
          <Route path="sale/:slug" element={<SalePage />} />
          <Route path="sales" element={<SalesHub />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="profile-setup" element={<UserProtectedRoute><ProfileSetup /></UserProtectedRoute>} />
          <Route path="account/*" element={<UserProtectedRoute><AccountDashboard /></UserProtectedRoute>} />
          <Route path="order-success/:orderId" element={<OrderSuccess />} />
          <Route path="payment/esewa/result" element={<PaymentResult />} />
          <Route path="track-order" element={<TrackOrder />} />
          <Route path="403" element={<Forbidden />} />
          {/* Bare slug → sale page (handles admin CTA links like /wintersale) */}
          <Route path=":slug" element={<SaleSlugRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}

export default App
