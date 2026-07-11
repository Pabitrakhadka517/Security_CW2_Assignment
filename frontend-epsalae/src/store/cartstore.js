import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'
import { useAdminAuth } from '@/components/store/authstore'

export const useCart = create(
  persist(
    (set, get) => ({
      cart: [],

      addToCart: (product) => {
        // Only customers may add to cart. Admin sessions are blocked here so the
        // rule holds no matter which button triggers it. Returns true on success,
        // false when blocked (callers gate their success toast on this).
        if (useAdminAuth.getState().isAdmin) {
          toast.error("Admins can't add items to the cart. Use a customer account to shop.")
          return false
        }
        set((state) => {
          const existing = state.cart.find(
            (item) => item.id === product.id && item.color === product.color && item.size === product.size
          )
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.id === product.id && item.color === product.color && item.size === product.size
                  ? { ...item, quantity: item.quantity + product.quantity }
                  : item
              ),
            }
          }
          return { cart: [...state.cart, product] }
        })
        return true
      },

      removeFromCart: (id) => {
        set((state) => ({ cart: state.cart.filter((item) => item.id !== id) }))
        
        // Red theme - Product removed
        toast.error('Removed from cart!', {
          duration: 2500,
          position: 'top-right',
          style: {
            background: '#EF4444',
            color: '#fff',
            fontWeight: '600',
            fontSize: '14px',
            padding: '14px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#EF4444',
          },
        })
      },

      updateQuantity: (id, quantity) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        })),

      clearCart: () => set({ cart: [] }),

      // Replace the cart wholesale (used when restoring the saved server cart).
      setCart: (items) => set({ cart: Array.isArray(items) ? items : [] }),

      // Merge server-saved items into the local cart (local quantities win
      // for items present in both; server-only items are appended).
      mergeServerCart: (serverItems) => {
        if (!Array.isArray(serverItems) || !serverItems.length) return
        set((state) => {
          const merged = [...state.cart]
          for (const it of serverItems) {
            if (!it || !it.id) continue
            const exists = merged.find((m) => m.id === it.id && m.color === it.color && m.size === it.size)
            if (!exists) merged.push(it)
          }
          return { cart: merged }
        })
      },

      getTotalPrice: () =>
        get().cart.reduce((sum, item) => sum + item.price * item.quantity, 0),

      getTotalItems: () =>
        get().cart.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: 'epasaley-cart-storage',
    }
  )
)
