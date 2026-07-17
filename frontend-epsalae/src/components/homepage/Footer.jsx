// src/components/Footer.jsx
import { Link } from "react-router-dom"
import { HelpCircle, Phone, Mail, ChevronRight, Package, Truck, Shield, CreditCard, Instagram, MapPin, Clock } from "lucide-react"
import { motion } from "framer-motion"
import toast from "react-hot-toast"
import { LogoMark } from "../ui/Logo"

// Pages that don't exist yet — let the click resolve to something rather
// than silently doing nothing and scrolling to top.
const comingSoon = (e) => {
  e.preventDefault()
  toast('This page is coming soon!')
}

// TikTok Icon Component
const TikTokIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
)

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-linear-to-b from-gray-50 to-white">

      {/* Main Footer */}
      <div className="bg-white">
        <div className="px-6 py-16 mx-auto max-w-7xl">

          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">

            {/* Brand Column */}
            <div className="lg:col-span-2">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3 mb-8 group">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-br from-[#1E293B] to-[#10B981]">
                  <LogoMark className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  epasal<span className="text-[#10B981]">ey</span>
                </span>
              </Link>

              <p className="max-w-md mb-10 text-lg leading-relaxed text-gray-600">
                Nepal’s most trusted online store. Fast delivery • Easy returns • 100% genuine products
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-6 mb-10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-xl">
                    <Truck className="w-7 h-7 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Free Delivery Over Rs.10,000</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
                    <Shield className="text-blue-600 w-7 h-7" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Secure Payment</span>
                </div>
              </div>

              {/* Social Icons - Enhanced */}
              <div className="flex gap-3">
                <a href="https://www.instagram.com/selection.clo?igsh=MW1oNGMwdWc0OHp4ag==" target="_blank" rel="noopener noreferrer" className="p-3 transition-all bg-gray-100 rounded-xl hover:bg-linear-to-tr hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#F77737] hover:text-white group">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://www.tiktok.com/@selection.clo?_r=1&_t=ZS-921wQD0ntWS" target="_blank" rel="noopener noreferrer" className="p-3 transition-all bg-gray-100 rounded-xl hover:bg-black hover:text-white group">
                  <TikTokIcon className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Shop */}
            <div>
              <h4 className="mb-6 text-lg font-semibold text-gray-900">Shop</h4>
              <ul className="space-y-4">
                {["All Products", "New Arrivals", "Best Sellers"].map((item) => (
                  <li key={item}>
                    <Link to="/products" className="flex items-center gap-2 text-gray-600 transition hover:text-gray-900 group">
                      <ChevronRight className="w-4 h-4 text-gray-400 transition group-hover:text-gray-900" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Care */}
            <div>
              <h4 className="mb-6 text-lg font-semibold text-gray-900">Customer Care</h4>
              <ul className="space-y-4">
                <li>
                  <Link to="/track-order" className="flex items-center gap-2 text-gray-600 transition hover:text-gray-900 group">
                    <ChevronRight className="w-4 h-4 text-gray-400 transition group-hover:text-gray-900" />
                    Track Order
                  </Link>
                </li>
                {["Returns & Refund", "Shipping Info", "Size Guide", "FAQ"].map((item) => (
                  <li key={item}>
                    <a href="#" onClick={comingSoon} className="flex items-center gap-2 text-gray-600 transition hover:text-gray-900 group">
                      <ChevronRight className="w-4 h-4 text-gray-400 transition group-hover:text-gray-900" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-6 text-lg font-semibold text-gray-900">Company</h4>
              <ul className="space-y-4">
                {["About Us", "Careers", "Press", "Blog", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" onClick={comingSoon} className="flex items-center gap-2 text-gray-600 transition hover:text-gray-900 group">
                      <ChevronRight className="w-4 h-4 text-gray-400 transition group-hover:text-gray-900" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Enhanced */}
      <div className="bg-gray-900">
        <div className="px-6 py-8 mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#10B981]" />
              <p className="text-sm text-gray-400">
                © {currentYear} <span className="font-semibold text-white">Epasaley</span>. All rights reserved. Made with ❤️ in Nepal
              </p>
            </div>
            <div className="flex items-center gap-8 text-sm">
              <a href="#" onClick={comingSoon} className="text-gray-400 transition hover:text-white">Privacy Policy</a>
              <a href="#" onClick={comingSoon} className="text-gray-400 transition hover:text-white">Terms of Service</a>
              <a href="#" onClick={comingSoon} className="text-gray-400 transition hover:text-white">Cookie Policy</a>
              <Link to="/admin/login" className="text-gray-600 transition hover:text-gray-300 text-xs">Admin</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}