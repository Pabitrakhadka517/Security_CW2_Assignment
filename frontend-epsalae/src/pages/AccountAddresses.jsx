import { useEffect, useState } from 'react'
import { MapPin, Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { profileEndpoints } from '@/components/api/userapi'
import FetchState from '@/components/ui/FetchState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'

const emptyForm = { label: '', addressLine: '', city: '', postalCode: '', country: 'Nepal', phone: '' }

const fieldLabelCls = 'block mb-1 text-xs font-medium text-slate-700'
const requiredMark = <span className="text-red-500 ml-0.5" aria-label="required">*</span>

function AddressFormFields({ idPrefix, values, onChange }) {
  const id = (name) => `${idPrefix}-${name}`
  return (
    <>
      <div>
        <label className={fieldLabelCls} htmlFor={id('label')}>Label</label>
        <input id={id('label')} name="label" value={values.label} onChange={onChange} placeholder="Home, Office..." className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />
      </div>
      <div>
        <label className={fieldLabelCls} htmlFor={id('phone')}>Phone number</label>
        <input id={id('phone')} name="phone" value={values.phone} onChange={onChange} placeholder="Optional" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />
      </div>
      <div className="sm:col-span-2">
        <label className={fieldLabelCls} htmlFor={id('addressLine')}>Street address{requiredMark}</label>
        <input id={id('addressLine')} name="addressLine" value={values.addressLine} onChange={onChange} placeholder="House no., street, area" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" required />
      </div>
      <div>
        <label className={fieldLabelCls} htmlFor={id('city')}>City{requiredMark}</label>
        <input id={id('city')} name="city" value={values.city} onChange={onChange} placeholder="City" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" required />
      </div>
      <div>
        <label className={fieldLabelCls} htmlFor={id('postalCode')}>Postal code{requiredMark}</label>
        <input id={id('postalCode')} name="postalCode" value={values.postalCode} onChange={onChange} placeholder="Postal code" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" required />
      </div>
      <div>
        <label className={fieldLabelCls} htmlFor={id('country')}>Country{requiredMark}</label>
        <input id={id('country')} name="country" value={values.country} onChange={onChange} placeholder="Country" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" required />
      </div>
    </>
  )
}

export default function AddressesPage(){
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [editModal, setEditModal] = useState({ isOpen: false, index: null })
  const [editForm, setEditForm] = useState(emptyForm)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, index: null })
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await profileEndpoints.addresses.list()
      const list = res.data?.data || res.data || []
      setAddresses(Array.isArray(list) ? list : [])
    } catch (e) {
      setAddresses([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onSave = async (e) => {
    e?.preventDefault?.()
    setError('')
    if (!form.addressLine || !form.city || !form.postalCode || !form.country) {
      setError('Address line, city, postal code and country are required.')
      return
    }
    setSaving(true)
    try {
      const res = await profileEndpoints.addresses.add(form)
      const next = res.data?.data?.savedAddresses || res.data?.savedAddresses
      if (Array.isArray(next)) {
        setAddresses(next)
      } else {
        // Fallback: append locally and refetch to stay accurate.
        setAddresses((prev) => [...prev, form])
        load()
      }
      toast.success('Address saved')
      setForm(emptyForm)
      setShowForm(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const openEditAddress = (address, index) => {
    setEditError('')
    setEditForm({
      label: address.label || '',
      addressLine: address.addressLine || '',
      city: address.city || '',
      postalCode: address.postalCode || '',
      country: address.country || 'Nepal',
      phone: address.phone || '',
    })
    setEditModal({ isOpen: true, index })
  }

  const onEditChange = (e) => setEditForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onEditSave = async (e) => {
    e?.preventDefault?.()
    setEditError('')
    if (!editForm.addressLine || !editForm.city || !editForm.postalCode || !editForm.country) {
      setEditError('Address line, city, postal code and country are required.')
      return
    }
    setEditSaving(true)
    try {
      const res = await profileEndpoints.addresses.update(editModal.index, editForm)
      const next = res.data?.data?.savedAddresses || res.data?.savedAddresses
      if (Array.isArray(next)) {
        setAddresses(next)
      } else {
        load()
      }
      toast.success('Address updated')
      setEditModal({ isOpen: false, index: null })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update address')
    } finally {
      setEditSaving(false)
    }
  }

  const deleteAddress = async (index) => {
    setDeleting(true)
    try {
      await profileEndpoints.addresses.remove(index)
      toast.success('Address deleted')
      setDeleteConfirm({ isOpen: false, index: null })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete address')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-card bg-white p-4 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Saved Addresses</h3>
          <p className="mt-1 text-sm text-slate-500">Use your saved addresses to autofill checkout faster.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'Add address'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSave} className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <AddressFormFields idPrefix="add" values={form} onChange={onChange} />
          {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
          <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60 sm:col-span-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save address'}
          </button>
        </form>
      )}

      <div className="mt-6">
        <FetchState
          isLoading={loading}
          isError={loadError}
          isEmpty={!loading && !loadError && addresses.length === 0}
          loading={(
            <div className="grid gap-4 sm:grid-cols-2">
              {[1,2].map((i)=>(<div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />))}
            </div>
          )}
          errorTitle="Couldn't load your addresses"
          errorDescription="Something went wrong. Check your connection and try again."
          onRetry={load}
          emptyTitle="No saved addresses"
          emptyDescription="Add an address to speed up checkout."
          emptyAction={(
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-btn bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              <Plus className="h-4 w-4" /> Add address
            </button>
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((a, i) => (
              <div key={i} className="rounded-xl sm:rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm">
                <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><MapPin className="h-4 w-4 text-emerald-600" /> {a.label || 'Address'}</div>
                <p className="text-sm text-slate-600">{a.addressLine}</p>
                <p className="text-sm text-slate-600">{a.city}, {a.postalCode}</p>
                <p className="text-sm text-slate-600">{a.country}</p>
                {a.phone && <p className="mt-1 text-sm text-slate-500">Phone: {a.phone}</p>}

                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEditAddress(a, i)}
                    className="text-xs text-green-700 hover:text-green-900 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, index: i })}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </FetchState>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete address?"
        description="This address will be permanently removed from your account."
        confirmLabel="Delete address"
        isLoading={deleting}
        onConfirm={() => deleteAddress(deleteConfirm.index)}
        onCancel={() => setDeleteConfirm({ isOpen: false, index: null })}
      />

      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, index: null })}
        title="Edit address"
      >
        <form onSubmit={onEditSave} className="grid gap-3 sm:grid-cols-2">
          <AddressFormFields idPrefix="edit" values={editForm} onChange={onEditChange} />
          {editError && <p className="text-sm text-rose-600 sm:col-span-2">{editError}</p>}
          <button disabled={editSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60 sm:col-span-2">
            {editSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save changes'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
