import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, IndianRupee, Clock, Receipt } from 'lucide-react';
import api from '../../services/api';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pretty = (s) => { const [y, m, d] = String(s).split('-').map(Number); return `${MONTHS[(m || 1) - 1]} ${d}, ${y}`; };

// Host earnings + payouts. Derived from real host bookings — until guests start
// booking live listings there are genuinely none (honest zeros, never faked).
// Every amount shown here is the BASE amount (no GST/convenience fee) — same
// figure the voucher email and the dashboard stats use.
export default function HostTransactionsPage() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get('/host/summary'),
      api.get('/host/transactions'),
    ])
      .then(([summaryRes, txnRes]) => {
        if (!alive) return;
        setStats((summaryRes.data.data || summaryRes.data).stats);
        setTransactions((txnRes.data.data || txnRes.data).transactions || []);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" size={24} /></div>;
  const s = stats || {};

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Transactions</h1>
        <p className="text-sm text-ink-muted mt-1">Your earnings, completed payouts and pending amounts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-soft p-5">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center mb-3"><IndianRupee size={20} className="text-brand-dark" /></div>
          <div className="text-2xl font-bold text-ink">{money(s.earnedTotal)}</div>
          <div className="text-sm text-ink-muted">Total earned</div>
        </div>
        <div className="bg-white rounded-2xl shadow-soft p-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center mb-3"><Receipt size={20} className="text-emerald-600" /></div>
          <div className="text-2xl font-bold text-ink">{money(s.earnedMonth)}</div>
          <div className="text-sm text-ink-muted">This month</div>
        </div>
        <div className="bg-white rounded-2xl shadow-soft p-5">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center mb-3"><Clock size={20} className="text-blue-600" /></div>
          <div className="text-2xl font-bold text-ink">{money(s.pendingTotal)}</div>
          <div className="text-sm text-ink-muted">Pending payout</div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-alt mx-auto flex items-center justify-center mb-3"><Receipt size={26} className="text-brand" /></div>
          <h3 className="font-semibold text-ink">No transactions yet</h3>
          <p className="text-sm text-ink-muted mt-1">Payouts appear here once guests book your live listings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((t) => (
            <Link key={t.id} to={`/host/bookings/${t.id}`} className="bg-white rounded-xl shadow-soft p-4 flex items-center justify-between gap-3 hover:shadow-md transition">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">{t.guest}</div>
                <div className="text-xs text-ink-muted truncate">{t.listingTitle} · {pretty(t.date)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-emerald-600">+{money(t.amount)}</div>
                <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">completed</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
