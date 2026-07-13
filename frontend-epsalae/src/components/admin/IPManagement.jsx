import { useEffect, useState, useCallback } from 'react';
import { Ban, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ipManagementApi } from '../api/ipManagementApi';

const STAT_CARDS = [
  { key: 'totalBlocked', label: 'Total Blocked', color: 'text-red-600' },
  { key: 'totalAllowed', label: 'Allow Listed', color: 'text-emerald-600' },
  { key: 'autoBlocked', label: 'Auto-Blocked', color: 'text-orange-600' },
  { key: 'permanentBlocked', label: 'Permanent Blocks', color: 'text-violet-600' },
  { key: 'expiringIn24h', label: 'Expiring in 24h', color: 'text-amber-600' },
];

function formatExpiry(expiresAt, permanent) {
  if (permanent || !expiresAt) return 'Permanent';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h remaining`;
  return `${Math.floor(hours / 24)}d remaining`;
}

export default function IPManagement() {
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [allowedIPs, setAllowedIPs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('blocked'); // 'blocked' | 'allowed' | 'add'

  const [blockForm, setBlockForm] = useState({ ip: '', reason: '', permanent: false, expiresInHours: 24 });
  const [allowForm, setAllowForm] = useState({ ip: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [blockedRes, allowedRes, statsRes] = await Promise.all([
        ipManagementApi.getBlocked(),
        ipManagementApi.getAllowed(),
        ipManagementApi.getStats(),
      ]);
      setBlockedIPs(blockedRes.data?.data?.ips ?? []);
      setAllowedIPs(allowedRes.data?.data?.ips ?? []);
      setStats(statsRes.data?.data?.stats ?? null);
    } catch {
      toast.error('Failed to load IP data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBlockIP = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ipManagementApi.blockIP(blockForm);
      toast.success(`IP ${blockForm.ip} blocked`);
      setBlockForm({ ip: '', reason: '', permanent: false, expiresInHours: 24 });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to block IP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllowIP = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ipManagementApi.allowIP(allowForm);
      toast.success(`IP ${allowForm.ip} allow-listed`);
      setAllowForm({ ip: '', reason: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to allow IP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (ip) => {
    if (!window.confirm(`Unblock ${ip}?`)) return;
    try {
      await ipManagementApi.unblockIP(ip);
      toast.success(`${ip} unblocked`);
      fetchData();
    } catch {
      toast.error('Failed to unblock IP');
    }
  };

  const handleRemoveAllow = async (ip) => {
    if (!window.confirm(`Remove ${ip} from the allow list?`)) return;
    try {
      await ipManagementApi.removeFromAllowList(ip);
      toast.success(`${ip} removed from allow list`);
      fetchData();
    } catch {
      toast.error('Failed to remove from allow list');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${card.color}`}>{stats[card.key] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* View switcher */}
      <div className="flex items-center justify-between border-b border-gray-100">
        <div className="flex gap-1">
          {[
            { id: 'blocked', label: `Blocked (${blockedIPs.length})` },
            { id: 'allowed', label: `Allowed (${allowedIPs.length})` },
            { id: 'add', label: '+ Add Rule' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                view === tab.id ? 'border-[#FF6B35] text-[#FF6B35]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 px-3 py-2"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Blocked IPs table */}
      {view === 'blocked' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {blockedIPs.length === 0 ? (
            <div className="py-14 text-center text-gray-300 text-sm">No IPs currently blocked</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-400 text-[11px] uppercase tracking-wider font-semibold border-b border-gray-100">
                    <th className="text-left px-5 py-3">IP Address</th>
                    <th className="text-left px-5 py-3">Reason</th>
                    <th className="text-left px-5 py-3">Source</th>
                    <th className="text-left px-5 py-3">Expires</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {blockedIPs.map((rule) => (
                    <tr key={rule._id} className="hover:bg-red-50/20">
                      <td className="px-5 py-3 font-mono text-red-600 font-medium">{rule.ip}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{rule.reason}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${rule.autoBlocked ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {rule.autoBlocked ? 'Auto' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{formatExpiry(rule.expiresAt, rule.permanent)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleUnblock(rule.ip)}
                          className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg hover:bg-emerald-200 transition-colors"
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Allowed IPs table */}
      {view === 'allowed' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {allowedIPs.length === 0 ? (
            <div className="py-14 text-center text-gray-300 text-sm">No IPs on the allow list</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-400 text-[11px] uppercase tracking-wider font-semibold border-b border-gray-100">
                    <th className="text-left px-5 py-3">IP Address</th>
                    <th className="text-left px-5 py-3">Reason</th>
                    <th className="text-left px-5 py-3">Added</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allowedIPs.map((rule) => (
                    <tr key={rule._id} className="hover:bg-emerald-50/20">
                      <td className="px-5 py-3 font-mono text-emerald-600 font-medium">{rule.ip}</td>
                      <td className="px-5 py-3 text-gray-600">{rule.reason}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {rule.createdAt ? new Date(rule.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleRemoveAllow(rule.ip)}
                          className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add rule forms */}
      {view === 'add' && (
        <div className="grid md:grid-cols-2 gap-5">
          <form onSubmit={handleBlockIP} className="bg-red-50/60 border border-red-100 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-red-800 flex items-center gap-2">
              <Ban className="w-4 h-4" /> Block an IP Address
            </h3>
            <input
              type="text"
              placeholder="IP address (e.g. 192.168.1.1)"
              value={blockForm.ip}
              onChange={(e) => setBlockForm((f) => ({ ...f, ip: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              required
            />
            <textarea
              placeholder="Reason for blocking..."
              value={blockForm.reason}
              onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              required
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={blockForm.permanent}
                  onChange={(e) => setBlockForm((f) => ({ ...f, permanent: e.target.checked }))}
                />
                Permanent block
              </label>
              {!blockForm.permanent && (
                <select
                  value={blockForm.expiresInHours}
                  onChange={(e) => setBlockForm((f) => ({ ...f, expiresInHours: parseInt(e.target.value, 10) }))}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>1 week</option>
                </select>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting || !blockForm.ip || !blockForm.reason}
              className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Block IP
            </button>
          </form>

          <form onSubmit={handleAllowIP} className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Allow an IP Address
            </h3>
            <input
              type="text"
              placeholder="IP address (e.g. 10.0.0.1)"
              value={allowForm.ip}
              onChange={(e) => setAllowForm((f) => ({ ...f, ip: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              required
            />
            <textarea
              placeholder="Reason for allowing..."
              value={allowForm.reason}
              onChange={(e) => setAllowForm((f) => ({ ...f, reason: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              required
            />
            <p className="text-xs text-emerald-700 bg-emerald-100/70 rounded-lg p-2">
              Allow-listed IPs bypass all rate limiting and can never be auto-blocked. Use only for trusted internal IPs.
            </p>
            <button
              type="submit"
              disabled={submitting || !allowForm.ip || !allowForm.reason}
              className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add to Allow List
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
