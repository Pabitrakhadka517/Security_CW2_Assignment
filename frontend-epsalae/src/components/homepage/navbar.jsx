// src/components/Navbar.jsx
import { useState, useEffect } from 'react'
import { Search, ShoppingBag, Heart, Menu, Package, LogIn, X, Grid, Home, ChevronDown, User, Zap, Flame } from 'lucide-react'
import api from '../api/base'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '@/store/cartstore'
import { useFavoritesStore } from '@/store/favoritesstore'
import { authEndpoints } from '../api/userapi'
import { useUserAuth } from '../store/authstore'
import { useProductStore } from '../store/productstore'
import { useCategoryStore } from '../store/categorystore'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '../../assets/logo1080.png'

export default function Navbar() {
  const navigate = useNavigate()
  const { cart } = useCart()
  const { isUser: isLoggedIn, logoutUser: logout } = useUserAuth()
  const { favorites, load: loadFavorites, initialized: favoritesInitialized } = useFavoritesStore()
  const { products, fetchProducts } = useProductStore()
  const { categories, fetchCategories } = useCategoryStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Fetch initial data
  useEffect(() => {
    if (products.length === 0) fetchProducts()
    if (categories.length === 0) fetchCategories()
    if (isLoggedIn && !favoritesInitialized) loadFavorites()
  }, [isLoggedIn, favoritesInitialized])

  const goToWishlist = () => {
    if (isLoggedIn) navigate('/account/wishlist')
    else navigate('/login', { state: { returnTo: '/account/wishlist' } })
  }

  // Scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  const suggestions = searchQuery.trim()
    ? products
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
    : []

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Sales', path: '/sales', icon: Flame },
    { name: 'All Products', path: '/products', icon: Grid },
  ]

  // Live count badge for the Sales nav entry (active sale categories)
  const [liveSaleCount, setLiveSaleCount] = useState(0)
  useEffect(() => {
    api.get('/sale-categories/active')
      .catch(() => ({ data: { data: [] } }))
      .then((sc) => {
        const sales = Array.isArray(sc.data?.data) ? sc.data.data.length : 0
        setLiveSaleCount(sales)
      })
  }, [])

  return (
    <>
      {/* Premium Announcement Bar */}
      <div className="relative z-50 w-full overflow-hidden border-b border-white/10 bg-[linear-gradient(90deg,rgba(8,12,20,0.98)_0%,rgba(26,60,138,0.96)_48%,rgba(255,107,53,0.94)_100%)] text-xs font-medium text-white/95 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.65)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_24%)]" />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 backdrop-blur-md shrink-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-300 opacity-60"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-400"></span>
            </span>
            <span className="whitespace-nowrap">
              MEGA SALE: Up to 50% Off!&nbsp;
              <span className="inline-flex items-center gap-1">
                Code:&nbsp;<strong className="text-orange-300 tracking-wider bg-orange-500/20 px-1.5 py-0.5 rounded">EPASALEY</strong>
              </span>
            </span>
          </div>
          <div className="hidden items-center gap-6 text-white/85 md:flex">
            <span className="flex items-center gap-1.5">🚚 Free delivery above Rs. 5,000</span>
            <span className="flex items-center gap-1.5">✨ 100% genuine products</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 px-4 pb-1.5 text-[11px] text-white/80 md:hidden">
          <span>🚚 Free delivery · ✨ Genuine products</span>
        </div>
      </div>

      {/* Ultra-Premium Sticky Navbar with Scroll Effect */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/88 backdrop-blur-2xl shadow-[0_18px_60px_-42px_rgba(15,23,42,0.5)] border-b border-slate-200/70' 
          : 'bg-white/72 backdrop-blur-2xl border-b border-white/70'
      }`}>
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">

          <div className={`flex items-center justify-between transition-all duration-300 ${
            scrolled ? 'h-16' : 'h-20'
          }`}>

            {/* Logo with scale on scroll */}
            <Link to="/" className="flex items-center group shrink-0">
              <img 
                src={logo} 
                alt="Epasaley Logo" 
                className={`object-contain transition-all duration-300 ${
                  scrolled ? 'w-20 h-20' : 'w-28 h-28'
                }`}
              />
            </Link>
            {/* Desktop Navigation & Actions */}
            <div className="flex items-center gap-1">

              {/* Nav Links with Hover Mega Dropdown */}
              <nav className="items-center hidden gap-1 lg:flex z-30">
                <Link
                  to="/"
                  className="flex items-center gap-2 rounded-full px-5 py-3 font-medium text-gray-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-gray-900"
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>

                {/* Categories Mega Dropdown */}
                <div className="relative group">
                  <button
                    className="flex cursor-pointer items-center gap-2 rounded-full px-5 py-3 font-medium text-gray-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-gray-900"
                  >
                    <Grid className="w-4 h-4" />
                    Categories
                    <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                  </button>
                  <div className="absolute left-0 z-50 mt-2 hidden w-64 overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-all duration-300 group-hover:block">
                    <div className="py-2">
                      {categories.map((cat) => (
                        <Link
                          key={cat._id || cat.id}
                          to={`/products?category=${cat._id || cat.id}`}
                          className="block px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-slate-50 hover:text-[#FF6B35]"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sales — dedicated entry with live-count badge */}
                <Link
                  to="/sales"
                  className="relative flex items-center gap-2 rounded-full px-5 py-3 font-semibold text-[#FF6B35] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-50"
                >
                  <Flame className="w-4 h-4" />
                  Sales
                  {liveSaleCount > 0 && (
                    <span className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6B35] px-1 text-[10px] font-bold text-white animate-pulse">
                      {liveSaleCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/products"
                  className="flex items-center gap-2 rounded-full px-5 py-3 font-medium text-gray-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-gray-900"
                >
                  <Grid className="w-4 h-4" />
                  All Products
                </Link>
              </nav>

              {/* Right Icons */}
              <div className="flex items-center gap-3 ml-6">

                {/* Track Order - Always Visible */}
                <Link
                  to="/track-order"
                  className="hidden items-center gap-2 rounded-full bg-linear-to-r from-emerald-600 to-emerald-700 px-5 py-3 font-medium text-white shadow-[0_18px_40px_-24px_rgba(16,185,129,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-25px_rgba(16,185,129,0.65)] lg:flex"
                >
                  <Package className="w-5 h-5" />
                  Track Order
                </Link>

                {/* Wishlist */}
                <button
                  onClick={goToWishlist}
                  aria-label={isLoggedIn && favorites.length > 0 ? `View wishlist (${favorites.length} items)` : 'View wishlist'}
                  className="relative rounded-full p-3 text-gray-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600"
                >
                  <Heart className="w-6 h-6" />
                  {isLoggedIn && favorites.length > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-r from-gray-900 to-gray-700 text-xs font-bold text-white shadow-lg"
                    >
                      {favorites.length}
                    </motion.span>
                  )}
                </button>

                {/* Cart with Badge */}
                <button
                  onClick={() => navigate('/cart')}
                  aria-label={cart.length > 0 ? `View cart (${cart.length} items)` : 'View cart'}
                  className="group relative rounded-full p-3 text-gray-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-gray-900"
                >
                  <ShoppingBag className="w-6 h-6" />
                  {cart.length > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-r from-gray-900 to-gray-700 text-xs font-bold text-white shadow-lg"
                    >
                      {cart.length}
                    </motion.span>
                  )}
                </button>

                {/* User Menu */}
                {isLoggedIn ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      aria-haspopup="true"
                      aria-expanded={userMenuOpen}
                      aria-label="User menu"
                      className="flex items-center gap-2 rounded-full bg-slate-100 px-5 py-3 font-medium text-gray-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-200"
                    >
                      <User className="w-5 h-5" />
                      <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {userMenuOpen && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setUserMenuOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-0 z-50 mt-3 w-56 overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur-xl"
                          >
                            <Link
                              to="/account"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-6 py-4 transition hover:bg-slate-50"
                            >
                              <User className="w-5 h-5 text-gray-600" />
                              <span className="font-medium">My Profile</span>
                            </Link>
                            <Link
                              to="/account/orders"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-6 py-4 transition hover:bg-slate-50"
                            >
                              <Package className="w-5 h-5 text-gray-600" />
                              <span className="font-medium">Purchase History</span>
                            </Link>
                            <hr className="border-gray-100" />
                            <button
                              onClick={async () => {
                                try { await authEndpoints.logout() } catch (_) {}
                                logout()
                                setUserMenuOpen(false)
                                navigate('/')
                              }}
                              className="flex w-full items-center gap-3 px-6 py-4 font-medium text-red-600 transition hover:bg-red-50"
                            >
                              <LogIn className="w-5 h-5" />
                              Logout
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center gap-2 rounded-full bg-[#1A3C8A] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#112960] shadow-md shadow-blue-200"
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </Link>
                )}

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={mobileMenuOpen}
                  className="rounded-full p-3 transition duration-300 hover:-translate-y-0.5 hover:bg-slate-100 lg:hidden"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu - Full Luxury Experience */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="border-t border-white/70 bg-white/96 shadow-[0_25px_70px_-48px_rgba(15,23,42,0.45)] lg:hidden"
            >
              <div className="px-6 py-8 space-y-6">

                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute w-6 h-6 text-gray-400 -translate-y-1/2 left-5 top-1/2" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-3xl border border-slate-200/80 bg-white py-5 pl-14 pr-12 text-lg shadow-[0_12px_35px_-28px_rgba(15,23,42,0.35)] focus:outline-none focus:ring-4 focus:ring-slate-200"
                  />
                </form>

                {/* Mobile Links */}
                <div className="space-y-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-4 rounded-3xl px-6 py-4 text-lg font-medium transition hover:bg-slate-100"
                    >
                      <link.icon className="w-6 h-6 text-gray-600" />
                      {link.name}
                    </Link>
                  ))}

                  <Link
                    to="/track-order"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 rounded-3xl bg-linear-to-r from-emerald-600 to-emerald-700 px-6 py-4 font-semibold text-white shadow-lg"
                  >
                    <Package className="w-6 h-6" />
                    Track Your Order
                  </Link>

                  {isLoggedIn ? (
                    <button
                      onClick={async () => {
                        try { await authEndpoints.logout() } catch (_) {}
                        logout()
                        setMobileMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-4 rounded-3xl bg-red-50 px-6 py-4 font-medium text-red-600 transition hover:bg-red-100"
                    >
                      <LogIn className="w-6 h-6" />
                      Logout
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-4 rounded-3xl bg-[#1A3C8A] px-6 py-4 font-semibold text-white shadow-lg"
                    >
                      <LogIn className="w-6 h-6" />
                      Login / Sign Up
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  )
}
