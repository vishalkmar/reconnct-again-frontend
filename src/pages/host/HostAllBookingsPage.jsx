import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Search, X, CalendarClock, Ticket, Eye, Users, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Lifecycle buckets — the SAME the backend computes (utils/bookingLifecycle),
// so the tab counts always agree with each row's status pill.
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
];
const STATUS_PILL = {
  upcoming: 'bg-brand/10 text-brand-dark',
  ongoing: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-100 text-rose-600',
};

const TIME_FILTERS = [
  ['all', 'All time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['this_week', 'This week'],
  ['this_month', 'This month'], ['last_month', 'Last month'], ['3_months', 'Last 3 months'],
  ['6_months', 'Last 6 months'], ['this_year', 'This year'], ['last_year', 'Last year'],
  ['specific', 'On a specific date'], ['range', 'Date range'],
];

// Filters on the experience date (scheduledFor).
const inRange = (dateStr, filter, specificDate, from, to) => {
  if (filter === 'all') return true;
  if (!dateStr) return false;
  const d = new Date(dateStr); const now = new Date();
  switch (filter) {
    case 'today': return d.toDateString() === now.toDateString();
    case 'yesterday': { const y = new Date(now); y.setDate(now.getDate() - 1); return d.toDateString() === y.toDateString(); }
    case 'this_week': { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0); return d >= s; }
    case 'this_month': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    case 'last_month': { const m = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); }
    case '3_months': { const s = new Date(now); s.setMonth(now.getMonth() - 3); return d >= s; }
    case '6_months': { const s = new Date(now); s.setMonth(now.getMonth() - 6); return d >= s; }
    case 'this_year': return d.getFullYear() === now.getFullYear();
    case 'last_year': return d.getFullYear() === now.getFullYear() - 1;
    case 'specific': return specificDate && d.toDateString() === new Date(specificDate).toDateString();
    case 'range': {
      if (!from && !to) return true;
      const t = d.setHours(0, 0, 0, 0);
      const okFrom = from ? t >= new Date(from).setHours(0, 0, 0, 0) : true;
      const okTo = to ? t <= new Date(to).setHours(0, 0, 0, 0) : true;
      return okFrom && okTo;
    }
    default: return true;
  }
};

const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function HostAllBookingsPage({ basePath = '/host' }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [time, setTime] = useState('all');
  const [specificDate, setSpecificDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');
  const [minRating, setMinRating] = useState('');
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`${basePath}/all-bookings`);
      setRows(res.data?.data?.bookings || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load bookings');
    } finally {
      setLoading(false);
    }
  }, [basePath]);
  useEffect(() => { load(); }, [load]);

  // Status is a clock event — re-render every 30s so ongoing→completed flips live.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(),
    [rows],
  );
  const counts = useMemo(() => {
    const c = { all: rows.length, upcoming: 0, ongoing: 0, completed: 0 };
    rows.forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => tab === 'all' || r.status === tab)
      .filter((r) => !q
        || (r.guestName || '').toLowerCase().includes(q)
        || (r.guestEmail || '').toLowerCase().includes(q)
        || (r.guestPhone || '').toLowerCase().includes(q)
        || String(r.amount || '').includes(q)
        || (r.experienceName || '').toLowerCase().includes(q))
      .filter((r) => inRange(r.scheduledFor, time, specificDate, from, to))
      .filter((r) => !category || r.category === category)
      .filter((r) => !minRating || (r.rating || 0) >= Number(minRating))
      .sort((a, b) => String(b.bookedAt).localeCompare(String(a.bookedAt)));
  }, [rows, tab, query, time, specificDate, from, to, category, minRating]);

  return (
    <div className="max-w-6xl">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1">All Bookings</h1>
        <p className="text-sm text-ink-muted">Every booking across all your listings, in one place.</p>
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`bg-white rounded-2xl shadow-soft p-3.5 flex items-center gap-2.5 text-left transition-all ${tab === t.key ? 'ring-2 ring-brand' : 'hover:shadow-lg hover:-translate-y-0.5'}`}>
            <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand-dark flex items-center justify-center shrink-0"><Ticket size={17} /></div>
            <div className="min-w-0">
              <div className="text-xl font-display font-bold leading-none">{counts[t.key] || 0}</div>
              <div className="text-[11px] text-ink-muted mt-0.5 truncate">{t.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-4 mb-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, amount or experience…"
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
          {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"><X size={15} /></button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={time} onChange={(e) => setTime(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none">
            {TIME_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {time === 'specific' && (
            <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none" />
          )}
          {time === 'range' && (
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none" />
              <span className="text-ink-muted text-sm">to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none" />
            </div>
          )}
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none">
            <option value="">Any rating</option>
            {[4, 3, 2, 1].map((r) => <option key={r} value={r}>{r}★ &amp; up</option>)}
          </select>
          {(query || time !== 'all' || category || minRating) && (
            <button onClick={() => { setQuery(''); setTime('all'); setSpecificDate(''); setFrom(''); setTo(''); setCategory(''); setMinRating(''); }}
              className="text-xs font-semibold text-brand-dark hover:underline ml-1">Clear filters</button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-3"><CalendarClock size={26} /></div>
          <h2 className="font-semibold text-lg">No bookings match</h2>
          <p className="text-sm text-ink-muted mt-1">Try a different tab or clear the filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-ink-muted border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Experience</th>
                  <th className="px-4 py-3 font-semibold">For date</th>
                  <th className="px-4 py-3 font-semibold">Slot</th>
                  <th className="px-4 py-3 font-semibold">Booked</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-alt/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{r.guestName}</div>
                      {r.guestEmail && <div className="text-[11px] text-ink-muted truncate max-w-[200px]">{r.guestEmail}</div>}
                      <div className="text-[11px] text-ink-muted flex items-center gap-2">
                        {r.guestPhone && <span>{r.guestPhone}</span>}
                        <span className="inline-flex items-center gap-0.5"><Users size={11} /> {r.guests}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink truncate max-w-[180px]">{r.experienceName}</div>
                      {r.category && <div className="text-[11px] text-ink-muted">{r.category}</div>}
                      {r.rating > 0 && <div className="text-[11px] text-amber-600 inline-flex items-center gap-0.5"><Star size={10} className="fill-amber-400 text-amber-400" /> {r.rating}</div>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmtDate(r.scheduledFor)}</td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{r.slot || '—'}</td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmtDate(r.bookedAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink whitespace-nowrap">{money(r.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_PILL[r.status] || 'bg-slate-100'}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`${basePath}/bookings/${r.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-ink text-xs font-semibold hover:bg-surface-alt whitespace-nowrap">
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-ink-muted">{shown.length} booking{shown.length !== 1 ? 's' : ''}</div>
        </div>
      )}
    </div>
  );
}
