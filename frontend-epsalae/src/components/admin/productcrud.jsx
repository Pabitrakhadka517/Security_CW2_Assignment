// src/pages/ProductCrud.jsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useProductStore } from '../store/productstore';
import { useCategoryStore } from '../store/categorystore';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Upload, Loader2, Search, X,
  Package, CheckCircle, AlertCircle, Eye
} from 'lucide-react';
import { getImageUrl } from '@/config';
import { TableSkeleton } from '../ui/Skeleton';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import StatusPill from '../ui/StatusPill';

export default function ProductCrud() {
  const { products, loading, fetchProducts, fetchAllProducts, addProduct, updateProduct, deleteProduct } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const defaultForm = {
    name: '', description: '', price: '', discountPrice: 0,
    stock: '', category_id: '', hasOffer: false, isActive: true, imageUrl: '',
    saleStartDate: '', saleEndDate: ''
  };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    // Admin sees the full catalogue, including inactive/hidden products.
    fetchAllProducts();
    fetchCategories();
  }, []);

  // If we arrived here from "Create a new product" (e.g. from the Add-to-Sale
  // picker), open the create modal with the typed name prefilled.
  const location = useLocation();
  useEffect(() => {
    const createName = location.state?.createName;
    if (createName !== undefined && createName !== null) {
      setEditingProduct(null);
      setForm({ ...defaultForm, name: createName });
      setPreviewImage(null);
      setShowModal(true);
      window.history.replaceState({}, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('Image must be under 10MB');
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result;
      setForm(prev => ({ ...prev, imageUrl: base64 }));
      setPreviewImage(base64);
      toast.success('Image selected');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category_id) {
      return toast.error('Name, Price & Category required');
    }
    setIsSaving(true);
    try {
      const data = {
        ...form,
        price: parseFloat(form.price),
        discountPrice: parseFloat(form.discountPrice) || 0,
        stock: parseInt(form.stock) || 0,
        saleStartDate: form.saleStartDate ? new Date(form.saleStartDate).toISOString() : null,
        saleEndDate: form.saleEndDate ? new Date(form.saleEndDate).toISOString() : null,
      };

      const productId = editingProduct?._id || editingProduct?.id;

      if (productId) {
        await updateProduct(productId, data);
        toast.success('Product updated!');
      } else {
        await addProduct(data);
        toast.success('Product created!');
      }
      closeModal();
      await fetchAllProducts();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    const catId = product.category_id || product.categoryId || product.category?._id || product.category?.id || product.category || '';
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      discountPrice: product.discountPrice || 0,
      stock: product.stock || 0,
      category_id: catId,
      hasOffer: product.hasOffer || false,
      isActive: product.isActive !== false,
      imageUrl: product.imageUrl || '',
      saleStartDate: product.saleStartDate ? product.saleStartDate.slice(0, 16) : '',
      saleEndDate: product.saleEndDate ? product.saleEndDate.slice(0, 16) : '',
    });
    setPreviewImage(product.imageUrl ? getImageUrl(product.imageUrl) : null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      fetchAllProducts();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Delete failed');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setForm(defaultForm);
    setPreviewImage(null);
  };

  const getCategoryName = (catId) => {
    if (!catId) return '—';
    const found = categories.find(c =>
      c._id === catId || c.id === catId ||
      String(c._id) === String(catId) || String(c.id) === String(catId)
    );
    return found?.name || '—';
  };

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    getCategoryName(p.category_id || p.categoryId)?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = products.filter(p => p.isActive !== false).length;
  const lowStockCount = products.filter(p => p.stock <= 5).length;

  return (
    <div className="ds-page space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ds-page-title">Products</h1>
          <p className="ds-page-sub">Manage your store inventory</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="ds-btn ds-btn-primary"
        >
          <Plus size={16} /> Add New Product
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="ds-card ds-card-pad">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-[#1E293B]" />
            </div>
            <div>
              <p className="text-xs text-(--ds-text-muted)">Total</p>
              <p className="text-lg font-bold text-(--ds-text)">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="ds-card ds-card-pad">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Eye className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-(--ds-text-muted)">Active</p>
              <p className="text-lg font-bold text-(--ds-text)">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="ds-card ds-card-pad">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-(--ds-text-muted)">Low Stock</p>
              <p className="text-lg font-bold text-(--ds-text)">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="ds-card ds-card-pad">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-[#047857]" />
            </div>
            <div>
              <p className="text-xs text-(--ds-text-muted)">Categories</p>
              <p className="text-lg font-bold text-(--ds-text)">{categories.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="ds-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--ds-border)">
          <h2 className="ds-section-title">All Products</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--ds-text-faint)" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ds-input pl-9 w-56"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-(--ds-text-faint) mx-auto mb-3" />
            <p className="font-semibold text-(--ds-text-muted)">No products found</p>
            <p className="text-sm text-(--ds-text-faint) mt-1">Add your first product to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="text-left">Product</th>
                  <th className="text-left">Category</th>
                  <th className="text-center">Price</th>
                  <th className="text-center">Stock</th>
                  <th className="text-center">Offer</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product._id || product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="overflow-hidden border border-(--ds-border-strong) w-10 h-10 rounded-lg shrink-0">
                          {product.imageUrl ? (
                            <img
                              src={getImageUrl(product.imageUrl)}
                              alt={product.name}
                              className="object-cover w-full h-full"
                              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div class="flex items-center justify-center w-full h-full bg-gray-100"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>' }}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full bg-gray-100">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-(--ds-text)">{product.name}</p>
                          <p className="text-xs text-(--ds-text-faint) line-clamp-1">{product.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="ds-badge ds-badge-info">
                        {getCategoryName(product.category_id || product.categoryId || product.category?._id || product.category?.id || product.category)}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="font-bold text-[#1E293B]">Rs. {product.price}</div>
                      {product.discountPrice > 0 && (
                        <div className="text-xs text-(--ds-text-faint) line-through">Rs. {product.discountPrice}</div>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`ds-badge ${
                        product.stock === 0 ? 'ds-badge-danger'
                        : product.stock <= 10 ? 'ds-badge-warning'
                        : 'ds-badge-success'
                      }`}>
                        {product.stock === 0 ? 'Out of stock'
                          : product.stock <= 10 ? `Low: ${product.stock}`
                          : `In stock: ${product.stock}`}
                      </span>
                    </td>
                    <td className="text-center">
                      {product.hasOffer ? (
                        <span className="ds-badge ds-badge-warning">Yes</span>
                      ) : (
                        <span className="text-xs text-(--ds-text-faint)">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <StatusPill isActive={product.isActive} />
                    </td>
                    <td>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          title={`Edit ${product.name}`}
                          aria-label={`Edit ${product.name}`}
                          className="ds-btn ds-btn-blue ds-btn-icon"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPendingDelete(product)}
                          title={`Delete ${product.name}`}
                          aria-label={`Delete ${product.name}`}
                          className="ds-btn ds-btn-danger ds-btn-icon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingProduct ? 'Edit Product' : 'Create New Product'}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div>
                <label className="ds-label">Product Name *</label>
                <input required name="name" value={form.name} onChange={handleChange} placeholder="iPhone 15 Pro Max"
                  className="ds-input" />
              </div>
              <div>
                <label className="ds-label">Category *</label>
                <select required name="category_id" value={form.category_id} onChange={handleChange}
                  className="ds-input">
                  <option value="">Select category</option>
                  {categories.map(c => {
                    const catId = c._id || c.id;
                    return <option key={catId} value={catId}>{c.name}</option>;
                  })}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">Price (Rs.) *</label>
                  <input required type="number" name="price" value={form.price} onChange={handleChange} placeholder="29999"
                    className="ds-input" />
                </div>
                <div>
                  <label className="ds-label">Discount Price</label>
                  <input type="number" name="discountPrice" value={form.discountPrice} onChange={handleChange} placeholder="24999"
                    className="ds-input" />
                </div>
              </div>
              <div>
                <label className="ds-label">Stock Quantity</label>
                <input type="number" name="stock" value={form.stock} onChange={handleChange} placeholder="100"
                  className="ds-input" />
              </div>
              <div>
                <label className="ds-label">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                  placeholder="Describe this product..."
                  className="ds-textarea resize-none" />
              </div>

              <div>
                <label className="ds-label">Product Image</label>
                <button type="button" onClick={() => document.getElementById('file-upload').click()} disabled={uploading}
                  className="ds-btn ds-btn-blue w-full">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
                <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {previewImage && (
                  <div className="relative mt-3 overflow-hidden rounded-xl">
                    <img src={previewImage} alt="Preview" className="object-cover w-full h-48" />
                    <button type="button" onClick={() => { setPreviewImage(null); setForm(p => ({ ...p, imageUrl: '' })); }}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-6 py-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" name="hasOffer" checked={form.hasOffer} onChange={handleChange} className="w-4 h-4 text-[#047857] rounded" />
                  <span className="font-medium text-(--ds-text)">Has Special Offer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="w-4 h-4 text-[#1E293B] rounded" />
                  <span className="font-medium text-(--ds-text)">Product is Active</span>
                </label>
              </div>

              {/* Optional sale scheduling — offer is only active within this window */}
              {form.hasOffer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ds-label">Sale Start (optional)</label>
                    <input type="datetime-local" name="saleStartDate" value={form.saleStartDate} onChange={handleChange}
                      className="ds-input" />
                  </div>
                  <div>
                    <label className="ds-label">Sale End (optional)</label>
                    <input type="datetime-local" name="saleEndDate" value={form.saleEndDate} onChange={handleChange}
                      className="ds-input" />
                  </div>
                </div>)}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSaving || uploading}
                  className="ds-btn ds-btn-primary flex-1">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button type="button" onClick={closeModal}
                  className="ds-btn ds-btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Delete ${pendingDelete?.name ?? 'this product'}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true);
          await handleDelete(pendingDelete._id || pendingDelete.id);
          setIsDeleting(false);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
