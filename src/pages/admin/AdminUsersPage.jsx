import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Loader2, ChevronLeft, ChevronRight, Filter, Users as UsersIcon,
  TrendingUp, UserPlus, Wallet, ChevronRight as ChevronRightIcon,
  Mail, Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import DatePicker from '../../components/common/DatePicker.jsx';
import { fmtMoney, fmtDate, fmtDateTime } from '../../components/user/bookingFormatters.js';

const PAGE_SIZES = [25, 50, 100];

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest signups' },
  { value: 'oldest',     label: 'Oldest signups' },
  { value: 'spend',      label: 'Highest spend' },
  { value: 'bookings',   label: 'Most bookings' },
  { value: 'lastActive', label: 'Recently active' },
];

const BOOKING_FILTER_OPTIONS = [
  { value: '',      label: 'All users' },
  { value: 'true',  label: 'With bookings' },
  { value: 'false', label: 'Without bookings' },
];

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ q: '', from: '', to: '', hasBookings: '', sort: 'newest' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/users', { params });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => { load(); }, [load]);

  const updateFilter = (key, value) => {
    setFilters((p) => ({ ...p, [key]: value }));
    setPage(1);
  };
  const resetFilters = () => {
    setFilters({ q: '', from: '', to: '', hasBookings: '', sort: 'newest' });
    setPage(1);
  };

  const summary = data?.summary || {};
  const users = data?.users || [];
  const totalPages = data?.totalPages || 1;
  const hasFilters = filters.q || filters.from || filters.to || filters.hasBookings || filters.sort !== 'newest';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">Users</h1>
        <p className="text-ink-muted text-sm">
          Every registered traveller — search by email, phone, booking code or payment id.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard icon={UsersIcon}  label="Total users"     value={summary.totalUsers ?? 0}                accent="bg-blue-50 text-blue-600"       loading={loading} />
        <StatCard icon={UserPlus}   label="New this month"  value={summary.newThisMonth ?? 0}              accent="bg-emerald-50 text-emerald-600" loading={loading} />
        <StatCard icon={TrendingUp} label="Paying users"    value={summary.payingUsers ?? 0}               accent="bg-amber-50 text-amber-600"     loading={loading} />
        <StatCard icon={Wallet}     label="Revenue"         value={fmtMoney(summary.totalRevenue)}         accent="bg-rose-50 text-rose-600"       loading={loading} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-4 mb-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-muted mb-3">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => updateFilter('q', e.target.value)}
              placeholder="Name, email, phone, booking code, payment id…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            />
          </div>
          <select
            value={filters.hasBookings}
            onChange={(e) => updateFilter('hasBookings', e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none"
          >
            {BOOKING_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filters.sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 lg:col-span-2">
            <DatePicker
              value={filters.from}
              onChange={(iso) => updateFilter('from', iso)}
              placeholder="Joined from"
              compact
              size="sm"
              ariaLabel="Joined from"
            />
            <DatePicker
              value={filters.to}
              min={filters.from || undefined}
              onChange={(iso) => updateFilter('to', iso)}
              placeholder="Joined to"
              compact
              size="sm"
              ariaLabel="Joined to"
            />
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3 text-right">
            <button type="button" onClick={resetFilters} className="text-xs font-semibold text-ink-muted hover:text-brand">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-surface-alt/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-right px-4 py-3">Bookings</th>
                <th className="text-right px-4 py-3">Total spent</th>
                <th className="text-right px-4 py-3">Wallet</th>
                <th className="text-left px-4 py-3">Last active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-ink-muted">
                  <Loader2 className="animate-spin inline-block text-brand" />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-ink-muted">
                  No users match the current filters.
                </td></tr>
              ) : users.map((u) => (
                <UserRow key={u.id} user={u} onOpen={() => navigate(`/admin/users/${u.id}`)} />
              ))}
            </tbody>
          </table>
        </div>

        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-surface-alt/30 flex-wrap">
            <div className="text-xs text-ink-muted">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, data?.total || 0)} of {data?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                className="px-2 py-1.5 rounded border border-gray-200 text-xs bg-white"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
              </select>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded border border-gray-200 disabled:opacity-50 hover:bg-white"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-semibold text-ink">{page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-gray-200 disabled:opacity-50 hover:bg-white"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, loading }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-ink-muted uppercase tracking-wide truncate">{label}</div>
        <div className="font-bold text-lg text-ink truncate">{loading ? '…' : value}</div>
      </div>
    </div>
  );
}

function Avatar({ user }) {
  if (user.avatarUrl) {
    return <img src={fileUrl(user.avatarUrl)} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />;
  }
  const initials = (user.name || user.email || '?').split(/[\s@]+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('') || '?';
  return (
    <div className="w-10 h-10 rounded-full bg-brand/10 text-brand font-bold text-sm flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

function UserRow({ user, onOpen }) {
  return (
    <tr onClick={onOpen} className="hover:bg-surface-alt/40 cursor-pointer transition group">
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <div className="min-w-0">
            <div className="font-semibold text-ink text-sm truncate max-w-[200px] group-hover:text-brand transition">
              {user.name || <span className="italic text-ink-muted">No name yet</span>}
            </div>
            <div className="text-[11px] text-ink-muted flex items-center gap-1.5">
              {user.isProfileComplete ? (
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Active</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Profile incomplete</span>
              )}
              {!user.isActive && <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">Disabled</span>}
              {user.referralCode && <span className="font-mono">{user.referralCode}</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-sm text-ink flex items-center gap-1.5"><Mail size={11} className="text-ink-muted" />{user.email || '—'}</div>
        <div className="text-xs text-ink-muted flex items-center gap-1.5 mt-0.5"><Phone size={11} />{user.phone || '—'}</div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-ink-muted">{fmtDate(user.createdAt)}</td>
      <td className="px-4 py-3 align-top text-right">
        <div className="font-semibold text-ink">{user.bookingCount}</div>
        <div className="text-[11px] text-ink-muted">{user.paidBookingCount} paid</div>
      </td>
      <td className="px-4 py-3 align-top text-right font-bold text-brand">{fmtMoney(user.totalSpent)}</td>
      <td className="px-4 py-3 align-top text-right text-sm text-emerald-700 font-semibold">{fmtMoney(user.walletBalance)}</td>
      <td className="px-4 py-3 align-top text-xs text-ink-muted">{user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : '—'}</td>
      <td className="px-4 py-3 align-middle text-right">
        <ChevronRightIcon size={16} className="text-ink-muted group-hover:text-brand inline-block transition" />
      </td>
    </tr>
  );
}
