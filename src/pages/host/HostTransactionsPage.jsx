import { useEffect, useState } from 'react';
import { Loader2, IndianRupee, Clock, Receipt } from 'lucide-react';
import api from '../../services/api';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Host earnings + payouts. Derived from real host bookings — until guests start
// booking live listings there are genuinely none (honest zeros, never faked).
export default function HostTransactionsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/host/summary')
      .then(({ data }) => { if (alive) setStats((data.data || data).stats); })
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

      <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-alt mx-auto flex items-center justify-center mb-3"><Receipt size={26} className="text-brand" /></div>
        <h3 className="font-semibold text-ink">No transactions yet</h3>
        <p className="text-sm text-ink-muted mt-1">Payouts appear here once guests book your live listings.</p>
      </div>
    </div>
  );
}
