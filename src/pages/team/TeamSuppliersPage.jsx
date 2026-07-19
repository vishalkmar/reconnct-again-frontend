import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Loader2, Truck, Mail, Phone, Search, Users, CalendarPlus, Globe, CircleCheck, ChevronRight, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

function StatTile({ icon: Icon, label, value, tone }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' };
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon size={20} /></div>
      <div className="min-w-0"><div className="text-2xl font-display font-bold leading-none">{value}</div><div className="text-[11px] text-ink-muted mt-1 truncate">{label}</div></div>
    </div>
  );
}

export default function TeamSuppliersPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/team/review-stats/my-suppliers');
      setItems(res.data?.data?.items || []);
      setStats(res.data?.data?.stats || null);
    } catch {
      toast.error('Could not load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => [s.companyName, s.supplierName, s.email, s.phone, s.address, s.city]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [items, query]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">My Suppliers</h1>
          <p className="text-sm text-ink-muted">Vendors you&apos;ve onboarded — open one to see all their listings by stage.</p>
        </div>
        <Link to="new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
          <Plus size={18} /> New supplier
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatTile icon={Users} label="Total suppliers" value={stats.total} tone="blue" />
          <StatTile icon={CalendarPlus} label="Added this month" value={stats.thisMonth} tone="indigo" />
          <StatTile icon={CircleCheck} label="Active" value={stats.active} tone="emerald" />
          <StatTile icon={Globe} label="With live listings" value={stats.withLive} tone="emerald" />
        </div>
      )}

      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, address…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><Truck size={26} /></div>
          <h2 className="font-semibold text-lg">No suppliers yet</h2>
          <p className="text-sm text-ink-muted mt-1">Onboard your first partner / vendor.</p>
          <Link to="new" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold">New supplier</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-ink-muted">No suppliers match &quot;{query}&quot;.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <Link key={s.id} to={`${s.id}/listings`} className="block bg-white rounded-2xl shadow-soft p-5 border border-transparent hover:border-brand/15 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-3 mb-3">
                {s.image ? <img src={fileUrl(s.image)} alt="" className="w-11 h-11 rounded-xl object-cover border" />
                  : <div className="w-11 h-11 rounded-xl bg-surface-alt flex items-center justify-center text-ink-muted"><Truck size={20} /></div>}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink truncate flex items-center gap-2">{s.companyName}{!s.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Disabled</span>}</div>
                  {s.supplierName && <div className="text-[11px] text-ink-muted truncate">{s.supplierName}</div>}
                </div>
                <ChevronRight size={18} className="text-ink-muted" />
              </div>
              <div className="text-xs text-ink-muted space-y-1 mb-3">
                {s.email && <div className="truncate inline-flex items-center gap-1"><Mail size={12} /> {s.email}</div>}
                {(s.address || s.city) && <div className="truncate inline-flex items-center gap-1"><MapPin size={12} /> {[s.address, s.city].filter(Boolean).join(', ')}</div>}
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-gray-100 text-center">
                <MiniStat value={s.totalListings} label="Total" />
                <MiniStat value={s.listingCounts.live} label="Live" tint="text-emerald-600" />
                <MiniStat value={s.listingCounts.in_queue} label="In queue" tint="text-blue-600" />
                <MiniStat value={s.listingCounts.under_progress + s.listingCounts.rejected + s.listingCounts.delisted} label="Other" tint="text-amber-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ value, label, tint = 'text-ink' }) {
  return <div><div className={`text-lg font-bold ${tint}`}>{value}</div><div className="text-[10px] text-ink-muted">{label}</div></div>;
}
