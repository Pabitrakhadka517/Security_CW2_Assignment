// src/components/admin/promocodecrud.jsx
import { useState, useEffect, useCallback } from 'react';
import { useCouponStore } from '../store/promocodestore';
import { useProductStore } from '../store/productstore';
import { useCategoryStore } from '../store/categorystore';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/config';
import { Plus, Edit2, Trash2, Loader2, X, Check, Tag, Search, BarChart3, Users, Repeat, Infinity as InfinityIcon, Package } from 'lucide-react';

const APPLY_ON_OPTS = [
  { value: 'cart', label: 'Entire Cart' },
  { value: 'product', label: 'Specific Products' },
  { value: 'category', label: 'Specific Categories' },
];
const TYPE_OPTS = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed Amount (Rs.)' },
];

const emptyForm = {
  code: '', description: '', discount_type: 'percentage', discount_value: '',
  max_discount_cap: '',
  apply_on: 'cart', applicable_products: [], applicable_categories: [],
  validFrom: '', validTo: '', usage_limit: '', min_order_amount: '', isActive: true,
  // Per-user usage controls. usageType drives per_user_limit:
  //   'single' -> 1, 'multiple' -> per_user_limit (>=1), 'unlimited' -> null
  usageType: 'unlimited', per_user_limit: '',
};

// Derive the per_user_limit value sent to the API from the chosen usage type.
const resolvePerUserLimit = (form) => {
  if (form.usageType === 'single') return 1;
  if (form.usageType === 'multiple') return form.per_user_limit ? Number(form.per_user_limit) : 1;
  return null; // unlimited
};

// Derive the usageType radio value from a stored per_user_limit.
const usageTypeFromLimit = (limit) => {
  if (limit === 1) return 'single';
  if (typeof limit === 'number' && limit > 1) return 'multiple';
  return 'unlimited';
};

// Module-level helpers (defined outside component to prevent re-mount on render)
const inputCls = (err) => `w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-[#FF6B35] transition ${err ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function PromoCodeCRUD() {
  const { coupons, loading, fetchCoupons, addCoupon, updateCoupon, deleteCoupon, fetchCouponAnalytics } = useCouponStore();
  const { products, fetchProducts, fetchAllProducts } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState('');
  const [analytics, setAnalytics] = useState(null);        // { code, ...stats }
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [productSelectorSearch, setProductSelectorSearch] = useState('');

  useEffect(() => { fetchCoupons(); fetchAllProducts(); fetchCategories(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErrors({}); setProductSelectorSearch(''); setShowModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code || '', description: c.description || '',
      discount_type: c.discount_type || 'percentage',
      discount_value: c.discount_value ?? '',
      max_discount_cap: c.max_discount_cap ?? '',
      apply_on: c.apply_on || 'cart',
      applicable_products: c.applicable_products || [],
      applicable_categories: c.applicable_categories || [],
      validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
      validTo: c.validTo ? c.validTo.slice(0, 10) : '',
      usage_limit: c.usage_limit ?? '',
      min_order_amount: c.min_order_amount ?? '',
      isActive: c.isActive !== false,
      usageType: usageTypeFromLimit(c.per_user_limit ?? null),
      per_user_limit: (typeof c.per_user_limit === 'number' && c.per_user_limit > 1) ? c.per_user_limit : '',
    });
    setErrors({}); setProductSelectorSearch(''); setShowModal(true);
  };

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.code?.trim()) e.code = 'Code is required';
    if (!form.discount_value || Number(form.discount_value) <= 0) e.discount_value = 'Discount must be > 0';
    if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) e.discount_value = 'Max 100%';
    if (!form.validFrom) e.validFrom = 'Required';
    if (!form.validTo) e.validTo = 'Required';
    if (form.validFrom && form.validTo && new Date(form.validTo) <= new Date(form.validFrom))
      e.validTo = 'Must be after start date';
    if (form.usageType === 'multiple' && (!form.per_user_limit || Number(form.per_user_limit) < 1))
      e.per_user_limit = 'Enter a per-user limit ≥ 1';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { toast.error('Fix errors first'); return; }
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_discount_cap: (form.discount_type === 'percentage' && form.max_discount_cap)
          ? Number(form.max_discount_cap) : null,
        apply_on: form.apply_on,
        applicable_products: form.apply_on === 'product' ? form.applicable_products : [],
        applicable_categories: form.apply_on === 'category' ? form.applicable_categories : [],
        validFrom: form.validFrom,
        validTo: form.validTo,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        per_user_limit: resolvePerUserLimit(form),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
        isActive: form.isActive,
      };
      if (editing) { await updateCoupon(editing.code, payload); toast.success('Coupon updated!'); }
      else { await addCoupon(payload); toast.success('Coupon created!'); }
      setShowModal(false); fetchCoupons();
    } catch (err) { toast.error(err?.response?.data?.message || 'Save failed'); }
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`Delete coupon ${code}?`)) return;
    try { await deleteCoupon(code); toast.success('Deleted!'); }
    catch (err) { toast.error(err?.response?.data?.message || 'Delete failed'); }
  };

  const openAnalytics = async (code) => {
    setAnalytics({ code });           // open modal immediately in loading state
    setAnalyticsLoading(true);
    try {
      const data = await fetchCouponAnalytics(code);
      setAnalytics(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load analytics');
      setAnalytics(null);
    } finally { setAnalyticsLoading(false); }
  };

  // Human label for a coupon's per-user policy.
  const perUserLabel = (c) => {
    const l = c.per_user_limit;
    if (l === null || l === undefined) return 'Unlimited / user';
    if (l === 1) return '1 / user';
    return `${l} / user`;
  };

  const toggleProduct = (id) => set('applicable_products',
    form.applicable_products.includes(id) ? form.applicable_products.filter(x => x !== id) : [...form.applicable_products, id]);
  const toggleCategory = (id) => set('applicable_categories',
    form.applicable_categories.includes(id) ? form.applicable_categories.filter(x => x !== id) : [...form.applicable_categories, id]);

  const filtered = coupons.filter(c => c.code?.toLowerCase().includes(search.toLowerCase()));



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupon Codes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage discount coupons</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-orange-200">
          <Plus className="w-4 h-4" /> New Coupon
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search coupons…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#FF6B35]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No coupons yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Code', 'Discount', 'Applies To', 'Valid', 'Usage', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c.code} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">{c.code}</span>
                      {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-orange-600">
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `Rs. ${c.discount_value}`}
                      {c.discount_type === 'percentage' && c.max_discount_cap > 0 && (
                        <p className="text-[11px] text-purple-500 font-normal">Cap Rs. {c.max_discount_cap}</p>
                      )}
                      {c.min_order_amount > 0 && <p className="text-xs text-gray-400 font-normal">Min Rs. {c.min_order_amount}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{c.apply_on}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {c.validFrom ? new Date(c.validFrom).toLocaleDateString() : '—'} → {c.validTo ? new Date(c.validTo).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{c.usage_count || 0}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</span>
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1"><Users className="w-3 h-3" /> {perUserLabel(c)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openAnalytics(c.code)} title="Analytics" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"><BarChart3 className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(c)} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(c.code)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Code *" error={errors.code}>
                  <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="SAVE20" className={inputCls(errors.code)} />
                </Field>
                <Field label="Status">
                  <div className="flex items-center gap-3 h-[42px]">
                    <div onClick={() => set('isActive', !form.isActive)} className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300'} relative`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-sm text-gray-600">{form.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </Field>
              </div>

              <Field label="Description">
                <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional note" className={inputCls()} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Discount Type">
                  <select value={form.discount_type} onChange={e => set('discount_type', e.target.value)} className={inputCls()}>
                    {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label={`Value ${form.discount_type === 'percentage' ? '(%)' : '(Rs.)'} *`} error={errors.discount_value}>
                  <input type="number" min="0" max={form.discount_type === 'percentage' ? 100 : undefined}
                    value={form.discount_value} onChange={e => set('discount_value', e.target.value)}
                    placeholder={form.discount_type === 'percentage' ? '10' : '500'}
                    className={inputCls(errors.discount_value)} />
                </Field>
              </div>

              {form.discount_type === 'percentage' && (
                <Field label="Max Discount Cap (Rs.)">
                  <input type="number" min="1" value={form.max_discount_cap}
                    onChange={e => set('max_discount_cap', e.target.value)}
                    placeholder="e.g. 500 — so 20% off never exceeds Rs. 500"
                    className={inputCls()} />
                  <p className="mt-1 text-[11px] text-gray-400">Leave blank for no cap</p>
                </Field>
              )}

              <Field label="Applies To">
                <select value={form.apply_on} onChange={e => set('apply_on', e.target.value)} className={inputCls()}>
                  {APPLY_ON_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>

              {form.apply_on === 'product' && (
                <Field label="Select Products">
                  <div className="space-y-2">
                    {/* Search input */}
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search products…"
                        value={productSelectorSearch}
                        onChange={e => setProductSelectorSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]/50"
                      />
                    </div>
                    {/* Selected chips */}
                    {form.applicable_products.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.applicable_products.map(pid => {
                          const p = products.find(x => (x.id || x._id) === pid);
                          if (!p) return null;
                          return (
                            <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                              {p.name}
                              <button type="button" onClick={() => toggleProduct(pid)} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {/* Product list */}
                    <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-50">
                      {(() => {
                        const q = productSelectorSearch.trim().toLowerCase();
                        const visible = products.filter(p => !q || p.name?.toLowerCase().includes(q)).slice(0, 60);
                        if (visible.length === 0) return (
                          <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
                            <Package className="w-7 h-7 opacity-40" />
                            <span className="text-xs">{q ? 'No products match your search' : 'No products available'}</span>
                          </div>
                        );
                        return visible.map(p => {
                          const id = p.id || p._id;
                          const checked = form.applicable_products.includes(id);
                          return (
                            <label key={id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${checked ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                              <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-[#FF6B35] border-[#FF6B35]' : 'border-gray-300'}`}
                                onClick={() => toggleProduct(id)}>
                                {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                              </div>
                              <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                {p.imageUrl ? (
                                  <img src={getImageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                                )}
                              </div>
                              <span className="text-sm text-gray-700 flex-1 truncate" onClick={() => toggleProduct(id)}>{p.name}</span>
                              <span className="text-xs text-gray-400 flex-shrink-0">Rs. {p.price?.toLocaleString()}</span>
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </Field>
              )}

              {form.apply_on === 'category' && (
                <Field label="Select Categories">
                  <div className="border border-gray-200 rounded-xl max-h-36 overflow-y-auto p-2 space-y-1">
                    {categories.slice(0, 30).map(cat => {
                      const id = cat.id || cat._id;
                      const checked = form.applicable_categories.includes(id);
                      return (
                        <label key={id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${checked ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleCategory(id)} className="text-[#FF6B35]" />
                          <span className="text-sm text-gray-700">{cat.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Valid From *" error={errors.validFrom}>
                  <input type="date" value={form.validFrom} onChange={e => set('validFrom', e.target.value)} className={inputCls(errors.validFrom)} />
                </Field>
                <Field label="Valid To *" error={errors.validTo}>
                  <input type="date" value={form.validTo} onChange={e => set('validTo', e.target.value)} className={inputCls(errors.validTo)} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Global Usage Limit">
                  <input type="number" min="1" value={form.usage_limit} onChange={e => set('usage_limit', e.target.value)} placeholder="Unlimited" className={inputCls()} />
                </Field>
                <Field label="Min Order (Rs.)">
                  <input type="number" min="0" value={form.min_order_amount} onChange={e => set('min_order_amount', e.target.value)} placeholder="0" className={inputCls()} />
                </Field>
              </div>

              {/* Per-user usage controls */}
              <div className="rounded-xl border border-gray-200 p-3.5 bg-gray-50/60">
                <p className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5"><Users className="w-4 h-4 text-[#FF6B35]" /> Per-User Usage</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'single', label: 'Single use', desc: '1 per user', Icon: Check },
                    { v: 'multiple', label: 'Multiple', desc: 'N per user', Icon: Repeat },
                    { v: 'unlimited', label: 'Unlimited', desc: 'No per-user cap', Icon: InfinityIcon },
                  ].map(({ v, label, desc, Icon }) => {
                    const active = form.usageType === v;
                    return (
                      <button type="button" key={v} onClick={() => set('usageType', v)}
                        className={`flex flex-col items-center text-center gap-1 px-2 py-2.5 rounded-lg border text-xs transition ${active ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35] ring-1 ring-[#FF6B35]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                        <Icon className="w-4 h-4" />
                        <span className="font-semibold">{label}</span>
                        <span className="text-[10px] opacity-70">{desc}</span>
                      </button>
                    );
                  })}
                </div>
                {form.usageType === 'multiple' && (
                  <div className="mt-3">
                    <Field label="Uses allowed per user" error={errors.per_user_limit}>
                      <input type="number" min="1" value={form.per_user_limit} onChange={e => set('per_user_limit', e.target.value)} placeholder="e.g. 5" className={inputCls(errors.per_user_limit)} />
                    </Field>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition disabled:opacity-70">
                  {editing ? 'Update Coupon' : 'Create Coupon'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {analytics && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4" onClick={() => setAnalytics(null)}>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Analytics · <span className="font-mono">{analytics.code}</span>
              </h2>
              <button onClick={() => setAnalytics(null)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {analyticsLoading || analytics.usage_count === undefined ? (
              <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-emerald-500" /></div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Uses', value: analytics.usage_count ?? 0 },
                    { label: 'Remaining', value: analytics.remaining === null ? '∞' : analytics.remaining },
                    { label: 'Unique Users', value: analytics.unique_users ?? 0 },
                    { label: 'Discount Given', value: `Rs. ${(analytics.total_discount_given ?? 0).toLocaleString()}` },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">{s.value}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  Per-user limit: <span className="font-semibold text-gray-700">{analytics.per_user_limit === null || analytics.per_user_limit === undefined ? 'Unlimited' : analytics.per_user_limit}</span>
                  <span className="mx-1">·</span>
                  Global limit: <span className="font-semibold text-gray-700">{analytics.usage_limit === null || analytics.usage_limit === undefined ? 'Unlimited' : analytics.usage_limit}</span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Recent redemptions</p>
                  {(!analytics.recent_redemptions || analytics.recent_redemptions.length === 0) ? (
                    <p className="text-xs text-gray-400 py-4 text-center bg-gray-50 rounded-xl">No redemptions yet</p>
                  ) : (
                    <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-56 overflow-y-auto">
                      {analytics.recent_redemptions.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-700 truncate">{r.email || r.userId || r.phone || 'Guest'}</p>
                            <p className="text-gray-400">{r.used_at ? new Date(r.used_at).toLocaleString() : ''}</p>
                          </div>
                          <span className="font-semibold text-orange-600 whitespace-nowrap">Rs. {(r.discountAmount ?? 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
