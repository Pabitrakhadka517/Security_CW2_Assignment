import { useEffect, useState } from 'react'
import { MapPin, Plus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { profileEndpoints } from '@/components/api/userapi'
import FetchState from '@/components/ui/FetchState'

const emptyForm = { label: '', addressLine: '', city: '', postalCode: '', country: 'Nepal', phone: '' }

export default function AddressesPage(){
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

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

  return (
    <div className="rounded-card bg-white p-4 sm:p-5 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-8">
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
          <input name="label" value={form.label} onChange={onChange} placeholder="Label (Home, Office...)" className="rounded-xl border border-slate-200 bg-white p-3 text-sm" />
          <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone (optional)" className="rounded-xl border border-slate-200 bg-white p-3 text-sm" />
          <input name="addressLine" value={form.addressLine} onChange={onChange} placeholder="Address line" className="rounded-xl border border-slate-200 bg-white p-3 text-sm sm:col-span-2" required />
          <input name="city" value={form.city} onChange={onChange} placeholder="City" className="rounded-xl border border-slate-200 bg-white p-3 text-sm" required />
          <input name="postalCode" value={form.postalCode} onChange={onChange} placeholder="Postal code" className="rounded-xl border border-slate-200 bg-white p-3 text-sm" required />
          <input name="country" value={form.country} onChange={onChange} placeholder="Country" className="rounded-xl border border-slate-200 bg-white p-3 text-sm" required />
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
              <div key={i} className="rounded-xl sm:rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm">
                <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><MapPin className="h-4 w-4 text-emerald-600" /> {a.label || 'Address'}</div>
                <p className="text-sm text-slate-600">{a.addressLine}</p>
                <p className="text-sm text-slate-600">{a.city}, {a.postalCode}</p>
                <p className="text-sm text-slate-600">{a.country}</p>
                {a.phone && <p className="mt-1 text-sm text-slate-500">📞 {a.phone}</p>}
              </div>
            ))}
          </div>
        </FetchState>
      </div>
    </div>
  )
}
