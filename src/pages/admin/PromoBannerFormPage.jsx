import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Settings, Plus, Trash2, GripVertical,
  Image as ImageIcon, Film, Link as LinkIcon, ChevronUp, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import usePersistedForm from '../../hooks/usePersistedForm.js';

const TYPES = [
  { value: 'image-single',   label: 'Single image' },
  { value: 'image-carousel', label: 'Image carousel' },
  { value: 'image-text',     label: 'Image + text overlay' },
  { value: 'video-single',   label: 'Single video' },
  { value: 'video-carousel', label: 'Video carousel' },
];

const PAGES = [
  { value: 'home',     label: 'Home page' },
  { value: 'hotels',   label: 'Hotels listing' },
  { value: 'retreats', label: 'Packages listing' },
  { value: 'events',   label: 'Events listing' },
  { value: 'all',      label: 'All pages' },
];

const POSITIONS = [
  { value: 'below-video-testimonials', label: 'Below video testimonials (home)' },
  { value: 'below-hero',                label: 'Below hero' },
  { value: 'below-featured',            label: 'Below featured items' },
  { value: 'above-footer',              label: 'Above footer' },
];

const WIDTH_MODES = [
  { value: 'container', label: 'Container (constrained)' },
  { value: 'full',      label: 'Full viewport width' },
];

const blankForm = {
  name: '',
  type: 'image-single',
  page: 'home',
  position: 'below-video-testimonials',
  heading: '',
  description: '',
  ctaLabel: '',
  ctaUrl: '',
  heightPx: 360,
  widthMode: 'container',
  autoplay: true,
  intervalMs: 5000,
  isActive: true,
  sortOrder: 0,
  slides: [],   // array of { mediaType, mediaUrl (or '__file:N__'), caption, overlayHeading, overlayText, linkUrl, _file, _previewUrl, _existing }
};

function Section({ icon: Icon, title, children, subtitle }) {
  return (
    <div className="card mb-5">
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="font-display font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-5 pb-5 pt-4 space-y-4">{children}</div>
    </div>
  );
}

export default function PromoBannerFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const {
    value: form,
    setValue: setForm,
    hydrateFromServer,
    clearDraft,
    discardDraft,
    hasDraft,
  } = usePersistedForm(`banner-form:${id || 'new'}`, blankForm, { editing });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(editing);

  // Pending file uploads, keyed by slide index in form.slides
  const fileMapRef = useRef(new Map());

  // Load if editing
  const load = useCallback(async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const res = await api.get(`/promo-banners/admin/${id}`);
      const b = res.data.data.banner;
      hydrateFromServer({
        name: b.name || '',
        type: b.type || 'image-single',
        page: b.page || 'home',
        position: b.position || 'below-video-testimonials',
        heading: b.heading || '',
        description: b.description || '',
        ctaLabel: b.ctaLabel || '',
        ctaUrl: b.ctaUrl || '',
        heightPx: b.heightPx ?? 360,
        widthMode: b.widthMode || 'container',
        autoplay: b.autoplay ?? true,
        intervalMs: b.intervalMs ?? 5000,
        isActive: b.isActive ?? true,
        sortOrder: b.sortOrder ?? 0,
        slides: (b.slides || []).map((s) => ({
          mediaType: s.mediaType,
          mediaUrl: s.mediaUrl,
          videoProvider: s.videoProvider || '',
          caption: s.caption || '',
          overlayHeading: s.overlayHeading || '',
          overlayText: s.overlayText || '',
          linkUrl: s.linkUrl || '',
          _existing: true,
        })),
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [editing, id, hydrateFromServer]);

  useEffect(() => { load(); }, [load]);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  // ─── Slide helpers ──────────────────────────────────────────────────────

  const addImageSlide = (file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setForm((s) => ({
      ...s,
      slides: [...s.slides, {
        mediaType: 'image',
        mediaUrl: previewUrl,
        _file: file,
        _previewUrl: previewUrl,
        caption: '',
        overlayHeading: '',
        overlayText: '',
        linkUrl: '',
      }],
    }));
  };

  const addVideoSlideUrl = (url) => {
    if (!url?.trim()) return;
    setForm((s) => ({
      ...s,
      slides: [...s.slides, {
        mediaType: 'video',
        mediaUrl: url.trim(),
        caption: '',
        overlayHeading: '',
        overlayText: '',
        linkUrl: '',
      }],
    }));
  };

  const addVideoSlideFile = (file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setForm((s) => ({
      ...s,
      slides: [...s.slides, {
        mediaType: 'video',
        mediaUrl: previewUrl,
        _file: file,
        _previewUrl: previewUrl,
        videoProvider: 'mp4',
        caption: '',
        overlayHeading: '',
        overlayText: '',
        linkUrl: '',
      }],
    }));
  };

  const updateSlide = (i, patch) => {
    setForm((s) => {
      const next = [...s.slides];
      next[i] = { ...next[i], ...patch };
      return { ...s, slides: next };
    });
  };

  const removeSlide = (i) => {
    setForm((s) => {
      const next = [...s.slides];
      const removed = next.splice(i, 1)[0];
      if (removed?._previewUrl) URL.revokeObjectURL(removed._previewUrl);
      return { ...s, slides: next };
    });
  };

  const moveSlide = (i, dir) => {
    setForm((s) => {
      const next = [...s.slides];
      const j = i + dir;
      if (j < 0 || j >= next.length) return s;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...s, slides: next };
    });
  };

  // ─── Submit ─────────────────────────────────────────────────────────────

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return toast.error('Banner name is required');
    if (form.slides.length === 0) return toast.error('Add at least one slide');

    // Build slides payload — for new uploads, use __file:N__ placeholder
    const fd = new FormData();
    let fileIdx = 0;
    const slidesPayload = form.slides.map((s) => {
      if (s._file) {
        fd.append('media', s._file);
        const placeholder = `__file:${fileIdx}__`;
        fileIdx += 1;
        return {
          mediaType: s.mediaType,
          mediaUrl: placeholder,
          videoProvider: s.videoProvider || undefined,
          caption: s.caption,
          overlayHeading: s.overlayHeading,
          overlayText: s.overlayText,
          linkUrl: s.linkUrl,
        };
      }
      return {
        mediaType: s.mediaType,
        mediaUrl: s.mediaUrl,
        videoProvider: s.videoProvider || undefined,
        caption: s.caption,
        overlayHeading: s.overlayHeading,
        overlayText: s.overlayText,
        linkUrl: s.linkUrl,
      };
    });

    // Scalar fields
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'slides') return;
      if (v === undefined || v === null) return;
      fd.append(k, v);
    });
    fd.append('slides', JSON.stringify(slidesPayload));

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/promo-banners/${id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Banner saved');
        clearDraft();
      } else {
        const res = await api.post('/promo-banners', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Banner created');
        clearDraft();
        navigate(`/admin/promo-banners/${res.data.data.banner.id}/edit`, { replace: true });
        return;
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isVideoBanner = form.type === 'video-single' || form.type === 'video-carousel';
  const isCarousel = form.type === 'image-carousel' || form.type === 'video-carousel';

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/promo-banners" className="p-2 rounded-lg hover:bg-surface-alt">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-display font-bold">
            {editing ? 'Edit Banner' : 'New Promo Banner'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <button
              type="button"
              onClick={() => {
                if (!confirm('Discard unsaved draft and reload from the server?')) return;
                discardDraft();
                if (editing) load();
              }}
              className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100"
            >
              Discard draft
            </button>
          )}
          <button disabled={submitting} className="btn-primary">
            <Save size={16} /> {submitting ? 'Saving…' : 'Save banner'}
          </button>
        </div>
      </div>

      {/* Basic */}
      <Section icon={Settings} title="Banner settings">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
          <div className="sm:col-span-2">
            <label className="label">Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => change('name', e.target.value)}
              placeholder="Admin label — e.g. Diwali offers carousel"
              required
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => change('type', e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Page</label>
            <select className="input" value={form.page} onChange={(e) => change('page', e.target.value)}>
              {PAGES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Position on page</label>
            <select className="input" value={form.position} onChange={(e) => change('position', e.target.value)}>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Width mode</label>
            <select className="input" value={form.widthMode} onChange={(e) => change('widthMode', e.target.value)}>
              {WIDTH_MODES.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Height (px)</label>
            <input
              type="number" min={120} step={20} className="input"
              value={form.heightPx}
              onChange={(e) => change('heightPx', parseInt(e.target.value || 360, 10))}
            />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input
              type="number" className="input"
              value={form.sortOrder}
              onChange={(e) => change('sortOrder', parseInt(e.target.value || 0, 10))}
            />
          </div>
          {isCarousel && (
            <>
              <div>
                <label className="label">Auto-play</label>
                <label className="flex items-center gap-2 input cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.autoplay}
                    onChange={(e) => change('autoplay', e.target.checked)}
                  />
                  <span className="text-sm">Cycle automatically</span>
                </label>
              </div>
              <div>
                <label className="label">Interval (ms)</label>
                <input
                  type="number" min={1000} step={500} className="input"
                  value={form.intervalMs}
                  onChange={(e) => change('intervalMs', parseInt(e.target.value || 5000, 10))}
                />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) => change('isActive', e.target.checked)}
              />
              Active / visible on site
            </label>
          </div>
        </div>
      </Section>

      {/* Overlay text — only for image-text (also generally useful for any banner) */}
      {form.type === 'image-text' && (
        <Section icon={Settings} title="Overlay text" subtitle="Shown over the banner — leave blank to hide">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
            <div className="sm:col-span-2">
              <label className="label">Heading</label>
              <input
                className="input"
                value={form.heading}
                onChange={(e) => change('heading', e.target.value)}
                placeholder="Leh & Ladakh"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input" rows={2}
                value={form.description}
                onChange={(e) => change('description', e.target.value)}
              />
            </div>
            <div>
              <label className="label">CTA label</label>
              <input
                className="input"
                value={form.ctaLabel}
                onChange={(e) => change('ctaLabel', e.target.value)}
                placeholder="Explore now"
              />
            </div>
            <div>
              <label className="label">CTA URL</label>
              <input
                className="input"
                value={form.ctaUrl}
                onChange={(e) => change('ctaUrl', e.target.value)}
                placeholder="/retreats or https://…"
              />
            </div>
          </div>
        </Section>
      )}

      {/* Slides */}
      <Section
        icon={isVideoBanner ? Film : ImageIcon}
        title="Slides"
        subtitle={`Add ${isCarousel ? 'multiple slides' : 'one slide'} (${isVideoBanner ? 'videos' : 'images'}). Drag to reorder.`}
      >
        <SlideAdder
          isVideo={isVideoBanner}
          onAddImage={addImageSlide}
          onAddVideoUrl={addVideoSlideUrl}
          onAddVideoFile={addVideoSlideFile}
        />

        <div className="space-y-3 mt-2">
          {form.slides.length === 0 ? (
            <p className="text-xs text-ink-muted italic text-center py-6">No slides yet — use the controls above to add one.</p>
          ) : form.slides.map((s, i) => (
            <SlideRow
              key={i}
              index={i}
              slide={s}
              total={form.slides.length}
              onUpdate={(patch) => updateSlide(i, patch)}
              onRemove={() => removeSlide(i)}
              onMoveUp={() => moveSlide(i, -1)}
              onMoveDown={() => moveSlide(i, +1)}
              showOverlayFields={form.type === 'image-text'}
            />
          ))}
        </div>
      </Section>

      <div className="sticky bottom-0 bg-surface/95 backdrop-blur border-t -mx-6 px-6 py-4 flex justify-end gap-2">
        <Link to="/admin/promo-banners" className="btn-ghost">Cancel</Link>
        <button disabled={submitting} className="btn-primary">
          <Save size={16} /> {submitting ? 'Saving…' : 'Save banner'}
        </button>
      </div>
    </form>
  );
}

/* ─── Slide adder ─── */

function SlideAdder({ isVideo, onAddImage, onAddVideoUrl, onAddVideoFile }) {
  const [videoUrl, setVideoUrl] = useState('');
  const imageInputRef = useRef();
  const videoFileRef = useRef();

  if (isVideo) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-surface-alt/50 p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-ink-muted">Add video by URL</label>
          <div className="flex gap-2 mt-1">
            <input
              className="input flex-1"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/… or https://vimeo.com/…"
            />
            <button
              type="button"
              onClick={() => { onAddVideoUrl(videoUrl); setVideoUrl(''); }}
              className="btn-outline text-sm"
            >
              <Plus size={14} /> Add URL
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 border-t" />
          <span className="text-[11px] text-ink-muted">or</span>
          <div className="flex-1 border-t" />
        </div>
        <div>
          <input
            ref={videoFileRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAddVideoFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => videoFileRef.current?.click()}
            className="btn-outline text-sm w-full"
          >
            <Film size={14} /> Upload MP4 file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-surface-alt/50 p-4">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          Array.from(e.target.files || []).forEach(onAddImage);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => imageInputRef.current?.click()}
        className="btn-outline text-sm w-full"
      >
        <Plus size={14} /> Upload image{`(${isVideo ? ' / video' : 's'})`}
      </button>
    </div>
  );
}

/* ─── Slide row ─── */

function SlideRow({ slide, index, total, onUpdate, onRemove, onMoveUp, onMoveDown, showOverlayFields }) {
  const isImage = slide.mediaType === 'image';
  const previewUrl = slide._previewUrl
    || (slide.mediaUrl?.startsWith('blob:') ? slide.mediaUrl : fileUrl(slide.mediaUrl));

  return (
    <div className="border rounded-xl p-3 bg-white flex gap-3">
      <div className="flex flex-col items-center gap-1 pt-1 text-ink-muted">
        <GripVertical size={14} />
        <button type="button" onClick={onMoveUp} disabled={index === 0} className="disabled:opacity-30 hover:text-brand">
          <ChevronUp size={14} />
        </button>
        <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="disabled:opacity-30 hover:text-brand">
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
        {isImage ? (
          previewUrl ? (
            <img src={previewUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-ink-muted" />
          )
        ) : (
          <Film size={28} className="text-ink-muted" />
        )}
      </div>

      <div className="flex-1 grid sm:grid-cols-2 gap-3">
        {!isImage && (
          <div className="sm:col-span-2">
            <label className="text-[11px] font-medium text-ink-muted">Video URL</label>
            <input
              className="input text-sm h-9"
              value={slide.mediaUrl}
              onChange={(e) => onUpdate({ mediaUrl: e.target.value })}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="text-[11px] font-medium text-ink-muted">Caption</label>
          <input
            className="input text-sm h-9"
            value={slide.caption || ''}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Optional caption"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink-muted flex items-center gap-1">
            <LinkIcon size={11} /> Click-through URL
          </label>
          <input
            className="input text-sm h-9"
            value={slide.linkUrl || ''}
            onChange={(e) => onUpdate({ linkUrl: e.target.value })}
            placeholder="/retreats, https://…"
          />
        </div>
        {showOverlayFields && (
          <>
            <div>
              <label className="text-[11px] font-medium text-ink-muted">Overlay heading</label>
              <input
                className="input text-sm h-9"
                value={slide.overlayHeading || ''}
                onChange={(e) => onUpdate({ overlayHeading: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-ink-muted">Overlay text</label>
              <textarea
                className="input text-sm"
                rows={2}
                value={slide.overlayText || ''}
                onChange={(e) => onUpdate({ overlayText: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="p-2 h-9 text-red-600 hover:bg-red-50 rounded-lg self-start"
        title="Remove slide"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
