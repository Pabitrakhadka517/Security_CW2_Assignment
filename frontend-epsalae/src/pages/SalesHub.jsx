// src/pages/SalesHub.jsx
// Dedicated /sales landing page — every live deal in one place:
// seasonal/sale-category sections (array)
// and promo banners. Linked from the navbar "Sales" entry.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Tag, PackageX } from 'lucide-react'
import api from '../components/api/base'
import SaleSection from '../components/homepage/salesection'
import { getImageUrl } from '@/config'

export default function SalesHub() {
  const [loading, setLoading] = useState(true)
  const [hasSales, setHasSales] = useState(false)
  const [promoBanners, setPromoBanners] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/sale-categories/active').catch(() => ({ data: { data: [] } })),
      api.get('/banners/active').catch(() => ({ data: { data: [] } })),
    ])
      .then(([sc, bn]) => {
        setHasSales(Array.isArray(sc.data?.data) && sc.data.data.length > 0)
        const banners = Array.isArray(bn.data?.data) ? bn.data.data : []
        setPromoBanners(
          banners
            .filter((b) => b.position === 'promo')
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        )
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen page-enter">
      {/* Page header */}
      <div className="bg-[linear-gradient(135deg,#0A1E46_0%,#1A3C8A_55%,#FF6B35_130%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-orange-200 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
            <Flame className="w-4 h-4" /> Live now
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Sales &amp; Offers</h1>
          <p className="mt-2 text-white/70 text-sm sm:text-base">
            Every seasonal sale and discount running right now — auto-updated, gone when the timer ends.
          </p>
        </div>
      </div>

      {/* Promo banners (position=promo) */}
      {promoBanners.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 grid gap-4 sm:grid-cols-2">
          {promoBanners.map((b) => (
            <a key={b.id} href={b.linkUrl || '#'}
              className="block rounded-2xl overflow-hidden group relative shadow-sm hover:shadow-md transition">
              <img src={getImageUrl(b.imageUrl)} alt={b.title}
                className="w-full h-40 sm:h-48 object-cover group-hover:scale-[1.02] transition-transform duration-500" />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end p-4">
                <div>
                  <p className="text-white font-bold">{b.title}</p>
                  {b.subtitle && <p className="text-white/70 text-xs">{b.subtitle}</p>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* All active seasonal / sale-category sections (array, self-fetching) */}
      <SaleSection />

      {/* Empty state */}
      {!loading && !hasSales && (
        <div className="max-w-md mx-auto text-center py-20 px-4">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
            <PackageX className="w-9 h-9 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">No sales running right now</h2>
          <p className="mt-1 text-sm text-gray-500">New deals appear here automatically the moment they go live. Check back soon!</p>
          <Link to="/products"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[#1A3C8A] text-white font-semibold rounded-xl hover:bg-[#112960] transition">
            <Tag className="w-4 h-4" /> Browse all products
          </Link>
        </div>
      )}
    </div>
  )
}
