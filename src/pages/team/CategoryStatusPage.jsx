import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Search } from 'lucide-react';
import api from '../../services/api';
import CategoryStatusDetailModal from './CategoryStatusDetailModal.jsx';

const PHASE_PILL = {
  cops_review: 'bg-blue-100 text-blue-700',
  changes: 'bg-rose-100 text-rose-600',
  qcops: 'bg-violet-100 text-violet-700',
  live: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-200 text-rose-700',
  delisted: 'bg-slate-200 text-slate-600',
};
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'cops_review', label: 'Center Ops' },
  { key: 'changes', label: 'Changes' },
  { key: 'qcops', label: 'QCOPS' },
  { key: 'live', label: 'Live' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'delisted', label: 'Delisted' },
];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/*
  Every listing in this Category Manager's categories and exactly where it sits
  in the review pipeline — Center Ops content review, changes requested, the
  QCOPS on-site visit, live or rejected. Click one for the full trail: who
  objected to what, the whole conversation, and the QCOPS report.
*/
export default function CategoryStatusPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    api.get('/team/category/status')
      .then(({ data }) => setItems(data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const countFor = (k) => (k === 'all' ? items.length : items.filter((i) => i.phaseKey === k).length);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => tab === 'all' || i.phaseKey === tab)
      .filter((i) => !q || [i.name, i.provider].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [items, tab, query]);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-5xl">
      <Link to="/team/category" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3"><ArrowLeft size={16} /> Category Overview</Link>
      <h1 className="text-2xl font-display font-bold mb-1">Experience Status</h1>
      <p className="text-sm text-ink-muted mb-4">Where every listing in your categories sits in the review pipeline.</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-brand text-ink' : 'bg-white shadow-soft text-ink-muted hover:text-ink'}`}>
            {t.label}<span className="text-[10px] font-bold opacity-70">{countFor(t.key)}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search listing or provider…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center text-ink-muted">Nothing here.</div>
      ) : (
        <div className="space-y-2.5">
          {shown.map((i) => (
            <button key={i.id} onClick={() => setDetailId(i.id)}
              className="w-full bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3 text-left hover:shadow-lg hover:-translate-y-0.5 transition">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink truncate">{i.name}</div>
                <div className="text-[11px] text-ink-muted truncate">{i.provider} · {i.providerKind} · updated {fmtDate(i.updatedAt)}</div>
              </div>
              {i.sections.total > 0 && (
                <div className="hidden sm:flex items-center gap-2 text-[11px]">
                  <span className="text-emerald-600">{i.sections.approved}✓</span>
                  <span className="text-rose-600">{i.sections.objection}!</span>
                  <span className="text-ink-muted">{i.sections.pending}·</span>
                </div>
              )}
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${PHASE_PILL[i.phaseKey] || 'bg-slate-100'}`}>{i.phaseLabel}</span>
            </button>
          ))}
        </div>
      )}

      {detailId && <CategoryStatusDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}


