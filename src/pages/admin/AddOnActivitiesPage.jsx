import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Eye, EyeOff, MapPin, Sparkles, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import SortableList, { DragHandle } from '../../components/admin/SortableList.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';

export default function AddOnActivitiesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all'); // all | general | hotel | package
  const [entityId, setEntityId] = useState(''); // selected hotel/package id when filtering
  const [hotels, setHotels] = useState([]);
  const [packages, setPackages] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/add-ons/admin/all');
      setItems(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/hotels/admin/all').then((r) => setHotels(r.data.data.items || [])).catch(() => {});
    api.get('/packages/admin/all').then((r) => setPackages(r.data.data.items || [])).catch(() => {});
  }, []);

  const filtered = items.filter((it) => {
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (ownerFilter !== 'all' && (it.ownerType || 'general') !== ownerFilter) return false;
    if (ownerFilter === 'hotel' && entityId && String(it.hotelId) !== String(entityId)) return false;
    if (ownerFilter === 'package' && entityId && String(it.packageId) !== String(entityId)) return false;
    return true;
  });
  const reorderingDisabled = !!search || ownerFilter !== 'all';

  // "New" carries the current owner context so the form pre-locks it.
  const newHref = (() => {
    if (ownerFilter === 'general') return '/admin/add-ons/new?ownerType=general';
    if (ownerFilter === 'hotel') return entityId ? `/admin/add-ons/new?hotelId=${entityId}` : '/admin/add-ons/new?ownerType=hotel';
    if (ownerFilter === 'package') return entityId ? `/admin/add-ons/new?packageId=${entityId}` : '/admin/add-ons/new?ownerType=package';
    return '/admin/add-ons/new';
  })();

  const persistOrder = async (ordered) => {
    setItems(ordered);
    try {
      await api.put('/add-ons/admin/reorder', { order: ordered.map((it) => it.id) });
    } catch (err) {
      toast.error('Reorder failed');
      load();
    }
  };

  const toggle = async (it) => {
    try {
      await api.patch(`/add-ons/${it.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const duplicate = async (it) => {
    if (duplicatingId) return;
    setDuplicatingId(it.id);
    try {
      const res = await api.post(`/add-ons/${it.id}/duplicate`);
      const newId = res.data?.data?.activity?.id;
      toast.success('Activity duplicated — opening for edit');
      if (newId) navigate(`/admin/add-ons/${newId}/edit`);
      else load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/add-ons/${deleteId}`);
      toast.success('Activity deleted');
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
          <h1 className="text-2xl font-display font-bold">Add-on Activities</h1>
          <p className="text-ink-muted text-sm">
            Extras shown as suggestions on hotel detail pages (massage, sunset cruise, cooking class, …).
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            className="input"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            value={ownerFilter}
            onChange={(e) => { setOwnerFilter(e.target.value); setEntityId(''); }}
            title="Filter by attachment"
          >
            <option value="all">All activities</option>
            <option value="general">General</option>
            <option value="hotel">Hotel-specific</option>
            <option value="package">Package-specific</option>
          </select>
          {ownerFilter === 'hotel' && (
            <select className="input" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
              <option value="">All hotels</option>
              {hotels.map((h) => (<option key={h.id} value={h.id}>{h.name}</option>))}
            </select>
          )}
          {ownerFilter === 'package' && (
            <select className="input" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
              <option value="">All packages</option>
              {packages.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          )}
          <Link to={newHref} className="btn-primary whitespace-nowrap">
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
          <Sparkles size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">No add-on activities yet.</p>
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
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Price</div>
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
                  <div className="w-20 h-12 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                    {it.mainImage ? (
                      <img src={fileUrl(it.mainImage)} alt={it.name} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles size={16} className="text-ink-muted" />
                    )}
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="font-medium text-sm leading-tight line-clamp-2 flex items-center gap-2">
                    {it.name}
                    {it.ownerType === 'hotel' && it.hotel && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold whitespace-nowrap">
                        🏨 {it.hotel.name}
                      </span>
                    )}
                    {it.ownerType === 'package' && it.package && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold whitespace-nowrap">
                        📦 {it.package.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-ink-muted mt-0.5">
                    {it.location?.name && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} /> {it.location.name}
                      </span>
                    )}
                    {(it.minAge || it.maxAge) && (
                      <>
                        <span>·</span>
                        <span>Age {it.minAge || 0}–{it.maxAge || '∞'}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-sm">
                  <span className="font-bold text-brand">
                    {it.currency} {Number(it.price).toLocaleString()}
                  </span>
                  {it.priceOriginal && Number(it.priceOriginal) > Number(it.price) && (
                    <div className="line-through text-ink-muted text-[11px]">
                      {Number(it.priceOriginal).toLocaleString()}
                    </div>
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
                    to={`/admin/add-ons/${it.id}/edit`}
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
        title="Delete activity?"
        message="This will permanently remove the activity and its gallery."
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
