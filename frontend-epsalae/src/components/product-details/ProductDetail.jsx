// src/components/product-details/ProductDetail.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Star, ShoppingCart, Heart, Truck, Shield,
  RotateCcw, ChevronRight, Minus, Plus, Check, Package, Zap,
  BadgeCheck, Clock, Sparkles, ArrowLeft, Share2, Tag
} from 'lucide-react'
import { useCart } from '@/store/cartstore'
import { useFavoritesStore } from '@/store/favoritesstore'
import { useUserAuth } from '@/components/store/authstore'
import { productApi } from '../api/productapi'
import { useCategoryStore } from '../store/categorystore'
import { getImageUrl } from '@/config'
import { formatProductName } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E'
const EASE = [0.16, 1, 0.3, 1]

function SkeletonDetail() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white page-enter">
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="aspect-square skeleton rounded-3xl" />
          <div className="space-y-5 py-2">
            <div className="h-5 skeleton rounded-full w-1/4" />
            <div className="h-8 skeleton rounded-xl w-4/5" />
            <div className="h-5 skeleton rounded-full w-2/3" />
            <div className="h-10 skeleton rounded-xl w-1/3 mt-6" />
            <div className="h-14 skeleton rounded-2xl mt-4" />
            <div className="h-14 skeleton rounded-2xl" />
            <div className="flex gap-3 mt-4">
              {[1,2,3].map(i => <div key={i} className="h-10 skeleton rounded-full flex-1" />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { categories, fetchCategories } = useCategoryStore()
  const { isUser } = useUserAuth()
  const { favorites, toggleFavorite, load, initialized } = useFavoritesStore()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mainImage, setMainImage] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    if (isUser && !initialized) load()
  }, [isUser, initialized, load])

  useEffect(() => {
    fetchCategories()
    // Batch initial state resets to avoid cascading render warnings
    Promise.resolve().then(() => { setLoading(true); setError(null); })
    productApi.getById(id)
      .then(res => {
        const data = res.data?.data || res.data
        setProduct(data)
        setMainImage(getImageUrl(data.imageUrl) || PLACEHOLDER)
      })
      .catch(err => {
        console.error('Error fetching product:', err)
        setError('Product not found or unavailable.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const getCategoryName = () => {
    if (!product) return 'General'
    if (product.category?.name) return product.category.name
    const catId = product.category_id || product.categoryId || product.category?._id || product.category?.id || product.category
    if (!catId) return 'General'
    const found = categories.find(c =>
      c._id === catId || c.id === catId ||
      String(c._id) === String(catId) || String(c.id) === String(catId)
    )
    return found?.name || 'General'
  }

  // Same id resolution as getCategoryName(), surfaced separately so the
  // breadcrumb can link to the category instead of just naming it.
  const categoryId = product?.category?._id || product?.category?.id || product?.category_id || product?.categoryId
    || (typeof product?.category === 'string' ? product.category : null)

  const handleAddToCart = async () => {
    if (!product || (product.stock || 0) === 0) {
      toast.error('This product is out of stock')
      return false
    }
    setAddingToCart(true)
    const added = addToCart({
      id: product._id || product.id,
      name: product.name,
      price: (product.hasOffer && product.discountPrice > 0) ? product.discountPrice : product.price,
      image: mainImage,
      quantity,
    })
    if (!added) { setAddingToCart(false); return false }
    setIsAdded(true)
    toast.success(`${quantity} item${quantity > 1 ? 's' : ''} added to cart!`, {
      style: { borderRadius: '14px', fontWeight: 600 },
      icon: '🛒',
    })
    setTimeout(() => { setIsAdded(false); setAddingToCart(false); }, 2200)
    return true
  }

  const handleBuyNow = async () => {
    const added = await handleAddToCart()
    if (added) navigate('/checkout')
  }

  const handleShare = async () => {
    try {
      await navigator.share({ title: product?.name, url: window.location.href })
    } catch {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied!')
    }
  }

  const discountPct = product?.discountPrice > 0
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0
  const isFav = favorites.includes(product?.id || product?._id)

  if (loading) return <SkeletonDetail />

  if (error || !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Package className="w-12 h-12 text-gray-300" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-500 mb-8 text-sm">{error || 'This item may be discontinued or unavailable.'}</p>
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#1A3C8A] text-white font-bold rounded-full text-sm hover:bg-[#163180] transition-all btn-press"
          >
            <ArrowLeft className="w-4 h-4" /> Browse Products
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 page-enter">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="px-4 py-3 mx-auto max-w-7xl sm:px-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 overflow-x-auto scrollbar-hide">
            <Link to="/" className="hover:text-[#1A3C8A] font-semibold whitespace-nowrap transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" aria-hidden="true" />
            <Link to="/products" className="hover:text-[#1A3C8A] font-semibold whitespace-nowrap transition-colors">Products</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" aria-hidden="true" />
            {categoryId && (
              <>
                <Link to={`/products?category=${categoryId}`} className="hover:text-[#1A3C8A] font-semibold whitespace-nowrap transition-colors">{getCategoryName()}</Link>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" aria-hidden="true" />
              </>
            )}
            <span aria-current="page" className="text-gray-800 font-bold truncate max-w-[180px]">{formatProductName(product.name)}</span>
          </nav>
        </div>
      </div>

      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
          {/* === IMAGE PANEL === */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            {/* Main image */}
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50 to-slate-100 shadow-xl aspect-square flex items-center justify-center p-6 group">
              <img
                src={mainImage}
                alt={product.name}
                className="object-contain w-full h-full transition-transform duration-700 group-hover:scale-105"
                onError={e => { e.target.src = PLACEHOLDER }}
              />

              {/* Discount badge */}
              {discountPct > 0 && (
                <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-extrabold px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 badge-flash">
                  <Tag className="w-4 h-4" /> {discountPct}% OFF
                </div>
              )}

              {/* Actions top-right */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleFavorite(product?.id || product?._id, isUser)}
                  className={`p-3 rounded-2xl shadow-md backdrop-blur-sm transition-all ${isFav ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                >
                  <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleShare}
                  className="p-3 rounded-2xl bg-white/90 shadow-md backdrop-blur-sm text-gray-400 hover:text-[#1A3C8A] transition-all"
                >
                  <Share2 className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Out of stock overlay */}
              {(product.stock || 0) === 0 && (
                <div className="absolute inset-0 bg-white/75 backdrop-blur-[3px] flex items-center justify-center">
                  <span className="bg-gray-800 text-white font-bold px-6 py-2.5 rounded-full text-sm shadow-lg">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Low stock alert */}
            {(product.stock || 0) > 0 && (product.stock || 0) <= 10 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm font-semibold text-amber-700"
              >
                <Clock className="w-4 h-4 shrink-0" />
                Only {product.stock} left — order before it's gone!
              </motion.div>
            )}
          </motion.div>

          {/* === INFO PANEL === */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
            className="flex flex-col gap-5"
          >
            {/* Category & status chips */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 text-[#1A3C8A] text-xs font-bold rounded-full">
                <Sparkles className="w-3.5 h-3.5" /> {getCategoryName()}
              </span>
              {(product.stock || 0) > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  In Stock ({product.stock} available)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-full">
                  Out of Stock
                </span>
              )}
              {discountPct > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold rounded-full">
                  <BadgeCheck className="w-3.5 h-3.5" /> Save {discountPct}%
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-gray-900 leading-snug">
              {formatProductName(product.name)}
            </h1>

            {/* Mock ratings */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1,2,3,4].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                <Star className="w-4 h-4 fill-gray-200 text-gray-200" />
              </div>
              <span className="text-sm text-gray-500 font-medium">(4.0 · 23 reviews)</span>
            </div>

            {/* Price block */}
            <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-black text-gray-900">
                  Rs. {(product.discountPrice > 0 ? product.discountPrice : product.price).toLocaleString()}
                </span>
                {product.discountPrice > 0 && (
                  <span className="text-lg text-gray-400 line-through font-medium">
                    Rs. {product.price.toLocaleString()}
                  </span>
                )}
              </div>
              {discountPct > 0 && (
                <p className="text-sm text-green-600 font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> You save Rs. {(product.price - product.discountPrice).toLocaleString()} ({discountPct}%)
                </p>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-gray-600 leading-relaxed border-l-4 border-[#1A3C8A]/20 pl-4">
                {product.description}
              </p>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-700">Quantity</span>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={(product.stock || 0) === 0}
                  className="qty-btn px-4 py-3 text-gray-600 hover:bg-[#1A3C8A] hover:text-white disabled:opacity-30 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-extrabold text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.stock || 99, q + 1))}
                  disabled={(product.stock || 0) === 0}
                  className="qty-btn px-4 py-3 text-gray-600 hover:bg-[#1A3C8A] hover:text-white disabled:opacity-30 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAddToCart}
                disabled={(product.stock || 0) === 0 || addingToCart}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-extrabold text-sm transition-all shadow-md ${
                  isAdded
                    ? 'bg-green-600 text-white shadow-green-200'
                    : 'bg-white border-2 border-[#1A3C8A] text-[#1A3C8A] hover:bg-[#1A3C8A] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <AnimatePresence mode="wait">
                  {isAdded ? (
                    <motion.span key="added" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                      <Check className="w-5 h-5" /> Added to Cart!
                    </motion.span>
                  ) : (
                    <motion.span key="add" className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" /> Add to Cart
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleBuyNow}
                disabled={(product.stock || 0) === 0}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#1A3C8A] to-[#FF6B35] text-white shadow-lg hover:shadow-xl hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" /> Buy Now
              </motion.button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
              {[
                { Icon: Truck,     text: 'Free Delivery',   sub: 'Orders > Rs.5,000', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { Icon: RotateCcw, text: 'Easy Returns',    sub: '7-day return',      color: 'text-amber-600',   bg: 'bg-amber-50'   },
                { Icon: Shield,    text: 'Secure Pay',      sub: '100% safe',         color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
              ].map(({ Icon: Ic, text, sub, color, bg }) => (
                <div key={text} className={`trust-badge ${bg} flex-col text-center rounded-xl py-3 px-2`}>
                  <Ic className={`w-5 h-5 ${color} mx-auto mb-1`} />
                  <p className={`text-xs font-bold ${color}`}>{text}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
