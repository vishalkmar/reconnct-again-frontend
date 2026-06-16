import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Wallet, CheckCircle2, XCircle,
  TrendingUp, AlertCircle,
} from 'lucide-react';
import api from '../../services/api';

// This build ships only the Main dashboard (booking management). The original
// project's "Configure" mode (website/content setup) is intentionally removed.

const fmtMoney = (n) =>
  `₹${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Lightweight booking summary so the dashboard surfaces useful numbers
  // (total revenue, paid, cancellations, recent bookings) up front.
  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    api.get('/admin/bookings', { params: { limit: 5 } })
      .then((res) => { if (!cancelled) setSummary(res.data?.data || null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSummaryLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">Dashboard</h1>
        <p className="text-ink-muted text-sm">Track every booking, payment and refund.</p>
      </div>

      <MainView summary={summary} loading={summaryLoading} />
    </div>
  );
}

function MainView({ summary, loading }) {
  const s = summary?.summary || {};
  return (
    <div className="space-y-6">
      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Total revenue" value={fmtMoney(s.totalRevenue)} accent="bg-amber-50 text-amber-600" loading={loading} />
        <StatCard icon={Calendar} label="Bookings" value={s.bookingCount ?? 0} accent="bg-blue-50 text-blue-600" loading={loading} />
        <StatCard icon={CheckCircle2} label="Paid" value={s.paidCount ?? 0} accent="bg-emerald-50 text-emerald-600" loading={loading} />
        <StatCard icon={XCircle} label="Cancellations" value={s.cancelledCount ?? 0} accent="bg-rose-50 text-rose-600" loading={loading} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/admin/bookings"
          className="card p-6 hover:shadow-lg transition group"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-blue-50 text-blue-600 group-hover:scale-110 transition">
            <Calendar size={22} />
          </div>
          <div className="font-semibold text-lg">All Bookings</div>
          <div className="text-sm text-ink-muted mt-1">View, filter and open full details for every booking.</div>
        </Link>
        <Link
          to="/admin/transactions"
          className="card p-6 hover:shadow-lg transition group"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-amber-50 text-amber-600 group-hover:scale-110 transition">
            <Wallet size={22} />
          </div>
          <div className="font-semibold text-lg">All Transactions</div>
          <div className="text-sm text-ink-muted mt-1">Payments, refunds, and full payment voucher per row.</div>
        </Link>
      </div>

      {/* Recent bookings preview */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Recent bookings</h2>
          <Link to="/admin/bookings" className="text-sm font-semibold text-brand hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="text-sm text-ink-muted py-6 text-center">Loading…</div>
        ) : !summary?.bookings?.length ? (
          <div className="text-sm text-ink-muted py-6 text-center inline-flex items-center justify-center gap-2 w-full">
            <AlertCircle size={16} /> No bookings yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {summary.bookings.map((b) => (
              <li key={b.bookingCode} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-ink truncate">{b.item?.name || 'Booking'}</div>
                  <div className="text-xs text-ink-muted truncate">
                    <span className="font-mono">{b.bookingCode}</span> · {b.guest?.name || b.user?.name}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-brand">{fmtMoney(b.pricing?.total)}</div>
                  <div className="text-[11px] text-ink-muted capitalize">{b.status.replace('_', ' ')}</div>
                </div>
              </li>
            ))}
          </ul>
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
