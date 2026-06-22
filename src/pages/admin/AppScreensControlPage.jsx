import { useEffect, useRef, useState } from 'react';
import { Smartphone, Save, Upload, Loader2 } from 'lucide-react';
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
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save
        </button>
        {!!msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
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
