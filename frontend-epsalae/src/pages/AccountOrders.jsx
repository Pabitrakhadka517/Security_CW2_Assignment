import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, Eye, Package, CalendarDays, ChevronDown, ChevronUp, CheckCircle2, XCircle, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { profileEndpoints } from '@/components/api/userapi'
import { useCart } from '@/store/cartstore'
import { getImageUrl } from '@/config'

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

const STATUS_META = {
  pending:    { label: 'Order Placed',  color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-200', dot: 'bg-yellow-400' },
  confirmed:  { label: 'Confirmed',     color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-500'   },
  processing: { label: 'Processing',    color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-500' },
  shipped:    { label: 'Shipped',       color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-200', dot: 'bg-indigo-500' },
  delivered:  { label: 'Delivered',     color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200',  dot: 'bg-green-500'  },
  cancelled:  { label: 'Cancelled',     color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200',    dot: 'bg-red-500'    },
}

function statusMeta(status) {
  return STATUS_META[status?.toLowerCase()] || STATUS_META.pending
}

function fmt(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

// ── Status Timeline ─────────────────────────────────────────────────────────

function StatusTimeline({ status, statusHistory = [] }) {
  const current = status?.toLowerCase()

  if (current === 'cancelled') {
    const cancelledAt = statusHistory.find(h => h.status === 'cancelled')?.changedAt
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        <XCircle className="h-4 w-4 shrink-0" />
        <span>This order was cancelled.</span>
        {cancelledAt && (
          <span className="ml-auto text-xs text-red-400">{fmt(cancelledAt)}</span>
        )}
      </div>
    )
  }

  const currentIdx = STATUS_STEPS.indexOf(current)
  const histMap = {}
  statusHistory.forEach(h => { histMap[h.status?.toLowerCase()] = h.changedAt })

  return (
    <div className="mt-4 flex items-start overflow-x-auto pb-2 -mx-1 px-1">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx
        const active = i === currentIdx
        const meta = statusMeta(step)
        const ts = histMap[step]
        return (
          <div key={step} className="flex flex-1 flex-col items-center min-w-[60px] sm:min-w-[80px]">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? 'invisible' : done ? 'bg-slate-900' : 'bg-slate-200'}`} />
              <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                done
                  ? active
                    ? 'border-slate-900 bg-slate-900 ring-4 ring-slate-100'
                    : 'border-slate-900 bg-slate-900'
                  : 'border-slate-200 bg-white'
              }`}>
                {done
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  : <span className={`h-2 w-2 rounded-full ${meta.dot} opacity-30`} />
                }
              </div>
              <div className={`h-0.5 flex-1 ${i === STATUS_STEPS.length - 1 ? 'invisible' : done && i < currentIdx ? 'bg-slate-900' : 'bg-slate-200'}`} />
            </div>
            <p className={`mt-2 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide ${done ? 'text-slate-800' : 'text-slate-300'}`}>
              {meta.label}
            </p>
            {ts && (
              <p className="mt-0.5 text-center text-[9px] leading-tight text-slate-400">
                {new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onReorder }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const orderId = order.id || order._id
  const meta = statusMeta(order.status)
  const placedAt = fmt(order.created_at || order.createdAt)
  const updatedAt = fmt(order.updated_at || order.updatedAt)

  return (
    <div className="rounded-[1.75rem] border border-slate-100 bg-white shadow-sm transition duration-300 hover:shadow-md">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Order</p>
            <h4 className="mt-0.5 text-base font-semibold text-slate-900">#{orderId}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500">
              {placedAt && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> {placedAt}
                </span>
              )}
              <span>·</span>
              <span>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span className="font-medium text-slate-700">Rs.{Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.color} ${meta.bg} ${meta.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <button
            onClick={() => navigate(`/account/orders/${orderId}`)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> Invoice
          </button>
          <button
            onClick={() => onReorder(order)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reorder
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {/* Status timeline */}
      <div className="px-5 pb-4">
        <StatusTimeline
          status={order.status}
          statusHistory={order.statusHistory || order.status_history || []}
        />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {/* Timing / meta grid */}
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Order Placed',    val: placedAt },
              { label: 'Last Updated',    val: updatedAt },
              { label: 'Payment Method',  val: order.paymentMethod || order.payment_method },
              { label: 'Payment Status',  val: order.paymentStatus || order.payment_status },
              { label: 'Delivery City',   val: order.shippingAddress?.city || order.shipping_address?.city },
              { label: 'Tracking ID',     val: order.trackingId || order.tracking_id },
            ].filter(x => x.val).map(({ label, val }) => (
              <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="mt-0.5 text-xs font-medium capitalize text-slate-700 break-all">{val}</p>
              </div>
            ))}
          </div>

          {/* Items */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Items in this order</p>
          <div className="space-y-3">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <img
                  src={getImageUrl(item.imageUrl, 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E')}
                  alt={item.name}
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  onError={e => { e.target.src = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23f1f5f9%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Crect%20x%3D%22105%22%20y%3D%22100%22%20width%3D%2290%22%20height%3D%2275%22%20rx%3D%228%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22127%22%20r%3D%2210%22%2F%3E%3Cpath%20d%3D%22M112%20168l26-24%2020%2018%2016-14%2020%2020%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22150%22%20y%3D%22205%22%20text-anchor%3D%22middle%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2215%22%3ENo%20image%3C%2Ftext%3E%3C%2Fsvg%3E' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{item.name || 'Product'}</p>
                  <p className="text-xs text-slate-500">Qty: {item.quantity} · Rs.{Number(item.price || 0).toLocaleString()}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-slate-800">
                  Rs.{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { addToCart } = useCart()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await profileEndpoints.orders({ page: 1, limit: 100 })
        const data = res.data?.data || res.data || {}
        const list = Array.isArray(data.orders) ? data.orders : Array.isArray(data) ? data : []
        setOrders(list)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const reorder = (order) => {
    ;(order.items || []).forEach((item) => {
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
  }

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  const visible = filter === 'all'
    ? orders
    : orders.filter(o => o.status?.toLowerCase() === filter)

  if (loading) {
    return (
      <div className="rounded-[2rem] bg-white p-5 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-[1.75rem] bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-[0_18px_70px_-50px_rgba(15,23,42,0.55)] sm:p-8">
      <div className="mb-6">
        <h3 className="text-2xl font-semibold text-slate-900">Purchase History</h3>
        <p className="mt-1 text-sm text-slate-500">
          Track the status and timeline of every order you've placed.
        </p>
      </div>

      {/* Filter tabs */}
      {orders.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map(f => {
            const count = f.key === 'all' ? orders.length : orders.filter(o => o.status?.toLowerCase() === f.key).length
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  filter === f.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label} <span className="opacity-60">({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {!visible.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <ShoppingBag className="mb-3 h-10 w-10 text-slate-200" />
          <p className="text-slate-500">
            {filter === 'all' ? 'No orders yet.' : `No ${filter} orders.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(o => (
            <OrderCard key={o.id || o._id} order={o} onReorder={reorder} />
          ))}
        </div>
      )}
    </div>
  )
}
