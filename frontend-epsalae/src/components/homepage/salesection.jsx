// src/components/homepage/salesection.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ShoppingCart, Tag, ChevronLeft, ChevronRight as ChevronRightIcon, Flame } from 'lucide-react'
import api from '@/components/api/base'
import { useCart } from '@/store/cartstore'
import { getImageUrl } from '@/config'
import SeasonalBadge from './SeasonalBadge'
import toast from 'react-hot-toast'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'

function CountdownTimer({ endDate }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    if (!endDate) return
    const tick = () => {
      const diff = new Date(endDate) - Date.now()
      if (diff <= 0) { setT({ d: 0, h: 0, m: 0, s: 0 }); return }
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endDate])
  if (!endDate) return null
  const Unit = ({ v, l }) => (
    <div className="text-center">
      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1 min-w-[36px] text-white font-bold text-lg leading-none">{String(v).padStart(2, '0')}</div>
      <div className="text-white/70 text-[10px] mt-0.5 uppercase tracking-wide">{l}</div>
    </div>
  )
  return (
    <div className="flex items-end gap-1.5">
      {t.d > 0 && <Unit v={t.d} l="d" />}
      <Unit v={t.h} l="hr" />
      <Unit v={t.m} l="min" />
      <Unit v={t.s} l="sec" />
    </div>
  )
}

function SaleProductCard({ product, sale }) {
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const price    = Number(product.sale_price ?? product.original_price ?? product.price) || 0
  const original = Number(product.original_price ?? product.price) || 0
  const discount = product.discount_percentage
  const stockLimit = product.stock_limit
  const isLowStock = stockLimit !== null && stockLimit !== undefined && stockLimit <= 10

  const handleAdd = (e) => {
    e.stopPropagation()
    if (!addToCart({ id: product.id, name: product.name, price, image: product.imageUrl, quantity: 1 })) return
    toast.success('Added to cart!')
  }

  return (
    <motion.div whileHover={{ y: -4 }} onClick={() => navigate(`/product/${product.id}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer group hover:shadow-md transition-shadow">
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img src={getImageUrl(product.imageUrl)} alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { e.target.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E' }} />

        {/* Discount badge — top left */}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-[#FF6B35] text-white text-xs font-bold px-2 py-1 rounded-full">
            -{discount}%
          </div>
        )}

        {/* Seasonal / custom badge — top right */}
        {(product.badge_label || sale?.season) && (
          <div className="absolute top-2 right-2">
            <SeasonalBadge
              season={sale?.season}
              label={product.badge_label || undefined}
              color={sale?.badge_color || undefined}
              size="sm"
            />
          </div>
        )}

        {/* Stock urgency — bottom overlay */}
        {isLowStock && (
          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent px-3 py-2">
            <div className="flex items-center gap-1 text-white text-[10px] font-bold">
              <Flame className="w-3 h-3 text-orange-400" />
              Only {stockLimit} left!
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{product.name}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            {price > 0
              ? <span className="text-base font-bold text-gray-900">Rs. {price.toLocaleString()}</span>
              : <span className="text-sm text-gray-400">—</span>}
            {discount > 0 && original > 0 && (
              <span className="ml-1.5 text-xs text-gray-400 line-through">Rs. {original.toLocaleString()}</span>
            )}
            {original > price && price > 0 && (
              <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">Save Rs. {(original - price).toLocaleString()}</p>
            )}
          </div>
          <button onClick={handleAdd}
            className="p-2 bg-[#FF6B35] hover:bg-orange-500 text-white rounded-xl transition shrink-0 shadow-sm shadow-orange-200">
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Horizontally scrollable strip showing active sale categories as clickable pills
function SaleCategoryStrip({ sales, activeSaleId, onSelect }) {
  const stripRef = useRef(null)
  const scrollBy = (dir) => {
    if (stripRef.current) stripRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  if (!sales || sales.length < 2) return null

  return (
    <div className="relative flex items-center gap-2 mb-8">
      <button onClick={() => scrollBy(-1)}
        className="shrink-0 p-1.5 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition z-10">
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div ref={stripRef} className="flex gap-2 overflow-x-auto scrollbar-none flex-1 py-1">
        {sales.map(sale => {
          const isActive = activeSaleId === (sale.id || sale.slug)
          return (
            <button key={sale.id || sale.slug} onClick={() => onSelect(sale.id || sale.slug)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-[#FF6B35] border-[#FF6B35] text-white shadow-md shadow-orange-200'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-[#FF6B35] hover:text-[#FF6B35]'
              }`}>
              {sale.badge_label ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                  style={{ background: isActive ? 'rgba(255,255,255,0.25)' : (sale.badge_color || '#FF6B35') }}>
                  {sale.badge_label}
                </span>
              ) : (
                <Tag className="w-3.5 h-3.5" />
              )}
              {sale.title}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {sale.products?.length || 0}
              </span>
            </button>
          )
        })}
      </div>

      <button onClick={() => scrollBy(1)}
        className="shrink-0 p-1.5 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition z-10">
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function SaleSection() {
  const navigate = useNavigate()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSaleId, setActiveSaleId] = useState(null)

  useEffect(() => {
    // /homepage returns EVERY active sale category (winter, summer, dashain …)
    // with its top products already hydrated (name, image, original_price,
    // sale_price, discount_percentage). The old /active endpoint returned raw
    // product_id references, so the cards had nothing to render.
    api.get('/sale-categories/homepage')
      .then(res => {
        const data = res.data?.data?.activeSaleCategories
        setSales(Array.isArray(data) ? data : [])
        // activeSaleId stays null → ALL active sales render as stacked
        // sections; clicking a chip in the strip focuses one (click again
        // to go back to all).
      })
      .catch(() => setSales([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <section className="py-6 sm:py-10 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <ProductGridSkeleton count={4} />
      </div>
    </section>
  )
  if (!sales.length) return null

  // If a sale is selected via strip, focus it; else show all
  const visibleSales = activeSaleId
    ? sales.filter(s => (s.id || s.slug) === activeSaleId)
    : sales

  return (
    <section className="py-8 sm:py-12 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section heading */}
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-[#FF6B35]"><Tag className="w-5 h-5" /></span>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Live Sales &amp; Offers</h2>
            <p className="text-xs text-gray-500">{sales.length} sale{sales.length !== 1 ? 's' : ''} running right now</p>
          </div>
        </div>

        {/* Active sale categories strip */}
        <SaleCategoryStrip
          sales={sales}
          activeSaleId={activeSaleId}
          onSelect={(id) => setActiveSaleId(prev => prev === id ? null : id)}
        />

        <div className="space-y-8">
          {visibleSales.map(sale => {
            const products = Array.isArray(sale.products) ? sale.products : []
            const preview = products.slice(0, 6)

            return (
              // One self-contained card per sale: banner + its products live INSIDE it
              <div key={sale.id || sale.slug} className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">

                {/* Banner header */}
                <div className={`relative ${sale.banner ? '' : 'bg-gradient-to-r from-[#0A1E46] via-[#1A3C8A] to-[#FF6B35]'}`}
                  style={sale.banner ? { background: `url(${sale.banner}) center/cover no-repeat` } : {}}>
                  <div className={`px-5 sm:px-7 py-6 sm:py-7 ${sale.banner ? 'bg-black/55' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 text-orange-300 text-[11px] font-bold uppercase tracking-widest">
                            <Tag className="w-3.5 h-3.5" /> Special Sale
                          </span>
                          {sale.season && (
                            <SeasonalBadge season={sale.season} label={sale.badge_label} color={sale.badge_color} size="lg" />
                          )}
                        </div>
                        <h3 className="text-lg sm:text-2xl font-extrabold text-white truncate">{sale.title}</h3>
                        {sale.description && <p className="text-white/70 text-sm mt-1 max-w-md line-clamp-2">{sale.description}</p>}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {sale.end_date && <CountdownTimer endDate={sale.end_date} />}
                        <button onClick={() => {
                            const url = sale.cta_url?.trim()
                            // External link → open it. Internal path must start with "/".
                            // Anything else (e.g. a bare slug) falls back to the sale page
                            // so the click always lands on the products INSIDE this sale.
                            if (url && /^https?:\/\//i.test(url)) { window.location.href = url; return }
                            if (url && url.startsWith('/')) { navigate(url); return }
                            navigate(`/sale/${sale.slug}`)
                          }}
                          className="flex items-center gap-2 bg-white text-gray-900 hover:bg-orange-50 font-semibold px-4 sm:px-5 py-2.5 rounded-xl text-sm transition whitespace-nowrap">
                          {sale.cta_label?.trim() || 'View All'} <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products — grouped INSIDE the sale card */}
                <div className="p-4 sm:p-6">
                  {preview.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                        {preview.map((prod, i) => (
                          <SaleProductCard key={prod.id || i} product={prod} sale={sale} />
                        ))}
                      </div>
                      {products.length > 6 && (
                        <div className="text-center mt-6">
                          <button onClick={() => navigate(`/sale/${sale.slug}`)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white font-semibold rounded-xl text-sm transition">
                            View all {products.length} products <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 mb-3"><Tag className="w-6 h-6" /></span>
                      <p className="text-sm font-medium text-gray-500">No products in this sale yet.</p>
                      <p className="text-xs text-gray-400 mt-0.5">Add them in Admin → Sale Products.</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
