import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Copy, ImageIcon, Film, Type,
  Images, Megaphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import SortableList, { DragHandle } from '../../components/admin/SortableList.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';

const TYPE_META = {
  'image-single':   { label: 'Single image',        icon: ImageIcon, color: 'bg-sky-100 text-sky-700' },
  'image-carousel': { label: 'Image carousel',      icon: Images,    color: 'bg-indigo-100 text-indigo-700' },
  'image-text':     { label: 'Image + text',        icon: Type,      color: 'bg-emerald-100 text-emerald-700' },
  'video-single':   { label: 'Single video',        icon: Film,      color: 'bg-rose-100 text-rose-700' },
  'video-carousel': { label: 'Video carousel',      icon: Film,      color: 'bg-fuchsia-100 text-fuchsia-700' },
};

export default function PromoBannersPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/promo-banners/admin/all');
      setItems(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const persistOrder = async (ordered) => {
    setItems(ordered);
    try {
      await api.put('/promo-banners/admin/reorder', { order: ordered.map((it) => it.id) });
    } catch {
      toast.error('Reorder failed');
      load();
    }
  };

  const toggle = async (b) => {
    try {
      await api.patch(`/promo-banners/${b.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const duplicate = async (b) => {
    if (duplicatingId) return;
    setDuplicatingId(b.id);
    try {
      const res = await api.post(`/promo-banners/${b.id}/duplicate`);
      const newId = res.data?.data?.banner?.id;
      toast.success('Banner duplicated — opening for edit');
      if (newId) navigate(`/admin/promo-banners/${newId}/edit`);
      else load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/promo-banners/${deleteId}`);
      toast.success('Banner deleted');
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
          <h1 className="text-2xl font-display font-bold">Promo Banners</h1>
          <p className="text-ink-muted text-sm">
            Image / video / text banners shown on public pages. Pick a type, choose a page, drop in slides.
          </p>
        </div>
        <Link to="/admin/promo-banners/new" className="btn-primary whitespace-nowrap">
          <Plus size={18} /> New Banner
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">No banners yet. Create your first one.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 bg-surface-alt text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <div className="col-span-1">Order</div>
            <div className="col-span-2">Preview</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Page · Position</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <SortableList
            items={items}
            onReorder={persistOrder}
            showHandle
            renderItem={(b, { dragHandleProps }) => {
              const meta = TYPE_META[b.type] || { label: b.type, icon: ImageIcon, color: 'bg-slate-100 text-slate-700' };
              const firstSlide = b.slides?.[0];
              return (
                <div className={`grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-surface-alt/50 ${!b.isActive && 'opacity-60'}`}>
                  <div className="col-span-1">
                    <DragHandle dragHandleProps={dragHandleProps} />
                  </div>
                  <div className="col-span-2">
                    <div className="w-24 h-14 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                      {firstSlide?.mediaType === 'image' && firstSlide.mediaUrl ? (
                        <img src={fileUrl(firstSlide.mediaUrl)} alt="" className="w-full h-full object-cover" />
                      ) : firstSlide?.mediaType === 'video' ? (
                        <Film size={18} className="text-ink-muted" />
                      ) : (
                        <ImageIcon size={18} className="text-ink-muted" />
                      )}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="font-medium text-sm leading-tight">{b.name}</div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      {b.slides?.length || 0} slide{b.slides?.length === 1 ? '' : 's'}
                      {b.heightPx && ` · ${b.heightPx}px tall`}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                      <meta.icon size={11} /> {meta.label}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-ink">
                    <span className="font-semibold">{b.page}</span>
                    <div className="text-ink-muted text-[11px]">{b.position}</div>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <ToggleSwitch checked={b.isActive} onChange={() => toggle(b)} size="sm" />
                    <button onClick={() => setViewItem(b)} className="p-1.5 hover:bg-surface-alt rounded" title="View details">
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => duplicate(b)}
                      disabled={duplicatingId === b.id}
                      className="p-1.5 hover:bg-surface-alt rounded disabled:opacity-50"
                      title="Duplicate"
                    >
                      <Copy size={16} />
                    </button>
                    <Link
                      to={`/admin/promo-banners/${b.id}/edit`}
                      className="p-1.5 hover:bg-surface-alt rounded"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => setDeleteId(b.id)}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete banner?"
        message="This will permanently remove the banner and all its slides."
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
