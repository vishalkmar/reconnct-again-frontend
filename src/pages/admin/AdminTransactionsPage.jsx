import { useCallback, useEffect, useState } from 'react';
import {
  Search, Loader2, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  TrendingUp, Wallet, RefreshCcw, ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminBookingDetailsModal from '../../components/admin/AdminBookingDetailsModal.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import {
  TYPE_LABEL, fmtMoney, fmtDateTime,
} from '../../components/user/bookingFormatters.js';

const PAGE_SIZES = [25, 50, 100];

// Admin transactions page — same backing endpoint as Bookings but always
// filtered to paid rows so it reads like a finance ledger.
export default function AdminTransactionsPage() {
  const [filters, setFilters] = useState({ q: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, paidOnly: true };
      if (filters.q) params.q = filters.q;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const res = await api.get('/admin/bookings', { params });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load transactions');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary || {};
  const rows = data?.bookings || [];
  const totalPages = data?.totalPages || 1;

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const openDetails = async (code) => {
    try {
      const res = await api.get(`/admin/bookings/${code}`);
      setSelected(res.data?.data?.booking || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load booking');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Transactions</h1>
          <p className="text-ink-muted text-sm">All paid bookings and refunds — every payment ledger entry across the platform.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-white text-sm font-medium disabled:opacity-60"
        >
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats — refundable totals are negative, so we render them as a "money out" stat. */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <StatCard icon={TrendingUp} label="Gross collected" value={fmtMoney(summary.totalRevenue)} accent="bg-emerald-50 text-emerald-600" loading={loading} />
        <StatCard icon={ArrowDownRight} label="Refunds" value={fmtMoney(summary.totalRefund)} accent="bg-rose-50 text-rose-600" loading={loading} />
        <StatCard icon={Wallet} label="Net" value={fmtMoney((summary.totalRevenue || 0) - (summary.totalRefund || 0))} accent="bg-brand/10 text-brand" loading={loading} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => updateFilter('q', e.target.value)}
              placeholder="Booking code, name, payment id…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            />
          </div>
          <DatePicker
            value={filters.from}
            onChange={(iso) => updateFilter('from', iso)}
            placeholder="From"
            compact
            size="sm"
            ariaLabel="From date"
          />
          <DatePicker
            value={filters.to}
            min={filters.from || undefined}
            onChange={(iso) => updateFilter('to', iso)}
            placeholder="To"
            compact
            size="sm"
            ariaLabel="To date"
          />
        </div>
      </div>

      {/* Ledger table */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-surface-alt/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Booking</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                  <Loader2 className="animate-spin inline-block text-brand" />
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                  No transactions match the current filters.
                </td></tr>
              ) : rows.map((b) => (
                <TxRow key={b.bookingCode} booking={b} onOpen={() => openDetails(b.bookingCode)} />
              ))}
            </tbody>
          </table>
        </div>

        {!loading && rows.length > 0 && (
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
        onChanged={load}
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

function TxRow({ booking, onOpen }) {
  const refunded = booking.status === 'refunded';
  return (
    <tr
      onClick={onOpen}
      className="hover:bg-surface-alt/40 cursor-pointer transition group"
    >
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            refunded ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
            {refunded ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink">{fmtDateTime(booking.payment?.paidAt || booking.updatedAt)}</div>
            <div className="text-[10px] text-ink-muted uppercase tracking-wide">
              {refunded ? 'Refund' : 'Payment'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="font-mono text-xs text-ink-muted">{booking.bookingCode}</div>
        <div className="text-sm font-medium text-ink truncate max-w-[260px] group-hover:text-brand transition">{booking.item?.name}</div>
        <div className="text-[11px] text-ink-muted">{TYPE_LABEL[booking.item?.type] || booking.item?.type}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-sm font-medium text-ink truncate max-w-[180px]">{booking.user?.name || booking.guest?.name}</div>
        <div className="text-xs text-ink-muted truncate max-w-[180px]">{booking.user?.email || booking.guest?.email}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="font-mono text-xs text-ink truncate max-w-[180px]">{booking.payment?.paymentId || '—'}</div>
        {booking.payment?.method && (
          <div className="text-[11px] text-ink-muted capitalize mt-0.5">via {booking.payment.method}</div>
        )}
      </td>
      <td className="px-4 py-3 align-top text-right">
        <div className={`text-base font-bold ${refunded ? 'text-rose-600' : 'text-emerald-700'}`}>
          {refunded ? '− ' : ''}{fmtMoney(booking.pricing?.total, booking.currency)}
        </div>
      </td>
      <td className="px-4 py-3 align-middle text-right">
        <ChevronRightIcon size={16} className="text-ink-muted group-hover:text-brand inline-block transition" />
      </td>
    </tr>
  );
}
