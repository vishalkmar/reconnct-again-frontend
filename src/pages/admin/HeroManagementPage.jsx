import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import HeroFormModal from '../../components/admin/HeroFormModal.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import SortableList, { DragHandle } from '../../components/admin/SortableList.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';

const TYPE_LABELS = {
  image: 'Single Image',
  image_text: 'Image + Text',
  image_carousel: 'Image Carousel',
  image_carousel_text: 'Carousel + Text',
  video: 'Video',
  video_carousel: 'Video Carousel',
};

// Same path → pageKey rule used by <PageHero/> on the public site.
const pathToPageKey = (path = '/') => {
  if (!path || path === '/') return 'home';
  if (/^https?:\/\//i.test(path)) return null;
  const seg = path.split('/').filter(Boolean)[0];
  return (seg || 'home').toLowerCase();
};

export default function HeroManagementPage() {
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPage, setFilterPage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [pageOptions, setPageOptions] = useState([{ key: 'home', label: 'Home' }]);

  // Pull header links so the page filter only shows pages the admin has registered.
  useEffect(() => {
    api.get('/header-links/all')
      .then((res) => {
        const links = res.data?.data?.links || [];
        const seen = new Map([['home', { key: 'home', label: 'Home' }]]);
        for (const link of links) {
          const key = pathToPageKey(link.path);
          if (!key || seen.has(key)) continue;
          seen.set(key, { key, label: link.label });
        }
        setPageOptions(Array.from(seen.values()));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/heroes', { params: filterPage ? { pageKey: filterPage } : {} });
      setHeroes(res.data.data.heroes);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load heroes');
    } finally {
      setLoading(false);
    }
  }, [filterPage]);

  useEffect(() => { load(); }, [load]);

  const persistOrder = async (ordered) => {
    setHeroes(ordered);
    try {
      await api.put('/heroes/reorder', { order: ordered.map((h) => h.id) });
    } catch (err) {
      toast.error('Reorder failed');
      load();
    }
  };

  const toggle = async (hero) => {
    try {
      await api.patch(`/heroes/${hero.id}/toggle`);
      toast.success(`Hero ${hero.isActive ? 'disabled' : 'enabled'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/heroes/${deleteId}`);
      toast.success('Hero deleted');
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
          <h1 className="text-2xl font-display font-bold">Hero Sections</h1>
          <p className="text-ink-muted text-sm">Drag a row's grip handle to reorder how heroes stack on a page.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filterPage}
            onChange={(e) => setFilterPage(e.target.value)}
            className="input max-w-[200px]"
          >
            <option value="">All pages</option>
            {pageOptions.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary whitespace-nowrap">
            <Plus size={18} /> New hero
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : heroes.length === 0 ? (
        <div className="card p-12 text-center">
          <ImageIcon size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">No hero sections yet. Create your first one to get started.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 bg-surface-alt text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <div className="col-span-1">Order</div>
            <div className="col-span-2">Preview</div>
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Page</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <SortableList
            items={heroes}
            onReorder={persistOrder}
            renderItem={(h, { dragHandleProps }) => {
              const first = h.media?.[0];
              const isVideo = first?.mediaType === 'video';
              return (
                <div className={`grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-surface-alt/50 ${!h.isActive && 'opacity-60'}`}>
                  <div className="col-span-1">
                    <DragHandle dragHandleProps={dragHandleProps} />
                  </div>
                  <div className="col-span-2">
                    <div className="w-20 h-12 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center relative">
                      {first ? (
                        isVideo ? (
                          <video src={fileUrl(first.url)} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={fileUrl(first.url)} alt={h.name} className="w-full h-full object-cover" />
                        )
                      ) : (
                        <ImageIcon size={16} className="text-ink-muted" />
                      )}
                      {(isVideo || h.type === 'video' || h.type === 'video_carousel') && (
                        <span className="absolute bottom-0.5 right-0.5 text-white">
                          <Video size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-4">
                    <div className="font-medium text-sm leading-tight">{h.name}</div>
                    {h.heading && (
                      <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{h.heading}</p>
                    )}
                    <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${h.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                      {h.isActive ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-ink-muted">{h.pageKey}</div>
                  <div className="col-span-1 text-[11px] text-ink-muted">{TYPE_LABELS[h.type]}</div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <ToggleSwitch checked={h.isActive} onChange={() => toggle(h)} size="sm" />
                    <button onClick={() => setViewItem(h)} className="p-1.5 hover:bg-surface-alt rounded" title="View details">
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => { setEditing(h); setShowForm(true); }}
                      className="p-1.5 hover:bg-surface-alt rounded"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteId(h.id)}
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

      <HeroFormModal
        open={showForm}
        hero={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete hero?"
        message="This will permanently remove this hero section and all its media. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />

      <RowDetailsModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.title || viewItem?.name || viewItem?.pageKey}
        data={viewItem}
      />
    </div>
  );
}
