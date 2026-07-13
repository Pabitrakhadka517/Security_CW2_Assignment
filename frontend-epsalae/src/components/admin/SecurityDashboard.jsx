import { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert, Lock, Globe, ArrowUpRight, ArrowDownRight,
  Loader2, ChevronDown, ChevronUp, Flame, Ban,
} from 'lucide-react';
import { auditApi } from '../api/auditapi';
import { useAuditStore } from '@/store/auditStore';
import IPManagement from './IPManagement';

const RISK_BADGE = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const STATUS_BADGE = {
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  FAILURE: 'bg-red-50 text-red-600',
  BLOCKED: 'bg-orange-50 text-orange-700',
};

function trendPct(count, previousCount) {
  if (!previousCount) return null;
  return ((count - previousCount) / previousCount) * 100;
}

function SummaryCard({ label, value, previousCount, icon: Icon, iconBg, iconColor }) {
  const pct = trendPct(value, previousCount);
  const up = (pct ?? 0) >= 0;
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div className={`w-11 h-11 ${iconBg} rounded-2xl flex items-center justify-center shadow-sm`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {pct !== null && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${up ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
            {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(pct).toFixed(0)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value ?? 0}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function RiskBadge({ level }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${RISK_BADGE[level] || RISK_BADGE.LOW}`}>
      {level || 'LOW'}
    </span>
  );
}

function EventRow({ event }) {
  const [open, setOpen] = useState(false);
  const isCritical = event.riskLevel === 'CRITICAL';
  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className={`cursor-pointer hover:bg-orange-50/30 transition-colors ${isCritical ? 'bg-red-50/40' : ''}`}
      >
        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
          {event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}
        </td>
        <td className="px-5 py-3 text-sm text-gray-800">{event.userEmail || 'guest'}</td>
        <td className="px-5 py-3 text-xs font-mono text-gray-600">{event.action}</td>
        <td className="px-5 py-3 text-xs text-gray-500">{event.ipAddress}</td>
        <td className="px-5 py-3">
          <span className={`inline-flex px-2 py-1 rounded-lg text-[11px] font-semibold ${STATUS_BADGE[event.status] || ''}`}>
            {event.status}
          </span>
        </td>
        <td className="px-5 py-3"><RiskBadge level={event.riskLevel} /></td>
        <td className="px-3 py-3 text-gray-300">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="px-5 pb-4 bg-gray-50/60">
            <pre className="text-[11px] text-gray-600 whitespace-pre-wrap break-all bg-white border border-gray-100 rounded-xl p-3">
              {JSON.stringify(event.metadata || {}, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export default function SecurityDashboard() {
  const { securitySummary, isLoading, fetchSecuritySummary } = useAuditStore();
  const [liveEvents, setLiveEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const pollLive = useCallback(async () => {
    try {
      const res = await auditApi.getLogs({ limit: 5 });
      const logs = res.data?.data?.logs || [];
      setLiveEvents(logs);
    } catch {
      // Live ticker is best-effort — a failed poll just keeps the last feed.
    }
  }, []);

  useEffect(() => {
    fetchSecuritySummary();
    pollLive();
    const interval = setInterval(() => {
      fetchSecuritySummary();
      pollLive();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchSecuritySummary, pollLive]);

  if (isLoading && !securitySummary) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  const summary = securitySummary?.summary || {};
  const topRiskEvents = securitySummary?.topRiskEvents || [];
  const topSuspiciousIps = securitySummary?.topSuspiciousIps || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Security Dashboard</h1>
        <p className="text-sm text-gray-500">Login activity, suspicious behaviour, and audit trail — last 24 hours.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-gray-100">
        {[
          { id: 'overview', label: 'Overview', icon: ShieldAlert },
          { id: 'ip', label: 'IP Management', icon: Ban },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-[#FF6B35] text-[#FF6B35]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ip' && <IPManagement />}

      {activeTab === 'overview' && (
      <>
      {/* Section 1 — Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Login Attempts (24h)"
          value={summary.totalLoginAttempts?.count}
          previousCount={summary.totalLoginAttempts?.previousCount}
          icon={Globe} iconBg="bg-blue-100" iconColor="text-blue-600"
        />
        <SummaryCard
          label="Failed Logins (24h)"
          value={summary.failedLogins?.count}
          previousCount={summary.failedLogins?.previousCount}
          icon={ShieldAlert} iconBg="bg-red-100" iconColor="text-red-600"
        />
        <SummaryCard
          label="Blocked Accounts (24h)"
          value={summary.blockedAccounts?.count}
          previousCount={summary.blockedAccounts?.previousCount}
          icon={Lock} iconBg="bg-orange-100" iconColor="text-[#FF6B35]"
        />
        <SummaryCard
          label="Suspicious IPs (24h)"
          value={summary.suspiciousIps?.count}
          previousCount={summary.suspiciousIps?.previousCount}
          icon={Flame} iconBg="bg-violet-100" iconColor="text-violet-600"
        />
      </div>

      {/* Section 2 — Recent high-risk events */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" /> High-Risk &amp; Critical Events
          </h2>
        </div>
        {topRiskEvents.length === 0 ? (
          <div className="py-14 text-center text-gray-300 text-sm">No high-risk events in the last 24 hours</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-400 text-[11px] uppercase tracking-wider font-semibold border-b border-gray-100">
                  <th className="text-left px-5 py-3">Time</th>
                  <th className="text-left px-5 py-3">User</th>
                  <th className="text-left px-5 py-3">Action</th>
                  <th className="text-left px-5 py-3">IP</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Risk</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topRiskEvents.map((e, i) => <EventRow key={e._id || i} event={e} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Section 3 — Top suspicious IPs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">Top Suspicious IPs</h2>
          </div>
          {topSuspiciousIps.length === 0 ? (
            <div className="py-10 text-center text-gray-300 text-sm">No failed-login clusters detected</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {topSuspiciousIps.map((ip, i) => (
                <li key={i} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-mono text-gray-800">{ip.ipAddress}</p>
                    <p className="text-xs text-gray-400">Last seen {ip.lastSeen ? new Date(ip.lastSeen).toLocaleString() : '—'}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600">{ip.count} failed</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Section 4 — Live activity feed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live Activity
            </h2>
            <span className="text-[11px] text-gray-400">refreshes every 30s</span>
          </div>
          {liveEvents.length === 0 ? (
            <div className="py-10 text-center text-gray-300 text-sm">No recent events</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {liveEvents.slice(0, 5).map((e, i) => (
                <li
                  key={e._id || i}
                  className={`flex items-center justify-between px-6 py-3 ${e.riskLevel === 'CRITICAL' ? 'border-2 border-red-400 rounded-xl m-1.5 animate-pulse' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-gray-700 truncate">{e.action}</p>
                    <p className="text-[11px] text-gray-400">{e.userEmail || 'guest'} &middot; {e.ipAddress}</p>
                  </div>
                  <RiskBadge level={e.riskLevel} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
