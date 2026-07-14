// src/pages/Cart.jsx
import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, AlertCircle, CheckCircle, X, Tag, ShoppingCart, Truck, Shield, RotateCcw, ChevronRight } from 'lucide-react'
import { useCart } from '@/store/cartstore'
import { useProductStore } from '../components/store/productstore'
import { promocode } from '../components/api/promocode'
import { AnimatePresence, motion } from 'framer-motion'
import { getImageUrl } from '@/config'

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E'

export default function Cart() {
  const navigate = useNavigate()
  const { cart, removeFromCart, updateQuantity, getTotalPrice, addToCart } = useCart()
  const { products } = useProductStore()

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  // Undo-toast pattern for removal: the item disappears immediately, but the
  // last-removed item stays available to re-add for a few seconds instead of
  // gating the removal behind a confirmation dialog.
  const [removedItem, setRemovedItem] = useState(null)
  const undoTimerRef = useRef(null)

  // Cart items don't carry their own stock (only id/name/price/quantity/image
  // are stored — see cartstore.addToCart), so we cross-reference whatever
  // product data is currently cached in the product store. That cache may not
  // include every cart item (it reflects the last page/filter fetched, not
  // the full catalogue), so an unresolved item is simply left uncapped rather
  // than guessed at.
  const getItemStock = (item) => {
    const p = products.find(x => (x.id || x._id) === item.id)
    return typeof p?.stock === 'number' ? p.stock : null
  }

  const handleRemove = (item) => {
    removeFromCart(item.id, { silent: true })
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setRemovedItem(item)
    undoTimerRef.current = setTimeout(() => setRemovedItem(null), 5000)
  }

  const handleUndo = () => {
    if (!removedItem) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    addToCart(removedItem)
    setRemovedItem(null)
  }

  // Mirrors the server's pricing formula (utils/priceCalculator.ts):
  // VAT 13% on the discounted subtotal; shipping Rs. 150, free above Rs. 5,000.
  const VAT_RATE = 0.13
  const FREE_SHIPPING_ABOVE = 5000
  const SHIPPING_RATE = 150
  const subtotal = getTotalPrice()
  const discountedSubtotal = subtotal - discount
  const vatAmount = Math.round(discountedSubtotal * VAT_RATE)
  const shipping = discountedSubtotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_RATE
  const total = discountedSubtotal + vatAmount + shipping

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code')
      return
    }
    try {
      setCouponError('')
      setCouponSuccess('')
      setCouponLoading(true)
      const productIds = cart.map(i => i.id || i._id).filter(Boolean)
      const categoryIds = [...new Set(
        productIds.map(pid => {
          const p = products.find(x => (x.id || x._id) === pid)
          return p?.category_id || p?.categoryId || p?.category?._id || p?.category?.id || (typeof p?.category === 'string' ? p.category : null)
        }).filter(Boolean)
      )]
      const context = {
        cartTotal: subtotal,
        productIds,
        categoryIds,
      }
      const res = await promocode.validate(couponCode.trim(), context)
      const coupon = res.data?.data || res.data

      if (coupon && coupon.valid) {
        // Recompute discount using the same scope logic as the backend priceCalculator
        let discountAmt = Number(coupon.discountAmount) || 0
        if (coupon.apply_on === 'product' && coupon.applicable_products?.length) {
          const base = cart
            .filter(i => coupon.applicable_products.includes(String(i.id || i._id)))
            .reduce((s, i) => s + i.price * i.quantity, 0)
          if (coupon.discount_type === 'percentage') {
            discountAmt = Math.round(base * coupon.discount_value / 100)
            if (coupon.max_discount_cap) discountAmt = Math.min(discountAmt, coupon.max_discount_cap)
          } else {
            discountAmt = Math.min(coupon.discount_value, base)
          }
          discountAmt = Math.min(discountAmt, subtotal)
        }
        if (discountAmt <= 0) {
          setCouponError('This coupon is not applicable to any items in your cart')
          return
        }
        setAppliedCoupon(coupon)
        setDiscount(discountAmt)
        setCouponSuccess(`Coupon applied! You save Rs. ${discountAmt.toLocaleString()}`)
        setCouponCode('')
      } else {
        setCouponError('Invalid or expired coupon code')
      }
    } catch (err) {
      setCouponError(err?.response?.data?.message || 'Coupon not found or expired')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setDiscount(0)
    setCouponSuccess('')
    setCouponError('')
  }

  // Rendered from both the empty-cart and populated-cart branches below —
  // removing the last item flips `cart` to empty and swaps in the
  // "Your cart is empty" view, which would otherwise unmount this toast
  // before the user ever sees the option to undo.
  const undoToast = (
    <AnimatePresence>
      {removedItem && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-xl bg-gray-900 px-5 py-3 text-sm text-white shadow-lg"
        >
          <span>"{removedItem.name}" removed</span>
          <button
            onClick={handleUndo}
            className="font-semibold text-[#FF9A72] transition-colors hover:text-white"
          >
            Undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (cart.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-6 page-enter">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <ShoppingBag className="w-12 h-12 text-gray-300" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added anything yet.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 py-4 font-bold text-white bg-gradient-to-r from-[#1A3C8A] to-[#FF6B35] rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all btn-press"
          >
            <ShoppingCart className="w-5 h-5" /> Start Shopping
          </Link>
        </motion.div>
        {undoToast}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 page-enter">
      <div className="px-4 py-6 sm:py-10 mx-auto max-w-7xl sm:px-6">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Shopping Cart</h1>
              <p className="text-sm text-gray-500 mt-1">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
            </div>
            <Link to="/products" className="text-sm font-semibold text-[#1A3C8A] hover:underline hidden sm:block">
              + Add more items
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">

          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cart.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="cart-item-enter bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-100 transition-all overflow-hidden"
                >
                  <div className="flex gap-4 p-4 sm:p-5">
                    {/* Image */}
                    <div
                      className="shrink-0 w-20 h-20 sm:w-28 sm:h-28 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl cursor-pointer flex items-center justify-center p-2"
                      onClick={() => navigate(`/product/${item.id}`)}
                    >
                      <img
                        src={getImageUrl(item.image, PLACEHOLDER)}
                        alt={item.name}
                        className="object-contain w-full h-full transition-transform duration-300 hover:scale-105"
                        onError={e => { e.target.src = PLACEHOLDER }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3
                        onClick={() => navigate(`/product/${item.id}`)}
                        className="text-sm sm:text-base font-bold text-gray-900 line-clamp-2 cursor-pointer hover:text-[#1A3C8A] transition-colors mb-1"
                      >
                        {item.name}
                      </h3>
                      {(item.color || item.size) && (
                        <p className="text-xs text-gray-400 mb-2">
                          {[item.color, item.size && `Size ${item.size}`].filter(Boolean).join(' · ')}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                        {/* Quantity stepper */}
                        <div>
                          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-sm">
                            <button
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="qty-btn px-3 py-2 text-gray-600 hover:bg-[#1A3C8A] hover:text-white transition-all"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-10 text-center text-sm font-extrabold text-gray-900">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label={`Increase quantity of ${item.name}`}
                              disabled={getItemStock(item) != null && item.quantity >= getItemStock(item)}
                              className="qty-btn px-3 py-2 text-gray-600 hover:bg-[#1A3C8A] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-600"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {getItemStock(item) != null && item.quantity >= getItemStock(item) && (
                            <p className="text-xs text-amber-600 mt-1">Max available: {getItemStock(item)}</p>
                          )}
                        </div>

                        {/* Price & delete */}
                        <div className="flex items-center gap-3">
                          <span className="text-base sm:text-lg font-extrabold text-gray-900">
                            Rs. {(item.price * item.quantity).toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleRemove(item)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Unit price */}
                      <p className="text-xs text-gray-400 mt-1.5">Rs. {item.price.toLocaleString()} each</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Continue shopping */}
            <Link
              to="/products"
              className="flex items-center gap-2 text-sm font-semibold text-[#1A3C8A] hover:underline py-2 sm:hidden"
            >
              + Add more items
            </Link>
          </div>

          {/* Order Summary */}
          <div className="cart-summary-sticky">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-extrabold text-gray-900">Order Summary</h2>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Coupon Section */}
                <div>
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={couponCode}
                          onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                          placeholder="Coupon code"
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none coupon-input transition-all"
                          onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                        />
                      </div>
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading}
                        className="px-4 py-2.5 bg-[#1A3C8A] text-white font-bold text-xs rounded-xl hover:bg-[#163180] transition-all btn-press disabled:opacity-50 shrink-0"
                      >
                        {couponLoading ? '…' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-sm font-bold text-green-800">{appliedCoupon.code}</p>
                          <p className="text-xs text-green-600">Save Rs. {Number(discount).toLocaleString()}</p>
                        </div>
                      </div>
                      <button onClick={removeCoupon} aria-label="Remove coupon" className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <AnimatePresence>
                    {couponError && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" /> {couponError}
                      </motion.p>
                    )}
                    {couponSuccess && !couponError && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-green-600">
                        <CheckCircle className="w-3.5 h-3.5" /> {couponSuccess}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Price breakdown */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal ({cart.length} items)</span>
                    <span className="font-semibold text-gray-900">Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm font-bold text-green-600">
                      <span>Coupon Discount</span>
                      <span>− Rs. {discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      Shipping
                      {shipping === 0 && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">FREE</span>}
                    </span>
                    <span className={`font-semibold ${shipping === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {shipping === 0 ? 'Free' : `Rs. ${shipping}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>VAT (13%)</span>
                    <span className="font-semibold text-gray-900">Rs. {vatAmount.toLocaleString()}</span>
                  </div>
                  {discountedSubtotal < FREE_SHIPPING_ABOVE && (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2">
                      <Truck className="w-3.5 h-3.5 shrink-0" />
                      Add Rs. {(FREE_SHIPPING_ABOVE - discountedSubtotal).toLocaleString()} more for free shipping
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-200">
                  <span className="font-extrabold text-gray-900">Total</span>
                  <span className="text-xl font-black text-gray-900 number-animate">
                    Rs. {Math.round(total).toLocaleString()}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
                    <p className="text-xs font-bold text-green-700">
                      🎉 You're saving Rs. {discount.toLocaleString()} on this order!
                    </p>
                  </div>
                )}

                {/* Checkout button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    sessionStorage.setItem('epasaley_discount', JSON.stringify({ discount, appliedCoupon }))
                    navigate('/checkout', { state: { discount, appliedCoupon } })
                  }}
                  className="w-full py-4 font-extrabold text-sm text-white bg-gradient-to-r from-[#1A3C8A] to-[#FF6B35] rounded-xl shadow-lg hover:shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  Proceed to Checkout
                  <ChevronRight className="w-4 h-4" />
                </motion.button>

                <Link
                  to="/products"
                  className="block w-full py-3 text-center text-sm font-bold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {undoToast}
    </div>
  )
}
