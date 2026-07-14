import { useEffect, useState } from 'react'
import { Heart, Loader2, Trash2, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { profileEndpoints } from '@/components/api/userapi'
import { productApi } from '@/components/api/productapi'
import { useCart } from '@/store/cartstore'
import { useFavoritesStore } from '@/store/favoritesstore'
import { getImageUrl } from '@/config'
import FetchState from '@/components/ui/FetchState'
import { Link } from 'react-router-dom'

/**
 * Wishlist page.
 *
 * Backend may return the user's saved favorites as an array of *hydrated*
 * products (when `GET /user/favorites` joins with Product) or as bare IDs.
 * We handle both: anything already shaped like a product is shown directly;
 * bare strings/IDs are fetched in parallel via productApi.getById.
 */
export default function WishlistPage(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState({}) // productId -> bool
  const { addToCart } = useCart()
  const removeId = useFavoritesStore((s) => s.removeId)

  const load = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await profileEndpoints.favorites.list()
      const raw = res.data?.data || res.data || []
      const arr = Array.isArray(raw) ? raw : []

      const hydrated = arr.filter((x) => x && typeof x === 'object' && (x.name || x.price))
      const bareIds = arr
        .map((x) => (typeof x === 'string' ? x : (x && !x.name ? (x.id || x._id || x.productId) : null)))
        .filter(Boolean)

      let fetched = []
      if (bareIds.length) {
        const results = await Promise.allSettled(bareIds.map((id) => productApi.getById(id)))
        fetched = results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value?.data?.data || r.value?.data)
          .filter(Boolean)
      }

      setItems([...hydrated, ...fetched])
    } catch (e) {
      setItems([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const remove = async (productId) => {
    if (!productId) return
    setBusy((b) => ({ ...b, [productId]: true }))
    try {
      await profileEndpoints.favorites.remove(productId)
      setItems((it) => it.filter((p) => (p.id || p._id) !== productId))
      removeId(productId)
      toast.success('Removed from wishlist')
    } catch (e) {
      toast.error('Failed to remove')
    } finally {
      setBusy((b) => ({ ...b, [productId]: false }))
    }
  }

  const moveToCart = (p) => {
    const added = addToCart({
      id: p.id || p._id,
      _id: p._id || p.id,
      name: p.name,
      price: Number(p.hasOffer && p.discountPrice ? p.discountPrice : p.price) || 0,
      image: p.imageUrl,
      quantity: 1,
    })
    if (!added) return
    toast.success(`${p.name} added to cart`)
  }

  return (
    <div className="rounded-card bg-white p-4 sm:p-8 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)]">
      <h3 className="text-2xl font-semibold text-slate-900">Wishlist</h3>
      <p className="mt-1 text-sm text-slate-500">Your saved products for later.</p>

      <div className="mt-6">
        <FetchState
          isLoading={loading}
          isError={loadError}
          isEmpty={!loading && !loadError && items.length === 0}
          loading={(
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[1,2].map((i)=>(<div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />))}
            </div>
          )}
          errorTitle="Couldn't load your wishlist"
          errorDescription="Something went wrong. Check your connection and try again."
          onRetry={load}
          emptyTitle="No favorites yet"
          emptyDescription="Save products you love and they'll show up here."
          emptyAction={(
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Browse products
            </Link>
          )}
        >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((p, idx) => {
            const pid = p.id || p._id || idx
            const price = Number(p.hasOffer && p.discountPrice ? p.discountPrice : p.price) || 0
            return (
              <div key={pid} className="flex gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm">
                <img src={getImageUrl(p.imageUrl)} alt={p.name} className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <Heart className="h-4 w-4 text-rose-500" /> <span className="truncate">{p.name}</span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{p.description || ''}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">Rs. {price.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => moveToCart(p)}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    <ShoppingCart className="h-3 w-3" /> Add
                  </button>
                  <button
                    onClick={() => remove(p.id || p._id)}
                    disabled={busy[p.id || p._id]}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {busy[p.id || p._id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        </FetchState>
      </div>
    </div>
  )
}
