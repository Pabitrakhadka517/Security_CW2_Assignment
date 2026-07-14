// src/components/TopCategories.jsx → Clean Equal Grid
import { useEffect, useState } from 'react'
import { useCategoryStore } from '../store/categorystore'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getImageUrl } from '@/config'
import { ArrowRight, Sparkles } from 'lucide-react'
import { CategoryGridSkeleton } from '@/components/ui/Skeleton'

// Placeholder for failed images
const CATEGORY_PLACEHOLDER = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
const PREMIUM_EASE = [0.16, 1, 0.3, 1]

const cardContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
}

const revealVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: PREMIUM_EASE,
    },
  },
}

export default function TopCategories() {
  const { categories, loading, fetchActiveCategories: fetchCategories } = useCategoryStore()
  const navigate = useNavigate()

  useEffect(() => { fetchCategories() }, [fetchCategories])

  // Only show categories from backend - limit to 8
  const cats = categories.length > 0 ? categories.slice(0, 8) : []

  if (loading) return (
    <section className="relative py-8 sm:py-14 lg:py-20">
      <div className="relative px-4 mx-auto max-w-7xl sm:px-6">
        <div className="mb-6 text-center sm:mb-10">
          <div className="h-7 w-40 mx-auto bg-gray-100 rounded-full animate-pulse" />
          <div className="h-9 w-64 mx-auto mt-4 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <CategoryGridSkeleton count={8} />
      </div>
    </section>
  )

  // Don't show section if no categories from backend
  if (cats.length === 0) return null

  return (
    <section className="relative py-8 overflow-hidden sm:py-14 lg:py-20">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-0 top-0 h-56 w-56 rounded-full bg-[#1A3C8A]/6 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#FF6B35]/6 blur-3xl" />
        <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full left-1/2 top-1/2 h-80 w-80 bg-slate-200/40 blur-3xl" />
      </div>

      <div className="relative px-4 mx-auto max-w-7xl sm:px-6">
        {/* Section Header */}
        <div className="mb-6 text-center sm:mb-10">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: PREMIUM_EASE }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-sm font-semibold text-[#1A3C8A] premium-pill shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)]"
          >
            <Sparkles className="w-4 h-4" />
            Browse by Category
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.78, ease: PREMIUM_EASE }}
            className="text-xl sm:text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl"
          >
            Shop Our Collections
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.72, delay: 0.06, ease: PREMIUM_EASE }}
            className="max-w-2xl mx-auto mt-4 text-sm leading-7 text-slate-500 sm:text-base"
          >
            Curated categories with a cleaner, more premium presentation so shoppers can move from discovery to product pages with less friction.
          </motion.p>
        </div>

        {/* Equal Grid - 2 cols mobile, 3 cols tablet, 4 cols desktop */}
        <motion.div
          variants={cardContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
        >
          {cats.map((cat, i) => (
            <CategoryCard key={cat._id || cat.id || i} cat={cat} index={i} navigate={navigate} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// Equal size category card
function CategoryCard({ cat, index, navigate }) {
  const [imgSrc, setImgSrc] = useState(getImageUrl(cat.imageUrl) || CATEGORY_PLACEHOLDER);
  const catId = cat._id || cat.id;

  return (
    <motion.div
      variants={revealVariants}
      whileHover={{ y: -10, scale: 1.015 }}
      onClick={() => navigate(`/products?category=${catId}`)}
      className="premium-card relative cursor-pointer overflow-hidden transition-all duration-300 group hover:border-white/80 hover:shadow-[0_28px_80px_-44px_rgba(15,23,42,0.38)]"
    >
      {/* Image Container - Fixed aspect ratio */}
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,1)_100%)] p-6 sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(26,60,138,0.08),transparent_45%),radial-gradient(circle_at_bottom,rgba(255,107,53,0.08),transparent_45%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute h-px inset-x-6 top-6 bg-linear-to-r from-transparent via-slate-200 to-transparent opacity-70" />
        <img
          src={imgSrc}
          alt={cat.name}
          className="relative z-10 object-contain w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:rotate-1"
          onError={() => setImgSrc(CATEGORY_PLACEHOLDER)}
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 transition-opacity duration-300 opacity-0 bg-linear-to-t from-black/5 via-transparent to-transparent group-hover:opacity-100" />
      </div>

      {/* Content */}
      <div className="p-5 text-center border-t border-slate-100 bg-white/95 backdrop-blur-sm sm:p-6">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900 transition-colors line-clamp-1 group-hover:text-[#FF6B35]">
          {cat.name}
        </h3>
        <p className="mt-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide text-[#1A3C8A] transition-all duration-300 group-hover:text-[#FF6B35]">
          Explore Collection
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </p>
      </div>
    </motion.div>
  )
}
