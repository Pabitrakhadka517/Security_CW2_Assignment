import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useProductStore }   from '../components/store/productstore';
import { useCategoryStore }  from '../components/store/categorystore';
import { useOrderStore }     from '../components/store/orderstore';
import { useCouponStore }    from '../components/store/promocodestore';
import { useBannerStore }    from '../components/store/bannerstore';
import { useAdminAuth }      from '../components/store/authstore';
import {
  Package, Tag, ShoppingCart, TicketPercent, ImageIcon,
  ArrowUpRight, ArrowDownRight, Banknote, AlertCircle,
  CheckCircle2, Loader2, Activity, BadgePercent, Clock,
  RefreshCw, TrendingUp, Users, Eye,
} from 'lucide-react';

/* ── colour tokens ───────────────────────────────────────────── */
const ORANGE = '#047857';
const BLUE   = '#1E293B';
const STATUS_COLORS = {
  pending:    '#F59E0B', confirmed: '#3B82F6', processing: '#8B5CF6',
  shipped: '#06B6D4', on_the_way: '#14B8A6', delivered: '#047857',
  cancelled: '#EF4444', received: '#22C55E',
};
const CAT_PAL = [ORANGE,'#1E293B','#047857','#8B5CF6','#F59E0B','#06B6D4','#EF4444','#EC4899'];

const fmt   = (n) => new Intl.NumberFormat('en-NP').format(n ?? 0);
const fmtRs = (n) => `Rs. ${fmt(n)}`;

/* ── custom tooltip ──────────────────────────────────────────── */
function ChartTip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-3 text-xs min-w-[140px]">
      {label && <p className="text-gray-500 mb-2 font-semibold">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-5 mb-1">
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="font-bold text-gray-900">{currency ? fmtRs(p.value) : fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── period picker ───────────────────────────────────────────── */
function PeriodPicker({ value, onChange, options }) {
  return (
    <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            value === o.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── KPI metric card ─────────────────────────────────────────── */
function MetricCard({ label, value, pct, icon: Icon, iconBg, iconColor, link }) {
  const up      = pct >= 0;
  const hasPct  = pct !== undefined && pct !== null;
  const card = (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-5">
        <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center shadow-sm`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {hasPct && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(pct).toFixed(2)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
  return link ? <Link to={link} className="block">{card}</Link> : card;
}

/* ── chart card wrapper ──────────────────────────────────────── */
function ChartCard({ title, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── stat tile (store overview) ──────────────────────────────── */
function StatTile({ label, value, icon: Icon, iconBg, iconColor, path }) {
  return (
    <Link to={path}
      className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-4`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-gray-800">{fmt(value)}</p>
      <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
      <p className="mt-2 text-[11px] text-[#047857] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Manage <ArrowUpRight className="w-3 h-3" />
      </p>
    </Link>
  );
}

/* ── quick action ────────────────────────────────────────────── */
function QuickAction({ label, desc, icon: Icon, iconBg, iconColor, path }) {
  return (
    <Link to={path}
      className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 group">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 group-hover:text-[#047857] transition-colors">{label}</p>
        <p className="text-xs text-gray-400 truncate">{desc}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#047857] shrink-0 ml-auto transition-colors" />
    </Link>
  );
}

/* ── main component ──────────────────────────────────────────── */
export default function AdminDashboard() {
  const productStore   = useProductStore();
  const categoryStore  = useCategoryStore();
  const orderStore     = useOrderStore();
  const couponStore    = useCouponStore();
  const bannerStore    = useBannerStore();
  const { admin }      = useAdminAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [revPeriod,  setRevPeriod]  = useState(30);
  const adminName = admin?.name || admin?.firstName || 'Admin';

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          productStore.fetchProducts?.(),
          categoryStore.fetchCategories?.(),
          orderStore.fetchOrders?.({ limit: 100 }),
          orderStore.fetchStats?.(),
          couponStore.fetchCoupons?.(),
          bannerStore.fetchBanners?.(),
        ].filter(Boolean));
      } catch {}
      finally { setIsLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orders     = orderStore.orders     ?? [];
  const products   = productStore.products ?? [];
  const categories = categoryStore.categories ?? [];
  const coupons    = couponStore.coupons   ?? [];

  // Server-side stats cover the WHOLE order book; the loaded `orders` page
  // (most recent 100) is only used for the trend chart below and the KPI
  // week-over-week deltas (see `kpiTrends`).
  const stats = orderStore.stats;
  const totalRevenue    = stats?.totalRevenue    ?? orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const pendingOrders   = stats?.pendingOrders   ?? orders.filter(o => o.status === 'pending').length;
  const deliveredOrders = stats?.deliveredOrders ?? orders.filter(o => o.status === 'delivered').length;
  const cancelledOrders = stats?.cancelledOrders ?? orders.filter(o => o.status === 'cancelled').length;
  const activeCoupons   = coupons.filter(c => c.isActive).length;
  const lowStockCount   = products.filter(p => p.stock > 0 && p.stock < 10).length;

  /* ── chart data ── */
  const now = new Date();

  // Real week-over-week deltas for the KPI cards, computed from the loaded
  // orders page (last 7 days vs the 7 days before that) — replaces the
  // previously hardcoded/fake trend percentages.
  const kpiTrends = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const currentStart  = new Date(now.getTime() - 7 * dayMs);
    const previousStart = new Date(now.getTime() - 14 * dayMs);
    let curRevenue = 0, prevRevenue = 0, curOrders = 0, prevOrders = 0, curPending = 0, prevPending = 0;
    orders.forEach(o => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      if (d >= currentStart) {
        curOrders += 1;
        if (o.status !== 'cancelled') curRevenue += o.totalAmount || 0;
        if (o.status === 'pending') curPending += 1;
      } else if (d >= previousStart) {
        prevOrders += 1;
        if (o.status !== 'cancelled') prevRevenue += o.totalAmount || 0;
        if (o.status === 'pending') prevPending += 1;
      }
    });
    const pct = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : null);
    return {
      revenue: pct(curRevenue, prevRevenue),
      orders:  pct(curOrders, prevOrders),
      pending: pct(curPending, prevPending),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const revenueTrend = useMemo(() => {
    const map = {};
    for (let i = revPeriod - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const k = d.toLocaleDateString('en-NP', { month: 'short', day: 'numeric' });
      map[k] = { date: k, revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      if (!o.created_at) return;
      const k = new Date(o.created_at).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' });
      if (map[k]) { map[k].revenue += o.totalAmount || 0; map[k].orders += 1; }
    });
    return Object.values(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, revPeriod]);

  // Compute "received" vs "pending" breakdown from last 7 days → bar chart
  const weeklyData = useMemo(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const map  = {};
    days.forEach(d => { map[d] = { day: d, delivered: 0, pending: 0 }; });
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 6);
    orders.forEach(o => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      if (d < cutoff) return;
      const key = days[d.getDay()];
      if (o.status === 'delivered') map[key].delivered += 1;
      else                          map[key].pending   += 1;
    });
    return days.map(d => map[d]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const statusData = useMemo(() => {
    const cnt = {};
    orders.forEach(o => { cnt[o.status] = (cnt[o.status] || 0) + 1; });
    return Object.entries(cnt)
      .map(([s, v]) => ({ name: s.charAt(0).toUpperCase() + s.slice(1).replace('_',' '), value: v, status: s }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  const stockHealth = useMemo(() => ([
    { name: 'In Stock',    value: products.filter(p => p.stock >= 10).length,              fill: '#047857' },
    { name: 'Low Stock',   value: products.filter(p => p.stock > 0 && p.stock < 10).length, fill: '#F59E0B' },
    { name: 'Out of Stock',value: products.filter(p => p.stock === 0).length,              fill: '#EF4444' },
  ]), [products]);

  // Top selling products — aggregate units & revenue from order items
  const topProducts = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      (o.items || []).forEach(it => {
        const key = it.name || 'Unknown';
        if (!map[key]) map[key] = { name: key, units: 0, revenue: 0 };
        const qty = it.quantity || 1;
        map[key].units   += qty;
        map[key].revenue += (it.price || 0) * qty;
      });
    });
    return Object.values(map).sort((a, b) => b.units - a.units).slice(0, 6);
  }, [orders]);

  // Products by category — count per category
  const categoryData = useMemo(() => {
    const nameOf = (id) => categories.find(c => (c._id || c.id) === id)?.name || 'Uncategorized';
    const cnt = {};
    products.forEach(p => {
      const id = p.category_id || p.categoryId || p.category?._id || p.category?.id || p.category;
      const name = typeof id === 'string' || typeof id === 'number' ? nameOf(id) : (id?.name || 'Uncategorized');
      cnt[name] = (cnt[name] || 0) + 1;
    });
    return Object.entries(cnt)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [products, categories]);

  // Compute received amount + due amount from orders
  const receivedAmt = orders.filter(o => o.status === 'delivered').reduce((s,o) => s + (o.totalAmount||0), 0);
  const dueAmt      = orders.filter(o => ['pending','confirmed','processing'].includes(o.status)).reduce((s,o) => s + (o.totalAmount||0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#047857] mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Alerts ─────────────────────────────────────────────── */}
      {(lowStockCount > 0 || cancelledOrders > 0) && (
        <div className="flex flex-wrap gap-3">
          {lowStockCount > 0 && (
            <Link to="/admin/productcrud"
              className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} low on stock
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          )}
          {cancelledOrders > 0 && (
            <Link to="/admin/ordercrud"
              className="flex items-center gap-2.5 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium hover:bg-red-100 transition-colors">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {cancelledOrders} cancelled order{cancelledOrders !== 1 ? 's' : ''}
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          )}
        </div>
      )}

      {/* ── KPI metric cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Revenue"
          value={`Rs. ${fmt(totalRevenue)}`}
          pct={kpiTrends.revenue}
          icon={Banknote}
          iconBg="bg-emerald-100"
          iconColor="text-[#047857]"
          link="/admin/ordercrud"
        />
        <MetricCard
          label="Total Products"
          value={products.length}
          icon={Package}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
          link="/admin/productcrud"
        />
        <MetricCard
          label="Total Orders"
          value={orders.length}
          pct={kpiTrends.orders}
          icon={ShoppingCart}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          link="/admin/ordercrud"
        />
        <MetricCard
          label="Pending Orders"
          value={pendingOrders}
          pct={kpiTrends.pending}
          icon={Clock}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          link="/admin/ordercrud"
        />
      </div>

      {/* ── Charts row: Revenue area + Weekly bar ───────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Revenue Overview — 2/3 */}
        <div className="xl:col-span-2">
          <ChartCard
            title="Revenue Overview"
            action={
              <PeriodPicker
                value={revPeriod}
                onChange={setRevPeriod}
                options={[{ value: 7, label: '7D' }, { value: 14, label: '14D' }, { value: 30, label: '30D' }]}
              />
            }
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={ORANGE} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={BLUE}   stopOpacity={0.20} />
                    <stop offset="100%" stopColor={BLUE}   stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  interval={revPeriod <= 7 ? 0 : revPeriod <= 14 ? 1 : 4} />
                <YAxis yAxisId="rev" orientation="left"  tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={38} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={24} />
                <Tooltip content={<ChartTip currency />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  formatter={(value) => <span className="text-gray-600">{value}</span>} />
                <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue (Rs.)"
                  stroke={ORANGE} strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: ORANGE, strokeWidth: 0 }} />
                <Area yAxisId="ord" type="monotone" dataKey="orders" name="Orders"
                  stroke={BLUE} strokeWidth={2.5} fill="url(#ordGrad)" dot={false} activeDot={{ r: 5, fill: BLUE, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>

            {/* Summary strip */}
            <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-gray-50">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Received Amount</p>
                <p className="text-xl font-bold text-gray-900">Rs. {fmt(receivedAmt)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Due Amount</p>
                <p className="text-xl font-bold text-[#047857]">Rs. {fmt(dueAmt)}</p>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Weekly Orders Bar — 1/3 */}
        <ChartCard
          title="Orders This Week"
          action={
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg font-medium">7 Days</span>
          }
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span className="w-3 h-3 rounded-sm" style={{ background: ORANGE }} /> Pending
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span className="w-3 h-3 rounded-sm" style={{ background: BLUE }} /> Delivered
            </span>
          </div>
          <ResponsiveContainer width="100%" height={228}>
            <BarChart data={weeklyData} margin={{ top: 4, right: 0, left: -16, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: '#FFF5F1' }} />
              <Bar dataKey="pending"   name="Pending"   fill={ORANGE} radius={[4,4,0,0]} maxBarSize={14} />
              <Bar dataKey="delivered" name="Delivered" fill={BLUE}   radius={[4,4,0,0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts row 2: Order Status donut + Stock Health ─────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Order Status donut — 2/3 */}
        <div className="xl:col-span-2">
          <ChartCard title="Order Status Distribution" action={
            <Link to="/admin/ordercrud" className="text-xs font-semibold text-[#047857] hover:text-emerald-600 flex items-center gap-1">
              All Orders <ArrowUpRight className="w-3 h-3" />
            </Link>
          }>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-300 text-sm">No orders yet</div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="shrink-0">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={58} outerRadius={82}
                        paddingAngle={2} dataKey="value" strokeWidth={0}>
                        {statusData.map((e,i) => (
                          <Cell key={i} fill={STATUS_COLORS[e.status] || CAT_PAL[i % CAT_PAL.length]} />
                        ))}
                      </Pie>
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                        <tspan x="50%" dy="-6" style={{ fontSize: 22, fontWeight: 700, fill: '#111827' }}>{orders.length}</tspan>
                        <tspan x="50%" dy="18" style={{ fontSize: 11, fill: '#9CA3AF' }}>orders</tspan>
                      </text>
                      <Tooltip content={<ChartTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {statusData.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.status] || CAT_PAL[i] }} />
                        <span className="text-xs text-gray-600 font-medium">{s.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-800 ml-2">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Stock Health — 1/3 */}
        <ChartCard title="Stock Health">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={stockHealth} cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                paddingAngle={3} dataKey="value" strokeWidth={0}>
                {stockHealth.map((s,i) => <Cell key={i} fill={s.fill} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2.5 mt-2">
            {stockHealth.map(s => (
              <div key={s.name} className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.fill }} />
                <span className="text-xs text-gray-600 flex-1 font-medium">{s.name}</span>
                <span className="text-xs font-bold text-gray-800">{s.value}</span>
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${products.length ? (s.value / products.length) * 100 : 0}%`,
                    background: s.fill,
                  }} />
                </div>
              </div>
            ))}
          </div>
          {lowStockCount > 0 && (
            <Link to="/admin/productcrud"
              className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl transition-colors">
              <AlertCircle className="w-3.5 h-3.5" /> {lowStockCount} need restocking
            </Link>
          )}
        </ChartCard>
      </div>

      {/* ── Charts row 3: Top Products bar + Category donut ─────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Top Selling Products — 2/3 */}
        <div className="xl:col-span-2">
          <ChartCard title="Top Selling Products" action={
            <Link to="/admin/productcrud" className="text-xs font-semibold text-[#047857] hover:text-emerald-600 flex items-center gap-1">
              All Products <ArrowUpRight className="w-3 h-3" />
            </Link>
          }>
            {topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-gray-300 text-sm">No sales data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false}
                    tickFormatter={v => v.length > 16 ? v.slice(0, 15) + '…' : v} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: '#FFF5F1' }} />
                  <Bar dataKey="units" name="Units Sold" fill={ORANGE} radius={[0,4,4,0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Products by Category — 1/3 */}
        <ChartCard title="Products by Category">
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">No products yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                    paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {categoryData.map((e,i) => <Cell key={i} fill={CAT_PAL[i % CAT_PAL.length]} />)}
                  </Pie>
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                    <tspan x="50%" dy="-4" style={{ fontSize: 20, fontWeight: 700, fill: '#111827' }}>{products.length}</tspan>
                    <tspan x="50%" dy="16" style={{ fontSize: 10, fill: '#9CA3AF' }}>products</tspan>
                  </text>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: CAT_PAL[i % CAT_PAL.length] }} />
                    <span className="text-xs text-gray-600 flex-1 font-medium truncate">{c.name}</span>
                    <span className="text-xs font-bold text-gray-800">{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* ── Store tiles + Quick Actions ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800">Store Overview</h2>
            <span className="text-xs text-gray-400">Click any tile to manage</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile label="Products"      value={products.length}                                         icon={Package}       iconBg="bg-emerald-50"  iconColor="text-[#047857]"   path="/admin/productcrud"   />
            <StatTile label="Categories"    value={categoryStore.categories?.length}                        icon={Tag}           iconBg="bg-purple-50"  iconColor="text-purple-600"  path="/admin/categorycrud"  />
            <StatTile label="Total Orders"  value={orders.length}                                           icon={ShoppingCart}  iconBg="bg-emerald-50" iconColor="text-emerald-600" path="/admin/ordercrud"     />
            <StatTile label="Active Coupons" value={activeCoupons}                                          icon={TicketPercent} iconBg="bg-pink-50"    iconColor="text-pink-600"    path="/admin/promocodecrud" />
            <StatTile label="Banners"       value={bannerStore.banners?.filter(b => b.isActive)?.length}    icon={ImageIcon}     iconBg="bg-indigo-50"  iconColor="text-indigo-600"  path="/admin/bannercrud"    />
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <QuickAction label="Add Product"    desc="Create a new product listing"   icon={Package}       iconBg="bg-emerald-50"  iconColor="text-[#047857]"   path="/admin/productcrud"   />
            <QuickAction label="Create Sale"    desc="Set up a sale category"          icon={BadgePercent}  iconBg="bg-emerald-50"  iconColor="text-[#047857]"   path="/admin/salecrud"      />
            <QuickAction label="Manage Orders"  desc="View & update order statuses"   icon={ShoppingCart}  iconBg="bg-emerald-50" iconColor="text-emerald-600" path="/admin/ordercrud"     />
            <QuickAction label="Add Promo Code" desc="Create discounts for customers" icon={TicketPercent} iconBg="bg-pink-50"    iconColor="text-pink-600"    path="/admin/promocodecrud" />
          </div>
        </div>
      </div>

      {/* ── Recent orders ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#047857]" /> Recent Orders
          </h2>
          <Link to="/admin/ordercrud" className="text-xs font-semibold text-[#047857] hover:text-emerald-600 flex items-center gap-1 transition-colors">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-400 text-[11px] uppercase tracking-wider font-semibold border-b border-gray-100">
                  <th className="text-left px-6 py-3">Customer</th>
                  <th className="text-left px-6 py-3 hidden sm:table-cell">Order ID</th>
                  <th className="text-left px-6 py-3 hidden md:table-cell">Items</th>
                  <th className="text-left px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.slice(0, 8).map((order, i) => {
                  const statusCls = {
                    pending:    'bg-amber-50 text-amber-700',
                    confirmed:  'bg-blue-50 text-blue-700',
                    processing: 'bg-violet-50 text-violet-700',
                    shipped:    'bg-cyan-50 text-cyan-700',
                    delivered:  'bg-emerald-50 text-emerald-700',
                    cancelled:  'bg-red-50 text-red-600',
                  }[order.status] ?? 'bg-gray-50 text-gray-600';

                  return (
                    <tr key={order._id || order.id || i} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#047857] to-amber-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(order.name || order.first_name || 'G').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{order.name || order.first_name || 'Guest'}</p>
                            <p className="text-xs text-gray-400 truncate">{order.email || order.phone || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 hidden sm:table-cell">
                        <code className="text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg font-mono">
                          {(order.id || order._id || '—').slice(-8).toUpperCase()}
                        </code>
                      </td>
                      <td className="px-6 py-3.5 text-gray-500 text-xs hidden md:table-cell">
                        {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-gray-800">
                        Rs.&nbsp;{fmt(order.totalAmount)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize ${statusCls}`}>
                          {order.status === 'delivered' && <CheckCircle2 className="w-3 h-3" />}
                          {order.status === 'pending'   && <Clock         className="w-3 h-3" />}
                          {order.status === 'cancelled' && <AlertCircle   className="w-3 h-3" />}
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString('en-NP', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
