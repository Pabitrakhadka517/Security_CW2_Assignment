import { useState, useRef } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, MapPin, Phone, ShoppingBag, ArrowLeft, Printer, Calendar, CreditCard, Hash, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { orderApi } from '../components/api/orderapi';
import { getImageUrl } from '../config';

// Normalize order data from backend (handles the various field shapes).
const normalizeOrder = (rawOrder) => {
  if (!rawOrder) return null;

  const customerName = rawOrder.name ||
    (rawOrder.first_name && rawOrder.last_name ? `${rawOrder.first_name} ${rawOrder.last_name}` : null) ||
    (rawOrder.firstName && rawOrder.lastName ? `${rawOrder.firstName} ${rawOrder.lastName}` : null) ||
    rawOrder.customerName || rawOrder.customer?.name || 'N/A';

  const customerPhone = rawOrder.phone || rawOrder.customerPhone || rawOrder.customer?.phone || rawOrder.mobile || 'N/A';
  const customerAddress = rawOrder.address || rawOrder.shippingAddress || rawOrder.shipping_address || rawOrder.customer?.address || 'N/A';
  const city = rawOrder.city || rawOrder.customer?.city || '';
  const district = rawOrder.district || rawOrder.customer?.district || '';
  const orderId = rawOrder.orderId || rawOrder.order_id || rawOrder.id || rawOrder._id || '';
  const orderDate = rawOrder.created_at || rawOrder.createdAt || rawOrder.orderDate || rawOrder.order_date || null;

  let items = [];
  if (Array.isArray(rawOrder.items)) items = rawOrder.items;
  else if (Array.isArray(rawOrder.orderItems)) items = rawOrder.orderItems;
  else if (Array.isArray(rawOrder.products)) items = rawOrder.products;

  const normalizedItems = items.map(item => ({
    name: item.name || item.productName || item.product?.name || 'Product',
    quantity: item.quantity || item.qty || 1,
    price: item.price || item.unitPrice || item.product?.price || 0,
    imageUrl: item.imageUrl || item.image || item.product?.imageUrl || item.product?.image || '',
  }));

  const totalAmount = rawOrder.totalAmount || rawOrder.total || rawOrder.total_amount || rawOrder.grandTotal || 0;
  const paymentMethod = rawOrder.paymentMethod || rawOrder.payment_method || 'cod';
  const status = rawOrder.status || 'pending';
  const shipping = rawOrder.shipping || rawOrder.shippingFee || rawOrder.shipping_fee || 0;
  const description = rawOrder.description || rawOrder.notes || rawOrder.note || '';

  return {
    ...rawOrder,
    customerName, customerPhone, customerAddress, city, district,
    orderId, orderDate, items: normalizedItems, totalAmount,
    paymentMethod, status, shipping, description,
  };
};

const BRAND = '#1E293B';
const ACCENT = '#10B981';

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const billRef = useRef(null);

  const statusConfig = {
    pending:    { ring: 'from-amber-400 to-emerald-500',   chip: 'bg-amber-100 text-amber-700',     icon: Clock,        label: 'Pending',    description: 'Your order has been received and is being reviewed.' },
    processing: { ring: 'from-blue-500 to-indigo-600',    chip: 'bg-blue-100 text-blue-700',       icon: Package,      label: 'Processing', description: 'Your order is being prepared for shipment.' },
    shipped:    { ring: 'from-violet-500 to-purple-600',  chip: 'bg-violet-100 text-violet-700',   icon: Truck,        label: 'Shipped',    description: 'Your order is on its way!' },
    delivered:  { ring: 'from-emerald-400 to-green-600',  chip: 'bg-emerald-100 text-emerald-700', icon: CheckCircle,  label: 'Delivered',  description: 'Your order has been delivered successfully!' },
    cancelled:  { ring: 'from-red-400 to-red-600',        chip: 'bg-red-100 text-red-600',         icon: AlertCircle,  label: 'Cancelled',  description: 'This order has been cancelled.' },
  };

  const statusFlow = ['pending', 'processing', 'shipped', 'delivered'];
  const getStatusIndex = (s) => statusFlow.indexOf(s);

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    setSearched(true);

    if (!orderId.trim() || !phone.trim()) {
      setError('Please enter both Order ID and Phone Number');
      return;
    }

    setLoading(true);
    try {
      const res = await orderApi.trackById(orderId.trim(), phone.trim());
      const fetchedOrder = res.data?.data || res.data?.order || res.data;
      const normalizedOrder = normalizeOrder(fetchedOrder);
      const dbPhone = normalizedOrder?.customerPhone;

      const normalizePhoneNumber = (p) => {
        if (!p || p === 'N/A') return '';
        return p.toString().replace(/[\s\-\+]/g, '').replace(/^977/, '').replace(/^0/, '');
      };
      const orderPhone = normalizePhoneNumber(dbPhone);
      const inputPhone = normalizePhoneNumber(phone);

      if (normalizedOrder && (!orderPhone || orderPhone.includes(inputPhone.slice(-10)) || inputPhone.includes(orderPhone.slice(-10)))) {
        setOrder(normalizedOrder);
      } else if (normalizedOrder) {
        setError('Phone number does not match the order. Please check and try again.');
      } else {
        setError('No order found with this Order ID.');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      if (err.response?.status === 404) setError('Order not found. Please check your Order ID.');
      else if (err.response?.status === 401) setError('Order tracking is temporarily unavailable. Please try again later.');
      else setError('Unable to fetch order. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NP', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const handlePrintBill = () => {
    const printContent = billRef.current;
    if (!printContent) return;
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Order ${order.orderId || ''}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}
        body{padding:24px;color:#111}
        h1{color:${BRAND};font-size:22px;margin-bottom:4px}
        .muted{color:#666;font-size:12px}
        .row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
        .total{border-top:2px solid ${BRAND};margin-top:8px;padding-top:8px;font-size:16px;font-weight:bold;color:${BRAND}}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th{background:#f3f4f6;padding:8px;text-align:left;font-size:12px;color:#666}
        td{padding:8px;border-bottom:1px solid #eee;font-size:13px}
      </style></head><body>${printContent.innerHTML}</body></html>
    `);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  const cfg = order ? (statusConfig[order.status] || statusConfig.pending) : null;
  const inputCls = 'w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#10B981] focus:bg-white transition';

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50">
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#0A1E46_0%,#1E293B_55%,#10B981_130%)]">
        <div className="max-w-3xl px-4 py-3 mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to Shop
          </Link>
        </div>
        <div className="max-w-3xl px-4 pb-10 mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-3 rounded-2xl bg-white/10 backdrop-blur-sm">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Track Your Order</h1>
          <p className="mt-1 text-sm text-white/70">Enter your Order ID and phone number to see live status.</p>
        </div>
      </div>

      <div className="max-w-3xl px-4 mx-auto -mt-6 pb-12">
        {/* Search card */}
        <form onSubmit={handleTrackOrder} className="p-5 sm:p-6 bg-white border border-gray-100 shadow-lg rounded-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-gray-600">Order ID</label>
              <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="e.g. NP26001" className={inputCls} />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-gray-600">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXXXX" className={inputCls} />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="flex items-center justify-center w-full gap-2 py-3.5 mt-4 font-bold text-white transition bg-[#1E293B] hover:bg-[#10B981] disabled:opacity-60 rounded-xl">
            {loading ? (<><div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" /> Searching…</>)
              : (<><Search className="w-5 h-5" /> Track Order</>)}
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-3 p-4 mt-6 border border-red-200 bg-red-50 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {order && cfg && (
          <div className="mt-6 space-y-5">
            {/* Status hero */}
            <div className="p-6 text-center bg-white border border-gray-100 shadow-sm rounded-2xl">
              <div className="relative inline-flex mb-4">
                <span className={`absolute inset-0 rounded-full bg-linear-to-br ${cfg.ring} opacity-25 animate-ping`} />
                <span className={`relative flex items-center justify-center w-20 h-20 rounded-full shadow-lg bg-linear-to-br ${cfg.ring}`}>
                  <cfg.icon className="w-10 h-10 text-white" />
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${cfg.chip}`}>{cfg.label}</span>
              </div>
              <p className="max-w-md mx-auto text-sm text-gray-600">{cfg.description}</p>

              {/* Timeline */}
              {order.status !== 'cancelled' && (
                <div className="relative mt-8 mb-2">
                  <div className="absolute h-1 bg-gray-200 rounded-full top-5 left-6 right-6">
                    <div className="h-full transition-all duration-700 rounded-full bg-[#10B981]"
                      style={{ width: `${(getStatusIndex(order.status) / (statusFlow.length - 1)) * 100}%` }} />
                  </div>
                  <div className="relative flex justify-between">
                    {statusFlow.map((st, i) => {
                      const c = statusConfig[st];
                      const active = getStatusIndex(order.status) >= i;
                      const current = order.status === st;
                      return (
                        <div key={st} className="flex flex-col items-center">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition ${active ? 'bg-[#1E293B] text-white' : 'bg-gray-200 text-gray-400'} ${current ? 'ring-4 ring-emerald-200' : ''}`}>
                            <c.icon className="w-5 h-5" />
                          </div>
                          <p className={`mt-2 text-xs font-semibold ${active ? 'text-gray-900' : 'text-gray-400'}`}>{c.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Order details (printable) */}
            <div className="p-5 sm:p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
                <button onClick={handlePrintBill} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>

              <div ref={billRef}>
                <h1 style={{ display: 'none' }}>ePasaley — Order {order.orderId}</h1>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info icon={Hash}        label="Order ID"  value={order.orderId} mono />
                  <Info icon={Calendar}    label="Order Date" value={formatDate(order.orderDate)} />
                  <Info icon={User}        label="Customer"   value={order.customerName} />
                  <Info icon={Phone}       label="Phone"      value={order.customerPhone} />
                  <Info icon={CreditCard}  label="Payment"    value={order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod} />
                  <Info icon={MapPin}      label="Deliver to" value={[order.customerAddress, order.city, order.district].filter(Boolean).filter(v => v !== 'N/A').join(', ') || 'N/A'} />
                </div>

                {/* Items */}
                {order.items?.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">Items</p>
                    <div className="space-y-2">
                      {order.items.map((it, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 border border-gray-100 rounded-xl">
                          <div className="shrink-0 w-12 h-12 overflow-hidden bg-gray-50 border border-gray-100 rounded-lg">
                            <img src={getImageUrl(it.imageUrl)} alt={it.name} className="object-contain w-full h-full p-1" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{it.name}</p>
                            <p className="text-xs text-gray-500">Qty: {it.quantity}</p>
                          </div>
                          <p className="text-sm font-bold text-gray-900">Rs. {(Number(it.price) * Number(it.quantity)).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-gray-100">
                  <span className="font-bold text-gray-900">Total Amount</span>
                  <span className="text-xl font-extrabold text-[#1E293B]">Rs. {Number(order.totalAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Need help */}
            <div className="p-5 text-center border border-emerald-200 bg-emerald-50 rounded-2xl">
              <h3 className="mb-1 font-bold text-emerald-800">Need Help?</h3>
              <p className="mb-3 text-sm text-emerald-700">Questions about your order? We're here for you.</p>
              <a href="https://wa.me/9779857089898" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-white transition bg-emerald-600 rounded-lg hover:bg-emerald-700">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Contact on WhatsApp
              </a>
            </div>
          </div>
        )}

        {searched && !order && !loading && !error && (
          <div className="py-12 mt-6 text-center bg-white border border-gray-100 shadow-sm rounded-2xl">
            <Package className="w-14 h-14 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No order to show yet — enter your details above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-gray-50/60">
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-[#1E293B] shrink-0 border border-gray-100">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
        <p className={`text-sm font-semibold text-gray-900 wrap-break-word ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}
