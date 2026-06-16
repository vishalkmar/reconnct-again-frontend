import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Star, Quote,
  Image as ImageIcon, Video, Layers, MessageSquare, Loader2,
  Palette, Save, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import TestimonialFormModal from '../../components/admin/TestimonialFormModal.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import ToggleSwitch from '../../components/admin/ToggleSwitch.jsx';
import RowDetailsModal from '../../components/admin/RowDetailsModal.jsx';

const TYPES = [
  { value: '', label: 'All types' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image + quote' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'video', label: 'Video' },
  { value: 'image_text', label: 'Image + text' },
  { value: 'video_text', label: 'Video + text' },
  { value: 'image_video', label: 'Image + video' },
];

const TYPE_ICONS = {
  text: Quote,
  image: ImageIcon,
  gallery: Layers,
  video: Video,
  image_text: ImageIcon,
  video_text: Video,
  image_video: Layers,
};

const TYPE_LABEL = {
  text: 'Text',
  image: 'Image',
  gallery: 'Gallery',
  video: 'Video',
  image_text: 'Image+text',
  video_text: 'Video+text',
  image_video: 'Img+vid',
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function TestimonialsPage() {
  const [tab, setTab] = useState('reviews');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/testimonials/all', {
        params: filterType ? { type: filterType } : {},
      });
      setItems(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (it) => {
    try {
      await api.patch(`/testimonials/${it.id}/toggle`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/testimonials/${deleteId}`);
      toast.success('Testimonial deleted');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Testimonials</h1>
          <p className="text-ink-muted text-sm">Manage your reviews and how each testimonial section looks.</p>
        </div>
        <div className="inline-flex bg-surface-alt rounded-lg p-1 text-sm">
          <button
            onClick={() => setTab('reviews')}
            className={`px-4 py-1.5 rounded-md inline-flex items-center gap-1.5 transition ${
              tab === 'reviews' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <MessageSquare size={14} /> Reviews
          </button>
          <button
            onClick={() => setTab('theme')}
            className={`px-4 py-1.5 rounded-md inline-flex items-center gap-1.5 transition ${
              tab === 'theme' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Palette size={14} /> Section Theme
          </button>
        </div>
      </div>

      {tab === 'theme' && <SectionThemeManager />}
      {tab === 'reviews' && (
      <div className="card overflow-hidden">
        {/* Header bar */}
        <div className="px-6 py-5 border-b flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shadow-soft">
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 className="font-display font-semibold">Reviews</h3>
              <p className="text-xs text-ink-muted">Manage home page testimonials/reviews</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input max-w-[200px] text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="btn-primary whitespace-nowrap"
            >
              <Plus size={16} /> Add Review
            </button>
          </div>
        </div>

        {/* Table / states */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-brand" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-muted">
            <Quote size={36} />
            <p className="font-semibold">No reviews yet</p>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="text-sm text-brand font-semibold hover:underline"
            >
              Add your first review
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-alt text-ink-muted uppercase text-[10px] font-bold tracking-[0.15em]">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Review</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((t) => {
                  const TIcon = TYPE_ICONS[t.type] || Quote;
                  return (
                    <tr key={t.id} className="hover:bg-surface-alt/40 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {t.authorAvatar ? (
                            <img
                              src={fileUrl(t.authorAvatar)}
                              alt={t.authorName || ''}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold">
                              {(t.authorName || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-ink truncate max-w-[180px]">{t.authorName || '—'}</div>
                            {t.authorTitle && (
                              <div className="text-xs text-ink-muted truncate max-w-[180px]">{t.authorTitle}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {t.rating ? (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={14}
                                className={s <= t.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                              />
                            ))}
                          </div>
                        ) : <span className="text-xs text-ink-muted">—</span>}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-ink-muted text-sm truncate" title={t.content || ''}>
                          {t.content || <span className="italic text-ink-muted/70">No quote</span>}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">
                          <TIcon size={11} /> {TYPE_LABEL[t.type] || t.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-muted">{t.sortOrder ?? 0}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-ink-muted">{formatDate(t.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <ToggleSwitch checked={t.isActive} onChange={() => toggle(t)} size="sm" />
                          <button
                            onClick={() => setViewItem(t)}
                            className="p-2 text-ink-muted hover:text-ink hover:bg-surface-alt rounded-lg transition"
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => { setEditing(t); setShowForm(true); }}
                            className="p-2 text-brand hover:text-brand-dark hover:bg-brand/10 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteId(t.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      <TestimonialFormModal
        open={showForm}
        item={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete review?"
        message="This will permanently remove this testimonial and its media."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />

      <RowDetailsModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.name || viewItem?.authorName}
        data={viewItem}
      />
    </div>
  );
}

/* ------------- Section Theme Manager ------------- */
const SECTIONS = [
  {
    key: 'clientReviews',
    label: '"What our clients say" — Arc carousel',
    note: 'Reviews shown above the testimonials band on the homepage.',
  },
  {
    key: 'videoBand',
    label: 'Video testimonials band',
    note: 'Dark band with video portrait cards (above "Find by activity").',
  },
  {
    key: 'testimonialsCarousel',
    label: 'Testimonials carousel band',
    note: 'Curated marketing testimonials in carousel mode.',
  },
  {
    key: 'testimonialsGrid',
    label: 'Testimonials static grid',
    note: 'Curated marketing testimonials in static grid mode.',
  },
];

const DEFAULTS = {
  clientReviews:        { bg: '#ffffff', card: '#ffffff', text: '#0f172a', accent: '#0d9488' },
  videoBand:            { bg: '#0f172a', card: '#1e293b', text: '#ffffff', accent: '#0d9488' },
  testimonialsCarousel: { bg: '#f8fafc', card: '#ffffff', text: '#0f172a', accent: '#0d9488' },
  testimonialsGrid:     { bg: '#f8fafc', card: '#ffffff', text: '#0f172a', accent: '#0d9488' },
};

function SectionThemeManager() {
  const [themes, setThemes] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/section-themes');
      const remote = res.data?.data?.themes || {};
      const next = {};
      Object.keys(DEFAULTS).forEach((k) => {
        next[k] = { ...DEFAULTS[k], ...(remote[k] || {}) };
      });
      setThemes(next);
    } catch (err) {
      toast.error('Failed to load themes');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setField = (sec, key, value) => {
    setThemes((s) => ({ ...s, [sec]: { ...s[sec], [key]: value } }));
  };

  const reset = (sec) => setThemes((s) => ({ ...s, [sec]: { ...DEFAULTS[sec] } }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/section-themes', themes);
      toast.success('Section themes saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {SECTIONS.map((sec) => {
        const t = themes[sec.key] || DEFAULTS[sec.key];
        return (
          <div key={sec.key} className="card p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display font-semibold">{sec.label}</h3>
                <p className="text-xs text-ink-muted mt-0.5">{sec.note}</p>
              </div>
              <button
                type="button"
                onClick={() => reset(sec.key)}
                className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-alt"
                title="Reset to default colors"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>

            <div className="grid sm:grid-cols-4 gap-4">
              <ColorField label="Background" value={t.bg} onChange={(v) => setField(sec.key, 'bg', v)} />
              <ColorField label="Card" value={t.card} onChange={(v) => setField(sec.key, 'card', v)} />
              <ColorField label="Text" value={t.text} onChange={(v) => setField(sec.key, 'text', v)} />
              <ColorField label="Accent" value={t.accent} onChange={(v) => setField(sec.key, 'accent', v)} />
            </div>

            {/* Live preview */}
            <div
              className="mt-4 rounded-xl p-4"
              style={{ background: t.bg, color: t.text }}
            >
              <div
                className="rounded-lg p-4 border"
                style={{
                  background: t.card,
                  color: t.text,
                  borderColor: t.accent + '55',
                }}
              >
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={12} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs italic" style={{ opacity: 0.8 }}>
                  "Live preview — sample review text with your chosen card colour and text colour."
                </p>
                <div
                  className="mt-2 inline-block text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
                  style={{ background: t.accent, color: t.card }}
                >
                  Accent
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary shadow-card"
        >
          <Save size={16} /> {saving ? 'Saving…' : 'Save section themes'}
        </button>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="w-12 h-10 rounded cursor-pointer border"
          value={value || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="input flex-1 font-mono text-xs uppercase"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#FFFFFF"
        />
      </div>
    </div>
  );
}
