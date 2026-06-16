import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff, FileText, Calendar, Tag, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';

export default function BlogsPage() {
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
      const res = await api.get('/blogs/admin/all');
      setItems(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((b) =>
    !search || b.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = async (b) => {
    try {
      await api.patch(`/blogs/${b.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const duplicate = async (b) => {
    if (duplicatingId) return;
    setDuplicatingId(b.id);
    try {
      const res = await api.post(`/blogs/${b.id}/duplicate`);
      const newId = res.data?.data?.blog?.id;
      toast.success('Blog duplicated — opening for edit');
      if (newId) navigate(`/admin/blogs/${newId}/edit`);
      else load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/blogs/${deleteId}`);
      toast.success('Blog deleted');
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
          <h1 className="text-2xl font-display font-bold">Blogs</h1>
          <p className="text-ink-muted text-sm">Articles, travel stories, wellness tips.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            className="input"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link to="/admin/blogs/new" className="btn-primary whitespace-nowrap">
            <Plus size={18} /> New blog
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="mx-auto text-ink-muted mb-3" />
          <p className="text-ink-muted">No blogs yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <div key={b.id} className={`card group ${!b.isPublished && 'opacity-70'}`}>
              <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
                {b.featuredImage ? (
                  <img src={fileUrl(b.featuredImage)} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-muted">
                    <FileText size={32} />
                  </div>
                )}
                <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${b.isPublished ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                  {b.isPublished ? 'PUBLISHED' : 'DRAFT'}
                </span>
                {b.isFeatured && (
                  <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 font-semibold">
                    FEATURED
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold leading-tight line-clamp-2">{b.title}</h3>
                {b.excerpt && (
                  <p
                    className="text-xs text-ink-muted mt-2 line-clamp-2"
                    title={b.excerpt.replace(/<[^>]*>/g, ' ')}
                  >
                    {b.excerpt.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-ink-muted mt-3 flex-wrap">
                  {b.category && (
                    <span className="inline-flex items-center gap-1">
                      <Tag size={12} /> {b.category.name}
                    </span>
                  )}
                  {b.publishedAt && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} /> {new Date(b.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                  <span>· {b.viewCount || 0} views</span>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <ToggleSwitch checked={b.isPublished} onChange={() => toggle(b)} showLabel />
                  <button onClick={() => setViewItem(b)} className="ml-auto btn-ghost text-xs">
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => duplicate(b)}
                    disabled={duplicatingId === b.id}
                    className="btn-ghost text-xs disabled:opacity-50"
                  >
                    <Copy size={14} /> Duplicate
                  </button>
                  <Link to={`/admin/blogs/${b.id}/edit`} className="flex-1 btn-ghost text-xs">
                    <Edit size={14} /> Edit
                  </Link>
                  <button
                    onClick={() => setDeleteId(b.id)}
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
        title="Delete blog?"
        message="This will permanently remove the blog. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />

      <RowDetailsModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.title || viewItem?.name}
        data={viewItem}
      />
    </div>
  );
}
