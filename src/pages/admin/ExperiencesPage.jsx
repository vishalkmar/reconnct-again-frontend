import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Copy, Eye, EyeOff, Trash2, Loader2, Search, Sparkles, ScanEye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const STATUS_STYLE = {
  draft: 'bg-amber-50 text-amber-700',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
};

export default function ExperiencesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
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

  const filtered = items.filter((e) => !q.trim() || e.name?.toLowerCase().includes(q.trim().toLowerCase()));

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

      <div className="relative w-full sm:w-80 mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…"
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><Sparkles size={26} /></div>
          <h2 className="font-semibold text-lg">No experiences yet</h2>
          <p className="text-sm text-ink-muted mt-1">Create your first activity or event.</p>
          <Link to="/admin/experiences/new" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold">New experience</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-5 py-3 bg-surface-alt text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <div className="col-span-5">Name</div>
            <div className="col-span-3">Category · Type</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map((e) => (
              <li key={e.id} className="grid grid-cols-12 gap-2 px-4 sm:px-5 py-3.5 items-center">
                <div className="col-span-12 md:col-span-5 min-w-0">
                  <div className="font-semibold text-ink truncate flex items-center gap-2">
                    {e.name}
                    {!e.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Hidden</span>}
                  </div>
                  <div className="text-[11px] text-ink-muted">{e.location || '—'}</div>
                </div>
                <div className="col-span-6 md:col-span-3 text-sm text-ink-muted truncate">
                  {e.category?.name || '—'}{e.type?.name ? ` · ${e.type.name}` : ''}
                </div>
                <div className="col-span-3 md:col-span-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[e.status] || 'bg-slate-100'}`}>{e.status}</span>
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
