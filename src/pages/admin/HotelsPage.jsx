import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Star, MapPin,
  Hotel as HotelIcon, LayoutGrid, List as ListIcon, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import SortableList, { DragHandle } from '../../components/admin/SortableList.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';

export default function HotelsPage() {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [view, setView] = useState('list');
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hotels/admin/all');
      setHotels(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = hotels.filter((h) =>
    !search || h.name.toLowerCase().includes(search.toLowerCase())
  );

  const reorderingDisabled = !!search;

  const persistOrder = async (ordered) => {
    setHotels(ordered);
    try {
      await api.put('/hotels/admin/reorder', { order: ordered.map((h) => h.id) });
    } catch (err) {
      toast.error('Reorder failed');
      load();
    }
  };

  const toggle = async (h) => {
    try {
      await api.patch(`/hotels/${h.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const duplicate = async (h) => {
    if (duplicatingId) return;
    setDuplicatingId(h.id);
    try {
      const res = await api.post(`/hotels/${h.id}/duplicate`);
      const newId = res.data?.data?.hotel?.id;
      toast.success('Hotel duplicated — opening for edit');
      if (newId) navigate(`/admin/hotels/${newId}/edit`);
      else load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/hotels/${deleteId}`);
      toast.success('Hotel deleted');
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
          <h1 className="text-2xl font-display font-bold">Hotels</h1>
          <p className="text-ink-muted text-sm">All hotel listings — drag to reorder how they appear on the public site.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            className="input"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="inline-flex bg-surface-alt rounded-lg p-1 text-sm shrink-0">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${
                view === 'list' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
              }`}
              title="List view (drag to reorder)"
            >
              <ListIcon size={14} /> List
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${
                view === 'grid' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
              }`}
              title="Grid view"
            >
              <LayoutGrid size={14} /> Grid
            </button>
          </div>
          <Link to="/admin/hotels/new" className="btn-primary whitespace-nowrap">
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
          <HotelIcon size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">No hotels yet. Click <strong>New</strong> to add one.</p>
        </div>
      ) : view === 'list' ? (
        <div className="card overflow-hidden">
          {reorderingDisabled && (
            <p className="text-xs text-amber-700 bg-amber-50 px-4 py-2 border-b">
              Reordering is paused while a search is active. Clear the search to drag rows.
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
            items={reorderingDisabled ? filtered : hotels}
            onReorder={reorderingDisabled ? () => {} : persistOrder}
            showHandle={!reorderingDisabled}
            renderItem={(h, { dragHandleProps }) => (
              <div className={`grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-surface-alt/50 ${!h.isActive && 'opacity-60'}`}>
                <div className="col-span-1">
                  {!reorderingDisabled && <DragHandle dragHandleProps={dragHandleProps} />}
                </div>
                <div className="col-span-2">
                  <div className="w-20 h-12 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                    {h.primaryImage ? (
                      <img src={fileUrl(h.primaryImage)} alt={h.name} className="w-full h-full object-cover" />
                    ) : (
                      <HotelIcon size={16} className="text-ink-muted" />
                    )}
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="font-medium text-sm leading-tight line-clamp-2">{h.name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-ink-muted mt-0.5">
                    {h.location?.name && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} /> {h.location.name}
                      </span>
                    )}
                    {h.starRating && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 text-amber-600">
                          {'★'.repeat(h.starRating)}
                        </span>
                      </>
                    )}
                    {h.rating > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Star size={10} className="fill-accent text-accent" />
                          {Number(h.rating).toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-sm">
                  <span className="font-bold text-brand">
                    {h.currency} {Number(h.priceFrom).toLocaleString()}
                  </span>
                  {h.priceOriginal && Number(h.priceOriginal) > Number(h.priceFrom) && (
                    <div className="line-through text-ink-muted text-[11px]">
                      {Number(h.priceOriginal).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="col-span-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${h.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    {h.isActive ? 'LIVE' : 'DRAFT'}
                  </span>
                  {h.isFeatured && (
                    <div className="text-[9px] mt-1 text-amber-700 font-semibold">FEATURED</div>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <ToggleSwitch checked={h.isActive} onChange={() => toggle(h)} size="sm" />
                  <button onClick={() => setViewItem(h)} className="p-1.5 hover:bg-surface-alt rounded" title="View details">
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => duplicate(h)}
                    disabled={duplicatingId === h.id}
                    className="p-1.5 hover:bg-surface-alt rounded disabled:opacity-50"
                    title="Duplicate"
                  >
                    <Copy size={16} />
                  </button>
                  <Link
                    to={`/admin/hotels/${h.id}/edit`}
                    className="p-1.5 hover:bg-surface-alt rounded"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </Link>
                  <button
                    onClick={() => setDeleteId(h.id)}
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((h) => (
            <div key={h.id} className={`card group ${!h.isActive && 'opacity-60'}`}>
              <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
                {h.primaryImage ? (
                  <img src={fileUrl(h.primaryImage)} alt={h.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-muted">
                    <HotelIcon size={32} />
                  </div>
                )}
                <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${h.isActive ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'}`}>
                  {h.isActive ? 'PUBLISHED' : 'DRAFT'}
                </span>
                {h.isFeatured && (
                  <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 font-semibold">
                    FEATURED
                  </span>
                )}
                {h.starRating && (
                  <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full bg-white/90 text-amber-700 font-semibold">
                    {'★'.repeat(h.starRating)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold leading-tight line-clamp-2">{h.name}</h3>
                <div className="flex items-center gap-2 text-xs text-ink-muted mt-1">
                  {h.location?.name && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {h.location.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <span className="font-bold text-brand">
                    {h.currency} {Number(h.priceFrom).toLocaleString()}
                  </span>
                  {h.priceOriginal && (
                    <span className="line-through text-ink-muted text-xs">
                      {Number(h.priceOriginal).toLocaleString()}
                    </span>
                  )}
                  {h.rating > 0 && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs">
                      <Star size={12} className="fill-accent text-accent" />
                      {Number(h.rating).toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <ToggleSwitch checked={h.isActive} onChange={() => toggle(h)} showLabel />
                  <button
                    onClick={() => setViewItem(h)}
                    className="ml-auto btn-ghost text-xs"
                  >
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => duplicate(h)}
                    disabled={duplicatingId === h.id}
                    className="btn-ghost text-xs disabled:opacity-50"
                  >
                    <Copy size={14} /> Duplicate
                  </button>
                  <Link
                    to={`/admin/hotels/${h.id}/edit`}
                    className="flex-1 btn-ghost text-xs"
                  >
                    <Edit size={14} /> Edit
                  </Link>
                  <button
                    onClick={() => setDeleteId(h.id)}
                    className="flex-1 btn-ghost text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete hotel?"
        message="This will permanently remove the hotel, its gallery and all associated rooms. This cannot be undone."
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
