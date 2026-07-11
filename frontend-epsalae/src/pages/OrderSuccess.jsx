import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Check, Home, CreditCard, Package, MapPin, Phone, Calendar, FileText, Copy, CheckCircle, Truck } from 'lucide-react'
import { useState } from 'react'
import { getImageUrl } from '../config'

const printStyles = `
@media print {
  @page { size: A4; margin: 12mm; }
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print, .no-print * { display: none !important; }
  .print-invoice { box-shadow: none !important; border: none !important; }
}
`

export default function OrderSuccess() {
  const { orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const order = location.state?.orderData || location.state?.order || {
    id: orderId, totalAmount: 0, subtotal: 0, shipping: 0, total: 0, items: [],
    name: '', phone: '', address: '', city: '', district: '', paymentMethod: 'cod',
    orderDate: new Date().toISOString(),
  }

  const subtotal = order.subtotal || order.items?.reduce((s, i) => s + ((i.price || 0) * (i.quantity || 0)), 0) || 0
  const couponDiscount = order.couponDiscount || order.discountAmount || 0
  const vatAmount = order.vatAmount || 0
  const discountedSubtotal = subtotal - couponDiscount
  const shipping = order.shipping !== undefined ? order.shipping : (discountedSubtotal >= 5000 ? 0 : 150)
  const total = order.total || order.totalAmount || (discountedSubtotal + vatAmount + shipping)
  const paymentMethod = order.paymentMethod || 'cod'
  const customerName = order.name || `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Customer'
  const orderDate = order.orderDate ? new Date(order.orderDate) : new Date()
  const orderNumber = order.orderId || order.order_id || order.id || order._id || orderId || 'N/A'

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <style>{printStyles}</style>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-xl px-4 py-8 mx-auto sm:py-10">

          {/* Success header */}
          <div className="mb-6 text-center no-print">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-3 rounded-full bg-emerald-100">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Order Confirmed!</h1>
            <p className="mt-1 text-sm text-gray-500">Thank you, {customerName.split(' ')[0]} — your order is placed.</p>
          </div>

          {/* Compact invoice card */}
          <div className="overflow-hidden bg-white border border-gray-100 shadow-sm print-invoice rounded-2xl">

            {/* Order id strip */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 bg-[#1A3C8A] text-white">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-white/60">Order Number</p>
                <p className="font-mono text-lg font-bold truncate">{orderNumber}</p>
              </div>
              <button onClick={copyOrderNumber} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/15 hover:bg-white/25 transition no-print">
                {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* date + payment */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {orderDate.toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="inline-flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod}</span>
              </div>

              {/* items */}
              {order.items?.length > 0 && (
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="shrink-0 w-11 h-11 overflow-hidden bg-gray-50 border border-gray-100 rounded-lg no-print">
                        <img src={getImageUrl(item.imageUrl || item.image)} alt={item.name} className="object-contain w-full h-full p-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.quantity} × Rs. {Number(item.price).toLocaleString()}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">Rs. {(Number(item.price) * Number(item.quantity)).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* summary */}
              <div className="pt-3 space-y-1.5 text-sm border-t border-dashed border-gray-200">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
                {couponDiscount > 0 && <div className="flex justify-between font-medium text-emerald-600"><span>Coupon{order.couponCode ? ` (${order.couponCode})` : ''}</span><span>− Rs. {couponDiscount.toLocaleString()}</span></div>}
                {vatAmount > 0 && <div className="flex justify-between text-gray-600"><span>VAT (13%)</span><span>Rs. {vatAmount.toLocaleString()}</span></div>}
                <div className="flex justify-between text-gray-600"><span>Shipping</span><span className={shipping === 0 ? 'text-emerald-600 font-semibold' : ''}>{shipping === 0 ? 'FREE' : `Rs. ${shipping.toLocaleString()}`}</span></div>
                <div className="flex justify-between pt-2 text-base font-bold text-gray-900 border-t border-gray-100">
                  <span>Total</span><span className="text-[#1A3C8A]">Rs. {total.toLocaleString()}</span>
                </div>
              </div>

              {/* ship + contact */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="flex items-center gap-1 mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400"><MapPin className="w-3 h-3" /> Ship to</p>
                  <p className="text-sm font-semibold text-gray-900">{customerName}</p>
                  <p className="text-xs text-gray-500">{[order.address, order.city, order.district].filter(Boolean).join(', ')}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400"><Phone className="w-3 h-3" /> Contact</p>
                  <p className="text-sm font-semibold text-gray-900">{order.phone}</p>
                </div>
              </div>

              {paymentMethod === 'cod' && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg no-print">
                  <Truck className="w-4 h-4 shrink-0" /> Keep Rs. {total.toLocaleString()} ready for cash on delivery.
                </div>
              )}
            </div>

            {/* print footer */}
            <div className="hidden print:block px-5 py-3 text-center border-t border-gray-200">
              <p className="text-xs text-gray-500">Thank you for shopping with ePasaley · www.epasaley.com</p>
            </div>
          </div>

          {/* track hint */}
          <p className="mt-4 text-xs text-center text-gray-500 no-print">
            Track anytime with your <strong>Order ID</strong> + <strong>phone number</strong> on the Track Order page.
          </p>

          {/* actions */}
          <div className="grid grid-cols-1 gap-3 mt-5 no-print sm:grid-cols-3">
            <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 transition border-2 border-gray-200 rounded-xl hover:bg-gray-50">
              <FileText className="w-4 h-4" /> Print
            </button>
            <button onClick={() => navigate('/track-order')} className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white transition bg-[#1A3C8A] rounded-xl hover:bg-[#112960]">
              <Package className="w-4 h-4" /> Track Order
            </button>
            <button onClick={() => navigate('/products')} className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white transition bg-[#FF6B35] rounded-xl hover:bg-[#e85d2a]">
              <Home className="w-4 h-4" /> Shop More
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
