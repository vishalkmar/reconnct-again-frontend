import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, ArrowLeft, Search, Truck, Home, Mail, Phone, Star, ChevronDown, UserCog,
} from 'lucide-react';
import api from '../../services/api';

const STATUS_PILL = {
  live: 'bg-emerald-100 text-emerald-700',
  in_queue: 'bg-blue-100 text-blue-700',
  under_progress: 'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-600',
  delisted: 'bg-slate-200 text-slate-600',
};
const STATUS_LABEL = {
  live: 'Live', in_queue: 'In review', under_progress: 'Changes', rejected: 'Rejected', delisted: 'Delisted',
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/*
  Every supplier / host with a listing in the categories this Category Manager
  owns — full profile, their in-scope listings, and their Key Account Manager.
  All data is already scoped server-side (/team/category/suppliers).
*/
export default function CategorySuppliersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState({}); // provider key -> expanded

  useEffect(() => {
    api.get('/team/category/suppliers')
      .then(({ data }) => setProviders(data?.data?.providers || []))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => [p.name, p.contactName, p.email, p.phone, p.city]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [providers, query]);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-5xl">
      <Link to="/team/category" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3"><ArrowLeft size={16} /> Category Overview</Link>
      <h1 className="text-2xl font-display font-bold mb-1">Suppliers</h1>
      <p className="text-sm text-ink-muted mb-4">Everyone listing in your categories — {providers.length} in total.</p>

      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center text-ink-muted">
          {providers.length ? `No one matches “${query}”.` : 'No suppliers listing in your categories yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((p) => {
            const key = `${p.kind}-${p.id}`;
            const isOpen = !!open[key];
            return (
              <div key={key} className="bg-white rounded-2xl shadow-soft overflow-hidden">
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-alt/50 transition">
                  <span className={`inline-flex w-11 h-11 rounded-xl items-center justify-center shrink-0 ${p.kind === 'supplier' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    {p.kind === 'supplier' ? <Truck size={20} /> : <Home size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink truncate flex items-center gap-2">
                      {p.name}
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{p.kind}</span>
                      {!p.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-500">disabled</span>}
                    </div>
                    <div className="text-[11px] text-ink-muted truncate">
                      {[p.contactName, p.email, p.phone].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-ink">{p.total}</div>
                    <div className="text-[10px] text-ink-muted">{p.live} live</div>
                  </div>
                  <ChevronDown size={18} className={`text-ink-muted transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-surface-alt/30">
                    {/* Profile + KAM */}
                    <div className="grid sm:grid-cols-2 gap-3 mb-3">
                      <div className="text-xs space-y-1">
                        <Row label="Contact" value={p.contactName} />
                        {p.email && <Row label="Email" value={<a href={`mailto:${p.email}`} className="text-brand-dark hover:underline inline-flex items-center gap-1"><Mail size={11} /> {p.email}</a>} />}
                        {p.phone && <Row label="Phone" value={<a href={`tel:${p.phone}`} className="text-brand-dark hover:underline inline-flex items-center gap-1"><Phone size={11} /> {p.phone}</a>} />}
                        {p.city && <Row label="City" value={p.city} />}
                        <Row label="Since" value={fmtDate(p.createdAt)} />
                      </div>
                      <div className="text-xs">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1"><UserCog size={12} /> Key Account Manager</div>
                        {p.kam ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-ink">{p.kam.name}</div>
                            {p.kam.email && <div className="text-ink-muted">{p.kam.email}</div>}
                            {p.kam.phone && <div className="text-ink-muted">{p.kam.phone}</div>}
                          </div>
                        ) : <div className="text-ink-muted">Not assigned yet</div>}
                      </div>
                    </div>

                    {/* In-scope listings */}
                    <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1.5">Listings in your categories</div>
                    <ul className="divide-y divide-slate-100">
                      {p.listings.map((l) => (
                        <li key={l.id} className="flex items-center gap-2 py-2">
                          <span className="flex-1 min-w-0 truncate text-sm text-ink">{l.name}</span>
                          {l.rating > 0 && <span className="text-[11px] text-amber-600 inline-flex items-center gap-0.5"><Star size={11} className="fill-amber-400 text-amber-400" /> {l.rating}</span>}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[l.status] || 'bg-slate-100 text-slate-500'}`}>{STATUS_LABEL[l.status] || l.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return value ? (
    <div className="flex gap-2"><span className="text-ink-muted w-16 shrink-0">{label}</span><span className="text-ink font-medium">{value}</span></div>
  ) : null;
}
