// src/components/admin/BannerCRUD.jsx
import { useState, useEffect } from 'react';
import { useBannerStore } from '../store/bannerstore';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Upload, Loader2, X, Eye, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { getImageUrl } from '@/config';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import { TableSkeleton } from '../ui/Skeleton';

export default function BannerCRUD() {
  const { banners, loading, fetchBanners, addBanner, updateBanner, deleteBanner } = useBannerStore();

  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    isActive: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const validateForm = () => {
    const newErrors = {};
    if (!form.title?.trim()) newErrors.title = 'Title is required';
    if (!form.imageUrl) newErrors.imageUrl = 'Please upload a banner image';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select a valid image'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setForm(prev => ({ ...prev, imageUrl: evt.target.result }));
      setUploading(false);
      toast.success('Image uploaded successfully!');
    };
    reader.onerror = () => { setUploading(false); toast.error('Failed to read image'); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) { toast.error('Please fix the errors'); return; }
    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle?.trim() || '',
        imageUrl: form.imageUrl,
        isActive: form.isActive,
      };
      if (editingBanner) {
        await updateBanner(editingBanner._id || editingBanner.id, payload);
        toast.success('Banner updated!');
      } else {
        await addBanner(payload);
        toast.success('Banner created!');
      }
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save banner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setForm({ title: banner.title || '', subtitle: banner.subtitle || '', imageUrl: banner.imageUrl || '', isActive: banner.isActive ?? true });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async (banner) => {
    try {
      await deleteBanner(banner._id || banner.id);
      toast.success('Banner deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBanner(null);
    setForm({ title: '', subtitle: '', imageUrl: '', isActive: true });
    setErrors({});
  };

  const activeCount = banners.filter(b => b.isActive !== false).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Banners</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage hero banners & promotional sliders</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#FF6B35] hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <Plus size={16} /> Add Banner
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-[#1A3C8A]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-800">{banners.length}</p>
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
            <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Inactive</p>
              <p className="text-lg font-bold text-gray-800">{banners.length - activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Banners Grid or Empty State */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-xl">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-600">No banners yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first promotional banner!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <div key={banner._id || banner.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Image */}
              <div className="relative bg-gray-100 aspect-video">
                <img
                  src={getImageUrl(banner.imageUrl, '/placeholder-banner.jpg')}
                  alt={banner.title}
                  className="object-cover w-full h-full"
                />
                <div className="absolute top-3 right-3">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1
                    ${banner.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {banner.isActive ? <CheckCircle className="w-3 h-3" /> : null}
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-800">{banner.title}</h3>
                {banner.subtitle && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{banner.subtitle}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-4 pb-4">
                <button onClick={() => handleEdit(banner)}
                  title={`Edit ${banner.title}`}
                  aria-label={`Edit ${banner.title}`}
                  className="flex-1 py-2 bg-[#1A3C8A] hover:bg-blue-900 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setPendingDelete(banner)}
                  title={`Delete ${banner.title}`}
                  aria-label={`Delete ${banner.title}`}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingBanner ? 'Edit Banner' : 'Create New Banner'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Banner Title *</label>
                <input type="text" placeholder="e.g. Summer Sale 2025" value={form.title}
                  onChange={(e) => { setForm({ ...form, title: e.target.value }); setErrors({ ...errors, title: '' }); }}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition
                    ${errors.title ? 'border-red-400' : 'border-gray-200 focus:border-[#FF6B35]'}`} />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subtitle (Optional)</label>
                <input type="text" placeholder="Up to 50% off on selected items" value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none text-sm" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Banner Image * <span className="font-normal text-gray-400">(Recommended: 1920×600)</span></label>
                <div className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
                  ${errors.imageUrl ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-[#FF6B35] bg-gray-50'}`}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading}
                    className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className={`w-8 h-8 mx-auto mb-2 text-gray-400 ${uploading ? 'animate-bounce' : ''}`} />
                  <p className="text-sm font-medium text-gray-600">
                    {uploading ? 'Uploading...' : form.imageUrl ? 'Click to replace image' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                </div>
                {errors.imageUrl && <p className="mt-1 text-xs text-red-600">{errors.imageUrl}</p>}
              </div>

              {form.imageUrl && (
                <div className="relative overflow-hidden rounded-xl">
                  <img src={form.imageUrl} alt="Preview" className="object-cover w-full h-40" />
                  <button type="button" onClick={() => setForm({ ...form, imageUrl: '' })}
                    className="absolute top-2 right-2 p-1.5 text-white bg-red-500 rounded-full hover:bg-red-600 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 py-1">
                <input type="checkbox" id="active" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-[#FF6B35] rounded" />
                <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer">Banner is Active</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSaving || uploading}
                  className="flex-1 py-2.5 bg-[#FF6B35] hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 disabled:opacity-70">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingBanner ? 'Update Banner' : 'Create Banner'}
                </button>
                <button type="button" onClick={closeModal} className="px-6 py-2.5 font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm transition">
                  Cancel
                </button>
              </div>
            </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Delete ${pendingDelete?.title ?? 'this banner'}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true);
          await handleDelete(pendingDelete);
          setIsDeleting(false);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
