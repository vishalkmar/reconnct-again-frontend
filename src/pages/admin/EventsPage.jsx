import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Calendar, MapPin, Copy,
  CalendarDays, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import SortableList, { DragHandle } from '../../components/admin/SortableList.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';

export default function EventsPage() {
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
      const res = await api.get('/events/admin/all');
      setItems(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((it) =>
    !search || it.name.toLowerCase().includes(search.toLowerCase())
  );
  const reorderingDisabled = !!search;

  const persistOrder = async (ordered) => {
    setItems(ordered);
    try {
      await api.put('/events/admin/reorder', { order: ordered.map((it) => it.id) });
    } catch (err) {
      toast.error('Reorder failed');
      load();
    }
  };

  const toggle = async (it) => {
    try {
      await api.patch(`/events/${it.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const duplicate = async (it) => {
    if (duplicatingId) return;
    setDuplicatingId(it.id);
    try {
      const res = await api.post(`/events/${it.id}/duplicate`);
      const newId = res.data?.data?.event?.id;
      toast.success('Event duplicated — opening for edit');
      if (newId) navigate(`/admin/events/${newId}/edit`);
      else load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/events/${deleteId}`);
      toast.success('Event deleted');
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
          <h1 className="text-2xl font-display font-bold">Events</h1>
          <p className="text-ink-muted text-sm">
            One-off shows, workshops & sport sessions. Sport-type events get hour-slot booking.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            className="input"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link to="/admin/events/new" className="btn-primary whitespace-nowrap">
            <Plus size={18} /> New
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarDays size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">No events yet.</p>
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
            <div className="col-span-2">Image</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-2">When</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Price</div>
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
                  <div className="w-20 h-12 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                    {it.mainImage ? (
                      <img src={fileUrl(it.mainImage)} alt={it.name} className="w-full h-full object-cover" />
                    ) : (
                      <CalendarDays size={16} className="text-ink-muted" />
                    )}
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="font-medium text-sm leading-tight line-clamp-2">{it.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-ink-muted mt-0.5">
                    {it.location?.name && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} /> {it.location.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-xs">
                  {it.eventDate && (
                    <div className="inline-flex items-center gap-1 text-ink">
                      <Calendar size={11} /> {formatDate(it.eventDate)}
                    </div>
                  )}
                  {(it.startTime || it.endTime) && (
                    <div className="inline-flex items-center gap-1 text-ink-muted">
                      <Clock size={11} /> {it.startTime || '—'}{it.endTime ? ` – ${it.endTime}` : ''}
                    </div>
                  )}
                </div>
                <div className="col-span-1 text-xs">
                  {it.eventType?.name ? (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${it.eventType.isSport ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      {it.eventType.name}
                    </span>
                  ) : '—'}
                </div>
                <div className="col-span-1 text-sm">
                  <span className="font-bold text-brand">
                    {it.currency} {Number(it.price).toLocaleString()}
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
                    to={`/admin/events/${it.id}/edit`}
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
        title="Delete event?"
        message="This will permanently remove the event, its gallery and all slots."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />

      <RowDetailsModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.name || viewItem?.title}
        data={viewItem}
      />
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
