// src/components/admin/salecrud.jsx
import { useState, useEffect, useCallback } from 'react';
import { useProductStore } from '../store/productstore';
import api from '../api/base';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/config';
import {
  Plus, Edit2, Trash2, Loader2, X, Tag, ToggleLeft, ToggleRight,
  Search, ChevronDown, ChevronUp, Package, Percent, Check, Sparkles, Upload,
} from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import FetchState from '../ui/FetchState';
import { TableSkeleton } from '../ui/Skeleton';

const ENDPOINT = '/sale-categories';

const SEASONS = [
  { value: '',         label: 'None (no season)' },
  { value: 'dashain',  label: '🎉 Dashain Mahotsav' },
  { value: 'tihar',    label: '🪔 Tihar Utsav' },
  { value: 'new_year', label: '🎆 New Year Bonanza' },
  { value: 'summer',   label: '🌞 Summer Clearance' },
  { value: 'winter',   label: '❄️ Winter Sale' },
];

const emptyForm = {
  title: '', slug: '', description: '', banner: '',
  is_active: true, start_date: '', end_date: '',
  priority: 0, cta_label: '', cta_url: '',
  season: '', badge_label: '', badge_color: '#FF6B35',
  products: [],
};

const slugify = s => s.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');

function SaleInput({ label, value, onChange, error, placeholder, required, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}{required && ' *'}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-[#FF6B35] transition ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function SaleCrud() {
  const { products, fetchProducts, fetchAllProducts } = useProductStore();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [expandedSale, setExpandedSale] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Close product dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-dropdown="product-search"]')) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    try {
      const res = await api.get(ENDPOINT);
      const data = res.data?.data || [];
      setSales(Array.isArray(data) ? data : data.items || []);
    } catch { setSales([]); setIsError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); fetchAllProducts(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErrors({}); setShowModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      title: s.title || '', slug: s.slug || '', description: s.description || '',
      banner: s.banner || '', is_active: s.is_active !== false,
      start_date: s.start_date ? s.start_date.slice(0, 16) : '',
      end_date: s.end_date ? s.end_date.slice(0, 16) : '',
      priority: s.priority ?? 0, cta_label: s.cta_label || '', cta_url: s.cta_url || '',
      season: s.season || '', badge_label: s.badge_label || '', badge_color: s.badge_color || '#FF6B35',
      products: Array.isArray(s.products) ? s.products.map(p => ({ product_id: p.product_id || p.id, discount_percentage: p.discount_percentage || 0 })) : [],
    });
    setErrors({}); setShowModal(true);
  };

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === 'title' && !editing) next.slug = slugify(v);
    return next;
  });

  // Upload a banner image from the device (stored inline; same approach as the
  // other admin forms). getImageUrl handles the resulting data URL everywhere.
  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => { set('banner', ev.target?.result); toast.success('Banner image selected'); setUploading(false); };
    reader.onerror = () => { toast.error('Failed to read image'); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.slug.trim()) e.slug = 'Slug is required';
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date))
      e.end_date = 'End date must be after start date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    // An active sale with no products renders an empty section on the
    // storefront — make the admin confirm that's really intended.
    if (form.products.length === 0 && form.is_active !== false) {
      const ok = window.confirm(
        'This sale has NO products attached.\n\n' +
        'It will appear on the homepage and /sales with an empty product grid. ' +
        'Add products from the list below (the picker now shows your full catalogue), ' +
        'or press OK to save it without products anyway.'
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        priority: Number(form.priority) || 0,
        cta_label: form.cta_label?.trim() || null,
        cta_url: form.cta_url?.trim() || null,
        season: form.season || null,
        badge_label: form.badge_label?.trim() || null,
        badge_color: form.badge_color?.trim() || null,
        products: form.products.map(p => ({ product_id: p.product_id, discount_percentage: Number(p.discount_percentage) || 0 })),
      };
      if (editing) {
        await api.put(`${ENDPOINT}/${editing.id}`, payload);
        toast.success('Sale category updated!');
      } else {
        await api.post(ENDPOINT, payload);
        toast.success('Sale category created!');
      }
      setShowModal(false); load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`${ENDPOINT}/${pendingDelete.id}`);
      toast.success('Deleted'); load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Delete failed'); }
    finally { setDeleting(false); setPendingDelete(null); }
  };

  const toggleActive = async (s) => {
    try {
      await api.put(`${ENDPOINT}/${s.id}`, { is_active: !s.is_active });
      toast.success(`Sale ${!s.is_active ? 'activated' : 'deactivated'}`); load();
    } catch { toast.error('Update failed'); }
  };

  // Product management in form
  const addProduct = (product) => {
    const id = product.id || product._id;
    if (form.products.find(p => p.product_id === id)) return;
    setForm(f => ({ ...f, products: [...f.products, { product_id: id, discount_percentage: 10 }] }));
    setProductSearch(''); setShowProductDropdown(false);
  };
  const removeProduct = (pid) => setForm(f => ({ ...f, products: f.products.filter(p => p.product_id !== pid) }));
  const setDiscount = (pid, val) => setForm(f => ({
    ...f, products: f.products.map(p => p.product_id === pid ? { ...p, discount_percentage: val } : p)
  }));

  const getProduct = (id) => products.find(p => (p.id || p._id) === id);
  const filteredProducts = products.filter(p =>
    !form.products.find(fp => fp.product_id === (p.id || p._id)) &&
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 20);

  const filtered = sales.filter(s => s.title?.toLowerCase().includes(search.toLowerCase()));


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sale Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage seasonal and promotional sale categories</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-orange-200">
          <Plus className="w-4 h-4" /> New Sale
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sales…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FF6B35] transition" />
      </div>

      {/* List */}
      <FetchState
        isLoading={loading}
        isError={isError}
        isEmpty={!loading && !isError && filtered.length === 0}
        loading={<TableSkeleton rows={5} cols={4} />}
        errorTitle="Couldn't load sales"
        errorDescription="Something went wrong. Check your connection and try again."
        onRetry={load}
        emptyIcon={Tag}
        emptyTitle="No sale categories yet"
        emptyDescription={search ? 'No sales match your search.' : 'Click "New Sale" to create one.'}
      >
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4 sm:p-5">
                {/* Banner thumb */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {s.banner ? <img src={getImageUrl(s.banner)} alt="" className="w-full h-full object-cover" /> : <Tag className="w-5 h-5 text-orange-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{s.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <p className="text-xs text-gray-400 truncate">/{s.slug} · {s.products?.length || 0} products
                      {s.start_date && ` · ${new Date(s.start_date).toLocaleDateString()}`}
                      {s.end_date && ` → ${new Date(s.end_date).toLocaleDateString()}`}
                    </p>
                    {s.season && (
                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                        {SEASONS.find(x => x.value === s.season)?.label ?? s.season}
                      </span>
                    )}
                    {s.badge_label && (
                      <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded-full text-white uppercase"
                        style={{ background: s.badge_color || '#FF6B35' }}>
                        {s.badge_label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedSale(expandedSale === s.id ? null : s.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition" title="View products">
                    {expandedSale === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleActive(s)} title={s.is_active ? 'Deactivate' : 'Activate'}
                    className="p-2 text-gray-400 hover:text-[#FF6B35] hover:bg-orange-50 rounded-lg transition">
                    {s.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => openEdit(s)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPendingDelete(s)} aria-label={`Delete sale ${s.title}`} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Expanded product list */}
              {expandedSale === s.id && (
                <div className="border-t border-gray-50 px-5 pb-4 pt-3 bg-gray-50/50">
                  {(!s.products || s.products.length === 0) ? (
                    <p className="text-sm text-gray-400">No products assigned yet. Click Edit to add products.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {s.products.map((sp, i) => {
                        const p = getProduct(sp.product_id);
                        return (
                          <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                              {p?.imageUrl ? <img src={getImageUrl(p.imageUrl)} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 m-2.5 text-gray-300" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{p?.name || sp.product_id}</p>
                              <p className="text-xs text-gray-400">{p?.price ? `Rs. ${p.price} → Rs. ${Math.round(p.price * (1 - sp.discount_percentage / 100))}` : 'Price not loaded'}</p>
                            </div>
                            <span className="shrink-0 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{sp.discount_percentage}% off</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </FetchState>

      {/* Modal */}
      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Delete "${pendingDelete?.title ?? 'this sale'}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Sale Category' : 'New Sale Category'} size="lg">
            <div className="space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <SaleInput label="Title" value={form.title} onChange={v => set('title', v)} placeholder="Winter Sale" error={errors.title} required />
                <SaleInput label="Slug" value={form.slug} onChange={v => set('slug', v)} placeholder="winter-sale" error={errors.slug} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Optional description…"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FF6B35] resize-none transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Banner Image</label>
                {!form.banner ? (
                  <label className="flex flex-col items-center justify-center gap-1.5 w-full py-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#FF6B35] hover:bg-orange-50/40 transition text-gray-500">
                    {uploading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Uploading…</>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span className="text-sm font-medium">Upload banner from device</span>
                        <span className="text-xs text-gray-400">PNG, JPG up to 10MB</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                  </label>
                ) : (
                  <div className="relative overflow-hidden border border-gray-200 rounded-xl">
                    <img src={getImageUrl(form.banner)} alt="Banner" className="w-full h-40 object-cover" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <label className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-gray-700 cursor-pointer hover:bg-white shadow">
                        Change
                        <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                      </label>
                      <button type="button" onClick={() => set('banner', '')} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 shadow">Remove</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SaleInput label="Start Date" type="datetime-local" value={form.start_date} onChange={v => set('start_date', v)} error={errors.start_date} />
                <SaleInput label="End Date" type="datetime-local" value={form.end_date} onChange={v => set('end_date', v)} error={errors.end_date} />
              </div>

              {/* Campaign promotion controls */}
              <div className="grid grid-cols-2 gap-4">
                <SaleInput label="Priority" type="number" value={form.priority} onChange={v => set('priority', v)} placeholder="0 = lowest" />
                <SaleInput label="CTA Button Label" value={form.cta_label} onChange={v => set('cta_label', v)} placeholder="Shop the Sale" />
              </div>
              <SaleInput label="CTA Redirect URL" value={form.cta_url} onChange={v => set('cta_url', v)} placeholder="/sale/winter-sale or https://…" />
              <p className="-mt-2 text-xs text-gray-400">Higher priority campaigns are shown first on the homepage.</p>

              {/* Season + Badge */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-bold text-gray-700">Season &amp; Badge</span>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Season</label>
                  <select value={form.season} onChange={e => set('season', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FF6B35] bg-white transition">
                    {SEASONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">Tag this sale to a season so the Seasonal Sales manager can activate it automatically.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SaleInput label="Badge Label" value={form.badge_label} onChange={v => set('badge_label', v)} placeholder="e.g. DASHAIN OFFER" />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Badge Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.badge_color}
                        onChange={e => set('badge_color', e.target.value)}
                        className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5" />
                      <input type="text" value={form.badge_color}
                        onChange={e => set('badge_color', e.target.value)}
                        placeholder="#FF6B35"
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FF6B35] font-mono transition" />
                    </div>
                  </div>
                </div>
                {form.badge_label && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    Preview:
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase"
                      style={{ background: form.badge_color || '#FF6B35' }}>
                      {form.badge_label}
                    </span>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div onClick={() => set('is_active', !form.is_active)}
                  className={`w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-300'} relative`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>

              {/* Products */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Products in this sale</label>
                {/* Search & add */}
                <div className="relative mb-3" data-dropdown="product-search">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input value={productSearch} placeholder="Search products to add…"
                    onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FF6B35] transition" />
                  {showProductDropdown && productSearch && (
                    <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-48 overflow-y-auto z-30">
                      {filteredProducts.length > 0 ? filteredProducts.map(p => (
                        <button key={p.id || p._id} type="button" onClick={() => addProduct(p)}
                          className="w-full text-left px-4 py-2.5 hover:bg-orange-50 flex items-center gap-3 text-sm transition">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            {p.imageUrl ? <img src={getImageUrl(p.imageUrl)} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 m-2 text-gray-300" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{p.name}</p>
                            <p className="text-xs text-gray-400">Rs. {p.price}</p>
                          </div>
                        </button>
                      )) : <p className="p-4 text-sm text-gray-400 text-center">No products found</p>}
                    </div>
                  )}
                </div>
                {/* Selected products */}
                {form.products.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">No products added yet</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {form.products.map((fp, i) => {
                      const p = getProduct(fp.product_id);
                      const salePrice = p ? Math.round(p.price * (1 - Number(fp.discount_percentage) / 100)) : null;
                      return (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-gray-100 shrink-0">
                            {p?.imageUrl ? <img src={getImageUrl(p.imageUrl)} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 m-2.5 text-gray-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p?.name || fp.product_id}</p>
                            {p?.price ? <p className="text-xs text-gray-400">Rs. {p.price} → <span className="text-orange-600 font-semibold">Rs. {Math.round(p.price * (1 - Number(fp.discount_percentage) / 100))}</span></p> : null}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Percent className="w-3.5 h-3.5 text-gray-400" />
                            <input type="number" min="0" max="100" value={fp.discount_percentage}
                              onChange={e => setDiscount(fp.product_id, e.target.value)}
                              className="w-16 text-sm text-center border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-[#FF6B35]" />
                            <button onClick={() => removeProduct(fp.product_id)} className="p-1 text-gray-400 hover:text-red-500 transition">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition disabled:opacity-70 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> {editing ? 'Update' : 'Create'}</>}
                </button>
                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm transition">
                  Cancel
                </button>
              </div>
            </div>
      </Modal>
    </div>
  );
}
