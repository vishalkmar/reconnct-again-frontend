import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Loader2, ChevronLeft, ChevronRight, Filter, Calendar as CalendarIcon,
  TrendingUp, CheckCircle2, XCircle, Hash, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import AdminBookingDetailsModal from '../../components/admin/AdminBookingDetailsModal.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import {
  TYPE_LABEL, STATUS_BADGE, fmtMoney, fmtDate,
} from '../../components/user/bookingFormatters.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'package', label: 'Retreats' },
  { value: 'room', label: 'Hotel Rooms' },
  { value: 'event', label: 'Events' },
  { value: 'addon', label: 'Add-ons' },
];

const PAGE_SIZES = [25, 50, 100];

export default function AdminBookingsPage() {
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    itemType: '',
    from: '',
    to: '',
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/bookings', { params });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load bookings');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary || {};
  const bookings = data?.bookings || [];
  const totalPages = data?.totalPages || 1;

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ q: '', status: '', itemType: '', from: '', to: '' });
    setPage(1);
  };

  // Open the detail modal but always re-fetch the freshest copy so any status
  // changes since the list was loaded show up immediately.
  const openDetails = async (bookingCode) => {
    try {
      const res = await api.get(`/admin/bookings/${bookingCode}`);
      setSelected(res.data?.data?.booking || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load booking');
    }
  };

  const handleChanged = async () => {
    await load();
    if (selected?.bookingCode) {
      try {
        const res = await api.get(`/admin/bookings/${selected.bookingCode}`);
        setSelected(res.data?.data?.booking || null);
      } catch { setSelected(null); }
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">Bookings</h1>
        <p className="text-ink-muted text-sm">Every booking across the platform, with full traveller and payment details.</p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <StatCard icon={TrendingUp} label="Revenue" value={fmtMoney(summary.totalRevenue)} accent="bg-emerald-50 text-emerald-600" loading={loading} />
        <StatCard icon={Hash} label="Bookings" value={summary.bookingCount ?? 0} accent="bg-blue-50 text-blue-600" loading={loading} />
        <StatCard icon={CheckCircle2} label="Paid" value={summary.paidCount ?? 0} accent="bg-amber-50 text-amber-600" loading={loading} />
        <StatCard icon={Clock} label="Pending" value={summary.pendingCount ?? 0} accent="bg-orange-50 text-orange-600" loading={loading} />
        <StatCard icon={XCircle} label="Cancelled" value={summary.cancelledCount ?? 0} accent="bg-rose-50 text-rose-600" loading={loading} />
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
              placeholder="Code, name, email, phone, payment id…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filters.itemType}
            onChange={(e) => updateFilter('itemType', e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none"
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <DatePicker
              value={filters.from}
              onChange={(iso) => updateFilter('from', iso)}
              placeholder="From"
              compact
              size="sm"
              ariaLabel="Scheduled from"
            />
            <DatePicker
              value={filters.to}
              min={filters.from || undefined}
              onChange={(iso) => updateFilter('to', iso)}
              placeholder="To"
              compact
              size="sm"
              ariaLabel="Scheduled to"
            />
          </div>
        </div>
        {(filters.q || filters.status || filters.itemType || filters.from || filters.to) && (
          <div className="mt-3 text-right">
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-ink-muted hover:text-brand"
            >Clear filters</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-surface-alt/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="text-left px-4 py-3">Booking</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                  <Loader2 className="animate-spin inline-block text-brand" />
                </td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                  No bookings match the current filters.
                </td></tr>
              ) : bookings.map((b) => (
                <BookingRow key={b.bookingCode} booking={b} onOpen={() => openDetails(b.bookingCode)} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && bookings.length > 0 && (
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

      <AdminBookingDetailsModal
        booking={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onChanged={handleChanged}
      />
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

function BookingRow({ booking, onOpen }) {
  const item = booking.item || {};
  const badge = STATUS_BADGE[booking.status] || { label: booking.status, cls: 'bg-slate-100 text-slate-700' };
  const scheduleLine = booking.scheduledFor
    ? booking.scheduledEndAt
      ? `${fmtDate(booking.scheduledFor)} → ${fmtDate(booking.scheduledEndAt)}`
      : fmtDate(booking.scheduledFor)
    : '—';

  return (
    <tr
      onClick={onOpen}
      className="hover:bg-surface-alt/40 cursor-pointer transition group"
    >
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-3">
          {item.image ? (
            <img src={fileUrl(item.image)} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center text-ink-muted text-xs">
              {TYPE_LABEL[item.type]?.slice(0, 1) || '?'}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-mono text-xs text-ink-muted">{booking.bookingCode}</div>
            <div className="font-semibold text-ink text-sm truncate group-hover:text-brand transition max-w-[260px]">
              {item.name || 'Booking'}
            </div>
            <div className="text-[11px] text-ink-muted mt-0.5">{TYPE_LABEL[item.type] || item.type}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="font-medium text-ink text-sm truncate max-w-[180px]">{booking.user?.name || booking.guest?.name}</div>
        <div className="text-xs text-ink-muted truncate max-w-[180px]">{booking.user?.email || booking.guest?.email}</div>
        <div className="text-[11px] text-ink-muted">{booking.guest?.phone || booking.user?.phone || '—'}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-sm text-ink inline-flex items-center gap-1">
          <CalendarIcon size={12} className="text-ink-muted" />
          {scheduleLine}
        </div>
        <div className="text-[11px] text-ink-muted mt-0.5">
          {booking.guest?.count || 1} guest{booking.guest?.count === 1 ? '' : 's'} · {booking.units || 1} {item.type === 'room' ? 'night' : 'day'}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-right">
        <div className="font-bold text-brand">{fmtMoney(booking.pricing?.total, booking.currency)}</div>
        {booking.pricing?.couponDiscount > 0 && (
          <div className="text-[11px] text-emerald-600">- {fmtMoney(booking.pricing.couponDiscount, booking.currency)} coupon</div>
        )}
      </td>
      <td className="px-4 py-3 align-middle text-right">
        <ChevronRight size={16} className="text-ink-muted group-hover:text-brand inline-block transition" />
      </td>
    </tr>
  );
}
