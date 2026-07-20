import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, Search, Globe, Ban, ScanEye, Loader,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function AdminAllListedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [delistFor, setDelistFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/experiences');
      // Only the final-listed (live on web + app).
      setItems((res.data?.data?.items || []).filter((e) => e.status === 'published' && e.isActive));
    } catch {
      toast.error('Could not load listings');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const delist = async (reason) => {
    const id = delistFor.id;
    try {
      await api.post(`/experiences/${id}/delist`, { reason });
      toast.success('Delisted — removed from web & app', { icon: '🚫' });
      setDelistFor(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const supplierOptions = useMemo(() => {
    const map = new Map();
    items.forEach((e) => { if (e.supplier?.id) map.set(e.supplier.id, e.supplier.companyName); });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filtered = items.filter((e) => {
    if (q.trim() && !e.name?.toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (supplierId && String(e.supplier?.id || '') !== String(supplierId)) return false;
    return true;
  });

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1 inline-flex items-center gap-2"><Globe size={22} className="text-emerald-600" /> All Listed</h1>
        <p className="text-sm text-ink-muted">Every experience currently live on the website &amp; app — from any source. Delist to remove it everywhere.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
        </div>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
          className="py-2 px-3 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none">
          <option value="">All suppliers</option>
          {supplierOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center mb-4"><Globe size={26} /></div>
          <h2 className="font-semibold text-lg">Nothing live yet</h2>
          <p className="text-sm text-ink-muted mt-1">Experiences appear here once they go live.</p>
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
                  <th className="px-4 py-3 font-bold whitespace-nowrap">Listed on</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
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
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmt(e.data?.listedAt || e.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/experiences/${e.id}/view`} title="View" className="p-2 rounded-lg text-ink-muted hover:bg-surface-alt hover:text-brand"><ScanEye size={15} /></Link>
                        <button onClick={() => setDelistFor(e)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 whitespace-nowrap"><Ban size={13} /> Delist</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {delistFor && <DelistModal name={delistFor.name} onConfirm={delist} onClose={() => setDelistFor(null)} />}
    </div>
  );
}

// Two-step delist: reason → a 10-second red countdown gate before the final,
// irreversible confirm.
function DelistModal({ name, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [step, setStep] = useState(1);
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (step !== 2) return undefined;
    setCount(10);
    const t = setInterval(() => setCount((c) => (c <= 1 ? (clearInterval(t), 0) : c - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const confirm = async () => { setBusy(true); await onConfirm(reason.trim()); setBusy(false); };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg text-rose-700 inline-flex items-center gap-2"><Ban size={18} /> Delist listing</h2>
          <p className="text-xs text-ink-muted mt-0.5 truncate">{name}</p>
        </div>
        {step === 1 ? (
          <>
            <div className="px-6 py-5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wide">Reason (problem at supplier’s end)</label>
              <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder="Why is this being removed from the platform?"
                className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none" />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
              <button onClick={() => reason.trim() ? setStep(2) : toast.error('A reason is required')}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700">Continue</button>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 py-5">
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-800">
                <p className="font-semibold mb-1">This cannot be easily undone.</p>
                <p>“{name}” will be removed from the <strong>website and app</strong> immediately, and everyone (supplier, account manager, BD, Center Ops, QCOPS) will be updated.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Back</button>
              <button onClick={confirm} disabled={count > 0 || busy}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
                {busy ? <Loader2 size={14} className="animate-spin" /> : count > 0 ? <Loader size={14} className="animate-spin" /> : <Ban size={14} />}
                {count > 0 ? `Confirm in ${count}s` : 'Yes, delist permanently'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
