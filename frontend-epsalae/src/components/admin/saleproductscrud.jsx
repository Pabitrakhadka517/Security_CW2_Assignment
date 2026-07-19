// src/components/admin/saleproductscrud.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '../store/productstore';
import { useCategoryStore } from '../store/categorystore';
import api from '../api/base';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/config';
import {
  Search, Package, Tag, Loader2, Edit2, Trash2,
  X, Plus, Check, Percent, ShoppingBag,
  LayoutGrid, DollarSign, Gift, ChevronUp, ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import FetchState from '../ui/FetchState';
import { TableSkeleton } from '../ui/Skeleton';
import StatusPill from '../ui/StatusPill';

const SALE_TYPES = [
  { value: 'percentage', label: 'Percentage Off', icon: Percent },
  { value: 'fixed',      label: 'Fixed Amount',   icon: DollarSign },
  { value: 'bxgy',       label: 'Buy X Get Y',    icon: Gift },
];

const DEFAULT_FORM = {
  saleId:             '',
  addMode:            'product',
  productIds:         [],
  productSearch:      '',
  categoryId:         '',
  saleType:           'percentage',
  discount_percentage: 10,
  fixed_amount:       '',
  buy_qty:            2,
  get_qty:            1,
};

export default function SaleProductsCrud() {
  const { products, fetchProducts, fetchAllProducts } = useProductStore();
  const { categories, fetchCategories }  = useCategoryStore();
  const navigate = useNavigate();

  const [saleCategories, setSaleCategories] = useState([]);
  const [activeTab,  setActiveTab]  = useState(null);   // sale category id
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [editing,    setEditing]    = useState(null);   // { saleId, productId, discount }
  const [showModal,  setShowModal]  = useState(false);
  const [addForm,    setAddForm]    = useState(DEFAULT_FORM);
  const [showProductDrop, setShowProductDrop] = useState(false);
  const [isError,    setIsError]    = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null); // { saleId, productId, name }

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-dd="prod"]')) setShowProductDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadSales = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    try {
      const res = await api.get('/sale-categories');
      const raw = res.data?.data ?? [];
      const cats = Array.isArray(raw) ? raw : (raw.items ?? []);
      setSaleCategories(cats);
      setActiveTab(prev => prev ?? cats[0]?.id ?? null);
    } catch {
      setSaleCategories([]);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
    fetchAllProducts();
    fetchCategories();
  }, [loadSales, fetchProducts, fetchCategories]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getProduct = (id) => products.find((p) => (p.id || p._id) === id) ?? null;

  const activeCategory = saleCategories.find(c => c.id === activeTab);
  const tabProducts = (activeCategory?.products ?? [])
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  // ── API helper ────────────────────────────────────────────────────────────
  const updateSaleProducts = async (saleId, updatedProducts, successMsg) => {
    setSaving(true);
    try {
      await api.put(`/sale-categories/${saleId}`, { products: updatedProducts });
      toast.success(successMsg);
      await loadSales();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Reorder ───────────────────────────────────────────────────────────────
  const moveProduct = (productId, direction) => {
    const cat = saleCategories.find(c => c.id === activeTab);
    if (!cat) return;
    const sorted = [...cat.products].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    const idx = sorted.findIndex(p => p.product_id === productId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const updated = sorted.map((p, i) => {
      if (i === idx) return { ...p, display_order: swapIdx };
      if (i === swapIdx) return { ...p, display_order: idx };
      return { ...p, display_order: i };
    });
    updateSaleProducts(activeTab, updated, 'Order updated');
  };

  // ── Inline discount edit ──────────────────────────────────────────────────
  const saveDiscount = () => {
    if (!editing) return;
    const cat = saleCategories.find((c) => c.id === editing.saleId);
    if (!cat) return;
    const updated = cat.products.map((p) =>
      p.product_id === editing.productId
        ? { ...p, discount_percentage: Math.min(100, Math.max(0, Number(editing.discount) || 0)) }
        : p
    );
    updateSaleProducts(editing.saleId, updated, 'Discount updated').then(() => setEditing(null));
  };

  // ── Remove from sale ──────────────────────────────────────────────────────
  const requestRemoveFromSale = (saleId, productId) => {
    const p = getProduct(productId);
    setPendingRemove({ saleId, productId, name: p?.name || productId });
  };

  const confirmRemoveFromSale = async () => {
    if (!pendingRemove) return;
    const { saleId, productId } = pendingRemove;
    const cat = saleCategories.find((c) => c.id === saleId);
    if (!cat) { setPendingRemove(null); return; }
    const updated = cat.products.filter((p) => p.product_id !== productId);
    await updateSaleProducts(saleId, updated, 'Removed from sale');
    setPendingRemove(null);
  };

  // ── Compute effective discount % ─────────────────────────────────────────
  const computeDiscountPct = (productId) => {
    const { saleType, discount_percentage, fixed_amount } = addForm;
    if (saleType === 'percentage') return Number(discount_percentage) || 0;
    if (saleType === 'fixed') {
      const p = getProduct(productId);
      if (!p?.price || !fixed_amount) return 0;
      return Math.min(100, Math.round((Number(fixed_amount) / p.price) * 100));
    }
    return 0;
  };

  // ── Add to sale submit ─────────────────────────────────────────────────────
  const addToSale = async () => {
    if (!addForm.saleId) return toast.error('Select a sale category');
    const cat = saleCategories.find((c) => c.id === addForm.saleId);
    if (!cat) return;
    const existingIds = new Set((cat.products ?? []).map((p) => p.product_id));

    let idsToAdd = [];
    if (addForm.addMode === 'product') {
      if (addForm.productIds.length === 0) return toast.error('Select at least one product');
      idsToAdd = addForm.productIds.filter((id) => !existingIds.has(id));
      if (idsToAdd.length === 0) return toast.error('All selected products are already in this sale');
    } else {
      if (!addForm.categoryId) return toast.error('Select a category');
      const catProds = products.filter((p) => {
        const cid = p.category_id || p.category?.id || p.category?._id;
        return cid === addForm.categoryId;
      });
      idsToAdd = catProds.map((p) => p.id || p._id).filter((id) => !existingIds.has(id));
      if (idsToAdd.length === 0) return toast.error('No new products found in this category');
    }

    const baseOrder = (cat.products ?? []).length;
    const updated = [
      ...(cat.products ?? []),
      ...idsToAdd.map((productId, i) => ({
        product_id: productId,
        discount_percentage: computeDiscountPct(productId),
        display_order: baseOrder + i,
        stock_limit: null,
        badge_label: null,
      })),
    ];

    await updateSaleProducts(addForm.saleId, updated, `${idsToAdd.length} product(s) added to sale`);
    setActiveTab(addForm.saleId);
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setAddForm(DEFAULT_FORM);
    setShowProductDrop(false);
  };

  const openModal = () => {
    setShowModal(true);
    setAddForm({ ...DEFAULT_FORM, saleId: activeTab ?? '' });
  };

  const toggleProductId = (id) =>
    setAddForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((x) => x !== id)
        : [...f.productIds, id],
    }));

  const availableProducts = (() => {
    const cat = saleCategories.find((c) => c.id === addForm.saleId);
    const existingIds = new Set((cat?.products ?? []).map((sp) => sp.product_id));
    return products
      .filter((p) => {
        if (existingIds.has(p.id || p._id)) return false;
        return !addForm.productSearch || p.name?.toLowerCase().includes(addForm.productSearch.toLowerCase());
      })
      .slice(0, 40);
  })();

  const categoryProducts = addForm.categoryId
    ? products.filter((p) => {
        const cid = p.category_id || p.category?.id || p.category?._id;
        return cid === addForm.categoryId;
      })
    : [];

  // Only sub-categories carry products directly (departments like "Men" are
  // just parents), so the picker only lists those — labeled with their
  // department so "Jackets" under Men and under Women aren't indistinguishable.
  const categoryById = Object.fromEntries(categories.map((c) => [c.id || c._id, c]));
  const categoryOptions = categories
    .filter((c) => c.depth !== 0)
    .map((c) => {
      const parent = categoryById[c.parentId];
      return { id: c.id || c._id, label: parent ? `${parent.name} > ${c.name}` : c.name };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const pricePreview = addForm.saleType !== 'bxgy'
    ? addForm.productIds.map((id) => {
        const p = getProduct(id);
        if (!p?.price) return null;
        const pct  = computeDiscountPct(id);
        const sale = Math.round(p.price * (1 - pct / 100));
        return { id, name: p.name, original: p.price, sale };
      }).filter(Boolean)
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ds-page-title">Sale Products</h1>
          <p className="ds-page-sub">Manage products within each sale category</p>
        </div>
        <button
          onClick={openModal}
          className="ds-btn ds-btn-primary"
        >
          <Plus className="w-4 h-4" /> Add Product to Sale
        </button>
      </div>

      <FetchState
        isLoading={loading}
        isError={isError}
        isEmpty={!loading && !isError && saleCategories.length === 0}
        loading={<TableSkeleton rows={5} cols={4} />}
        errorTitle="Couldn't load sale products"
        errorDescription="Something went wrong. Check your connection and try again."
        onRetry={loadSales}
        emptyIcon={Tag}
        emptyTitle="No sale categories yet"
        emptyDescription="Create sale categories first, then add products here."
      >
        <div className="ds-card overflow-hidden">
          {/* ── Tab bar ── */}
          <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-none">
            {saleCategories.map((cat) => {
              const isActive = cat.id === activeTab;
              const count = cat.products?.length ?? 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                    isActive
                      ? 'border-[#047857] text-[#047857] bg-emerald-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-[#047857] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                  {!cat.is_active && (
                    <span className="text-[10px] text-gray-400">(off)</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Tab content ── */}
          {activeCategory && (
            <div>
              {/* Tab header */}
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-50">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusPill isActive={activeCategory.is_active} />
                    <span className="font-semibold text-(--ds-text)">{activeCategory.title}</span>
                    {activeCategory.badge_label && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: activeCategory.badge_color || '#047857' }}>
                        {activeCategory.badge_label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tabProducts.length} product{tabProducts.length !== 1 ? 's' : ''} · Drag rows or use arrows to reorder
                  </p>
                </div>
                <button
                  onClick={openModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#047857] border border-[#047857]/30 rounded-lg hover:bg-emerald-50 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Products
                </button>
              </div>

              {/* Product list */}
              {tabProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No products in this sale yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {tabProducts.map((sp, idx) => {
                    const p             = getProduct(sp.product_id);
                    const originalPrice = p?.price ?? 0;
                    const salePrice     = originalPrice
                      ? Math.round(originalPrice * (1 - sp.discount_percentage / 100))
                      : 0;
                    const isEditingThis = editing?.saleId === activeTab && editing?.productId === sp.product_id;

                    return (
                      <div key={sp.product_id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group">
                        {/* Sort arrows */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => moveProduct(sp.product_id, 'up')}
                            disabled={idx === 0 || saving}
                            className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed rounded"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveProduct(sp.product_id, 'down')}
                            disabled={idx === tabProducts.length - 1 || saving}
                            className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed rounded"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Order number */}
                        <span className="text-xs text-gray-300 w-5 text-center shrink-0 font-mono">{idx + 1}</span>

                        {/* Thumbnail */}
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {p?.imageUrl
                            ? <img src={getImageUrl(p.imageUrl)} alt={p?.name} className="w-full h-full object-cover" />
                            : <Package className="w-5 h-5 m-3 text-gray-300" />}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-(--ds-text) text-sm truncate">
                            {p?.name ?? <span className="text-gray-400 text-xs font-mono">{sp.product_id}</span>}
                          </p>
                          {sp.badge_label && (
                            <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded text-white bg-[#047857]">
                              {sp.badge_label}
                            </span>
                          )}
                        </div>

                        {/* Prices */}
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[#047857] text-sm">Rs. {salePrice.toLocaleString()}</p>
                          <p className="text-xs text-gray-600 line-through">Rs. {originalPrice.toLocaleString()}</p>
                        </div>

                        {/* Discount — inline editable */}
                        <div className="shrink-0 w-28 text-center">
                          {isEditingThis ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number" min="0" max="100"
                                value={editing.discount}
                                onChange={(e) => setEditing((ed) => ({ ...ed, discount: e.target.value }))}
                                className="w-16 text-center border border-[#047857] rounded-lg py-1 text-sm focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter')  saveDiscount();
                                  if (e.key === 'Escape') setEditing(null);
                                }}
                              />
                              <button
                                onClick={saveDiscount} disabled={saving}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditing({ saleId: activeTab, productId: sp.product_id, discount: sp.discount_percentage })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 font-bold rounded-full text-xs hover:bg-emerald-100 transition"
                            >
                              <Percent className="w-3 h-3" />{sp.discount_percentage}%
                            </button>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditing({ saleId: activeTab, productId: sp.product_id, discount: sp.discount_percentage })}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit discount"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => requestRemoveFromSale(activeTab, sp.product_id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove"
                            aria-label={`Remove ${p?.name || sp.product_id} from sale`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </FetchState>

      {/* ── Add to Sale Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={<span className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-[#047857]" /> Add to Sale</span>}
      >
            <div className="space-y-5">

              {/* Sale Category */}
              <div>
                <label className="ds-label">Sale Category *</label>
                <select
                  value={addForm.saleId}
                  onChange={(e) => setAddForm((f) => ({ ...f, saleId: e.target.value, productIds: [] }))}
                  className="ds-select"
                >
                  <option value="">Select a sale…</option>
                  {saleCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}{!c.is_active ? ' (Inactive)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Sale Type */}
              <div>
                <label className="ds-label">Discount Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {SALE_TYPES.map(({ value, label, icon: Icon }) => {
                    const active = addForm.saleType === value;
                    return (
                      <button
                        key={value} type="button"
                        onClick={() => setAddForm((f) => ({ ...f, saleType: value }))}
                        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-xs font-semibold transition ${
                          active
                            ? 'border-[#047857] bg-emerald-50 text-[#047857] ring-1 ring-[#047857]'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Mode toggle */}
              <div>
                <label className="ds-label">Add By</label>
                <div className="flex gap-2">
                  {[
                    { v: 'product',  label: 'Select Products', icon: Package },
                    { v: 'category', label: 'Entire Category', icon: LayoutGrid },
                  ].map(({ v, label, icon: Icon }) => {
                    const active = addForm.addMode === v;
                    return (
                      <button
                        key={v} type="button"
                        onClick={() => setAddForm((f) => ({ ...f, addMode: v, productIds: [], categoryId: '' }))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                          active ? 'border-[#1E293B] bg-blue-50 text-[#1E293B]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Product multi-select */}
              {addForm.addMode === 'product' && (
                <div>
                  <label className="ds-label">
                    Products *
                    {addForm.productIds.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-[#047857]">{addForm.productIds.length} selected</span>
                    )}
                  </label>
                  <div className="relative" data-dd="prod">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      value={addForm.productSearch}
                      onChange={(e) => { setAddForm((f) => ({ ...f, productSearch: e.target.value })); setShowProductDrop(true); }}
                      onFocus={() => setShowProductDrop(true)}
                      placeholder="Search and tick products to add…"
                      className="ds-input pl-9"
                    />
                    {showProductDrop && (
                      <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-52 overflow-y-auto z-30">
                        {availableProducts.length > 0 ? (
                          availableProducts.map((p) => {
                            const id = p.id || p._id;
                            const checked = addForm.productIds.includes(id);
                            return (
                              <button key={id} type="button" onClick={() => toggleProductId(id)}
                                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition ${checked ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${checked ? 'bg-[#047857] border-[#047857]' : 'border-gray-300'}`}>
                                  {checked && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                  {p.imageUrl ? <img src={getImageUrl(p.imageUrl)} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 m-2 text-gray-300" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">{p.name}</p>
                                  <p className="text-xs text-gray-400">Rs. {p.price?.toLocaleString()}</p>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center">
                            {!addForm.saleId ? (
                              <p className="text-sm text-gray-400">Select a sale category first</p>
                            ) : (
                              <>
                                <p className="text-sm text-gray-400">
                                  {addForm.productSearch ? `No product matches "${addForm.productSearch}"` : 'No more products available'}
                                </p>
                                <button type="button"
                                  onClick={() => navigate('/admin/productcrud', { state: { createName: addForm.productSearch || '' } })}
                                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#047857] rounded-lg hover:bg-[#065f46] transition">
                                  <Plus className="w-3.5 h-3.5" /> Create a new product
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {addForm.productIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {addForm.productIds.map((id) => {
                        const p = getProduct(id);
                        return (
                          <span key={id} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full">
                            {p?.name ?? id}
                            <button type="button" onClick={() => toggleProductId(id)} className="hover:text-red-600 ml-0.5">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Category select */}
              {addForm.addMode === 'category' && (
                <div>
                  <label className="ds-label">Category *</label>
                  <select
                    value={addForm.categoryId}
                    onChange={(e) => setAddForm((f) => ({ ...f, categoryId: e.target.value }))}
                    className="ds-select"
                  >
                    <option value="">Select a category…</option>
                    {categoryOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                  {addForm.categoryId && (
                    <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />{categoryProducts.length} product(s) will be added
                    </p>
                  )}
                </div>
              )}

              {/* Discount fields */}
              {addForm.saleType === 'percentage' && (
                <div>
                  <label className="ds-label">Discount % *</label>
                  <div className="relative">
                    <input type="number" min="0" max="100"
                      value={addForm.discount_percentage}
                      onChange={(e) => setAddForm((f) => ({ ...f, discount_percentage: e.target.value }))}
                      className="ds-input pr-10"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              )}

              {addForm.saleType === 'fixed' && (
                <div>
                  <label className="ds-label">Fixed Amount Off (Rs.) *</label>
                  <input type="number" min="0"
                    value={addForm.fixed_amount}
                    onChange={(e) => setAddForm((f) => ({ ...f, fixed_amount: e.target.value }))}
                    placeholder="e.g. 200"
                    className="ds-input"
                  />
                </div>
              )}

              {addForm.saleType === 'bxgy' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="ds-label">Buy Qty</label>
                      <input type="number" min="1" value={addForm.buy_qty}
                        onChange={(e) => setAddForm((f) => ({ ...f, buy_qty: e.target.value }))}
                        className="ds-input"
                      />
                    </div>
                    <div>
                      <label className="ds-label">Get Qty Free</label>
                      <input type="number" min="1" value={addForm.get_qty}
                        onChange={(e) => setAddForm((f) => ({ ...f, get_qty: e.target.value }))}
                        className="ds-input"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    Buy {addForm.buy_qty || 2} get {addForm.get_qty || 1} free — BXGY logic enforced at order level.
                  </p>
                </div>
              )}

              {/* Price Preview */}
              {pricePreview.length > 0 && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Price Preview</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {pricePreview.map(({ id, name, original, sale }) => (
                      <div key={id} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-gray-600 truncate flex-1">{name}</span>
                        <span className="text-gray-600 line-through whitespace-nowrap">Rs. {original.toLocaleString()}</span>
                        <span className="font-bold text-emerald-600 whitespace-nowrap">Rs. {sale.toLocaleString()}</span>
                        <span className="text-emerald-600 font-semibold">{addForm.discount_percentage}% OFF</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={addToSale} disabled={saving}
                  className="ds-btn ds-btn-primary flex-1"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                    : <><Plus className="w-4 h-4" /> Add to Sale</>}
                </button>
                <button
                  onClick={closeModal}
                  className="ds-btn ds-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingRemove}
        title={`Remove ${pendingRemove?.name ?? 'this product'} from the sale?`}
        description="This can't be undone."
        confirmLabel="Remove"
        variant="danger"
        isLoading={saving}
        onConfirm={confirmRemoveFromSale}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
