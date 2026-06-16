import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Copy, User, Award, Briefcase,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import SortableList, { DragHandle } from '../../components/admin/SortableList.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';

export default function TrainersPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/trainers/admin/all');
      setItems(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((it) =>
    !search ||
    it.name.toLowerCase().includes(search.toLowerCase()) ||
    (it.role || '').toLowerCase().includes(search.toLowerCase())
  );
  const reorderingDisabled = !!search;

  const persistOrder = async (ordered) => {
    setItems(ordered);
    try {
      await api.put('/trainers/admin/reorder', { order: ordered.map((it) => it.id) });
    } catch (err) {
      toast.error('Reorder failed');
      load();
    }
  };

  const toggle = async (it) => {
    try {
      await api.patch(`/trainers/${it.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const duplicate = async (it) => {
    if (duplicatingId) return;
    setDuplicatingId(it.id);
    try {
      const res = await api.post(`/trainers/${it.id}/duplicate`);
      const newId = res.data?.data?.trainer?.id;
      toast.success('Trainer duplicated — opening for edit');
      if (newId) navigate(`/admin/trainers/${newId}/edit`);
      else load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/trainers/${deleteId}`);
      toast.success('Trainer deleted');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Trainer Profiles</h1>
          <p className="text-ink-muted text-sm">
            Reusable coach / instructor profiles that can be attached to any package.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            className="input"
            placeholder="Search by name or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link to="/admin/trainers/new" className="btn-primary whitespace-nowrap">
            <Plus size={18} /> New Trainer
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <User size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">
            {search ? 'No trainers match your search.' : 'No trainers yet — create your first one to attach to packages.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {reorderingDisabled && (
            <p className="text-xs text-amber-700 bg-amber-50 px-4 py-2 border-b">
              Reordering is paused while a search is active.
            </p>
          )}
          <div className="grid grid-cols-12 px-4 py-3 bg-surface-alt text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <div className="col-span-1">Order</div>
            <div className="col-span-2">Photo</div>
            <div className="col-span-4">Name &amp; Role</div>
            <div className="col-span-2">Packages</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <SortableList
            items={reorderingDisabled ? filtered : items}
            onReorder={reorderingDisabled ? () => {} : persistOrder}
            showHandle={!reorderingDisabled}
            renderItem={(it, { dragHandleProps }) => (
              <div className={`grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-surface-alt/50 ${!it.isActive && 'opacity-60'}`}>
                <div className="col-span-1">
                  {!reorderingDisabled && <DragHandle dragHandleProps={dragHandleProps} />}
                </div>
                <div className="col-span-2">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                    {it.photo ? (
                      <img src={fileUrl(it.photo)} alt={it.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-ink-muted" />
                    )}
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="font-medium text-sm leading-tight">{it.name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-ink-muted mt-0.5 flex-wrap">
                    {it.role && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase size={11} /> {it.role}
                      </span>
                    )}
                    {it.experienceYears != null && (
                      <span className="inline-flex items-center gap-1">
                        <Award size={11} /> {it.experienceYears} yr{it.experienceYears === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  {it.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {it.specialties.slice(0, 3).map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">
                          {s}
                        </span>
                      ))}
                      {it.specialties.length > 3 && (
                        <span className="text-[10px] text-ink-muted">+{it.specialties.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-xs text-ink-muted">
                  {it.packages?.length > 0 ? (
                    <span>
                      <strong className="text-ink">{it.packages.length}</strong> attached
                    </span>
                  ) : (
                    <span className="italic">Not attached</span>
                  )}
                </div>
                <div className="col-span-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${it.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    {it.isActive ? 'LIVE' : 'DRAFT'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <ToggleSwitch checked={it.isActive} onChange={() => toggle(it)} size="sm" />
                  <button onClick={() => setViewItem(it)} className="p-1.5 hover:bg-surface-alt rounded" title="View details">
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => duplicate(it)}
                    disabled={duplicatingId === it.id}
                    className="p-1.5 hover:bg-surface-alt rounded disabled:opacity-50"
                    title="Duplicate"
                  >
                    <Copy size={16} />
                  </button>
                  <Link
                    to={`/admin/trainers/${it.id}/edit`}
                    className="p-1.5 hover:bg-surface-alt rounded"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </Link>
                  <button
                    onClick={() => setDeleteId(it.id)}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete trainer?"
        message="This will permanently remove the trainer profile. Packages that referenced this trainer will simply no longer show them."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />

      <RowDetailsModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.name}
        data={viewItem}
      />
    </div>
  );
}
