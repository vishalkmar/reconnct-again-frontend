import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, Ban, ScanEye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function AdminDelistedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/experiences');
      setItems((res.data?.data?.items || []).filter((e) => e.reviewStage === 'delisted'));
    } catch {
      toast.error('Could not load');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((e) => e.name?.toLowerCase().includes(s) || (e.supplier?.companyName || '').toLowerCase().includes(s));
  }, [items, q]);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1 inline-flex items-center gap-2"><Ban size={22} className="text-slate-500" /> Delisted</h1>
        <p className="text-sm text-ink-muted">Experiences removed from the platform (problem at supplier’s end) — with onboarding &amp; delist dates.</p>
      </div>

      <div className="relative w-full sm:w-72 mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or supplier…"
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-slate-100 text-slate-500 items-center justify-center mb-4"><Ban size={26} /></div>
          <h2 className="font-semibold text-lg">Nothing delisted</h2>
          <p className="text-sm text-ink-muted mt-1">Delisted experiences will show here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted bg-surface-alt">
                  <th className="px-4 py-3 font-bold">Name</th>
                  <th className="px-4 py-3 font-bold">Supplier</th>
                  <th className="px-4 py-3 font-bold">Category · Type</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">Onboarded</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">Delisted on</th>
                  <th className="px-4 py-3 font-bold">Reason</th>
                  <th className="px-4 py-3 font-bold text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((e) => (
                  <tr key={e.id} className="align-top hover:bg-surface-alt/40">
                    <td className="px-4 py-3">
                      <Link to={`/admin/experiences/${e.id}/view`} className="font-semibold text-ink hover:text-brand">{e.name}</Link>
                      {e.location && <div className="text-[11px] text-ink-muted">{e.location}</div>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{e.supplier?.companyName || '—'}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {(e.categoryItems || []).map((c) => c.name).join(', ') || '—'}
                      {(e.typeItems || []).length ? ` · ${e.typeItems.map((t) => t.name).join(', ')}` : ''}
                    </td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmt(e.supplier?.createdAt)}</td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmt(e.data?.delistedAt)}</td>
                    <td className="px-4 py-3 text-ink-muted max-w-[260px]"><span className="line-clamp-2">{e.data?.delistReason || e.reviewNote || '—'}</span></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/experiences/${e.id}/view`} title="View" className="inline-flex p-2 rounded-lg text-ink-muted hover:bg-surface-alt hover:text-brand"><ScanEye size={15} /></Link>
                    </td>
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
