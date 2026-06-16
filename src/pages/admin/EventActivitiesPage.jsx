import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Copy, PartyPopper } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';
import { CATEGORIES, categoryLabel } from '../../config/eventActivitySchema.js';

export default function EventActivitiesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/event-activities/admin/all', { params: category ? { category } : {} });
      setItems(res.data.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((it) => !search || it.title.toLowerCase().includes(search.toLowerCase()));

  const toggle = async (it) => {
    try { await api.patch(`/event-activities/${it.id}/toggle`); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Toggle failed'); }
  };

  const duplicate = async (it) => {
    if (duplicatingId) return;
    setDuplicatingId(it.id);
    try {
      const res = await api.post(`/event-activities/${it.id}/duplicate`);
      const newId = res.data?.data?.event?.id;
      toast.success('Duplicated — opening for edit');
      if (newId) navigate(`/admin/event-activities/${newId}/edit`); else load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Duplicate failed');
    } finally { setDuplicatingId(null); }
  };

  const confirmDelete = async () => {
    try { await api.delete(`/event-activities/${deleteId}`); toast.success('Deleted'); setDeleteId(null); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Events &amp; Activity</h1>
          <p className="text-ink-muted text-sm">Category-driven listings — pick a category and the form adapts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input className="input" placeholder="Search by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <Link to="/admin/event-activities/new" className="btn-primary whitespace-nowrap"><Plus size={18} /> New</Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <PartyPopper size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">No events yet. Click <strong>New</strong> to add one.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 bg-surface-alt text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <div className="col-span-2">Image</div>
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          {filtered.map((it) => (
            <div key={it.id} className={`grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-surface-alt/50 ${!it.isActive && 'opacity-60'}`}>
              <div className="col-span-2">
                <div className="w-20 h-12 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                  {it.thumbnail || it.mainBanner ? (
                    <img src={fileUrl(it.thumbnail || it.mainBanner)} alt={it.title} className="w-full h-full object-cover" />
                  ) : <PartyPopper size={16} className="text-ink-muted" />}
                </div>
              </div>
              <div className="col-span-4">
                <div className="font-medium text-sm leading-tight line-clamp-2">{it.title}</div>
                {Array.isArray(it.audience) && it.audience.length > 0 && (
                  <div className="text-[11px] text-ink-muted mt-0.5">{it.audience.join(', ')}</div>
                )}
              </div>
              <div className="col-span-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{categoryLabel(it.category)}</span>
              </div>
              <div className="col-span-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${it.status === 'published' ? 'bg-green-100 text-green-700' : it.status === 'archived' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>{it.status}</span>
              </div>
              <div className="col-span-3 flex items-center justify-end gap-1.5">
                <ToggleSwitch checked={it.isActive} onChange={() => toggle(it)} size="sm" />
                <button onClick={() => setViewItem(it)} className="p-1.5 hover:bg-surface-alt rounded" title="View details"><Eye size={16} /></button>
                <button onClick={() => duplicate(it)} disabled={duplicatingId === it.id} className="p-1.5 hover:bg-surface-alt rounded disabled:opacity-50" title="Duplicate"><Copy size={16} /></button>
                <Link to={`/admin/event-activities/${it.id}/edit`} className="p-1.5 hover:bg-surface-alt rounded" title="Edit"><Edit size={16} /></Link>
                <button onClick={() => setDeleteId(it.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete event?"
        message="This permanently removes the event/activity."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
      <RowDetailsModal open={!!viewItem} onClose={() => setViewItem(null)} title={viewItem?.title} data={viewItem} />
    </div>
  );
}
