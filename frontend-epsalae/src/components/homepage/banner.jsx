// src/components/Banner.jsx — Enhanced
import React, { useState, useEffect, useCallback } from 'react'
import { useBannerStore } from '../store/bannerstore'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { API_BASE_URL } from '@/config'
import { Skeleton } from '@/components/ui/Skeleton'

const INTERVAL = 5000

export default function Banner() {
  const { banners, loading, fetchActiveBanners } = useBannerStore()
  const [current, setCurrent] = useState(0)
  const [progressKey, setProgressKey] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => { fetchActiveBanners() }, [fetchActiveBanners])

  // Only hero-position banners belong in the carousel (promo/strip render
  // elsewhere); legacy banners without a position default to hero.
  const heroBanners = (banners || [])
    .filter((b) => !b.position || b.position === 'hero')
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
  const slides = heroBanners.length > 0
    ? heroBanners
        .filter(b => b.isActive)
        .map(b => ({
          imageUrl: b.imageUrl?.startsWith('http') ? b.imageUrl : `${API_BASE_URL}${b.imageUrl}`,
          title: b.title || 'Elevate Your Lifestyle',
          eyebrow: b.eyebrow || 'New Arrivals',
          subtitle: b.subtitle || 'Handpicked premium pieces curated for those who demand more.',
          badge: b.badge || null,         // { value: "40", unit: "percent", label: "off today" }
          ctaLabel: b.ctaLabel || 'Shop Collection',
          link: b.link || '/products',
        }))
    : []

  const goTo = useCallback((n) => {
    setCurrent((n + slides.length) % slides.length)
    setProgressKey(k => k + 1)
  }, [slides.length])

  useEffect(() => {
    if (slides.length < 2) return
    if (isPaused) return
    const t = setInterval(() => goTo(current + 1), INTERVAL)
    return () => clearInterval(t)
  }, [slides.length, current, goTo, isPaused])

  if (loading) return (
    <section className="py-4 md:py-6 lg:py-8">
      <div className="px-4 mx-auto max-w-7xl md:px-6 lg:px-8">
        <Skeleton className="w-full rounded-2xl md:rounded-3xl aspect-1920/600" />
      </div>
    </section>
  )

  if (!slides.length) return null

  return (
    <section className="py-4 bg-white md:py-6 lg:py-8">
      <div className="px-4 mx-auto max-w-7xl md:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-[#1a1209]"
          style={{
            aspectRatio: '1920/600',
            boxShadow: '0 32px 80px -20px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >

          {/* ── Slides ────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0"
            >
              {/* Image with subtle ken-burns */}
              <motion.img
                src={slides[current].imageUrl}
                alt={slides[current].title}
                className="absolute inset-0 object-cover w-full h-full"
                initial={{ scale: 1.04 }}
                animate={{ scale: 1 }}
                transition={{ duration: 6, ease: 'easeOut' }}
                onClick={() => {
                  const target = slides[current].linkUrl || slides[current].link
                  if (target) window.location.href = target
                }}
                style={{ cursor: slides[current].link ? 'pointer' : 'default' }}
              />

              {/* Gradient stack */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, rgba(10,6,2,0.88) 0%, rgba(10,6,2,0.55) 42%, rgba(10,6,2,0.1) 70%, transparent 100%)',
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 35%)' }}
              />

              {/* Film grain */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: 0.035,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  backgroundSize: '200px 200px',
                }}
              />

              {/* ── Text content ── */}
              <div className="absolute inset-0 flex flex-col justify-center px-[7%] pb-[4%] pointer-events-none select-none z-10">

                {/* Eyebrow */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2 mb-2"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#10B981]"
                    style={{ boxShadow: '0 0 8px rgba(16,185,129,0.8)' }}
                  />
                  <span className="text-[10px] sm:text-xs font-medium tracking-[0.16em] uppercase text-[#FF9A72]">
                    {slides[current].eyebrow}
                  </span>
                </motion.div>

                {/* Headline */}
                <motion.h2
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="text-xl sm:text-3xl md:text-5xl lg:text-[3.25rem] font-black leading-[1.05] text-white max-w-xl md:max-w-2xl tracking-tight"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    textShadow: '0 2px 20px rgba(0,0,0,0.4)',
                  }}
                >
                  {slides[current].title}
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.34, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-[85%] sm:max-w-sm mt-2 text-xs sm:text-sm font-light leading-relaxed md:text-base text-white/60 md:max-w-md"
                >
                  {slides[current].subtitle}
                </motion.p>

                {/* CTA row */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.46, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mt-4 pointer-events-auto sm:mt-5"
                >
                  <button
                    onClick={() => (window.location.href = slides[current].link)}
                    className="inline-flex items-center gap-2 px-5 py-2 sm:px-7 sm:py-3 text-xs sm:text-sm font-medium text-white bg-[#10B981] hover:bg-[#059669] rounded-full transition-all duration-250 hover:-translate-y-0.5"
                    style={{ boxShadow: '0 8px 24px rgba(16,185,129,0.45)' }}
                  >
                    {slides[current].ctaLabel}
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={() => (window.location.href = '/products')}
                    className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2.5 text-xs font-normal text-white/80 border border-white/20 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/18 hover:text-white hover:-translate-y-0.5 transition-all duration-250"
                  >
                    View All
                  </button>
                </motion.div>
              </div>

              {/* ── Decorative badge (top-right) ── */}
              {slides[current].badge && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-[4%] sm:right-[6%] top-[22%] sm:top-1/2 sm:-translate-y-1/2 z-10 flex flex-col items-center justify-center w-12 h-12 sm:w-[72px] sm:h-[72px] rounded-full border border-white/25 bg-white/8 backdrop-blur-md"
                  style={{ transform: 'rotate(12deg)' }}
                >
                  <span className="text-sm sm:text-2xl font-black leading-none text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {slides[current].badge.value}
                  </span>
                  <span className="hidden sm:block text-[9px] tracking-widest uppercase text-white/55 font-medium">
                    {slides[current].badge.unit}
                  </span>
                  <span className="hidden sm:block text-[9px] tracking-wider uppercase text-[#FF9A72] font-medium mt-0.5">
                    {slides[current].badge.label}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Slide counter ────────────────────── */}
          <div className="absolute top-3.5 right-4 z-20 hidden sm:flex items-baseline gap-1 text-white/45 text-[11px] tracking-wide font-medium select-none">
            <span className="text-sm font-medium text-white">{String(current + 1).padStart(2, '0')}</span>
            <span>/</span>
            <span>{String(slides.length).padStart(2, '0')}</span>
          </div>

          {/* ── Navigation arrows ────────────────── */}
          {slides.length > 1 && (
            <>
              <button
                onClick={() => goTo(current - 1)}
                aria-label="Previous slide"
                className="absolute z-20 flex items-center justify-center transition-all duration-200 -translate-y-1/2 rounded-full shadow-lg left-3 md:left-5 top-1/2 w-9 h-9 md:w-11 md:h-11 bg-white/90 hover:bg-white hover:shadow-xl hover:scale-110"
              >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-[#1a1209]" />
              </button>
              <button
                onClick={() => goTo(current + 1)}
                aria-label="Next slide"
                className="absolute z-20 flex items-center justify-center transition-all duration-200 -translate-y-1/2 rounded-full shadow-lg right-3 md:right-5 top-1/2 w-9 h-9 md:w-11 md:h-11 bg-white/90 hover:bg-white hover:shadow-xl hover:scale-110"
              >
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-[#1a1209]" />
              </button>
            </>
          )}

          {/* ── Dot indicators ───────────────────── */}
          {slides.length > 1 && (
            <div className="absolute z-20 bottom-4 md:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === current ? 'true' : 'false'}
                  className={`h-[3px] rounded-full transition-all duration-500 ${
                    i === current
                      ? 'w-7 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                      : 'w-1.5 bg-white/35 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}

          {/* ── Progress bar ─────────────────────── */}
          {slides.length > 1 && (
            <div
              key={progressKey}
              className="absolute bottom-0 left-0 h-[2.5px] rounded-r-full z-20"
              style={{
                background: 'linear-gradient(90deg, #10B981, #FF9A72)',
                boxShadow: '0 0 8px rgba(16,185,129,0.6)',
                animation: `bannerProgress ${INTERVAL}ms linear forwards`,
              }}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes bannerProgress { from { width: 0 } to { width: 100% } }
      `}</style>
    </section>
  )
}