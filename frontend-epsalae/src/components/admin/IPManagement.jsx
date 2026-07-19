import { useEffect, useState, useCallback } from 'react';
import { Ban, ShieldCheck, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ipManagementApi } from '../api/ipManagementApi';
import ConfirmDialog from '../ui/ConfirmDialog';
import { ErrorState } from '../ui/States';

const STAT_CARDS = [
  { key: 'totalBlocked', label: 'Total Blocked', color: 'text-red-600' },
  { key: 'totalAllowed', label: 'Allow Listed', color: 'text-emerald-600' },
  { key: 'autoBlocked', label: 'Auto-Blocked', color: 'text-emerald-600' },
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
  const [error, setError] = useState(null);
  const [view, setView] = useState('blocked'); // 'blocked' | 'allowed' | 'add'

  const [blockForm, setBlockForm] = useState({ ip: '', reason: '', permanent: false, expiresInHours: 24 });
  const [allowForm, setAllowForm] = useState({ ip: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { type: 'unblock' | 'removeAllow', ip }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError('Failed to load IP data');
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
    try {
      await ipManagementApi.unblockIP(ip);
      toast.success(`${ip} unblocked`);
      fetchData();
    } catch {
      toast.error('Failed to unblock IP');
    }
  };

  const handleRemoveAllow = async (ip) => {
    try {
      await ipManagementApi.removeFromAllowList(ip);
      toast.success(`${ip} removed from allow list`);
      fetchData();
    } catch {
      toast.error('Failed to remove from allow list');
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      if (pendingAction.type === 'unblock') await handleUnblock(pendingAction.ip);
      else await handleRemoveAllow(pendingAction.ip);
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // Never loaded successfully — show a real error instead of an empty
  // "no IPs blocked" table that's indistinguishable from a genuinely clean state.
  if (error && !stats) {
    return (
      <div className="ds-page max-w-7xl mx-auto">
        <ErrorState
          title="Couldn't load IP data"
          description="Something went wrong. Check your connection and try again."
          onRetry={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="ds-page space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="ds-page-title">IP Management</h1>
        <p className="ds-page-sub">Block or allow-list IP addresses across the platform</p>
      </div>

      {error && stats && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Couldn't refresh the latest data — showing the last successful load.
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="ds-card ds-card-pad text-center">
              <p className={`text-2xl font-bold ${card.color}`}>{stats[card.key] ?? 0}</p>
              <p className="text-xs text-(--ds-text-muted) mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* View switcher */}
      <div className="flex items-center justify-between border-b border-(--ds-border)">
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
                view === tab.id ? 'border-[#047857] text-[#047857]' : 'border-transparent text-(--ds-text-muted) hover:text-(--ds-text)'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          className="ds-btn ds-btn-ghost ds-btn-icon"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Blocked IPs table */}
      {view === 'blocked' && (
        <div className="ds-card overflow-hidden">
          {blockedIPs.length === 0 ? (
            <div className="py-14 text-center text-(--ds-text-faint) text-sm">No IPs currently blocked</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Reason</th>
                    <th>Source</th>
                    <th>Expires</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {blockedIPs.map((rule) => (
                    <tr key={rule._id}>
                      <td className="font-mono text-red-600 font-medium">{rule.ip}</td>
                      <td className="text-(--ds-text-muted) max-w-xs truncate">{rule.reason}</td>
                      <td>
                        <span className={`ds-badge ${rule.autoBlocked ? 'ds-badge-success' : 'ds-badge-info'}`}>
                          {rule.autoBlocked ? 'Auto' : 'Manual'}
                        </span>
                      </td>
                      <td className="text-(--ds-text-muted) text-xs">{formatExpiry(rule.expiresAt, rule.permanent)}</td>
                      <td className="text-right">
                        <button
                          onClick={() => setPendingAction({ type: 'unblock', ip: rule.ip })}
                          className="ds-btn ds-btn-primary ds-btn-icon"
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
        <div className="ds-card overflow-hidden">
          {allowedIPs.length === 0 ? (
            <div className="py-14 text-center text-(--ds-text-faint) text-sm">No IPs on the allow list</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Reason</th>
                    <th>Added</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {allowedIPs.map((rule) => (
                    <tr key={rule._id}>
                      <td className="font-mono text-emerald-600 font-medium">{rule.ip}</td>
                      <td className="text-(--ds-text-muted)">{rule.reason}</td>
                      <td className="text-(--ds-text-muted) text-xs">
                        {rule.createdAt ? new Date(rule.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => setPendingAction({ type: 'removeAllow', ip: rule.ip })}
                          className="ds-btn ds-btn-danger ds-btn-icon"
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
          <form onSubmit={handleBlockIP} className="ds-card ds-card-pad space-y-3 border-red-100">
            <h3 className="font-semibold text-red-700 flex items-center gap-2">
              <Ban className="w-4 h-4" /> Block an IP Address
            </h3>
            <input
              type="text"
              placeholder="IP address (e.g. 192.168.1.1)"
              value={blockForm.ip}
              onChange={(e) => setBlockForm((f) => ({ ...f, ip: e.target.value }))}
              className="ds-input"
              required
            />
            <textarea
              placeholder="Reason for blocking..."
              value={blockForm.reason}
              onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
              rows={2}
              className="ds-textarea"
              required
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-(--ds-text-muted)">
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
                  className="ds-select w-auto py-1"
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
              className="ds-btn ds-btn-danger w-full"
            >
              Block IP
            </button>
          </form>

          <form onSubmit={handleAllowIP} className="ds-card ds-card-pad space-y-3 border-emerald-100">
            <h3 className="font-semibold text-emerald-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Allow an IP Address
            </h3>
            <input
              type="text"
              placeholder="IP address (e.g. 10.0.0.1)"
              value={allowForm.ip}
              onChange={(e) => setAllowForm((f) => ({ ...f, ip: e.target.value }))}
              className="ds-input"
              required
            />
            <textarea
              placeholder="Reason for allowing..."
              value={allowForm.reason}
              onChange={(e) => setAllowForm((f) => ({ ...f, reason: e.target.value }))}
              rows={2}
              className="ds-textarea"
              required
            />
            <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2">
              Allow-listed IPs bypass all rate limiting and can never be auto-blocked. Use only for trusted internal IPs.
            </p>
            <button
              type="submit"
              disabled={submitting || !allowForm.ip || !allowForm.reason}
              className="ds-btn ds-btn-primary w-full"
            >
              Add to Allow List
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!pendingAction}
        title={pendingAction?.type === 'unblock' ? `Unblock ${pendingAction?.ip}?` : `Remove ${pendingAction?.ip} from the allow list?`}
        description={pendingAction?.type === 'unblock'
          ? 'This IP will be able to access the site again.'
          : 'This IP will lose its allow-listed status and normal rate limiting will apply again.'}
        confirmLabel={pendingAction?.type === 'unblock' ? 'Unblock' : 'Remove'}
        variant="warning"
        isLoading={actionLoading}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
