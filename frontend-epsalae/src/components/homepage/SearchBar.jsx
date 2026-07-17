// src/components/homepage/SearchBar.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, X, Clock, TrendingUp, Tag, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProductStore } from '../store/productstore'
import { useCategoryStore } from '../store/categorystore'
import { getImageUrl } from '@/config'

const TRENDING = ['Trekking Gear', 'Camping Tent', 'Backpack', 'Sleeping Bag', 'Jacket']
const MAX_RECENT = 6
const LS_KEY = 'epasaley-recent-searches'

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveRecent(query) {
  const prev = loadRecent().filter(q => q !== query)
  localStorage.setItem(LS_KEY, JSON.stringify([query, ...prev].slice(0, MAX_RECENT)))
}
function clearRecent() {
  localStorage.removeItem(LS_KEY)
}

const HIDDEN_PATHS = ['/cart', '/checkout', '/login', '/register', '/account', '/order-success', '/track-order', '/profile-setup']

export default function SearchBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { products } = useProductStore()
  const { categories } = useCategoryStore()

  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [open, setOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [recent, setRecent] = useState(loadRecent)

  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setCatOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sync query from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const s = params.get('search') || ''
    setQuery(s)
    const cat = params.get('category') || ''
    setSelectedCategory(cat)
  }, [location.search])

  // Hide on pages where search isn't needed
  if (HIDDEN_PATHS.some(p => location.pathname.startsWith(p))) return null

  const suggestions = query.trim()
    ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []

  const selectedCatLabel = selectedCategory
    ? categories.find(c => (c._id || c.id) === selectedCategory)?.name || 'Category'
    : 'All Categories'

  const doSearch = (q = query, cat = selectedCategory) => {
    const trimmed = q.trim()
    if (!trimmed) {
      navigate(cat ? `/products?category=${cat}` : '/products')
      return
    }
    saveRecent(trimmed)
    setRecent(loadRecent())
    const params = new URLSearchParams()
    params.set('search', trimmed)
    if (cat) params.set('category', cat)
    navigate(`/products?${params.toString()}`)
    setOpen(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    doSearch()
  }

  const pickRecent = (q) => { setQuery(q); doSearch(q) }
  const pickTrending = (q) => { setQuery(q); doSearch(q) }
  const pickSuggestion = (p) => {
    navigate(`/product/${p.id || p._id}`)
    setOpen(false)
  }
  const pickCategory = (id) => {
    setSelectedCategory(id)
    setCatOpen(false)
    doSearch(query, id)
  }
  const removeRecent = (q, e) => {
    e.stopPropagation()
    const next = loadRecent().filter(r => r !== q)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    setRecent(next)
  }
  const handleClearRecent = (e) => {
    e.stopPropagation()
    clearRecent()
    setRecent([])
  }

  const showDropdown = open && (query.trim() ? suggestions.length > 0 : recent.length > 0 || true)

  return (
    <div className="sticky top-28 sm:top-28 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-xl shadow-[0_4px_24px_-8px_rgba(15,23,42,0.1)]">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6" ref={wrapRef}>
        <form onSubmit={handleSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-2">

          {/* Category selector */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => { setCatOpen(v => !v); setOpen(false) }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 whitespace-nowrap"
            >
              <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="max-w-20 sm:max-w-[120px] truncate">{selectedCatLabel}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {catOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-0 top-full z-50 mt-2 max-h-64 w-52 overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.3)]"
                >
                  <button
                    type="button"
                    onClick={() => pickCategory('')}
                    className={`flex w-full items-center px-4 py-2.5 text-sm transition hover:bg-slate-50 ${!selectedCategory ? 'font-semibold text-[#1E293B]' : 'text-slate-700'}`}
                  >
                    All Categories
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat._id || cat.id}
                      type="button"
                      onClick={() => pickCategory(cat._id || cat.id)}
                      className={`flex w-full items-center px-4 py-2.5 text-sm transition hover:bg-slate-50 ${selectedCategory === (cat._id || cat.id) ? 'font-semibold text-[#1E293B]' : 'text-slate-700'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="hidden xs:block h-7 w-px bg-slate-200 shrink-0" />

          {/* Search input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder={selectedCategory ? `Search in ${selectedCatLabel}…` : 'Search products, brands, categories…'}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 outline-none transition focus:border-[#1E293B] focus:bg-white focus:ring-4 focus:ring-[#1E293B]/10 placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search button */}
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Search
          </button>
        </form>

        {/* ── Dropdown ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute left-0 right-0 z-50 mx-4 mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] sm:mx-6"
            >
              {query.trim() ? (
                /* ── Suggestions ── */
                suggestions.length > 0 ? (
                  <div className="py-2">
                    <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Products</p>
                    {suggestions.map(p => (
                      <button
                        key={p._id || p.id}
                        type="button"
                        onClick={() => pickSuggestion(p)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50"
                      >
                        <img
                          src={getImageUrl(p.imageUrl, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E')}
                          alt={p.name}
                          onError={e => { e.target.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E' }}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-500">Rs. {Number(p.price || 0).toLocaleString()}</p>
                        </div>
                      </button>
                    ))}
                    <div className="border-t border-slate-100 px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => doSearch()}
                        className="flex w-full items-center gap-2 text-sm font-medium text-[#1E293B] hover:underline"
                      >
                        <Search className="h-3.5 w-3.5" />
                        See all results for "{query}"
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    No products found for "<span className="font-medium text-slate-600">{query}</span>"
                  </div>
                )
              ) : (
                /* ── Recent + Trending ── */
                <div className="py-3">
                  {recent.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between px-4 pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent</p>
                        <button type="button" onClick={handleClearRecent} className="text-[10px] text-slate-400 hover:text-red-500">Clear all</button>
                      </div>
                      {recent.map(q => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => pickRecent(q)}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                          <span className="flex-1">{q}</span>
                          <X
                            className="h-3.5 w-3.5 shrink-0 text-slate-300 hover:text-slate-600"
                            onClick={(e) => removeRecent(q, e)}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={recent.length > 0 ? 'border-t border-slate-100 pt-2' : ''}>
                    <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Trending</p>
                    <div className="flex flex-wrap gap-2 px-4 py-2">
                      {TRENDING.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => pickTrending(t)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-[#1E293B] hover:bg-[#1E293B]/5 hover:text-[#1E293B]"
                        >
                          <TrendingUp className="h-3 w-3" /> {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
