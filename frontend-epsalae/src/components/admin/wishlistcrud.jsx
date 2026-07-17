// src/components/admin/wishlistcrud.jsx
import { useEffect, useState, useCallback } from 'react'
import { Heart, Search, ChevronDown, ChevronUp, User, ShoppingBag } from 'lucide-react'
import api from '../api/base'
import { getImageUrl } from '@/config'
import FetchState from '../ui/FetchState'
import { TableSkeleton } from '../ui/Skeleton'

export default function WishlistCrud() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})

  const loadWishlists = useCallback(async () => {
    setLoading(true)
    setIsError(false)
    try {
      const res = await api.get('/user/admin/wishlists')
      setData(res.data?.data || res.data || [])
    } catch {
      setData([])
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadWishlists() }, [loadWishlists])

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  const filtered = data.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const totalItems = data.reduce((s, u) => s + (u.wishlist?.length || 0), 0)

  return (
    <div className="ds-page space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ds-page-title">Customer Wishlists</h1>
          <p className="ds-page-sub">
            {data.length} customers · {totalItems} total wishlist items
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="ds-input pl-9"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Customers with wishlists', value: data.length, icon: User, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total wishlist items', value: totalItems, icon: Heart, color: 'bg-rose-50 text-rose-600' },
          { label: 'Avg. items / customer', value: data.length ? (totalItems / data.length).toFixed(1) : 0, icon: ShoppingBag, color: 'bg-purple-50 text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="ds-card ds-card-pad">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-2xl font-bold text-(--ds-text)">{value}</p>
            <p className="mt-0.5 text-xs text-(--ds-text-muted)">{label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <FetchState
        isLoading={loading}
        isError={isError}
        isEmpty={!loading && !isError && filtered.length === 0}
        loading={<TableSkeleton rows={5} cols={4} />}
        errorTitle="Couldn't load wishlists"
        errorDescription="Something went wrong. Check your connection and try again."
        onRetry={loadWishlists}
        emptyIcon={Heart}
        emptyTitle="No wishlist items yet"
        emptyDescription={search ? 'No customers match your search.' : 'No customers have wishlists yet.'}
      >
        <div className="space-y-3">
          {filtered.map(u => {
            const uid = String(u.userId)
            const open = !!expanded[uid]
            return (
              <div key={uid} className="ds-card overflow-hidden">
                {/* User row */}
                <button
                  onClick={() => toggle(uid)}
                  aria-expanded={open}
                  aria-label={`${open ? 'Collapse' : 'Expand'} wishlist for ${u.name || u.email || 'customer'}`}
                  className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-gray-50"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-slate-700 to-slate-900 text-sm font-bold text-white">
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                      : (u.name?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-(--ds-text)">{u.name || '—'}</p>
                    <p className="truncate text-xs text-gray-500">{u.email}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                    <Heart className="h-3 w-3" /> {u.wishlist?.length || 0}
                  </span>
                  {open
                    ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
                    : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />}
                </button>

                {/* Expanded product cards */}
                {open && (
                  <div className="border-t border-gray-100 p-4">
                    {!u.wishlist?.length ? (
                      <p className="text-sm text-gray-400">No items.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {u.wishlist.map((p, idx) => {
                          const price = Number(p.hasOffer && p.discountPrice ? p.discountPrice : p.price) || 0
                          const pid = p._id || p.id || idx
                          return (
                            <div key={pid} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                              <img
                                src={getImageUrl(p.imageUrl, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E')}
                                alt={p.name}
                                onError={e => { e.target.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E' }}
                                className="h-14 w-14 shrink-0 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium text-gray-800">{p.name}</p>
                                <p className="mt-0.5 text-xs font-semibold text-gray-700">
                                  Rs.{price.toLocaleString()}
                                  {p.hasOffer && (
                                    <span className="ml-1.5 text-[10px] font-normal text-rose-500 line-through">
                                      Rs.{Number(p.price).toLocaleString()}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </FetchState>
    </div>
  )
}
