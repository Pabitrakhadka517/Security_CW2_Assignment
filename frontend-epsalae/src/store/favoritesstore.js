import { create } from 'zustand'
import { profileEndpoints } from '@/components/api/userapi'
import toast from 'react-hot-toast'

export const useFavoritesStore = create((set, get) => ({
  favorites: [],    // array of product custom IDs (e.g. "prod_xxx")
  loading: false,
  initialized: false,

  // Load the user's favorite IDs from the backend.
  // Backend returns hydrated products; we just need their id field.
  load: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const res = await profileEndpoints.favorites.list()
      const raw = res.data?.data ?? res.data ?? []
      const arr = Array.isArray(raw) ? raw : []
      const ids = arr
        .map((x) => (typeof x === 'string' ? x : (x?.id || x?._id || null)))
        .filter(Boolean)
      set({ favorites: ids, initialized: true })
    } catch {
      set({ favorites: [], initialized: true })
    } finally {
      set({ loading: false })
    }
  },

  // Optimistically toggle a product in/out of favorites, then sync with API.
  toggleFavorite: async (productId, isLoggedIn) => {
    if (!productId) return
    if (!isLoggedIn) {
      toast.error('Please log in to save favourites')
      return
    }

    const current = get().favorites
    const wasFav = current.includes(productId)

    // Optimistic update
    set({ favorites: wasFav ? current.filter((id) => id !== productId) : [...current, productId] })

    try {
      if (wasFav) {
        await profileEndpoints.favorites.remove(productId)
        toast.success('Removed from wishlist')
      } else {
        await profileEndpoints.favorites.add(productId)
        toast.success('Added to wishlist')
      }
    } catch (e) {
      // Revert on failure
      set({ favorites: wasFav ? [...get().favorites, productId] : get().favorites.filter((id) => id !== productId) })
      toast.error(e?.response?.data?.message || 'Failed to update wishlist')
    }
  },

  // Remove a single ID without an API call (used after WishlistPage's own API call).
  removeId: (productId) =>
    set((state) => ({ favorites: state.favorites.filter((id) => id !== productId) })),

  reset: () => set({ favorites: [], initialized: false, loading: false }),
}))
