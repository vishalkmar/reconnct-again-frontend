import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Search, Loader2, ChevronRight, CreditCard, ArrowDownRight, ArrowUpRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import BookingDetailsModal from '../../components/user/BookingDetailsModal.jsx';
import {
  TYPE_LABEL, fmtMoney, fmtDateTime, isPaid,
} from '../../components/user/bookingFormatters.js';

const TABS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'paid', label: 'Payments', match: (b) => b.status === 'confirmed' || b.status === 'completed' },
  { key: 'refunded', label: 'Refunds', match: (b) => b.status === 'refunded' },
];

export default function UserTransactionsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/me');
      // A "transaction" only exists once money actually moved (or was refunded).
      // pending_payment rows aren't transactions yet.
      const onlyPaid = (res.data?.data?.bookings || []).filter(isPaid);
      setBookings(onlyPaid);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab) || TABS[0];
    let rows = bookings.filter(activeTab.match);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((b) =>
        b.bookingCode?.toLowerCase().includes(q) ||
        b.item?.name?.toLowerCase().includes(q) ||
        b.payment?.paymentId?.toLowerCase().includes(q) ||
        b.payment?.orderId?.toLowerCase().includes(q)
      );
    }
    // Newest paid-at first; fall back to creation date.
    return rows.sort((a, b) => {
      const ta = new Date(a.payment?.paidAt || a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.payment?.paidAt || b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [bookings, tab, query]);

  const stats = useMemo(() => {
    let paidPaise = 0;
    let refundedPaise = 0;
    for (const b of bookings) {
      const t = Math.round(Number(b.pricing?.total || 0) * 100);
      if (b.status === 'refunded') refundedPaise += t;
      else if (b.status === 'confirmed' || b.status === 'completed') paidPaise += t;
    }
    return {
      paid: paidPaise / 100,
      refunded: refundedPaise / 100,
      net: (paidPaise - refundedPaise) / 100,
      count: bookings.length,
    };
  }, [bookings]);

  const handleChanged = async () => {
    await load();
    if (selected?.bookingCode) {
      try {
        const res = await api.get(`/bookings/me/${selected.bookingCode}`);
        setSelected(res.data?.data?.booking || null);
      } catch {
        setSelected(null);
      }
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold">Transactions</h1>
        <p className="text-sm text-ink-muted mt-1">Every payment and refund, with the linked booking and voucher attached.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard icon={ArrowUpRight} label="Total paid" value={fmtMoney(stats.paid)} accent="bg-emerald-50 text-emerald-600" />
        <StatCard icon={ArrowDownRight} label="Refunded" value={fmtMoney(stats.refunded)} accent="bg-rose-50 text-rose-600" />
        <StatCard icon={Wallet} label="Net spend" value={fmtMoney(stats.net)} accent="bg-brand/10 text-brand" />
      </div>

      {/* Tabs + search */}
      <div className="bg-white rounded-2xl shadow-soft p-3 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const count = bookings.filter(t.match).length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  active
                    ? 'bg-brand text-white border-brand shadow-soft'
                    : 'border-gray-200 text-ink hover:border-brand/40 hover:text-brand'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-100 text-ink-muted'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, item, payment id…"
            className="w-full pl-8 pr-3 py-1.5 rounded-full border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center">
          <Loader2 className="animate-spin mx-auto text-brand" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState tab={tab} hasAny={bookings.length > 0} />
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          {/* Header row — only on md+ to keep the mobile UX clean */}
          <div className="hidden md:grid grid-cols-12 px-5 py-3 bg-surface-alt/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <div className="col-span-3">Date</div>
            <div className="col-span-4">Booking</div>
            <div className="col-span-3">Payment ref</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map((b) => (
              <TransactionRow key={b.bookingCode} booking={b} onOpen={() => setSelected(b)} />
            ))}
          </ul>
        </div>
      )}

      <BookingDetailsModal
        booking={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onChanged={handleChanged}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-ink-muted uppercase tracking-wide">{label}</div>
        <div className="font-bold text-lg text-ink truncate">{value}</div>
      </div>
    </div>
  );
}

function TransactionRow({ booking, onOpen }) {
  const refunded = booking.status === 'refunded';
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left grid grid-cols-12 gap-2 md:gap-3 px-4 sm:px-5 py-3.5 hover:bg-surface-alt/40 transition items-center group"
      >
        {/* Mobile: a single stacked card. Desktop: 12-col grid. */}
        <div className="col-span-12 md:col-span-3 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            refunded ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
            {refunded ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink truncate">{fmtDateTime(booking.payment?.paidAt || booking.updatedAt || booking.createdAt)}</div>
            <div className="text-[10px] text-ink-muted uppercase tracking-wide">
              {refunded ? 'Refund' : 'Payment'}
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 min-w-0">
          <div className="text-sm font-semibold text-ink truncate group-hover:text-brand transition">
            {booking.item?.name || 'Booking'}
          </div>
          <div className="text-[11px] text-ink-muted mt-0.5">
            <span className="font-mono">{booking.bookingCode}</span>
            {booking.item?.type && <> · {TYPE_LABEL[booking.item.type] || booking.item.type}</>}
          </div>
        </div>

        <div className="col-span-8 md:col-span-3 min-w-0">
          <div className="text-[11px] text-ink-muted uppercase tracking-wide">Payment id</div>
          <div className="font-mono text-xs text-ink truncate">{booking.payment?.paymentId || '—'}</div>
          {booking.payment?.method && (
            <div className="text-[10px] text-ink-muted capitalize mt-0.5">via {booking.payment.method}</div>
          )}
        </div>

        <div className="col-span-4 md:col-span-2 text-right">
          <div className={`text-base font-bold ${refunded ? 'text-rose-600' : 'text-emerald-700'}`}>
            {refunded ? '− ' : ''}{fmtMoney(booking.pricing?.total, booking.currency)}
          </div>
          <span className="hidden md:inline-flex items-center text-xs font-semibold text-brand mt-1 group-hover:gap-2 transition-all">
            Details <ChevronRight size={12} />
          </span>
        </div>
      </button>
    </li>
  );
}

function EmptyState({ tab, hasAny }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center mb-4">
        <CreditCard size={26} />
      </div>
      <h2 className="font-semibold text-lg text-ink">
        {hasAny ? 'Nothing matches that filter' : 'No transactions yet'}
      </h2>
      <p className="text-sm text-ink-muted mt-1 max-w-md mx-auto">
        {hasAny
          ? 'Try a different tab or clear the search.'
          : 'Your payment receipts will appear here the moment your first booking is paid.'}
      </p>
      {!hasAny && (
        <Link to="/retreats" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-white font-medium hover:brightness-110 transition">
          Browse retreats
        </Link>
      )}
    </div>
  );
}
