import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Copy, Eye, EyeOff, Trash2, Loader2, Search, Sparkles, ScanEye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const STATUS_STYLE = {
  draft: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-blue-50 text-blue-700',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
};
const STATUS_LABEL = { pending_review: 'Pending Review' };

export default function ExperiencesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [typeId, setTypeId] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/experiences');
      setItems(res.data?.data?.items || []);
    } catch {
      toast.error('Could not load experiences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const duplicate = async (id) => {
    try { await api.post(`/experiences/${id}/duplicate`); toast.success('Duplicated'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const toggle = async (id) => {
    try { await api.patch(`/experiences/${id}/toggle`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const remove = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await api.delete(`/experiences/${id}`); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  // Filter dropdown options derived from what's actually in the list.
  const supplierOptions = useMemo(() => {
    const map = new Map();
    items.forEach((e) => { if (e.supplier?.id) map.set(e.supplier.id, e.supplier.companyName); });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const typeOptions = useMemo(() => {
    const map = new Map();
    items.forEach((e) => (e.typeItems || []).forEach((t) => map.set(t.id, t.name)));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filtered = items.filter((e) => {
    if (q.trim() && !e.name?.toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (supplierId && String(e.supplier?.id || '') !== String(supplierId)) return false;
    if (typeId && !(e.typeItems || []).some((t) => String(t.id) === String(typeId))) return false;
    return true;
  });

  const hasFilters = q.trim() || supplierId || typeId;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Experiences</h1>
          <p className="text-sm text-ink-muted">Activities &amp; events built from the Reconnct category chart.</p>
        </div>
        <Link to="/admin/experiences/new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
          <Plus size={18} /> New experience
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
        </div>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
          className="py-2 px-3 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none">
          <option value="">All suppliers</option>
          {supplierOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)}
          className="py-2 px-3 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none">
          <option value="">All activities</option>
          {typeOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setQ(''); setSupplierId(''); setTypeId(''); }}
            className="text-sm text-ink-muted hover:text-brand underline">Clear</button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><Sparkles size={26} /></div>
          <h2 className="font-semibold text-lg">{hasFilters ? 'No matches' : 'No experiences yet'}</h2>
          <p className="text-sm text-ink-muted mt-1">{hasFilters ? 'Try clearing the filters.' : 'Create your first activity or event.'}</p>
          {!hasFilters && <Link to="/admin/experiences/new" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold">New experience</Link>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-5 py-3 bg-surface-alt text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Supplier</div>
            <div className="col-span-3">Category · Type</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map((e) => (
              <li key={e.id} className="grid grid-cols-12 gap-2 px-4 sm:px-5 py-3.5 items-center">
                <div className="col-span-12 md:col-span-4 min-w-0">
                  <div className="font-semibold text-ink truncate flex items-center gap-2">
                    {e.name}
                    {!e.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Hidden</span>}
                  </div>
                  <div className="text-[11px] text-ink-muted">{e.location || '—'}</div>
                </div>
                <div className="col-span-6 md:col-span-2 text-sm text-ink-muted min-w-0">
                  {e.supplier ? (
                    <span className="truncate block" title={e.supplier.companyName}>{e.supplier.companyName}</span>
                  ) : <span className="text-slate-300">—</span>}
                </div>
                <div className="col-span-6 md:col-span-3 text-sm text-ink-muted truncate">
                  {(e.categoryItems || []).map((c) => c.name).join(', ') || '—'}
                  {(e.typeItems || []).length ? ` · ${e.typeItems.map((t) => t.name).join(', ')}` : ''}
                </div>
                <div className="col-span-3 md:col-span-1">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[e.status] || 'bg-slate-100'}`}>{STATUS_LABEL[e.status] || e.status}</span>
                </div>
                <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-1">
                  <IconBtn title="View" onClick={() => navigate(`/admin/experiences/${e.id}/view`)}><ScanEye size={15} /></IconBtn>
                  <IconBtn title="Edit" onClick={() => navigate(`/admin/experiences/${e.id}/edit`)}><Pencil size={15} /></IconBtn>
                  <IconBtn title="Duplicate" onClick={() => duplicate(e.id)}><Copy size={15} /></IconBtn>
                  <IconBtn title={e.isActive ? 'Hide' : 'Show'} onClick={() => toggle(e.id)}>{e.isActive ? <EyeOff size={15} /> : <Eye size={15} />}</IconBtn>
                  <IconBtn title="Delete" danger onClick={() => remove(e.id, e.name)}><Trash2 size={15} /></IconBtn>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IconBtn({ title, onClick, children, danger }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`p-2 rounded-lg transition ${danger ? 'text-rose-500 hover:bg-rose-50' : 'text-ink-muted hover:bg-surface-alt hover:text-brand'}`}>
      {children}
    </button>
  );
}
