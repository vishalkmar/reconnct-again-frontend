import { useEffect, useState } from 'react';
import { X, Trash2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import Dropzone from './Dropzone.jsx';

const TYPES = [
  { value: 'text', label: 'Text quote (no media)' },
  { value: 'image', label: 'Image + quote' },
  { value: 'gallery', label: 'Image gallery (carousel)' },
  { value: 'video', label: 'Video' },
  { value: 'image_text', label: 'Image + text card' },
  { value: 'video_text', label: 'Video + text card' },
  { value: 'image_video', label: 'Image + video (mixed)' },
];

const DISPLAY_MODES = [
  { value: 'carousel', label: 'Carousel' },
  { value: 'grid', label: 'Grid / static cards' },
];

// Mirrors backend `Testimonial.PLACEMENTS` so admin can pick where this
// testimonial appears on the public site. Kept in sync manually — if the
// backend list changes, update this list too.
const PLACEMENTS = [
  { value: 'home_clients_say', label: 'Home — "What our clients say" (arc carousel)' },
  { value: 'home_video_band',  label: 'Home — Video testimonials band' },
  { value: 'home_grid',        label: 'Home — Static testimonial grid' },
  { value: 'about_page',       label: 'About page' },
  { value: 'package_detail',   label: 'Package detail page' },
  { value: 'retreats_page',    label: 'Retreats listing page' },
  { value: 'blogs_page',       label: 'Blogs page' },
  { value: 'contact_page',     label: 'Contact page' },
];

const blank = {
  type: 'text',
  authorName: '',
  authorTitle: '',
  authorLocation: '',
  rating: 5,
  content: '',
  videoUrl: '',
  sortOrder: 0,
  isActive: true,
  cardWidth: '',
  cardHeight: '',
  cardPadding: '',
  cardMargin: '',
  displayMode: 'carousel',
  placements: [],
};

export default function TestimonialFormModal({ open, item, onClose, onSaved }) {
  const editing = !!item;
  const [form, setForm] = useState(blank);
  const [avatar, setAvatar] = useState(null);
  const [poster, setPoster] = useState(null);
  const [media, setMedia] = useState([]);
  const [replaceMedia, setReplaceMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        type: item.type || 'text',
        authorName: item.authorName || '',
        authorTitle: item.authorTitle || '',
        authorLocation: item.authorLocation || '',
        rating: item.rating ?? 5,
        content: item.content || '',
        videoUrl: item.videoUrl || '',
        sortOrder: item.sortOrder ?? 0,
        isActive: item.isActive ?? true,
        cardWidth: item.cardWidth ?? '',
        cardHeight: item.cardHeight ?? '',
        cardPadding: item.cardPadding ?? '',
        cardMargin: item.cardMargin ?? '',
        displayMode: item.displayMode || 'carousel',
        placements: Array.isArray(item.placements) ? item.placements : [],
      });
    } else setForm(blank);
    setAvatar(null);
    setPoster(null);
    setMedia([]);
    setReplaceMedia(false);
  }, [item, open]);

  if (!open) return null;

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
        fd.append(k, JSON.stringify(v));
      } else {
        fd.append(k, v);
      }
    });
    if (avatar) fd.append('avatar', avatar);
    if (poster) fd.append('videoPoster', poster);
    media.forEach((f) => fd.append('media', f));
    if (editing && replaceMedia) fd.append('replaceMedia', 'true');

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/testimonials/${item.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Testimonial updated');
      } else {
        await api.post('/testimonials', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Testimonial created');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const removeMedia = async (mediaId) => {
    if (!confirm('Remove this media item?')) return;
    try {
      await api.delete(`/testimonials/${item.id}/media/${mediaId}`);
      toast.success('Removed');
      onSaved?.();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const expectsAuthor = form.type !== 'gallery';
  const expectsContent = ['text', 'image', 'video', 'image_text', 'video_text'].includes(form.type);
  const expectsVideoFields = ['video', 'video_text', 'image_video'].includes(form.type);
  const expectsMediaGallery = ['image', 'gallery', 'image_text', 'image_video'].includes(form.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-card">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-display font-semibold">
            {editing ? 'Edit Testimonial' : 'New Testimonial'}
          </h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X size={22} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Type *</label>
              <select className="input" value={form.type} onChange={(e) => change('type', e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sort order</label>
              <input
                type="number" className="input"
                value={form.sortOrder}
                onChange={(e) => change('sortOrder', parseInt(e.target.value || 0, 10))}
              />
            </div>
          </div>

          {expectsAuthor && (
            <div className="bg-surface-alt p-4 rounded-xl space-y-4">
              <h4 className="font-semibold text-sm">Author</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    className="input" value={form.authorName}
                    onChange={(e) => change('authorName', e.target.value)}
                    placeholder="Kunal Banthia"
                  />
                </div>
                <div>
                  <label className="label">Location / title</label>
                  <input
                    className="input" value={form.authorTitle}
                    onChange={(e) => change('authorTitle', e.target.value)}
                    placeholder="Visited Oman"
                  />
                </div>
              </div>
              <div>
                <label className="label">Avatar (optional)</label>
                <Dropzone
                  accept="image/*"
                  value={avatar}
                  onChange={setAvatar}
                  existingUrl={item?.authorAvatar}
                  placeholder="Drag avatar image, or click"
                />
              </div>
            </div>
          )}

          {expectsContent && (
            <>
              <div>
                <label className="label">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => change('rating', n)}
                      className={n <= form.rating ? 'text-accent' : 'text-slate-300'}
                    >
                      <Star size={22} className={n <= form.rating ? 'fill-accent' : ''} />
                    </button>
                  ))}
                  <button type="button" onClick={() => change('rating', null)} className="ml-3 text-xs text-ink-muted hover:underline">
                    Clear
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Quote / content</label>
                <textarea
                  className="input" rows={4}
                  value={form.content}
                  onChange={(e) => change('content', e.target.value)}
                  placeholder='"Excellent service by Traveon. Our Oman trip was perfectly organized…"'
                />
              </div>
            </>
          )}

          {expectsVideoFields && (
            <div className="bg-surface-alt p-4 rounded-xl space-y-4">
              <h4 className="font-semibold text-sm">Video</h4>
              <div>
                <label className="label">Video URL (or upload below)</label>
                <input
                  className="input"
                  value={form.videoUrl}
                  onChange={(e) => change('videoUrl', e.target.value)}
                  placeholder="https://youtu.be/… or https://… .mp4"
                />
              </div>
              <div>
                <label className="label">Poster image (optional)</label>
                <Dropzone
                  accept="image/*"
                  value={poster}
                  onChange={setPoster}
                  existingUrl={item?.videoPoster}
                  placeholder="Drag poster image, or click"
                />
              </div>
              <p className="text-xs text-ink-muted">
                You can either provide an external video URL above, or upload an MP4 video file in the media field below.
              </p>
            </div>
          )}

          {(expectsMediaGallery || expectsVideoFields) && (
            <div>
              <label className="label">
                {form.type === 'gallery'
                  ? 'Gallery images'
                  : form.type === 'image'
                    ? 'Hero image'
                    : 'Video file (alternative to URL)'}
              </label>
              <Dropzone
                accept={form.type === 'video' ? 'video/*' : 'image/*'}
                multiple={form.type === 'gallery'}
                value={form.type === 'gallery' ? media : (media[0] || null)}
                onChange={(v) => setMedia(form.type === 'gallery' ? (v || []) : v ? [v] : [])}
                placeholder={form.type === 'gallery' ? 'Drag & drop images, or click' : 'Drag & drop a file, or click'}
              />
              {item?.media?.length > 0 && (
                <label className="flex items-center gap-2 text-sm mt-3">
                  <input type="checkbox" checked={replaceMedia} onChange={(e) => setReplaceMedia(e.target.checked)} />
                  Replace existing media
                </label>
              )}
              {item?.media?.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
                  {item.media.map((m) => (
                    <div key={m.id} className="relative group rounded-lg overflow-hidden border">
                      {m.mediaType === 'video' ? (
                        <video src={fileUrl(m.url)} className="w-full h-20 object-cover" muted />
                      ) : (
                        <img src={fileUrl(m.url)} className="w-full h-20 object-cover" alt="" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(m.id)}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-surface-alt p-4 rounded-xl space-y-4">
            <h4 className="font-semibold text-sm">Display settings</h4>
            <div>
              <label className="label">Layout mode</label>
              <select
                className="input"
                value={form.displayMode}
                onChange={(e) => change('displayMode', e.target.value)}
              >
                {DISPLAY_MODES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-ink-muted mt-1">How this card is shown on the public site.</p>
            </div>
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <label className="label">Width (px)</label>
                <input
                  type="number" min={120} className="input"
                  value={form.cardWidth}
                  onChange={(e) => change('cardWidth', e.target.value)}
                  placeholder="auto"
                />
              </div>
              <div>
                <label className="label">Height (px)</label>
                <input
                  type="number" min={120} className="input"
                  value={form.cardHeight}
                  onChange={(e) => change('cardHeight', e.target.value)}
                  placeholder="auto"
                />
              </div>
              <div>
                <label className="label">Padding (px)</label>
                <input
                  type="number" min={0} className="input"
                  value={form.cardPadding}
                  onChange={(e) => change('cardPadding', e.target.value)}
                  placeholder="default"
                />
              </div>
              <div>
                <label className="label">Margin (px)</label>
                <input
                  type="number" min={0} className="input"
                  value={form.cardMargin}
                  onChange={(e) => change('cardMargin', e.target.value)}
                  placeholder="default"
                />
              </div>
            </div>
            <p className="text-[11px] text-ink-muted">Leave blank for the section's responsive default.</p>
          </div>

          {/* Placement multi-select — where this testimonial appears */}
          <div className="bg-surface-alt p-4 rounded-xl space-y-3">
            <div>
              <h4 className="font-semibold text-sm">Show on pages / sections</h4>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Pick where this testimonial should appear. Leave all unchecked
                for legacy behaviour — video types fall back to the video band,
                everything else to the "What our clients say" carousel.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {PLACEMENTS.map((p) => {
                const checked = form.placements.includes(p.value);
                return (
                  <label
                    key={p.value}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                      checked
                        ? 'border-brand bg-brand/5'
                        : 'border-slate-200 hover:border-brand/40 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...form.placements, p.value]
                          : form.placements.filter((v) => v !== p.value);
                        change('placements', next);
                      }}
                    />
                    <span className="text-sm leading-tight">{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={form.isActive}
              onChange={(e) => change('isActive', e.target.checked)}
            />
            Visible on site
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create testimonial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
