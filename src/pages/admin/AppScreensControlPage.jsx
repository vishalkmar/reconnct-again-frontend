import { useEffect, useRef, useState } from 'react';
import {
  Smartphone, Save, Upload, Loader2, Plus, Trash2, Image as ImageIcon, Link2, ArrowRight, ChevronUp, ChevronDown,
} from 'lucide-react';
import api from '../../services/api.js';

/**
 * App Screens Control — admin edits the text + media shown on the mobile app's
 * Login / OTP screens. Saved under SiteSetting `app_screen_login` and read by
 * the app via /api/public/app-screen/login.
 */
const TEXT_FIELDS = [
  { key: 'brandTitle', label: 'Brand title' },
  { key: 'tagline', label: 'Tagline' },
  { key: 'headline', label: 'Headline (Login)' },
  { key: 'subtitle', label: 'Subtitle (Login)' },
  { key: 'emailPlaceholder', label: 'Email placeholder' },
  { key: 'buttonText', label: 'Button text' },
  { key: 'legal', label: 'Legal line' },
  { key: 'otpHeadline', label: 'Headline (OTP)' },
  { key: 'otpSubtitle', label: 'Subtitle (OTP)' },
  { key: 'secureText', label: 'Secure note (OTP)' },
];

export default function AppScreensControlPage() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/admin/app-screens/login')
      .then((r) => setContent(r.data.data.content))
      .catch(() => setMsg('Could not load — are you signed in as admin?'))
      .finally(() => setLoading(false));
  }, []);

  const setField = (k, v) => setContent((c) => ({ ...c, [k]: v }));
  const setMedia = (mediaKey, patch) => setContent((c) => ({ ...c, [mediaKey]: { ...(c[mediaKey] || {}), ...patch } }));

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const r = await api.put('/admin/app-screens/login', content);
      setContent(r.data.data.content);
      setMsg('Saved ✓ — changes appear in the app on next open.');
    } catch (e) {
      setMsg(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!content) return <div className="p-8 text-red-600">{msg}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-1">
        <Smartphone className="text-amber-500" />
        <h1 className="text-2xl font-bold">App Screens Control</h1>
      </div>
      <p className="text-gray-500 mb-6">Edit the content &amp; media of the mobile app’s Login / OTP screens.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Text */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-lg">Login Screen — text</h2>
          {TEXT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-600 mb-1">{f.label}</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={content[f.key] || ''}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Media */}
        <div className="space-y-6">
          <MediaEditor title="Login hero media" mediaKey="heroMedia" media={content.heroMedia} onChange={setMedia} />
          <MediaEditor title="OTP hero media" mediaKey="otpMedia" media={content.otpMedia} onChange={setMedia} />
        </div>
      </div>

      <div className="flex items-center gap-4 mt-6">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2.5 rounded-lg disabled:opacity-60">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save login screen
        </button>
        {!!msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>

      <OfferBanners />
    </div>
  );
}

function OfferBanners() {
  const [banners, setBanners] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Published experiences, for the "link to an experience" shortcut.
  const [experiences, setExperiences] = useState([]);

  useEffect(() => {
    api.get('/admin/app-screens/offer-banners')
      .then((r) => setBanners(r.data.data.banners || []))
      .catch(() => {});
    api.get('/public/experiences')
      .then((r) => setExperiences(r.data?.data?.items || []))
      .catch(() => {});
  }, []);

  const add = () => setBanners((b) => [...b, {
    id: Date.now(), type: 'image_text', active: true, image: '',
    badge: 'Featured experience', title: '', subtitle: '', ctaText: 'Explore Experience', ctaLink: '',
  }]);
  const set = (i, patch) => setBanners((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i) => setBanners((b) => b.filter((_, idx) => idx !== i));
  const move = (i, dir) => setBanners((b) => {
    const j = i + dir;
    if (j < 0 || j >= b.length) return b;
    const next = [...b];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await api.put('/admin/app-screens/offer-banners', { banners });
      setMsg('Saved ✓');
    } catch (e) { setMsg(e.response?.data?.message || 'Save failed'); } finally { setSaving(false); }
  };

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-1">
        <ImageIcon className="text-amber-500" />
        <h2 className="text-xl font-bold">Offer Banners</h2>
      </div>
      <p className="text-gray-500 mb-4">
        The featured carousel under the hero on the <b>website Home</b> and the advert carousel on the <b>Android app Home</b>.
        “Image + text” shows the badge, title, subtitle and button over the photo; “Image only” shows just the photo.
        Clicking the banner (or its button) opens the <b>Redirect URL</b>.
      </p>

      <div className="space-y-4">
        {banners.map((b, i) => (
          <div key={b.id || i} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                <select className="border rounded-lg px-3 py-1.5" value={b.type} onChange={(e) => set(i, { type: e.target.value })}>
                  <option value="image_text">Image + text</option>
                  <option value="image">Image only</option>
                </select>
                <label className="inline-flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={b.active !== false} onChange={(e) => set(i, { active: e.target.checked })} /> Active
                </label>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up" className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronUp size={16} /></button>
                <button onClick={() => move(i, 1)} disabled={i === banners.length - 1} title="Move down" className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronDown size={16} /></button>
                <button onClick={() => remove(i)} className="ml-2 text-red-500 inline-flex items-center gap-1 text-sm"><Trash2 size={15} /> Remove</button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <BannerImage value={b.image} onChange={(url) => set(i, { image: url })} />
                <p className="text-xs text-gray-400 mt-1">Wide photo works best (about 1600 × 460 px or wider).</p>
              </div>
              <div className="space-y-2">
                {b.type === 'image_text' && (
                  <>
                    <Field label="Badge text" hint="Small pill above the title, e.g. FEATURED EXPERIENCE">
                      <input className="w-full border rounded-lg px-3 py-2" placeholder="Featured experience" value={b.badge || ''} onChange={(e) => set(i, { badge: e.target.value })} />
                    </Field>
                    <Field label="Title">
                      <input className="w-full border rounded-lg px-3 py-2" placeholder="Family Fun at the Water Park" value={b.title || ''} onChange={(e) => set(i, { title: e.target.value })} />
                    </Field>
                    <Field label="Subtitle">
                      <textarea rows={2} className="w-full border rounded-lg px-3 py-2" placeholder="Splash, play and create unforgettable memories with your loved ones." value={b.subtitle || ''} onChange={(e) => set(i, { subtitle: e.target.value })} />
                    </Field>
                    <Field label="Button text">
                      <input className="w-full border rounded-lg px-3 py-2" placeholder="Explore Experience" value={b.ctaText || ''} onChange={(e) => set(i, { ctaText: e.target.value })} />
                    </Field>
                  </>
                )}
                <Field label="Redirect URL (on click)" hint="A page on this site like /experiences/my-deal, or a full https:// link (opens in a new tab).">
                  <div className="flex items-center gap-2">
                    <Link2 size={16} className="text-gray-400 shrink-0" />
                    <input className="w-full border rounded-lg px-3 py-2" placeholder="/experiences/pixyland-20-vr-gaming-experience" value={b.ctaLink || ''} onChange={(e) => set(i, { ctaLink: e.target.value })} />
                  </div>
                </Field>
                {experiences.length > 0 && (
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-600"
                    value=""
                    onChange={(e) => {
                      const exp = experiences.find((x) => String(x.id) === e.target.value);
                      if (exp) set(i, { ctaLink: `/experiences/${exp.slug || exp.id}` });
                    }}
                  >
                    <option value="">…or pick an experience to link to</option>
                    {experiences.map((x) => <option key={x.id} value={x.id}>{x.name}{x.city ? ` — ${x.city}` : ''}</option>)}
                  </select>
                )}
              </div>
            </div>
            {b.image && <BannerPreview banner={b} />}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-4">
        <button onClick={add} className="inline-flex items-center gap-2 border rounded-lg px-4 py-2 text-sm hover:bg-gray-50"><Plus size={16} /> Add banner</button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2.5 rounded-lg disabled:opacity-60">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save banners
        </button>
        {!!msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

// Small live preview of how the banner reads on the website.
function BannerPreview({ banner: b }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold text-gray-500 mb-1.5">Website preview</div>
      <div className="relative h-44 rounded-2xl overflow-hidden bg-gray-800">
        <img src={b.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        {b.type === 'image_text' && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 max-w-[60%] text-white">
              {b.badge && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 border border-white/25 text-[9px] font-semibold tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />{b.badge}
                </span>
              )}
              {b.title && <div className="text-xl font-black leading-tight mt-2 line-clamp-2">{b.title}</div>}
              {b.subtitle && <div className="text-xs mt-1 opacity-90 line-clamp-2">{b.subtitle}</div>}
              {b.ctaText && (
                <span className="mt-2 inline-flex items-center gap-1 bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full">{b.ctaText} <ArrowRight size={12} /></span>
              )}
            </div>
          </>
        )}
        <span className="absolute right-3 bottom-3 text-[10px] bg-white/90 text-gray-700 px-2 py-0.5 rounded-full max-w-[60%] truncate">
          → {b.ctaLink || '/experiences (default)'}
        </span>
      </div>
    </div>
  );
}

function BannerImage({ value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/uploads/inline', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(r.data.data.url);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };
  return (
    <div>
      <input className="w-full border rounded-lg px-3 py-2 mb-2" placeholder="Image URL" value={value || ''} onChange={(e) => onChange(e.target.value)} />
      <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 border rounded-lg px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60">
        {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Upload
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      {value && <img src={value} alt="" className="mt-2 w-full h-32 object-cover rounded-lg border" />}
    </div>
  );
}

function MediaEditor({ title, mediaKey, media = {}, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const type = media.type || 'image';

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/uploads/inline', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(mediaKey, { url: r.data.data.url });
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <div className="bg-white rounded-xl border p-5">
      <h2 className="font-semibold text-lg mb-3">{title}</h2>
      <div className="flex gap-3 mb-3">
        <select className="border rounded-lg px-3 py-2" value={type} onChange={(e) => onChange(mediaKey, { type: e.target.value })}>
          <option value="image">Image</option>
          <option value="gif">GIF</option>
          <option value="video">Video</option>
        </select>
        <input className="flex-1 border rounded-lg px-3 py-2" placeholder="Media URL"
          value={media.url || ''} onChange={(e) => onChange(mediaKey, { url: e.target.value })} />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-2 border rounded-lg px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60">
          {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Upload image
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        <span className="text-xs text-gray-400">Image uploads here; for GIF/video paste a URL.</span>
      </div>
      {media.url && type !== 'video' && (
        <img src={media.url} alt="" className="mt-3 w-full h-40 object-cover rounded-lg border" />
      )}
    </div>
  );
}
