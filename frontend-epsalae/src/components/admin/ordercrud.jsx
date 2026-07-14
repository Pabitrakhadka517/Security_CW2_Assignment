// src/pages/OrderCRUD.jsx
import { useEffect, useState } from 'react';
import { useOrderStore } from '../store/orderstore';
import toast from 'react-hot-toast';
import {
  Package, Truck, CheckCircle, Clock, AlertCircle, Loader2, Eye, X,
  MapPin, Phone, User, ShoppingBag, Calendar, RefreshCw, Copy,
  TrendingUp, DollarSign, Search
} from 'lucide-react';
import { TableSkeleton } from '../ui/Skeleton';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function OrderCRUD() {
  const { orders, pagination, loading, error, fetchOrders, updateOrderStatus } = useOrderStore();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingCancel, setPendingCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    // Server-side pagination + status filter so the table isn't capped at the
    // backend's default 20 rows.
    fetchOrders({ page, limit: PAGE_SIZE, ...(statusFilter !== 'all' ? { status: statusFilter } : {}) });
  }, [fetchOrders, page, statusFilter]);

  useEffect(() => { setPage(1); }, [statusFilter]);

  const statusConfig = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: Clock, label: 'Pending' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: Package, label: 'Processing' },
    shipped: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', icon: Truck, label: 'Shipped' },
    delivered: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', icon: CheckCircle, label: 'Delivered' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: AlertCircle, label: 'Cancelled' },
  };

  const nextStatus = (current) => {
    const flow = ['pending', 'processing', 'shipped', 'delivered'];
    const idx = flow.indexOf(current);
    return idx < flow.length - 1 ? flow[idx + 1] : current;
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order updated to ${statusConfig[newStatus]?.label || newStatus}!`);
    } catch {
      toast.error('Failed to update order');
    }
  };

  const confirmCancelOrder = async () => {
    if (!pendingCancel) return;
    setCancelling(true);
    try {
      await handleStatusUpdate(pendingCancel.id, 'cancelled');
      setSelectedOrder(null);
    } finally {
      setCancelling(false);
      setPendingCancel(null);
    }
  };

  const getStatusIcon = (status) => {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return <Icon className="w-4 h-4" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NP', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const searchLower = searchQuery.toLowerCase();
    const orderId = (order.orderId || order.order_id || order._id || order.id || '').toLowerCase();
    const customerName = (order.first_name && order.last_name
      ? `${order.first_name} ${order.last_name}`
      : order.name || '').toLowerCase();
    const phone = (order.phone || '').toLowerCase();
    const matchesSearch = !searchQuery ||
      orderId.includes(searchLower) ||
      customerName.includes(searchLower) ||
      phone.includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const pendingRevenue = orders
    .filter(o => o.status !== 'cancelled' && o.status !== 'delivered')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const statusTabColors = {
    all: 'bg-[#1A3C8A] text-white',
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and fulfill customer orders</p>
        </div>
        <button
          onClick={() => fetchOrders()}
          className="bg-[#FF6B35] hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#1A3C8A]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-base font-bold text-gray-800">Rs. {totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#FF6B35]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Value</p>
              <p className="text-base font-bold text-gray-800">Rs. {pendingRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Delivered</p>
              <p className="text-lg font-bold text-gray-800">{orderCounts.delivered}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-lg font-bold text-gray-800">{orderCounts.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(orderCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              statusFilter === status
                ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/20 ' + statusTabColors[status]
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {status === 'all' ? 'All' : statusConfig[status]?.label} ({count})
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 text-red-700 border border-red-200 bg-red-50 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">All Orders</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:border-[#FF6B35] focus:outline-none w-60"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">No orders found</p>
            <p className="text-sm text-gray-400 mt-1">{searchQuery ? 'Try a different search term' : 'Waiting for your first sale!'}</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mt-3 text-sm text-[#FF6B35] hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-5 py-3 text-left">Order ID</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-center">Items</th>
                  <th className="px-5 py-3 text-center">Total</th>
                  <th className="px-5 py-3 text-center">Date</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order, i) => {
                  const config = statusConfig[order.status] || statusConfig.pending;
                  const fullOrderId = order.orderId || order.order_id || order._id || order.id || `order-${i}`;
                  const shortOrderId = String(fullOrderId).slice(-10);
                  const customerName = order.first_name && order.last_name
                    ? `${order.first_name} ${order.last_name}`
                    : order.name || 'Customer';

                  const copyOrderId = (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(fullOrderId);
                    toast.success('Order ID copied!');
                  };

                  return (
                    <tr key={fullOrderId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#1A3C8A] bg-blue-50 px-2 py-1 rounded">
                            #{shortOrderId}
                          </span>
                          <button
                            onClick={copyOrderId}
                            className="p-1 text-gray-400 hover:text-[#FF6B35] rounded transition"
                            title="Copy full Order ID"
                            aria-label={`Copy order ID for order ${shortOrderId}`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#1A3C8A]" />
                          {customerName}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {order.phone || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {order.city}{order.district ? `, ${order.district}` : ''}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {order.items?.length || 0}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-[#1A3C8A]">
                        Rs. {(order.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-center text-xs text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                          {getStatusIcon(order.status)}
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="bg-[#1A3C8A] hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-sm"
                            title="View Details"
                            aria-label={`View order ${order.orderNumber || shortOrderId}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => handleStatusUpdate(fullOrderId, nextStatus(order.status))}
                              className="bg-[#FF6B35] hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                              aria-label={`Advance order ${order.orderNumber || shortOrderId} to ${statusConfig[nextStatus(order.status)]?.label || nextStatus(order.status)}`}
                            >
                              Next →
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4 border-t border-gray-100">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  ← Prev
                </button>
                <span className="text-xs font-bold text-gray-600">Page {page} / {pagination.totalPages} ({pagination.total} orders)</span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (() => {
        const modalFullOrderId = selectedOrder.orderId || selectedOrder.order_id || selectedOrder._id || selectedOrder.id || '';
        const modalCustomerName = selectedOrder.first_name && selectedOrder.last_name
          ? `${selectedOrder.first_name} ${selectedOrder.last_name}`
          : selectedOrder.name || 'Customer';

        const copyModalOrderId = () => {
          navigator.clipboard.writeText(modalFullOrderId);
          toast.success('Order ID copied!');
        };

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-800">Order Details</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {modalFullOrderId}
                    </span>
                    <button onClick={copyModalOrderId} className="p-1 text-gray-400 hover:text-[#FF6B35] rounded transition" title="Copy Order ID">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Status & Date */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusConfig[selectedOrder.status]?.bg} ${statusConfig[selectedOrder.status]?.text}`}>
                    {getStatusIcon(selectedOrder.status)}
                    {statusConfig[selectedOrder.status]?.label}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedOrder.created_at)}
                  </div>
                </div>

                {/* Customer & Address */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="font-semibold text-[#1A3C8A] mb-3 flex items-center gap-2 text-sm">
                      <User className="w-4 h-4" /> Customer
                    </h3>
                    <p className="font-medium text-sm text-gray-800">{modalCustomerName}</p>
                    <p className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Phone className="w-4 h-4" /> {selectedOrder.phone}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="font-semibold text-[#1A3C8A] mb-3 flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" /> Delivery Address
                    </h3>
                    <p className="font-medium text-sm text-gray-800">{selectedOrder.address}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.city}, {selectedOrder.district}</p>
                    {selectedOrder.description && (
                      <p className="mt-2 text-xs italic text-gray-400">Note: {selectedOrder.description}</p>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-[#1A3C8A] mb-3 flex items-center gap-2 text-sm">
                    <ShoppingBag className="w-4 h-4" /> Order Items
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-lg">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="object-cover w-12 h-12 rounded-lg"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div className={`items-center justify-center w-12 h-12 bg-gray-200 rounded-lg ${item.imageUrl ? 'hidden' : 'flex'}`}>
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                        </div>
                        <p className="font-bold text-sm text-[#1A3C8A]">
                          Rs. {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price breakdown */}
                {(() => {
                  const subtotal = selectedOrder.items?.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0) || 0;
                  const discount = selectedOrder.discountAmount || 0;
                  const vat      = selectedOrder.vatAmount || 0;
                  const discounted = subtotal - discount;
                  const shipping = (selectedOrder.totalAmount || 0) - discounted - vat;
                  return (
                    <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between font-medium text-green-600">
                          <span>Coupon Discount{selectedOrder.couponCode ? ` (${selectedOrder.couponCode})` : ''}</span>
                          <span>- Rs. {discount.toLocaleString()}</span>
                        </div>
                      )}
                      {vat > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>VAT (13%)</span><span>Rs. {vat.toLocaleString()}</span>
                        </div>
                      )}
                      {shipping > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Shipping</span><span>Rs. {shipping.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Total */}
                <div className="flex items-center justify-between bg-[#1A3C8A] rounded-xl p-4 text-white">
                  <span className="font-bold">Total Amount</span>
                  <span className="text-2xl font-bold">Rs. {(selectedOrder.totalAmount || 0).toLocaleString()}</span>
                </div>

                {/* Actions */}
                {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        handleStatusUpdate(modalFullOrderId, nextStatus(selectedOrder.status));
                        setSelectedOrder(null);
                      }}
                      className="flex-1 py-3 bg-[#FF6B35] hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition"
                    >
                      Mark as {statusConfig[nextStatus(selectedOrder.status)]?.label}
                    </button>
                    <button
                      onClick={() => setPendingCancel({ id: modalFullOrderId, label: modalCustomerName })}
                      className="px-6 py-3 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl text-sm transition"
                    >
                      Cancel Order
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <ConfirmDialog
        isOpen={!!pendingCancel}
        title="Cancel this order?"
        description="The customer will be notified. This can't be undone."
        confirmLabel="Cancel order"
        variant="danger"
        isLoading={cancelling}
        onConfirm={confirmCancelOrder}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  );
}
