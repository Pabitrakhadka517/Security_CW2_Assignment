import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react'
import { useProductStore } from '../store/productstore'
import { getImageUrl } from '@/config'
import { formatProductName } from '@/lib/utils'

const FALLBACK_SHOWCASE = [
	{
		id: 'fallback-1',
		name: 'New season essentials',
		price: 'Rs. 4,990',
		imageUrl: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600',
	},
	{
		id: 'fallback-2',
		name: 'Premium lifestyle picks',
		price: 'Rs. 2,490',
		imageUrl: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=600',
	},
	{
		id: 'fallback-3',
		name: 'Trending daily upgrades',
		price: 'Rs. 1,890',
		imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600',
	},
]

const TRUST_POINTS = [
	{ icon: ShieldCheck, label: 'Secure checkout' },
	{ icon: Truck, label: 'Fast delivery' },
	{ icon: BadgeCheck, label: 'Authentic products' },
]

export default function AdditionalContent() {
	const { products } = useProductStore()

	const showcase = (products?.length ? products.slice(0, 3) : FALLBACK_SHOWCASE).map((product, index) => ({
		id: product.id || product._id || `showcase-${index}`,
		name: product.name || product.title || 'Featured product',
		price: product.discountPrice || product.salePrice || product.price || product.displayPrice || FALLBACK_SHOWCASE[index]?.price,
		imageUrl: getImageUrl(product.imageUrl, FALLBACK_SHOWCASE[index]?.imageUrl),
	}))

	return (
		<section className="relative py-10 sm:py-16 lg:py-20">
			<div className="absolute inset-0 pointer-events-none overflow-hidden">
				<div className="absolute -left-24 top-12 h-56 w-56 rounded-full bg-[#1E293B]/8 blur-3xl" />
				<div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#047857]/8 blur-3xl" />
			</div>

			<div className="relative px-3 sm:px-6 lg:px-8 mx-auto max-w-7xl">
				<div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: '-80px' }}
						transition={{ duration: 0.6, ease: 'easeOut' }}
						className="relative overflow-hidden rounded-4xl border border-white/70 bg-[linear-gradient(135deg,rgba(17,24,39,0.96)_0%,rgba(30,41,59,0.96)_55%,rgba(16,185,129,0.92)_100%)] p-4 sm:p-8 lg:p-10 text-white shadow-[0_30px_90px_-50px_rgba(15,23,42,0.55)]"
					>
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
						<div className="relative">
							<div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 sm:px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/90 backdrop-blur-md">
								<Sparkles className="h-4 w-4 text-emerald-200" />
								Trending now
							</div>

							<h2 className="mt-6 max-w-xl text-2xl font-semibold leading-tight sm:text-3xl lg:text-5xl">
								A cleaner, more premium way to discover products that feel worth the click.
							</h2>

							<p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
								Subtle motion, stronger hierarchy, and a smoother shopping path create a more trustworthy premium storefront without changing how the site works.
							</p>

							<div className="mt-7 flex flex-wrap gap-3">
								{TRUST_POINTS.map(({ icon: Icon, label }) => (
									<div key={label} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 sm:px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md">
										<Icon className="h-4 w-4 text-emerald-200" />
										{label}
									</div>
								))}
							</div>

							<div className="mt-8 flex flex-wrap items-center gap-4">
								<Link
									to="/products"
									className="inline-flex items-center gap-2 rounded-full bg-white px-4 sm:px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
								>
									Explore trending products
									<ArrowRight className="h-4 w-4" />
								</Link>
								<div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 sm:px-4 py-3 text-sm text-white/80 backdrop-blur-md">
									<Star className="h-4 w-4 text-yellow-300" />
									Loved for premium presentation and easy shopping flow
								</div>
							</div>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: '-80px' }}
						transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
						className="premium-card overflow-hidden p-5 sm:p-6"
					>
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Featured picks</p>
								<h3 className="mt-2 text-xl font-semibold text-slate-900">Current customer favorites</h3>
							</div>
							<div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
								<span className="h-2 w-2 rounded-full bg-emerald-500" />
								Live
							</div>
						</div>

						<div className="mt-5 space-y-3">
							{showcase.map((product, index) => (
								<motion.div
									key={product.id}
									initial={{ opacity: 0, x: 16 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true, margin: '-40px' }}
									transition={{ delay: index * 0.08 }}
									className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-slate-50/90 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_40px_-28px_rgba(15,23,42,0.35)]"
								>
									<div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
										<img
											src={product.imageUrl}
											alt={product.name}
											className="h-full w-full object-contain p-2 transition-transform duration-500 hover:scale-105"
											onError={(event) => {
												event.currentTarget.src = FALLBACK_SHOWCASE[index].imageUrl
											}}
										/>
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold text-slate-900 line-clamp-1">
											{formatProductName(product.name)}
										</p>
										<p className="mt-1 text-xs text-slate-500">Premium presentation and smooth product discovery</p>
									</div>
									<div className="text-right">
										<p className="text-sm font-semibold text-[#047857]">{product.price}</p>
										<p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Trending</p>
									</div>
								</motion.div>
							))}
						</div>

						<div className="mt-5 rounded-3xl bg-[linear-gradient(135deg,#0f172a_0%,#1E293B_60%,#047857_100%)] p-5 text-white shadow-[0_20px_50px_-32px_rgba(15,23,42,0.45)]">
							<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
								<ShieldCheck className="h-4 w-4 text-emerald-200" />
								Trusted checkout experience
							</div>
							<p className="mt-3 text-sm leading-6 text-white/82">
								Elegant visuals, secure payments, and conversion-friendly product discovery that keeps the buying flow effortless.
							</p>
							<Link
								to="/track-order"
								className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-all duration-300 hover:-translate-y-0.5"
							>
								Track your order
								<ArrowRight className="h-4 w-4" />
							</Link>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	)
}
