import { useEffect, useState, useMemo } from 'react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import Dropzone from './Dropzone.jsx';

const HERO_TYPES = [
  { value: 'image', label: 'Single Image' },
  { value: 'image_text', label: 'Single Image + Text' },
  { value: 'image_carousel', label: 'Image Carousel' },
  { value: 'image_carousel_text', label: 'Image Carousel + Text' },
  { value: 'video', label: 'Single Video' },
  { value: 'video_carousel', label: 'Video Carousel' },
];

// Same rule used by `<PageHero/>` on the public site to map the URL path
// (e.g. "/retreats/some-slug") to the hero's `pageKey` (e.g. "retreats").
const pathToPageKey = (path = '/') => {
  if (!path || path === '/') return 'home';
  // Treat external links (https://…) as no-op for hero binding
  if (/^https?:\/\//i.test(path)) return null;
  const seg = path.split('/').filter(Boolean)[0];
  return (seg || 'home').toLowerCase();
};

const HEIGHTS = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'full', label: 'Full screen' },
  { value: 'custom', label: 'Custom (vh)' },
];

const WIDTHS = [
  { value: 'full', label: 'Full bleed (100%)' },
  { value: 'large', label: 'Large (container)' },
  { value: 'medium', label: 'Medium (75%)' },
  { value: 'small', label: 'Small (50%)' },
  { value: 'custom', label: 'Custom (%)' },
];

const blank = {
  name: '',
  type: 'image_text',
  pageKey: 'home',
  heading: '',
  subheading: '',
  ctaLabel: '',
  ctaUrl: '',
  textPosition: 'center',
  textColor: '#ffffff',
  overlayOpacity: 35,
  autoplay: true,
  intervalMs: 5000,
  height: 'lg',
  heightValue: '',
  widthMode: 'large',
  widthValue: 100,
  isActive: true,
  sortOrder: 0,
};

export default function HeroFormModal({ open, hero, onClose, onSaved }) {
  const editing = !!hero;
  const [form, setForm] = useState(blank);
  const [files, setFiles] = useState([]);
  const [replaceMedia, setReplaceMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageOptions, setPageOptions] = useState([
    { key: 'home', label: 'Home (/)' }, // always present even if no header link configured
  ]);

  // Pull the registered header links so the page dropdown only ever lists
  // pages the admin has actually created. We dedupe by derived pageKey so
  // sub-paths like /retreats/foo collapse onto the parent "retreats" entry.
  useEffect(() => {
    if (!open) return;
    api.get('/header-links/all')
      .then((res) => {
        const links = res.data?.data?.links || [];
        const seen = new Map();
        seen.set('home', { key: 'home', label: 'Home (/)' });
        for (const link of links) {
          const key = pathToPageKey(link.path);
          if (!key || seen.has(key)) continue;
          seen.set(key, { key, label: `${link.label} (${link.path})` });
        }
        setPageOptions(Array.from(seen.values()));
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (hero) {
      setForm({
        name: hero.name || '',
        type: hero.type || 'image_text',
        pageKey: hero.pageKey || 'home',
        heading: hero.heading || '',
        subheading: hero.subheading || '',
        ctaLabel: hero.ctaLabel || '',
        ctaUrl: hero.ctaUrl || '',
        textPosition: hero.textPosition || 'center',
        textColor: hero.textColor || '#ffffff',
        overlayOpacity: hero.overlayOpacity ?? 35,
        autoplay: hero.autoplay ?? true,
        intervalMs: hero.intervalMs ?? 5000,
        height: hero.height || 'lg',
        heightValue: hero.heightValue ?? '',
        widthMode: hero.widthMode || 'large',
        widthValue: hero.widthValue ?? 100,
        isActive: hero.isActive ?? true,
        sortOrder: hero.sortOrder ?? 0,
      });
    } else {
      setForm(blank);
    }
    setFiles([]);
    setReplaceMedia(false);
  }, [hero, open]);

  // If editing a hero whose pageKey isn't in the current set of registered
  // pages (e.g. its header link was removed), include it so the value is
  // still selectable instead of silently dropped.
  const mergedPageOptions = useMemo(() => {
    if (!form.pageKey) return pageOptions;
    if (pageOptions.some((p) => p.key === form.pageKey)) return pageOptions;
    return [...pageOptions, { key: form.pageKey, label: `${form.pageKey} (unregistered)` }];
  }, [pageOptions, form.pageKey]);

  if (!open) return null;

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const expectsMultipleMedia =
    form.type === 'image_carousel' ||
    form.type === 'image_carousel_text' ||
    form.type === 'video_carousel';

  const expectsVideo = form.type === 'video' || form.type === 'video_carousel';

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, v);
    });
    if (editing && replaceMedia) fd.append('replaceMedia', 'true');
    files.forEach((f) => fd.append('media', f));

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/heroes/${hero.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Hero updated');
      } else {
        await api.post('/heroes', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Hero created');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const removeExistingMedia = async (mediaId) => {
    if (!confirm('Remove this media item?')) return;
    try {
      await api.delete(`/heroes/${hero.id}/media/${mediaId}`);
      toast.success('Media removed');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-card">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-display font-semibold">
            {editing ? 'Edit Hero Section' : 'Create Hero Section'}
          </h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Internal name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => change('name', e.target.value)}
                placeholder="e.g. Home main hero"
                required
              />
            </div>

            <div>
              <label className="label">Page *</label>
              <select className="input" value={form.pageKey} onChange={(e) => change('pageKey', e.target.value)}>
                {mergedPageOptions.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-ink-muted mt-1">
                Pages come from your header links. Add a link in
                {' '}<span className="font-medium">Website Configure → Header Links</span>{' '}
                to create more options.
              </p>
            </div>

            <div>
              <label className="label">Type *</label>
              <select className="input" value={form.type} onChange={(e) => change('type', e.target.value)}>
                {HERO_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Height</label>
              <select className="input" value={form.height} onChange={(e) => change('height', e.target.value)}>
                {HEIGHTS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>

            {form.height === 'custom' && (
              <div>
                <label className="label">Custom height (vh, 10-100)</label>
                <input
                  type="number" min={10} max={100} className="input"
                  value={form.heightValue || ''}
                  onChange={(e) => change('heightValue', parseInt(e.target.value || 60, 10))}
                />
              </div>
            )}

            <div>
              <label className="label">Width</label>
              <select className="input" value={form.widthMode} onChange={(e) => change('widthMode', e.target.value)}>
                {WIDTHS.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>

            {form.widthMode === 'custom' && (
              <div>
                <label className="label">Custom width (%, 10-100)</label>
                <input
                  type="number" min={10} max={100} className="input"
                  value={form.widthValue || 100}
                  onChange={(e) => change('widthValue', parseInt(e.target.value || 100, 10))}
                />
              </div>
            )}
          </div>

          {(form.type === 'image_text' || form.type === 'image_carousel_text') && (
            <div className="space-y-4 bg-surface-alt p-4 rounded-xl">
              <h4 className="font-semibold text-sm">Text Overlay</h4>
              <div>
                <label className="label">Heading</label>
                <input className="input" value={form.heading} onChange={(e) => change('heading', e.target.value)} />
              </div>
              <div>
                <label className="label">Subheading</label>
                <textarea className="input" rows={2} value={form.subheading} onChange={(e) => change('subheading', e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">CTA label</label>
                  <input className="input" value={form.ctaLabel} onChange={(e) => change('ctaLabel', e.target.value)} placeholder="Explore now" />
                </div>
                <div>
                  <label className="label">CTA URL</label>
                  <input className="input" value={form.ctaUrl} onChange={(e) => change('ctaUrl', e.target.value)} placeholder="/retreats" />
                </div>
                <div>
                  <label className="label">Text position</label>
                  <select className="input" value={form.textPosition} onChange={(e) => change('textPosition', e.target.value)}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <label className="label">Text color</label>
                  <input type="color" className="input h-11 p-1" value={form.textColor} onChange={(e) => change('textColor', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Overlay darkness ({form.overlayOpacity}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={form.overlayOpacity}
                    onChange={(e) => change('overlayOpacity', parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {expectsMultipleMedia && (
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.autoplay} onChange={(e) => change('autoplay', e.target.checked)} />
                Autoplay carousel
              </label>
              <div>
                <label className="label">Interval (ms)</label>
                <input
                  type="number"
                  className="input"
                  value={form.intervalMs}
                  onChange={(e) => change('intervalMs', parseInt(e.target.value || 5000, 10))}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">
              Upload {expectsVideo ? 'video' : 'image'}
              {expectsMultipleMedia ? '(s)' : ''}
            </label>
            <Dropzone
              accept={expectsVideo ? 'video/*' : 'image/*'}
              multiple={expectsMultipleMedia}
              value={expectsMultipleMedia ? files : files[0] || null}
              onChange={(v) => setFiles(expectsMultipleMedia ? (v || []) : v ? [v] : [])}
              placeholder={expectsMultipleMedia ? 'Drag & drop files, or click to browse' : 'Drag & drop a file, or click to browse'}
            />
            {editing && hero?.media?.length > 0 && (
              <label className="flex items-center gap-2 text-sm mt-3">
                <input type="checkbox" checked={replaceMedia} onChange={(e) => setReplaceMedia(e.target.checked)} />
                Replace existing media (instead of appending)
              </label>
            )}
          </div>

          {editing && hero?.media?.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Current media</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {hero.media.map((m) => (
                  <div key={m.id} className="relative group rounded-lg overflow-hidden border">
                    {m.mediaType === 'video' ? (
                      <video src={fileUrl(m.url)} className="w-full h-24 object-cover" muted />
                    ) : (
                      <img src={fileUrl(m.url)} alt={m.alt || ''} className="w-full h-24 object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingMedia(m.id)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Sort order</label>
              <input
                type="number"
                className="input"
                value={form.sortOrder}
                onChange={(e) => change('sortOrder', parseInt(e.target.value || 0, 10))}
              />
            </div>
            <label className="flex items-center gap-2 mt-7">
              <input type="checkbox" checked={form.isActive} onChange={(e) => change('isActive', e.target.checked)} />
              <span>Enabled (visible on site)</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create hero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
