import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Calendar, CreditCard, Download, MapPin, Package, Printer, RotateCcw, Truck, CircleCheckBig } from 'lucide-react'
import toast from 'react-hot-toast'
import userApi from '@/components/api/userapi'
import { useCart } from '@/store/cartstore'

// Hide everything except the invoice when printing
const PRINT_STYLE = `
@media print {
  body > * { display: none !important; }
  #invoice-printable { display: block !important; }
  #invoice-printable { position: fixed; inset: 0; background: white; z-index: 9999; overflow: auto; padding: 24px; }
  .no-print { display: none !important; }
}
`

const statusTone = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200',
  out_for_delivery: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const timeline = [
  { key: 'pending', label: 'Order placed', desc: 'We received your order' },
  { key: 'confirmed', label: 'Confirmed', desc: 'Payment/confirmation completed' },
  { key: 'processing', label: 'Processing', desc: 'Items are being prepared' },
  { key: 'shipped', label: 'Shipped', desc: 'Courier picked up the parcel' },
  { key: 'out_for_delivery', label: 'Out for delivery', desc: 'On the way to your address' },
  { key: 'delivered', label: 'Delivered', desc: 'Package delivered successfully' },
]

export default function OrderInvoice() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // Owner-checked single-order endpoint — no more fetching 100 orders
        // and filtering client-side.
        const res = await userApi.get(`/orders/my/${encodeURIComponent(orderId)}`)
        const data = res.data?.data || null
        setOrders(data ? [data] : [])
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load order')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId])

  const order = useMemo(() => {
    return orders.find((o) => String(o.id || o._id) === String(orderId)) || null
  }, [orders, orderId])

  const subtotal = order?.items?.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0) || 0
  const couponDiscount = order?.discountAmount || 0
  const vatAmount = order?.vatAmount || 0
  const discountedSubtotal = subtotal - couponDiscount
  const shipping = discountedSubtotal >= 5000 ? 0 : 150
  const total = Number(order?.totalAmount) || (discountedSubtotal + vatAmount + shipping)
  const status = (order?.status || 'pending').toLowerCase()

  const reorder = () => {
    if (!order?.items?.length) return
    order.items.forEach((item) => {
      addToCart({
        id: item.productId || item.id,
        _id: item.productId || item.id,
        name: item.name,
        price: Number(item.price || 0),
        image: item.imageUrl,
        quantity: Number(item.quantity || 1),
      })
    })
    toast.success('Items added back to cart')
    navigate('/cart')
  }

  const printInvoice = () => {
    const prev = document.title
    document.title = `Invoice-${orderId}`
    window.print()
    document.title = prev
  }

  const downloadInvoice = () => {
    const prev = document.title
    document.title = `Invoice-${orderId}`
    window.print()
    document.title = prev
  }

  const statusIndex = timeline.findIndex((step) => step.key === status)

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-12 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-5xl">
          <div className="h-10 w-56 animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
              <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            </div>
            <div className="h-80 animate-pulse rounded-3xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <Package className="mx-auto mb-4 h-14 w-14 text-slate-300" />
          <h1 className="text-2xl font-semibold text-slate-900">Order not found</h1>
          <p className="mt-2 text-slate-600">We could not find this invoice in your order history.</p>
          <button onClick={() => navigate('/account/orders')} className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-white">
            Back to Orders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div id="invoice-printable" className="min-h-screen bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_52%,_#eef3ff_100%)] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <style>{PRINT_STYLE}</style>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
          <button onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Back
          </button>
          <div className="flex gap-3">
              <button onClick={downloadInvoice} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <Download className="h-4 w-4" /> Download invoice
              </button>
              <button onClick={printInvoice} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <Printer className="h-4 w-4" /> Print
              </button>
              <button onClick={reorder} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800">
                <RotateCcw className="h-4 w-4" /> Reorder
              </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl sm:rounded-[2rem] bg-white p-4 sm:p-5 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Order Invoice</p>
                <h1 className="mt-2 text-xl sm:text-3xl font-semibold tracking-tight text-slate-900">#{order.id || order._id}</h1>
                <p className="mt-1 text-sm text-slate-500 flex items-center gap-2"><Calendar className="h-4 w-4" /> {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
              </div>
              <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusTone[status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                {status.replaceAll('_', ' ')}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-slate-900 font-semibold"><MapPin className="h-4 w-4 text-emerald-600" /> Shipping</div>
                <p className="text-sm text-slate-700">{order.name || order.customerName || 'Customer'}</p>
                <p className="text-sm text-slate-600">{order.address}</p>
                <p className="text-sm text-slate-600">{order.city}, {order.district}</p>
                <p className="text-sm text-slate-600">{order.phone}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-slate-900 font-semibold"><CreditCard className="h-4 w-4 text-emerald-600" /> Payment</div>
                <p className="text-sm text-slate-700">Method: {order.paymentMethod || 'COD'}</p>
                <p className="text-sm text-slate-600">Payment status: {order.paymentStatus || 'Pending'}</p>
                <p className="text-sm text-slate-600">Delivery: {order.deliveryStatus || status}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Items</h2>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={`${item.productId || item.id || index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100/80">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-500">Qty {item.quantity} • Rs. {Number(item.price || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">Rs. {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString()}</p>
                      <button
                        onClick={() => {
                          addToCart({
                            id: item.productId || item.id,
                            _id: item.productId || item.id,
                            name: item.name,
                            price: Number(item.price || 0),
                            image: item.imageUrl,
                            quantity: Number(item.quantity || 1),
                          })
                          toast.success(`${item.name} added to cart`)
                        }}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reorder item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 no-print">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Delivery timeline</h2>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 capitalize">{status.replaceAll('_', ' ')}</span>
              </div>
              <div className="space-y-4">
                {timeline.map((step, index) => {
                  const completed = statusIndex >= index
                  const current = statusIndex === index
                  return (
                    <div key={step.key} className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-400'}`}>
                        {completed ? <CircleCheckBig className="h-5 w-5" /> : index + 1}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${completed ? 'text-emerald-700' : 'text-slate-900'}`}>{step.label}</p>
                          {current && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">Current</span>}
                        </div>
                        <p className="text-sm text-slate-500">{step.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl sm:rounded-[2rem] bg-white p-4 sm:p-5 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between font-medium text-emerald-600">
                    <span>Coupon{order?.couponCode ? ` (${order.couponCode})` : ' Discount'}</span>
                    <span>− Rs. {couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                {vatAmount > 0 && (
                  <div className="flex justify-between text-slate-600"><span>VAT (13%)</span><span>Rs. {vatAmount.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between text-slate-600"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : `Rs. ${shipping}`}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold text-slate-900"><span>Total</span><span>Rs. {total.toLocaleString()}</span></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
