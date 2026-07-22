// src/components/admin/usercrud.jsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users, Search, Eye, Lock, Unlock, ShieldOff, ShieldCheck,
  LogOut, Trash2, ShieldAlert, KeyRound, Mail, Calendar, Clock,
} from 'lucide-react';
import { useAdminAuth } from '../store/authstore';
import { useDebounce } from '@/hooks/useDebounce';
import { TableSkeleton } from '../ui/Skeleton';
import FetchState from '../ui/FetchState';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import {
  useAdminUsers, useAdminUser,
  useLockUser, useUnlockUser, useSetUserStatus, useRevokeUserSessions, useDeleteUser,
} from '@/hooks/useAdminUsersQuery';

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'user', label: 'Customer' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'locked', label: 'Locked' },
  { value: 'deleted', label: 'Deleted' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Registration date' },
  { value: 'lastLoginAt', label: 'Last login' },
];

function formatDate(value) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-NP', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ user }) {
  if (user.isDeleted) return <span className="ds-badge bg-gray-100 text-gray-500">Deleted</span>;
  if (user.isLocked) return <span className="ds-badge bg-amber-100 text-amber-700">Locked</span>;
  if (!user.isActive) return <span className="ds-badge bg-red-100 text-red-700">Inactive</span>;
  return <span className="ds-badge ds-badge-success">Active</span>;
}

function Avatar({ user, size = 'w-9 h-9' }) {
  const initial = (user.name?.[0] || user.email?.[0] || 'U').toUpperCase();
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.name} className={`${size} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${size} rounded-full bg-linear-to-br from-slate-700 to-slate-900 text-white text-sm font-bold flex items-center justify-center shrink-0`}>
      {initial}
    </div>
  );
}

export default function UserCrud() {
  const { admin } = useAdminAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);

  const [viewUserId, setViewUserId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // { type, id, label }

  useEffect(() => { setPage(1); }, [debouncedSearch, roleFilter, statusFilter, sortBy, order]);

  const { data, isLoading, isError, refetch } = useAdminUsers({
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    sortBy,
    order,
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination ?? null;

  const lockMutation = useLockUser();
  const unlockMutation = useUnlockUser();
  const statusMutation = useSetUserStatus();
  const revokeMutation = useRevokeUserSessions();
  const deleteMutation = useDeleteUser();

  const isSelf = (id) => admin?.id && String(admin.id) === String(id);

  const runAction = async (fn, successMessage, failureMessage) => {
    try {
      await fn();
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.response?.data?.message ?? failureMessage);
    }
  };

  const handleUnlock = (user) =>
    runAction(() => unlockMutation.mutateAsync({ id: user.id }), `${user.name || user.email} unlocked`, 'Failed to unlock user');

  const handleActivate = (user) =>
    runAction(
      () => statusMutation.mutateAsync({ id: user.id, isActive: true }),
      `${user.name || user.email} activated`,
      'Failed to activate user'
    );

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const { type, id, label } = pendingAction;
    try {
      if (type === 'lock') {
        await lockMutation.mutateAsync({ id });
        toast.success(`${label} locked`);
      } else if (type === 'deactivate') {
        await statusMutation.mutateAsync({ id, isActive: false });
        toast.success(`${label} deactivated`);
      } else if (type === 'revoke') {
        await revokeMutation.mutateAsync({ id });
        toast.success(`Sessions revoked for ${label}`);
      } else if (type === 'delete') {
        await deleteMutation.mutateAsync({ id });
        toast.success(`${label} deleted`);
        if (viewUserId === id) setViewUserId(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Action failed');
    } finally {
      setPendingAction(null);
    }
  };

  const actionLoading =
    lockMutation.isPending || statusMutation.isPending || revokeMutation.isPending || deleteMutation.isPending;

  const confirmCopy = {
    lock: {
      title: `Lock ${pendingAction?.label}'s account?`,
      description: 'They will be signed out of every device and unable to log back in until an admin unlocks the account.',
      confirmLabel: 'Lock account',
    },
    deactivate: {
      title: `Deactivate ${pendingAction?.label}'s account?`,
      description: 'They will be signed out immediately and unable to log in until reactivated.',
      confirmLabel: 'Deactivate',
    },
    revoke: {
      title: `Revoke all sessions for ${pendingAction?.label}?`,
      description: 'Every device currently logged in as this user will be signed out immediately.',
      confirmLabel: 'Revoke sessions',
    },
    delete: {
      title: `Delete ${pendingAction?.label}'s account?`,
      description: "This anonymises their profile and revokes all sessions. Their order history is kept, but this can't be undone.",
      confirmLabel: 'Delete account',
    },
  }[pendingAction?.type] || {};

  return (
    <div className="ds-page space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ds-page-title">User Management</h1>
          <p className="ds-page-sub">View and manage customer accounts</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-(--ds-text-muted)">
          <Users className="w-4 h-4" />
          {pagination?.total ?? 0} total users
        </div>
      </div>

      {/* Filters */}
      <div className="ds-card ds-card-pad flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ds-input pl-9"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="ds-select w-auto">
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ds-select w-auto">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="ds-select w-auto">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
        </select>
        <button
          onClick={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
          className="ds-btn ds-btn-ghost"
          title={order === 'asc' ? 'Ascending' : 'Descending'}
        >
          {order === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
      </div>

      {/* Table */}
      <div className="ds-card overflow-hidden">
        <FetchState
          isLoading={isLoading}
          isError={isError}
          isEmpty={!isLoading && !isError && users.length === 0}
          loading={<TableSkeleton rows={8} cols={7} />}
          errorTitle="Couldn't load users"
          errorDescription="Something went wrong. Check your connection and try again."
          onRetry={refetch}
          emptyIcon={Users}
          emptyTitle="No users found"
          emptyDescription={search ? 'Try a different search term.' : 'No customer accounts match these filters.'}
        >
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="text-left">User</th>
                  <th className="text-left">Role</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">MFA</th>
                  <th className="text-left">Last Login</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = isSelf(u.id);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar user={u} />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{u.name}{self && <span className="ml-1.5 text-[10px] font-normal text-(--ds-text-faint)">(you)</span>}</p>
                            <p className="text-xs text-gray-500 truncate flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-left">
                        <span className="ds-badge ds-badge-info">Customer</span>
                      </td>
                      <td className="text-center"><StatusBadge user={u} /></td>
                      <td className="text-center">
                        {u.mfaEnabled
                          ? <ShieldCheck className="w-4 h-4 text-emerald-600 inline" aria-label="MFA enabled" />
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="text-left text-xs text-(--ds-text-muted)">{formatDate(u.lastLoginAt)}</td>
                      <td>
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => setViewUserId(u.id)}
                            className="ds-btn ds-btn-blue ds-btn-icon"
                            title="View details"
                            aria-label={`View ${u.name || u.email}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {u.isLocked ? (
                            <button
                              onClick={() => handleUnlock(u)}
                              disabled={actionLoading}
                              className="ds-btn ds-btn-ghost ds-btn-icon"
                              title="Unlock account"
                              aria-label={`Unlock ${u.name || u.email}`}
                            >
                              <Unlock className="w-4 h-4 text-emerald-600" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setPendingAction({ type: 'lock', id: u.id, label: u.name || u.email })}
                              disabled={self || u.isDeleted || actionLoading}
                              className="ds-btn ds-btn-ghost ds-btn-icon disabled:opacity-30"
                              title={self ? "Can't lock your own account" : 'Lock account'}
                              aria-label={`Lock ${u.name || u.email}`}
                            >
                              <Lock className="w-4 h-4 text-amber-600" />
                            </button>
                          )}

                          {u.isActive ? (
                            <button
                              onClick={() => setPendingAction({ type: 'deactivate', id: u.id, label: u.name || u.email })}
                              disabled={self || u.isDeleted || actionLoading}
                              className="ds-btn ds-btn-ghost ds-btn-icon disabled:opacity-30"
                              title={self ? "Can't deactivate your own account" : 'Deactivate account'}
                              aria-label={`Deactivate ${u.name || u.email}`}
                            >
                              <ShieldOff className="w-4 h-4 text-red-500" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(u)}
                              disabled={u.isDeleted || actionLoading}
                              className="ds-btn ds-btn-ghost ds-btn-icon disabled:opacity-30"
                              title="Activate account"
                              aria-label={`Activate ${u.name || u.email}`}
                            >
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            </button>
                          )}

                          <button
                            onClick={() => setPendingAction({ type: 'revoke', id: u.id, label: u.name || u.email })}
                            disabled={u.isDeleted || actionLoading}
                            className="ds-btn ds-btn-ghost ds-btn-icon disabled:opacity-30"
                            title="Revoke all sessions"
                            aria-label={`Revoke sessions for ${u.name || u.email}`}
                          >
                            <LogOut className="w-4 h-4 text-blue-600" />
                          </button>

                          <button
                            onClick={() => setPendingAction({ type: 'delete', id: u.id, label: u.name || u.email })}
                            disabled={self || u.isDeleted || actionLoading}
                            className="ds-btn ds-btn-ghost ds-btn-icon disabled:opacity-30"
                            title={self ? "Can't delete your own account" : 'Delete account'}
                            aria-label={`Delete ${u.name || u.email}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  ← Prev
                </button>
                <span className="text-xs font-bold text-gray-600">
                  Page {page} / {pagination.totalPages} ({pagination.total} users)
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </FetchState>
      </div>

      <UserDetailModal
        userId={viewUserId}
        onClose={() => setViewUserId(null)}
        isSelf={isSelf}
        onAction={(type, user) => setPendingAction({ type, id: user.id, label: user.name || user.email })}
        onUnlock={handleUnlock}
        onActivate={handleActivate}
        actionLoading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!pendingAction}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        variant="danger"
        isLoading={actionLoading}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

const EVENT_RISK_STYLE = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

function UserDetailModal({ userId, onClose, isSelf, onAction, onUnlock, onActivate, actionLoading }) {
  const { data, isLoading } = useAdminUser(userId);

  if (!userId) return null;

  const user = data?.user;
  const self = user && isSelf(user.id);

  return (
    <Modal isOpen={!!userId} onClose={onClose} size="lg" title="User Details">
      {isLoading || !user ? (
        <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar user={user} size="w-14 h-14" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-gray-900 truncate">{user.name}{self && ' (you)'}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
            <StatusBadge user={user} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="ds-card ds-card-pad space-y-1">
              <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Last login</p>
              <p className="font-medium text-gray-800">{formatDate(user.lastLoginAt)}</p>
            </div>
            <div className="ds-card ds-card-pad space-y-1">
              <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Registered</p>
              <p className="font-medium text-gray-800">{formatDate(user.createdAt)}</p>
            </div>
            <div className="ds-card ds-card-pad space-y-1">
              <p className="text-xs text-gray-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Failed login attempts</p>
              <p className="font-medium text-gray-800">{user.loginAttempts}</p>
            </div>
            <div className="ds-card ds-card-pad space-y-1">
              <p className="text-xs text-gray-400 flex items-center gap-1"><KeyRound className="w-3 h-3" /> Active sessions</p>
              <p className="font-medium text-gray-800">{data.activeSessionCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`ds-badge ${user.mfaEnabled ? 'ds-badge-success' : 'bg-gray-100 text-gray-500'}`}>
              MFA {user.mfaEnabled ? `enabled (${user.mfaMethod})` : 'disabled'}
            </span>
            <span className={`ds-badge ${user.emailVerified ? 'ds-badge-success' : 'bg-gray-100 text-gray-500'}`}>
              Email {user.emailVerified ? 'verified' : 'unverified'}
            </span>
            {user.mustChangePassword && <span className="ds-badge bg-amber-100 text-amber-700">Must change password</span>}
            <span className="ds-badge bg-gray-100 text-gray-500">Password expires {formatDate(user.passwordExpiresAt)}</span>
          </div>

          {!user.isDeleted && (
            <div className="flex flex-wrap gap-2 pt-1">
              {user.isLocked ? (
                <button onClick={() => onUnlock(user)} disabled={actionLoading} className="ds-btn ds-btn-primary">
                  <Unlock className="w-4 h-4" /> Unlock account
                </button>
              ) : (
                <button
                  onClick={() => onAction('lock', user)}
                  disabled={self || actionLoading}
                  className="ds-btn ds-btn-ghost disabled:opacity-30"
                >
                  <Lock className="w-4 h-4" /> Lock account
                </button>
              )}
              {user.isActive ? (
                <button
                  onClick={() => onAction('deactivate', user)}
                  disabled={self || actionLoading}
                  className="ds-btn ds-btn-ghost disabled:opacity-30"
                >
                  <ShieldOff className="w-4 h-4" /> Deactivate
                </button>
              ) : (
                <button onClick={() => onActivate(user)} disabled={actionLoading} className="ds-btn ds-btn-primary">
                  <ShieldCheck className="w-4 h-4" /> Activate
                </button>
              )}
              <button onClick={() => onAction('revoke', user)} disabled={actionLoading} className="ds-btn ds-btn-ghost">
                <LogOut className="w-4 h-4" /> Revoke sessions
              </button>
              <button
                onClick={() => onAction('delete', user)}
                disabled={self || actionLoading}
                className="ds-btn ds-btn-danger disabled:opacity-30"
              >
                <Trash2 className="w-4 h-4" /> Delete account
              </button>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Recent security events</h3>
            {!data.recentEvents?.length ? (
              <p className="text-sm text-gray-400">No recent activity.</p>
            ) : (
              <div className="space-y-2">
                {data.recentEvents.map((ev) => (
                  <div key={ev._id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-700 truncate">{ev.action}</p>
                      <p className="text-gray-400">{formatDate(ev.timestamp)} · {ev.ipAddress}</p>
                    </div>
                    <span className={`ds-badge shrink-0 ${EVENT_RISK_STYLE[ev.riskLevel] || EVENT_RISK_STYLE.LOW}`}>{ev.riskLevel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
