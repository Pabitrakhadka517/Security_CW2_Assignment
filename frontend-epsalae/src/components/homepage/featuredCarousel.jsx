import React, { useEffect } from 'react'
import { useProductStore } from '../store/productstore'
import { getImageUrl } from '@/config'
import { formatProductName } from '@/lib/utils'
import { ShoppingCart, ArrowRight, Flame } from 'lucide-react'
import { useCart } from '@/store/cartstore'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

function CardSkeleton() {
  return (
    <div className="w-44 sm:w-56 flex-shrink-0 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="aspect-square bg-gray-100 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-3.5 w-2/3 bg-gray-100 rounded animate-pulse" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function FeaturedCarousel() {
  const { products, loading, fetchProductsWithOffers } = useProductStore()
  const { addToCart } = useCart()
  const navigate = useNavigate()

  useEffect(() => { fetchProductsWithOffers({ limit: 12 }) }, [fetchProductsWithOffers])

  // Hide the whole section only when we've finished loading and truly have nothing.
  if (!loading && (!products || products.length === 0)) return null

  return (
    <section className="py-6 sm:py-10">
      <div className="px-3 sm:px-6 mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h3 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-orange-50 text-[#FF6B35]">
              <Flame className="w-4 h-4" />
            </span>
            Hot Deals
          </h3>
          <Link to="/products" className="text-sm text-[#1A3C8A] font-semibold flex items-center gap-1.5 hover:gap-2.5 transition-all">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto -mx-4 px-3 sm:px-4 scrollbar-none">
          <div className="flex gap-3 sm:gap-4 w-max py-2">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : products.slice(0, 12).map(p => {
                  const id = p._id || p.id
                  const hasOffer = p.discountPrice && p.discountPrice < p.price
                  const price = hasOffer ? p.discountPrice : p.price
                  const pct = hasOffer ? Math.round(((p.price - p.discountPrice) / p.price) * 100) : 0
                  return (
                    <article
                      key={id}
                      className="group w-44 sm:w-56 flex-shrink-0 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg hover:border-orange-100 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                    >
                      <div className="relative aspect-square p-3 flex items-center justify-center bg-gray-50">
                        {hasOffer && (
                          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-extrabold text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-md shadow">
                            -{pct}%
                          </span>
                        )}
                        <img
                          src={getImageUrl(p.imageUrl)}
                          alt={p.name}
                          loading="lazy"
                          className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600' }}
                        />
                      </div>
                      <div className="p-3">
                        <h4
                          onClick={() => navigate(`/product/${id}`)}
                          className="text-sm font-semibold text-gray-900 cursor-pointer line-clamp-2 group-hover:text-[#1A3C8A] transition-colors min-h-[2.5rem]"
                        >
                          {formatProductName(p.name)}
                        </h4>
                        <div className="flex items-center justify-between mt-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-900">Rs. {price?.toLocaleString()}</div>
                            {hasOffer && (
                              <div className="text-xs text-gray-400 line-through">Rs. {p.price?.toLocaleString()}</div>
                            )}
                          </div>
                          <button
                            aria-label="Add to cart"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!addToCart({ id, name: p.name, price: p.discountPrice || p.price, image: getImageUrl(p.imageUrl), quantity: 1 })) return
                              toast.success('Added to cart!')
                            }}
                            className="shrink-0 p-2 text-white bg-[#1A3C8A] rounded-full hover:bg-[#FF6B35] active:scale-90 transition-all"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
          </div>
        </div>
      </div>
    </section>
  )
}
