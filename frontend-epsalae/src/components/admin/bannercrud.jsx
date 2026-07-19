// src/components/admin/BannerCRUD.jsx
import { useState, useEffect } from 'react';
import { useBannerStore } from '../store/bannerstore';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Upload, Loader2, X, Eye, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { getImageUrl } from '@/config';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import { TableSkeleton } from '../ui/Skeleton';
import FetchState from '../ui/FetchState';
import StatusPill from '../ui/StatusPill';

export default function BannerCRUD() {
  const { banners, loading, error, fetchBanners, addBanner, updateBanner, deleteBanner } = useBannerStore();

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
    <div className="ds-page space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ds-page-title">Banners</h1>
          <p className="ds-page-sub">Manage hero banners & promotional sliders</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="ds-btn ds-btn-primary"
        >
          <Plus size={16} /> Add Banner
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="ds-card ds-card-pad">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-[#1E293B]" />
            </div>
            <div>
              <p className="text-xs text-(--ds-text-muted)">Total</p>
              <p className="text-lg font-bold text-(--ds-text)">{banners.length}</p>
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
            <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-(--ds-text-muted)">Inactive</p>
              <p className="text-lg font-bold text-(--ds-text)">{banners.length - activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Banners Grid or Empty State */}
      <FetchState
        isLoading={loading}
        isError={!!error && banners.length === 0}
        isEmpty={!loading && !error && banners.length === 0}
        loading={<TableSkeleton rows={5} cols={4} />}
        errorTitle="Couldn't load banners"
        errorDescription="Something went wrong. Check your connection and try again."
        onRetry={fetchBanners}
        emptyIcon={Upload}
        emptyTitle="No banners yet"
        emptyDescription="Create your first promotional banner!"
        emptyAction={
          <button
            onClick={() => setShowModal(true)}
            className="ds-btn ds-btn-primary"
          >
            <Plus className="w-4 h-4" /> Create first banner
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <div key={banner._id || banner.id}
              className="ds-card overflow-hidden hover:shadow-md transition-shadow">
              {/* Image */}
              <div className="relative bg-gray-100 aspect-video">
                <img
                  src={getImageUrl(banner.imageUrl, '/placeholder-banner.jpg')}
                  alt={banner.title}
                  className="object-cover w-full h-full"
                />
                <div className="absolute top-3 right-3">
                  <StatusPill isActive={banner.isActive} />
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-(--ds-text)">{banner.title}</h3>
                {banner.subtitle && (
                  <p className="text-xs text-(--ds-text-muted) mt-0.5 line-clamp-1">{banner.subtitle}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-4 pb-4">
                <button onClick={() => handleEdit(banner)}
                  title={`Edit ${banner.title}`}
                  aria-label={`Edit ${banner.title}`}
                  className="ds-btn ds-btn-blue flex-1 py-2">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setPendingDelete(banner)}
                  title={`Delete ${banner.title}`}
                  aria-label={`Delete ${banner.title}`}
                  className="ds-btn ds-btn-danger flex-1 py-2">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </FetchState>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingBanner ? 'Edit Banner' : 'Create New Banner'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="ds-label">Banner Title *</label>
                <input type="text" placeholder="e.g. Summer Sale 2025" value={form.title}
                  onChange={(e) => { setForm({ ...form, title: e.target.value }); setErrors({ ...errors, title: '' }); }}
                  className={`ds-input ${errors.title ? 'ds-input--error' : ''}`} />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="ds-label">Subtitle (Optional)</label>
                <input type="text" placeholder="Up to 50% off on selected items" value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="ds-input" />
              </div>

              <div>
                <label className="ds-label">Banner Image * <span className="font-normal text-gray-400">(Recommended: 1920×600)</span></label>
                <div className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
                  ${errors.imageUrl ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-[#047857] bg-gray-50'}`}>
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
                  className="w-4 h-4 text-[#047857] rounded" />
                <label htmlFor="active" className="text-sm font-medium text-(--ds-text) cursor-pointer">Banner is Active</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSaving || uploading}
                  className="ds-btn ds-btn-primary flex-1">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingBanner ? 'Update Banner' : 'Create Banner'}
                </button>
                <button type="button" onClick={closeModal} className="ds-btn ds-btn-secondary">
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
