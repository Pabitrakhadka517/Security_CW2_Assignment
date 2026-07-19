// src/pages/SalePage.jsx
import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, ArrowLeft, Loader2, SlidersHorizontal, Search, Tag, ArrowUpDown } from 'lucide-react'
import api from '@/components/api/base'
import { useCart } from '@/store/cartstore'
import { getImageUrl } from '@/config'
import toast from 'react-hot-toast'
import { ErrorState } from '@/components/ui/States'

const SORT_OPTS = [
  { value: 'discount_desc', label: 'Highest Discount' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name A–Z' },
]

export default function SalePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('discount_desc')
  const [minDiscount, setMinDiscount] = useState(0)

  const load = () => {
    setLoading(true)
    setLoadError(false)
    api.get(`/sale-categories/slug/${slug}`)
      .then(res => setSale(res.data?.data || null))
      .catch(err => {
        setSale(null)
        // A 404 genuinely means no such sale; anything else (network/5xx) is
        // a real failure and shouldn't be shown as "sale not found".
        if (err.response?.status !== 404) setLoadError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const products = useMemo(() => {
    if (!sale?.products) return []
    let list = sale.products.filter(p => p && p.name)
    if (search.trim()) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    if (minDiscount > 0) list = list.filter(p => (p.discount_percentage || 0) >= minDiscount)
    list = [...list].sort((a, b) => {
      if (sort === 'discount_desc') return (b.discount_percentage || 0) - (a.discount_percentage || 0)
      if (sort === 'price_asc') return (a.sale_price || a.price) - (b.sale_price || b.price)
      if (sort === 'price_desc') return (b.sale_price || b.price) - (a.sale_price || a.price)
      if (sort === 'name_asc') return a.name.localeCompare(b.name)
      return 0
    })
    return list
  }, [sale, search, sort, minDiscount])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#047857]" />
    </div>
  )
  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center">
      <ErrorState
        title="Couldn't load this sale"
        description="Something went wrong. Check your connection and try again."
        onRetry={load}
      />
    </div>
  )
  if (!sale) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
      <Tag className="w-12 h-12 opacity-30" />
      <p className="text-lg font-medium">Sale not found</p>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-[#047857] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Go back
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero banner */}
      <div className={`relative overflow-hidden ${sale.banner ? '' : 'bg-gradient-to-r from-[#0A1E46] via-[#1E293B] to-[#047857]'}`}
        style={sale.banner ? { background: `url(${sale.banner}) center/cover no-repeat` } : {}}>
        <div className={`px-4 py-14 sm:py-20 ${sale.banner ? 'bg-black/55' : ''}`}>
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
              <Tag className="w-4 h-4 text-emerald-300" />
              <span className="text-white/90 text-xs font-bold uppercase tracking-widest">Special Sale</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">{sale.title}</h1>
            {sale.description && <p className="text-white/75 text-base max-w-xl mx-auto">{sale.description}</p>}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-white/70">
              <span>{products.length} Products</span>
              {sale.end_date && <span>Ends {new Date(sale.end_date).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Non-live notice — the backend already returns REGULAR prices for
            upcoming/ended sales, so the cards below are always truthful. */}
        {sale.is_live === false && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Tag className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {sale.status === 'upcoming'
                  ? `This sale hasn't started yet${sale.start_date ? ` — starts ${new Date(sale.start_date).toLocaleDateString()}` : ''}.`
                  : 'This sale has ended.'}
              </p>
              <p className="text-amber-700/80">You're browsing the collection at regular prices. Discounts apply automatically while the sale is live.</p>
            </div>
          </div>
        )}

        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:border-[#047857] transition" />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <select value={minDiscount} onChange={e => setMinDiscount(Number(e.target.value))}
              className="border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#047857]">
              <option value={0}>All Discounts</option>
              <option value={10}>10%+</option>
              <option value={20}>20%+</option>
              <option value={30}>30%+</option>
              <option value={50}>50%+</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#047857]">
              {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <span className="text-sm text-gray-400 ml-auto">{products.length} results</span>
        </div>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            {sale.configured_products === 0 ? (
              <>
                <p className="font-semibold text-gray-500">No products have been added to this sale yet.</p>
                <p className="text-sm mt-1">The store team is stocking it up — check back soon.</p>
              </>
            ) : sale.products?.length === 0 ? (
              <>
                <p className="font-semibold text-gray-500">The products in this sale are currently unavailable.</p>
                <p className="text-sm mt-1">{sale.configured_products} item{sale.configured_products !== 1 ? 's are' : ' is'} attached but out of the catalogue right now.</p>
              </>
            ) : (
              <p>No products match your filters.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((p, i) => {
              const price = Number(p.sale_price ?? p.price) || 0
              const original = Number(p.original_price ?? p.price) || 0
              return (
                <motion.div key={p.id || i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => navigate(`/product/${p.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer group hover:shadow-md hover:-translate-y-1 transition-all">
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    <img src={getImageUrl(p.imageUrl)} alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { e.target.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                    {p.discount_percentage > 0 && (
                      <div className="absolute top-2 left-2 bg-[#047857] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        -{p.discount_percentage}%
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{p.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{price > 0 ? `Rs. ${price.toLocaleString()}` : <span className="text-gray-400 text-sm">Price unavailable</span>}</p>
                        {p.discount_percentage > 0 && original > 0 && <p className="text-xs text-gray-600 line-through">Rs. {original.toLocaleString()}</p>}
                      </div>
                      <button onClick={e => {
                        e.stopPropagation()
                        if (!addToCart({ id: p.id, name: p.name, price, image: p.imageUrl, quantity: 1 })) return
                        toast.success('Added to cart!')
                      }} className="p-2 bg-[#047857] hover:bg-emerald-500 text-white rounded-xl transition shadow-sm shadow-emerald-200">
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
