// src/pages/CategoryCrud.jsx
import { useState, useEffect } from 'react';
import { useCategoryStore } from '../store/categorystore';
import { useProductStore } from '../store/productstore';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Search, Upload, X, Loader2,
  Tag, Image as ImageIcon, Eye, EyeOff
} from 'lucide-react';
import { openCloudinaryWidget } from '../../utils/cloudinary';
import { TableSkeleton } from '../ui/Skeleton';
import { getImageUrl } from '@/config';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';

export default function CategoryCrud() {
  const { categories, loading, fetchCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore();
  const { products, fetchProducts, deleteProduct } = useProductStore();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: null,
    isActive: true,
  });

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const getProductCount = (categoryId) => {
    if (!categoryId || !products.length) return 0;
    return products.filter(p => {
      const prodCatId = p.category_id || p.categoryId || p.category?._id || p.category?.id || p.category;
      return prodCatId === categoryId;
    }).length;
  };

  const handleNameChange = (name) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setForm(prev => ({ ...prev, name, slug }));
  };

  const openUploadWidget = () => {
    setUploading(true);
    openCloudinaryWidget(
      {
        cloudName: 'dycex9eui',
        uploadPreset: 'epasaley-categories',
        sources: ['local', 'url', 'camera'],
        multiple: false,
        cropping: true,
        croppingAspectRatio: 1,
        showSkipCropButton: false,
        styles: {
          palette: {
            window: "#ffffff",
            sourceBg: "#f8f8f8",
            windowBorder: "#FF6B35",
            tabIcon: "#FF6B35",
            inactiveTabIcon: "#555",
            link: "#FF6B35",
            action: "#FF6B35"
          }
        }
      },
      (error, result) => {
        setUploading(false);
        if (!error && result?.event === 'success') {
          setForm(prev => ({ ...prev, imageUrl: result.info.secure_url }));
          toast.success('Image uploaded!');
        }
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Category name is required');
    if (!form.description.trim()) return toast.error('Description is required');
    if (!form.imageUrl) return toast.error('Please upload an image');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl,
      isActive: form.isActive,
    };

    try {
      const categoryId = editingCat?._id || editingCat?.id;
      console.log('💾 Saving category:', { categoryId, isEdit: !!categoryId, payload });

      if (categoryId) {
        await updateCategory(categoryId, payload);
        toast.success('Category updated successfully!');
      } else {
        await addCategory(payload);
        toast.success('Category created successfully!');
      }
      closeModal();
      await fetchCategories();
    } catch (error) {
      console.error('❌ Save failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to save category');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCat(null);
    setForm({ name: '', slug: '', description: '', imageUrl: null, isActive: true });
  };

  const handleEdit = (cat) => {
    setEditingCat(cat);
    setForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      imageUrl: cat.imageUrl || null,
      isActive: cat.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      console.log('🗑️ Deleting category:', id);
      await deleteCategory(id);
      toast.success('Category deleted');
      await fetchCategories();
      await fetchProducts();
    } catch (error) {
      console.error('❌ Delete failed:', error);
      toast.error(error?.response?.data?.message || 'Delete failed');
    }
  };

  const filtered = categories.filter(cat =>
    cat.name?.toLowerCase().includes(search.toLowerCase()) ||
    cat.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = categories.filter(c => c.isActive !== false).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organize your products with categories</p>
        </div>
        <button
          onClick={() => {
            setEditingCat(null);
            setForm({ name: '', slug: '', description: '', imageUrl: null, isActive: true });
            setShowModal(true);
          }}
          className="bg-[#FF6B35] hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Tag className="w-4 h-4 text-[#1A3C8A]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-800">{categories.length}</p>
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
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Products</p>
              <p className="text-lg font-bold text-gray-800">{products.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">All Categories</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none w-56"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">No categories found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first category to organize products</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Slug</th>
                  <th className="px-5 py-3 text-center">Products</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((cat) => (
                  <tr key={cat._id || cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden border border-gray-200 rounded-lg flex-shrink-0">
                          {cat.imageUrl ? (
                            <img src={getImageUrl(cat.imageUrl)} alt={cat.name} className="object-cover w-full h-full" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full bg-gray-100">
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{cat.name}</p>
                          <p className="text-xs text-gray-400 line-clamp-1">{cat.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <code className="px-2 py-1 font-mono text-xs text-gray-600 bg-gray-100 rounded">
                        /{cat.slug}
                      </code>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {(() => {
                        const count = cat.productCount ?? getProductCount(cat._id || cat.id);
                        return (
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {count} {count === 1 ? 'Product' : 'Products'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {cat.isActive ? (
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
                        <button onClick={() => handleEdit(cat)} title={`Edit ${cat.name}`} aria-label={`Edit ${cat.name}`} className="bg-[#1A3C8A] hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-sm">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setPendingDelete(cat)} title={`Delete ${cat.name}`} aria-label={`Delete ${cat.name}`} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm">
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
        title={editingCat ? 'Edit Category' : 'Create New Category'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Fashion, Electronics, Home & Living"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug (Auto-generated)</label>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">store.com/</span>
                  <input readOnly value={form.slug} placeholder="fashion"
                    className="flex-1 px-4 py-2.5 text-gray-500 bg-gray-50 rounded-xl border border-gray-200 cursor-not-allowed" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description *</label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief description for SEO and display..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none resize-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category Image (1:1) *</label>
                {!form.imageUrl ? (
                  <button type="button" onClick={openUploadWidget} disabled={uploading}
                    className="w-full py-3 bg-[#1A3C8A] hover:bg-blue-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-70">
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Image</>}
                  </button>
                ) : (
                  <div className="relative overflow-hidden border border-gray-200 rounded-xl">
                    <img src={getImageUrl(form.imageUrl)} alt="Category" className="object-cover w-full h-48" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition">
                      <button type="button" onClick={openUploadWidget}
                        className="px-4 py-2 bg-white text-[#1A3C8A] font-semibold rounded-lg text-sm hover:bg-gray-100 transition">
                        Change Image
                      </button>
                    </div>
                    <button onClick={() => setForm(prev => ({ ...prev, imageUrl: null }))}
                      className="absolute top-2 right-2 p-1.5 text-white bg-red-600 rounded-full hover:bg-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 py-1">
                <input type="checkbox" id="active" checked={form.isActive}
                  onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-[#FF6B35] rounded" />
                <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Category is Active (Visible on site)
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={uploading}
                  className="flex-1 py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition disabled:opacity-70">
                  {editingCat ? 'Update Category' : 'Create Category'}
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
        title={`Delete ${pendingDelete?.name ?? 'this category'}?`}
        description={
          pendingDelete && getProductCount(pendingDelete._id || pendingDelete.id) > 0
            ? `The ${getProductCount(pendingDelete._id || pendingDelete.id)} product${getProductCount(pendingDelete._id || pendingDelete.id) === 1 ? '' : 's'} in this category will be hidden until reassigned. This can't be undone.`
            : "This can't be undone."
        }
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
