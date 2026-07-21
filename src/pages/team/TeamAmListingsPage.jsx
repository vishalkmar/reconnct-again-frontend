import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Loader2, Globe, XCircle, Ban, MapPin, RotateCcw, ClipboardList, RefreshCw, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import UnderProgressBlock from '../../components/team/UnderProgressBlock.jsx';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const TABS = [
  { key: 'in_queue', label: 'In queue', icon: Clock },
  // QCOPS asked for changes on a supplier's OWN submission — there's no BD in
  // that loop, so answering is this account manager's job.
  { key: 'under_progress', label: 'Under progress', icon: RefreshCw },
  { key: 'live', label: 'Live listings', icon: Globe },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
  { key: 'delisted', label: 'Delisted', icon: Ban },
];

export default function TeamAmListingsPage() {
  const [params, setParams] = useSearchParams();
  const view = TABS.some((t) => t.key === params.get('view')) ? params.get('view') : 'live';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/team/my-suppliers/overview');
      setData(res.data?.data || null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = data ? (data[view] || []) : [];

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1">My suppliers’ listings</h1>
        <p className="text-sm text-ink-muted">Every listing across the suppliers assigned to you — live, rejected and delisted.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setParams({ view: t.key })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border transition ${view === t.key ? 'bg-brand text-ink border-brand' : 'border-gray-200 text-ink-muted hover:bg-surface-alt'}`}>
            <t.icon size={15} /> {t.label} <span className="text-[11px] opacity-70">{data?.[t.key]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><ClipboardList size={26} /></div>
          <h2 className="font-semibold text-lg">Nothing here</h2>
          <p className="text-sm text-ink-muted mt-1">No {TABS.find((t) => t.key === view)?.label.toLowerCase()} for your suppliers.</p>
        </div>
      ) : view === 'under_progress' ? (
        /* Cards, not a table — each one carries the full respond UI, the same
           block the BD gets on their own submissions. */
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-soft p-4 sm:p-5">
              <div className="flex items-center gap-3">
                {r.mainImage
                  ? <img src={fileUrl(r.mainImage)} alt="" className="w-11 h-11 rounded-lg object-cover border shrink-0" />
                  : <div className="w-11 h-11 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><ClipboardList size={18} /></div>}
                <div className="min-w-0 flex-1">
                  <Link to={`/team/experiences/${r.id}/view`} className="font-semibold text-ink truncate hover:text-brand block">{r.name}</Link>
                  <div className="text-[11px] text-ink-muted truncate flex items-center gap-2 flex-wrap">
                    {r.supplier?.name && <span>{r.supplier.name}</span>}
                    {r.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {r.location}</span>}
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${r.canRespond ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                  {r.canRespond ? 'Your response needed' : (r.viaBd ? 'With the BD' : 'Under progress')}
                </span>
              </div>
              {/* Read-only when the round isn't this manager's to answer — a BD
                  owns their own submissions, so don't offer a button the API
                  would reject. */}
              <UnderProgressBlock item={{ ...r, reviewNote: r.reason }} onChanged={load} readOnly={!r.canRespond} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-ink-muted border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold">Experience</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Onboarded</th>
                  {view === 'live' && <th className="px-4 py-3 font-semibold">Listed on</th>}
                  {view === 'delisted' && <th className="px-4 py-3 font-semibold">Delisted on</th>}
                  {(view === 'rejected' || view === 'delisted') && <th className="px-4 py-3 font-semibold">Reason</th>}
                  {(view === 'rejected' || view === 'delisted') && <th className="px-4 py-3 font-semibold text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-alt/50">
                    <td className="px-4 py-3">
                      <Link to={`/team/experiences/${r.id}/view`} className="flex items-center gap-2.5 min-w-[200px]">
                        {r.mainImage
                          ? <img src={fileUrl(r.mainImage)} alt="" className="w-9 h-9 rounded-lg object-cover border shrink-0" />
                          : <div className="w-9 h-9 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><ClipboardList size={14} /></div>}
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink hover:text-brand truncate">{r.name}</span>
                          <span className="block text-[11px] text-ink-muted truncate">
                            {[r.category, r.type].filter(Boolean).join(' · ')}{r.location ? ` · ${r.location}` : ''}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink">{r.supplier?.name || '—'}</span>
                      {r.supplier?.email && <span className="block text-[11px] text-ink-muted truncate">{r.supplier.email}</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmt(r.supplier?.onboardedAt)}</td>
                    {view === 'live' && <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmt(r.listedAt)}</td>}
                    {view === 'delisted' && <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmt(r.delistedAt)}</td>}
                    {(view === 'rejected' || view === 'delisted') && <td className="px-4 py-3 text-ink-muted max-w-[240px]"><span className="line-clamp-2">{r.reason || '—'}</span></td>}
                    {(view === 'rejected' || view === 'delisted') && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => toast('Re-onboard request noted (coming soon)', { icon: '🔁' })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand/30 text-brand-dark text-xs font-semibold hover:bg-brand/5 whitespace-nowrap">
                          <RotateCcw size={13} /> Re-onboard request
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
