// src/pages/Products.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid3x3, List, Filter, ShoppingCart, Heart,
  ChevronRight, Loader2, X, Star, Search, SlidersHorizontal,
  ArrowUpDown, PackageX, Check
} from 'lucide-react';
import { useProductStore } from '../components/store/productstore';
import { useCategoryStore } from '../components/store/categorystore';
import { useCart } from '../store/cartstore';
import { useFavoritesStore } from '../store/favoritesstore';
import { useUserAuth } from '../components/store/authstore';
import { getImageUrl as getImage } from '@/config';
import { formatProductName } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';
import FetchState from '@/components/ui/FetchState';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E';

function ProductImg({ src, alt, className }) {
  const [imgSrc, setImgSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full">
      {!loaded && <div className="absolute inset-0 skeleton" />}
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => { setImgSrc(PLACEHOLDER); setLoaded(true); }}
      />
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low → High' },
  { value: 'price-high', label: 'Price: High → Low' },
  { value: 'name', label: 'Name A–Z' },
];

function FilterPanel({ categories, selectedCategory, setSelectedCategory, priceRange, setPriceRange, getProductCountForCategory, onClose }) {
  return (
    <div className="space-y-8">
      {/* Categories */}
      <div>
        <h3 className="mb-4 text-xs font-extrabold uppercase tracking-widest text-gray-400">Categories</h3>
        <div className="space-y-1">
          <button
            onClick={() => { setSelectedCategory('all'); onClose?.(); }}
            className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#1A3C8A] text-white shadow-md shadow-blue-200'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span>All Products</span>
            {selectedCategory === 'all' && <Check className="w-4 h-4" />}
          </button>
          {categories.map(cat => {
            const catId = cat.id || cat._id;
            const count = getProductCountForCategory(catId);
            const active = selectedCategory === catId || String(selectedCategory) === String(catId);
            return (
              <button
                key={catId}
                onClick={() => { setSelectedCategory(catId); onClose?.(); }}
                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active ? 'bg-[#1A3C8A] text-white shadow-md shadow-blue-200' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{cat.name}</span>
                {count !== null && <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="mb-4 text-xs font-extrabold uppercase tracking-widest text-gray-400">Max Price</h3>
        <input
          type="range" min="0" max="100000" step="500"
          value={priceRange[1]}
          onChange={(e) => setPriceRange([0, Number(e.target.value)])}
          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#1A3C8A]"
        />
        <div className="flex justify-between mt-3 text-sm font-bold text-gray-700">
          <span>Rs. 0</span>
          <span className="text-[#1A3C8A]">Rs. {priceRange[1].toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, loading, error, fetchProducts, pagination } = useProductStore();
  const { categories, fetchActiveCategories } = useCategoryStore();
  const { addToCart } = useCart();
  const { isUser } = useUserAuth();
  const { favorites, toggleFavorite, load, initialized } = useFavoritesStore();

  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState('popular');
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [viewMode, setViewMode] = useState('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');
  // Debounce the term used for filtering/URL-sync so the (memoized) filter and
  // history updates only run after the user pauses typing — the input itself
  // stays fully responsive via `localSearch`.
  const debouncedSearch = useDebounce(localSearch, 300);
  const debouncedMaxPrice = useDebounce(priceRange[1], 400);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;

  useEffect(() => {
    fetchActiveCategories();
  }, []);

  // Server-side filtering/sorting/pagination — the old code fetched only the
  // first 20 products and filtered client-side, silently hiding the rest of
  // the catalogue.
  const buildFetchParams = () => {
    const params = { page, limit: PAGE_SIZE };
    if (selectedCategory !== 'all') params.categoryId = selectedCategory;
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (debouncedMaxPrice < 100000) params.maxPrice = debouncedMaxPrice;
    if (sortBy === 'price-low')  { params.sortBy = 'price'; params.order = 'asc'; }
    if (sortBy === 'price-high') { params.sortBy = 'price'; params.order = 'desc'; }
    if (sortBy === 'name')       { params.sortBy = 'name';  params.order = 'asc'; }
    if (sortBy === 'newest' || sortBy === 'popular') { params.sortBy = 'createdAt'; params.order = 'desc'; }
    return params;
  };

  useEffect(() => {
    fetchProducts(buildFetchParams());
  }, [page, selectedCategory, debouncedSearch, debouncedMaxPrice, sortBy, fetchProducts]);

  // Any filter change goes back to page 1.
  useEffect(() => { setPage(1); }, [selectedCategory, debouncedSearch, debouncedMaxPrice, sortBy]);

  useEffect(() => {
    if (isUser && !initialized) load();
  }, [isUser, initialized, load]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (debouncedSearch) params.set('search', debouncedSearch);
    setSearchParams(params, { replace: true });
  }, [selectedCategory, debouncedSearch]);

  // Products already carry their own subcategory/category name strings
  // (e.g. "T-Shirts" / "Men") — no need to resolve an id against the
  // categories list, which only holds top-level departments here.
  const getCategoryName = (product) => {
    if (typeof product.subcategory === 'string' && product.subcategory) return product.subcategory;
    if (typeof product.category === 'string' && product.category) return product.category;
    if (product.category?.name) return product.category.name;
    return 'General';
  };

  // Counts per category would need the full catalogue; with server-side
  // pagination we no longer have it, so the badge is hidden (returns null).
  const getProductCountForCategory = () => null;

  // Filtering/sorting now happens server-side; this is just the current page.
  const filteredProducts = useMemo(() => (Array.isArray(products) ? products : []), [products]);
  const totalProducts = pagination?.total ?? filteredProducts.length;
  const totalPages = pagination?.totalPages ?? 1;

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    if ((product.stock || 0) <= 0) return toast.error('Out of stock');
    if (!addToCart({ id: product.id || product._id, name: product.name, price: product.discountPrice || product.price, image: product.imageUrl, quantity: 1 })) return;
    toast.success('Added to cart!', { style: { borderRadius: '12px', fontWeight: 600 } });
  };

  const currentCategoryName = selectedCategory === 'all'
    ? 'All Products'
    : categories.find(c => (c.id || c._id) === selectedCategory || String(c.id || c._id) === String(selectedCategory))?.name || 'Collection';

  const activeFilterCount = [
    selectedCategory !== 'all',
    priceRange[1] < 100000,
    !!localSearch,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 page-enter">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 sm:py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
            <Link to="/" className="hover:text-[#1A3C8A] transition-colors font-medium">Home</Link>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-900 font-semibold">{currentCategoryName}</span>
          </nav>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-4xl">{currentCategoryName}</h1>
              <p className="mt-1 text-gray-500 text-sm">
                {loading ? 'Loading…' : `${totalProducts} product${totalProducts !== 1 ? 's' : ''} found`}
              </p>
            </div>

            {/* Search bar */}
            <div className="relative w-full max-w-xs md:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products…"
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#1A3C8A] focus:bg-white transition-all coupon-input"
              />
              {localSearch && (
                <button onClick={() => setLocalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6">
        <div className="flex gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="sticky top-24 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-extrabold text-gray-900 text-sm mb-6 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#1A3C8A]" /> Filters
              </h2>
              <FilterPanel
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                getProductCountForCategory={getProductCountForCategory}
              />
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {/* Mobile filter button */}
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-all relative"
                >
                  <Filter className="w-4 h-4" /> Filters
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF6B35] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* View toggle */}
                <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#1A3C8A] text-white shadow' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#1A3C8A] text-white shadow' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="px-4 py-2 text-sm font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#1A3C8A] text-gray-700 cursor-pointer transition-all"
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Active filters chips */}
            {(selectedCategory !== 'all' || priceRange[1] < 100000 || localSearch) && (
              <div className="flex flex-wrap gap-2 mb-5">
                {selectedCategory !== 'all' && (
                  <span className="filter-tag active inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border cursor-pointer" onClick={() => setSelectedCategory('all')}>
                    {currentCategoryName} <X className="w-3 h-3" />
                  </span>
                )}
                {priceRange[1] < 100000 && (
                  <span className="filter-tag active inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border cursor-pointer" onClick={() => setPriceRange([0, 100000])}>
                    ≤ Rs. {priceRange[1].toLocaleString()} <X className="w-3 h-3" />
                  </span>
                )}
                {localSearch && (
                  <span className="filter-tag active inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border cursor-pointer" onClick={() => setLocalSearch('')}>
                    "{localSearch}" <X className="w-3 h-3" />
                  </span>
                )}
              </div>
            )}

            {/* Products */}
            <FetchState
              isLoading={loading}
              isError={!!error}
              isEmpty={!loading && !error && filteredProducts.length === 0}
              loading={<ProductGridSkeleton count={9} />}
              errorTitle="Couldn't load products"
              errorDescription="Something went wrong while loading. Check your connection and try again."
              onRetry={() => fetchProducts(buildFetchParams())}
              emptyIcon={PackageX}
              emptyTitle="No products found"
              emptyDescription="Try adjusting your search or filters"
              emptyAction={
                <button
                  onClick={() => { setSelectedCategory('all'); setPriceRange([0, 100000]); setLocalSearch(''); }}
                  className="px-6 py-2.5 bg-[#1A3C8A] text-white font-semibold rounded-full text-sm hover:bg-[#163180] transition-colors"
                >
                  Clear All Filters
                </button>
              }
            >
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {filteredProducts.map((product, index) => {
                  const pid = product.id || product._id;
                  const isFav = favorites.includes(pid);
                  const discountPct = product.discountPrice && product.discountPrice < product.price
                    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
                    : 0;

                  if (viewMode === 'list') {
                    return (
                      <motion.div
                        key={pid}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.04, 0.3) }}
                        onClick={() => navigate(`/product/${pid}`)}
                        className="flex gap-4 bg-white border border-gray-100 rounded-2xl overflow-hidden cursor-pointer group hover:shadow-md hover:border-blue-100 transition-all p-3"
                      >
                        <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center p-2">
                          <ProductImg src={getImage(product.imageUrl)} alt={product.name} className="object-contain w-full h-full img-zoom" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B35] mb-1">{getCategoryName(product)}</p>
                            <h3 className="font-bold text-gray-900 group-hover:text-[#1A3C8A] transition-colors line-clamp-2 text-sm sm:text-base">{formatProductName(product.name)}</h3>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div>
                              {product.discountPrice && product.discountPrice < product.price ? (
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-extrabold text-gray-900">Rs. {product.discountPrice.toLocaleString()}</span>
                                  <span className="text-xs text-gray-400 line-through">Rs. {product.price.toLocaleString()}</span>
                                  {discountPct > 0 && <span className="text-xs font-bold text-red-500">-{discountPct}%</span>}
                                </div>
                              ) : (
                                <span className="font-extrabold text-gray-900">Rs. {product.price?.toLocaleString()}</span>
                              )}
                            </div>
                            <button
                              onClick={(e) => handleAddToCart(e, product)}
                              disabled={(product.stock || 0) === 0}
                              className="p-2.5 bg-[#1A3C8A] text-white rounded-xl hover:bg-[#163180] transition-all disabled:bg-gray-200 disabled:text-gray-400 btn-press"
                            >
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={pid}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.4 }}
                      className="product-card overflow-hidden bg-white border border-gray-100 rounded-2xl group shadow-sm cursor-pointer"
                      onClick={() => navigate(`/product/${pid}`)}
                    >
                      <div className="relative overflow-hidden aspect-square bg-linear-to-br from-gray-50 to-white">
                        <div className="w-full h-full flex items-center justify-center p-4">
                          <ProductImg src={getImage(product.imageUrl)} alt={product.name} className="object-contain w-full h-full img-zoom" />
                        </div>

                        {discountPct > 0 && (
                          <div className="absolute top-2.5 left-2.5 bg-linear-to-r from-red-500 to-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-sm">
                            -{discountPct}%
                          </div>
                        )}

                        {(product.stock || 0) > 0 && (product.stock || 0) < 10 && (
                          <div className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                            Only {product.stock} left!
                          </div>
                        )}

                        {/* Wishlist */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(pid, isUser); }}
                          className={`absolute bottom-2.5 right-2.5 p-2 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 ${isFav ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </button>

                        {/* Quick add */}
                        <div className="absolute bottom-2.5 left-2.5 right-10 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => handleAddToCart(e, product)}
                            disabled={(product.stock || 0) === 0}
                            className="quick-add-btn w-full py-2 bg-[#1A3C8A] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:bg-[#163180] disabled:bg-gray-300 disabled:text-gray-500 btn-press"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            {(product.stock || 0) > 0 ? 'Add to Cart' : 'Out of Stock'}
                          </button>
                        </div>

                        {(product.stock || 0) === 0 && (
                          <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="bg-gray-700 text-white text-xs font-bold px-3 py-1.5 rounded-full">Sold Out</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B35] mb-0.5 truncate">{getCategoryName(product)}</p>
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-[#1A3C8A] transition-colors mb-2">
                          {formatProductName(product.name)}
                        </h3>
                        <div className="flex items-baseline gap-1.5">
                          {product.discountPrice && product.discountPrice < product.price ? (
                            <>
                              <span className="text-sm font-extrabold text-gray-900">Rs. {product.discountPrice.toLocaleString()}</span>
                              <span className="text-xs text-gray-400 line-through">Rs. {product.price.toLocaleString()}</span>
                            </>
                          ) : (
                            <span className="text-sm font-extrabold text-gray-900">Rs. {product.price?.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </FetchState>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-semibold bg-white border border-gray-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-bold text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-semibold bg-white border border-gray-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <AnimatePresence>
        {showMobileFilters && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden backdrop-blur-sm"
            onClick={() => setShowMobileFilters(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#1A3C8A]" /> Filters
                </h2>
                <button onClick={() => setShowMobileFilters(false)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <FilterPanel
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                getProductCountForCategory={getProductCountForCategory}
                onClose={() => setShowMobileFilters(false)}
              />
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full mt-8 py-3.5 bg-[#1A3C8A] text-white font-bold rounded-xl text-sm hover:bg-[#163180] transition-colors btn-press"
              >
                Apply Filters ({totalProducts} results)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
