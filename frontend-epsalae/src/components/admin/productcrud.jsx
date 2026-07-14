// src/pages/ProductCrud.jsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useProductStore } from '../store/productstore';
import { useCategoryStore } from '../store/categorystore';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Upload, Loader2, Search, X,
  Package, CheckCircle, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { getImageUrl } from '@/config';
import { TableSkeleton } from '../ui/Skeleton';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';

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
      console.log('💾 Saving product:', { productId, isEdit: !!productId, data });

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
      console.error('❌ Save failed:', error);
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
      console.log('🗑️ Attempting to delete product:', id);
      await deleteProduct(id);
      toast.success('Product deleted');
      fetchAllProducts();
    } catch (error) {
      console.error('❌ Delete failed:', error);
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
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your store inventory</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#FF6B35] hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <Plus size={16} /> Add New Product
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-[#1A3C8A]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-800">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Eye className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-lg font-bold text-gray-800">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Low Stock</p>
              <p className="text-lg font-bold text-gray-800">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-[#FF6B35]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Categories</p>
              <p className="text-lg font-bold text-gray-800">{categories.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">All Products</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none w-56"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">No products found</p>
            <p className="text-sm text-gray-400 mt-1">Add your first product to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-5 py-3 text-left">Product</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-center">Price</th>
                  <th className="px-5 py-3 text-center">Stock</th>
                  <th className="px-5 py-3 text-center">Offer</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((product) => (
                  <tr key={product._id || product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="overflow-hidden border border-gray-200 w-10 h-10 rounded-lg shrink-0">
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
                          <p className="font-semibold text-gray-800">{product.name}</p>
                          <p className="text-xs text-gray-400 line-clamp-1">{product.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {getCategoryName(product.category_id || product.categoryId || product.category?._id || product.category?.id || product.category)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="font-bold text-[#1A3C8A]">Rs. {product.price}</div>
                      {product.discountPrice > 0 && (
                        <div className="text-xs text-gray-400 line-through">Rs. {product.discountPrice}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        product.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {product.hasOffer ? (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF6B35]">Yes</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {product.isActive ? (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 inline-flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          title={`Edit ${product.name}`}
                          aria-label={`Edit ${product.name}`}
                          className="bg-[#1A3C8A] hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPendingDelete(product)}
                          title={`Delete ${product.name}`}
                          aria-label={`Delete ${product.name}`}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name *</label>
                <input required name="name" value={form.name} onChange={handleChange} placeholder="iPhone 15 Pro Max"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
                <select required name="category_id" value={form.category_id} onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none text-sm">
                  <option value="">Select category</option>
                  {categories.map(c => {
                    const catId = c._id || c.id;
                    return <option key={catId} value={catId}>{c.name}</option>;
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price (Rs.) *</label>
                  <input required type="number" name="price" value={form.price} onChange={handleChange} placeholder="29999"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Discount Price</label>
                  <input type="number" name="discountPrice" value={form.discountPrice} onChange={handleChange} placeholder="24999"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock Quantity</label>
                <input type="number" name="stock" value={form.stock} onChange={handleChange} placeholder="100"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                  placeholder="Describe this product..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none resize-none text-sm" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Image</label>
                <button type="button" onClick={() => document.getElementById('file-upload').click()} disabled={uploading}
                  className="w-full py-3 bg-[#1A3C8A] hover:bg-blue-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-70">
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
                  <input type="checkbox" name="hasOffer" checked={form.hasOffer} onChange={handleChange} className="w-4 h-4 text-[#FF6B35] rounded" />
                  <span className="font-medium text-gray-700">Has Special Offer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="w-4 h-4 text-[#1A3C8A] rounded" />
                  <span className="font-medium text-gray-700">Product is Active</span>
                </label>
              </div>

              {/* Optional sale scheduling — offer is only active within this window */}
              {form.hasOffer && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sale Start (optional)</label>
                    <input type="datetime-local" name="saleStartDate" value={form.saleStartDate} onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sale End (optional)</label>
                    <input type="datetime-local" name="saleEndDate" value={form.saleEndDate} onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
                  </div>
                </div>)}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSaving || uploading}
                  className="flex-1 py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 disabled:opacity-70">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button type="button" onClick={closeModal}
                  className="px-6 py-2.5 font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm transition">
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
