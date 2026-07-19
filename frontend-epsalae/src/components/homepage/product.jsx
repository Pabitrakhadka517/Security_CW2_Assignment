import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useProductStore } from "../store/productstore";
import { useCategoryStore } from "../store/categorystore";
import { ShoppingCart, Heart, Star, ArrowRight, Sparkles, X, Eye } from "lucide-react";
import { useCart } from "@/store/cartstore";
import { useFavoritesStore } from "@/store/favoritesstore";
import { useUserAuth } from "@/components/store/authstore";
import { getImageUrl } from "@/config";
import { formatProductName, getStockStatus } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E';

// Image component with error handling and loading state
function ProductImage({ src, alt, className, onClick }) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {isLoading && <div className="absolute inset-0 skeleton" />}
      <img
        src={imgSrc}
        alt={alt}
        onClick={onClick}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 img-zoom`}
        onLoad={() => setIsLoading(false)}
        onError={() => { setImgSrc(PLACEHOLDER); setIsLoading(false); }}
      />
    </div>
  );
}

// Quick View Modal
function QuickViewModal({ product, onClose, onAddToCart }) {
  if (!product) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="relative w-[95vw] max-w-2xl overflow-hidden bg-white shadow-2xl rounded-2xl z-10 flex flex-col md:flex-row"
        >
          <button
            onClick={onClose}
            className="absolute p-2 text-gray-500 transition bg-white rounded-full shadow-md right-4 top-4 hover:bg-gray-100 z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-full md:w-1/2 bg-linear-to-br from-gray-50 to-slate-100 flex items-center justify-center p-6 aspect-square md:aspect-auto">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="object-contain w-full max-h-72 transition-transform duration-500 hover:scale-105"
              onError={(e) => { e.target.src = PLACEHOLDER; }}
            />
          </div>

          <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#047857] bg-emerald-50 px-2.5 py-1 rounded-full">
                {product.category}
              </span>
              <h3 className="mt-3 text-xl font-bold text-gray-900 leading-tight">
                {formatProductName(product.name)}
              </h3>
              <div className="flex items-center gap-1 mt-2">
                {[1,2,3,4].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                <Star className="w-4 h-4 text-gray-200 fill-gray-200" />
                <span className="text-xs text-gray-400 ml-1.5 font-medium">(4.0)</span>
              </div>
              <div className="flex items-baseline gap-2.5 mt-5">
                {product.discountPrice && product.discountPrice < product.price ? (
                  <>
                    <span className="text-2xl font-black text-gray-900">Rs. {product.discountPrice.toLocaleString()}</span>
                    <span className="text-sm text-gray-600 line-through">Rs. {product.price.toLocaleString()}</span>
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                      {Math.round(((product.price - product.discountPrice) / product.price) * 100)}% OFF
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-black text-gray-900">Rs. {product.price.toLocaleString()}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4">
                {(() => {
                  const s = getStockStatus(product.stock);
                  const tone = s.tone === 'success' ? 'bg-green-50 text-green-700' : s.tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600';
                  const dot = s.tone === 'success' ? 'bg-green-500' : s.tone === 'warning' ? 'bg-amber-500' : 'bg-red-500';
                  return (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${tone}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                      {s.label}
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => { onAddToCart(product); onClose(); }}
                disabled={product.stock === 0}
                className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all btn-press ${
                  product.stock > 0
                    ? 'bg-linear-to-r from-[#1E293B] to-[#2d4ea8] text-white hover:shadow-lg hover:shadow-blue-500/25'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <Link
                to={`/product/${product.id}`}
                onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
              >
                View Full Details
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function ProductsGrid() {
  const navigate = useNavigate();
  const { products, loading, fetchProducts } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { addToCart } = useCart();
  const { isUser } = useUserAuth();
  const { favorites, toggleFavorite, load, initialized } = useFavoritesStore();
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (isUser && !initialized) load();
  }, [isUser, initialized, load]);

  useEffect(() => {
    fetchProducts({ limit: 48 });
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const getCategoryName = (product) => {
    if (product.category?.name) return product.category.name;
    const catId = product.category_id || product.categoryId || product.category?._id || product.category?.id || product.category;
    if (!catId) return 'General';
    const foundCat = categories.find(c =>
      c._id === catId || c.id === catId ||
      String(c._id) === String(catId) || String(c.id) === String(catId)
    );
    return foundCat?.name || 'General';
  };

  const PRODUCTS_LIMIT = 12;
  const totalProducts = products?.length || 0;
  const hasMoreProducts = totalProducts > PRODUCTS_LIMIT;

  const displayProducts = (products && products.length > 0)
    ? products.slice(0, PRODUCTS_LIMIT).map(product => ({
        id: product.id || product._id,
        name: product.name,
        imageUrl: getImageUrl(product.imageUrl, PLACEHOLDER),
        price: product.price || 0,
        discountPrice: product.discountPrice || 0,
        stock: product.stock || 0,
        isActive: product.isActive,
        category: getCategoryName(product),
      }))
    : [];

  const handleAddToCart = (product) => {
    if (product.stock > 0) {
      if (!addToCart({ id: product.id, name: product.name, price: product.discountPrice || product.price, image: product.imageUrl, quantity: 1 })) return;
      toast.success(`${formatProductName(product.name).slice(0, 28)}… added!`, {
        style: { borderRadius: '12px', fontWeight: 600 },
      });
    } else {
      toast.error('This product is out of stock');
    }
  };

  // Skeleton loading state
  if (loading) {
    return (
      <section className="py-8 sm:py-14 bg-linear-to-b from-white to-gray-50">
  <div className="px-3 mx-auto max-w-7xl sm:px-6">
          <div className="flex justify-between items-end mb-12">
            <div className="space-y-3">
              <div className="h-6 skeleton rounded-full w-40" />
              <div className="h-9 skeleton rounded-xl w-64" />
            </div>
            <div className="h-12 skeleton rounded-full w-40 hidden md:block" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </section>
    );
  }

  if (displayProducts.length === 0) return null;

  return (
    <section className="py-8 sm:py-14 bg-linear-to-b from-white to-gray-50">
      <div className="px-3 mx-auto max-w-7xl sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col items-start justify-between gap-4 mb-10 sm:mb-12 md:flex-row md:items-center">
          <div>
            <motion.span
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-3 text-xs font-bold text-[#047857] bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5" /> Curated Collection
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="text-3xl font-extrabold text-gray-900 md:text-4xl section-heading"
            >
              Featured Products
            </motion.h2>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 font-bold text-sm text-white bg-linear-to-r from-[#1E293B] to-[#047857] rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all btn-press"
          >
            View All {hasMoreProducts ? `${totalProducts}+ ` : ''}Products
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
          {displayProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.45, ease: 'easeOut' }}
              className="product-card overflow-hidden bg-white border border-gray-100 rounded-3xl group shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
            >
              {/* Image Area */}
              <div
                className="relative overflow-hidden cursor-pointer"
                style={{ aspectRatio: '1/1' }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="w-full h-full bg-linear-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="object-contain w-full h-full"
                  />
                </div>

                {/* Discount badge */}
                {product.discountPrice > 0 && product.discountPrice < product.price && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 text-[11px] font-extrabold text-white bg-linear-to-r from-red-500 to-rose-600 rounded-lg shadow-md badge-flash">
                    -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                  </div>
                )}

                {/* Wishlist button */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id, isUser); }}
                  aria-label={favorites.includes(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  className="absolute p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md top-3 right-3 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 hover:bg-red-50"
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                </button>

                {/* Quick view */}
                <div className="absolute bottom-3 inset-x-3 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                    className="quick-add-btn w-full py-2.5 bg-white/95 backdrop-blur-sm rounded-xl text-xs font-bold text-gray-800 flex items-center justify-center gap-1.5 shadow-lg hover:bg-white"
                  >
                    <Eye className="w-3.5 h-3.5" /> Quick View
                  </button>
                </div>

                {/* Out of stock overlay */}
                {product.stock === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[2px]">
                    <span className="px-4 py-1.5 text-xs font-bold text-white bg-gray-700 rounded-full">
                      Out of Stock
                    </span>
                  </div>
                )}

                {/* Low-stock urgency badge */}
                {getStockStatus(product.stock).state === 'low' && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 text-[11px] font-bold text-white bg-amber-500 rounded-lg shadow-md">
                    {getStockStatus(product.stock).short}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#047857] mb-1 truncate">
                  {product.category}
                </p>
                <h3
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="text-sm font-bold text-gray-900 line-clamp-1 cursor-pointer hover:text-[#1E293B] transition-colors mb-3"
                >
                  {formatProductName(product.name)}
                </h3>

                {/* Price */}
                <div className="flex items-baseline gap-1.5 mb-3">
                  {product.discountPrice > 0 && product.discountPrice < product.price ? (
                    <>
                      <span className="text-base font-extrabold text-gray-900">
                        Rs. {product.discountPrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-600 line-through">
                        Rs. {product.price.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-base font-extrabold text-gray-900">
                      Rs. {product.price.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Add to Cart */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                  disabled={product.stock === 0}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all btn-press ${
                    product.stock > 0
                      ? 'bg-[#1E293B] text-white hover:bg-[#0B1220] hover:shadow-md hover:shadow-blue-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View more CTA */}
        {hasMoreProducts && (
          <div className="flex justify-center mt-10">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-8 py-3.5 font-bold text-sm border-2 border-[#1E293B] text-[#1E293B] rounded-full hover:bg-[#1E293B] hover:text-white transition-all btn-press"
            >
              See All {totalProducts} Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </section>
  );
}
