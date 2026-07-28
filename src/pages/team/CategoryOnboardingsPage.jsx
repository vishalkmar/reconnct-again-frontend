import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Search, Star, Users, Ticket } from 'lucide-react';
import api from '../../services/api';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// Everything LIVE in this CM's categories, with its real numbers.
export default function CategoryOnboardingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/team/category/onboardings')
      .then(({ data }) => setItems(data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => !q || [i.name, i.provider].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [items, query]);
  const totalRev = items.reduce((n, i) => n + i.revenue, 0);
  const totalBk = items.reduce((n, i) => n + i.bookings, 0);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-5xl">
      <Link to="/team/category" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3"><ArrowLeft size={16} /> Category Overview</Link>
      <h1 className="text-2xl font-display font-bold mb-1">Live Onboardings</h1>
      <p className="text-sm text-ink-muted mb-4">{items.length} live listing{items.length !== 1 ? 's' : ''} · {money(totalRev)} from {totalBk} bookings.</p>

      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search listing or provider…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center text-ink-muted">Nothing live yet in your categories.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {shown.map((i) => (
            <div key={i.id} className="bg-white rounded-2xl shadow-soft p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{i.name}</div>
                  <div className="text-[11px] text-ink-muted truncate">{i.provider} · {i.providerKind}{i.city ? ` · ${i.city}` : ''}</div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">Live</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center pt-2 border-t border-slate-100">
                <Mini icon={Ticket} value={i.bookings} label="Bookings" />
                <Mini icon={Users} value={i.buyers} label="Buyers" />
                <Mini icon={Star} value={i.rating || '—'} label="Rating" />
                <div><div className="text-sm font-bold text-price">{money(i.revenue)}</div><div className="text-[10px] text-ink-muted">Revenue</div></div>
              </div>
              <div className="text-[10px] text-ink-muted mt-2">Live since {fmtDate(i.liveAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({ icon: Icon, value, label }) {
  return (
    <div>
      <div className="text-sm font-bold text-ink inline-flex items-center gap-0.5 justify-center"><Icon size={12} className="text-ink-muted" />{value}</div>
      <div className="text-[10px] text-ink-muted">{label}</div>
    </div>
  );
}
