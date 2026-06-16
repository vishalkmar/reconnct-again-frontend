import { useEffect, useState } from 'react';
import {
  Save, Plus, Trash2, Sparkles, Type, Link2, Image as ImageIcon,
  MessageCircle, Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Dropzone from '../../components/admin/Dropzone.jsx';

// Icons the admin can choose for the quick-link cards (must match the
// frontend ICON_MAP in PersonalisedRecommendationCTA.jsx).
const QUICK_ICON_CHOICES = [
  'PackageOpen', 'BedDouble', 'CalendarDays', 'Sparkles',
  'Heart', 'MessageCircle', 'MapPin', 'Award', 'Star', 'Compass',
];

const BLANK = {
  heading: '',
  subheading: '',
  primaryCtaLabel: '',
  primaryCtaUrl: '',
  whatsappCtaLabel: '',
  whatsappUrl: '',
  liveMatchTitle: '',
  liveMatchSubtitle: '',
  topRatedTitle: '',
  topRatedSubtitle: '',
  bottomBadgeTitle: '',
  bottomBadgeSubtitle: '',
  ringBadgeText: '',
  ringBadgeLabel: '',
  quickLinks: [],
};

function Section({ icon: Icon, title, hint, children }) {
  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="font-display font-semibold">{title}</h3>
          {hint && <p className="text-xs text-ink-muted mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function QuickLinksEditor({ items, onChange }) {
  const update = (i, key, value) => {
    const next = items.map((q, idx) => (idx === i ? { ...q, [key]: value } : q));
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([
    ...items,
    { label: '', tooltip: '', url: '', icon: QUICK_ICON_CHOICES[0] },
  ]);

  return (
    <div className="space-y-3">
      {items.map((q, i) => (
        <div key={i} className="border rounded-xl p-3 space-y-2 bg-surface-alt/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              className="input"
              value={q.label}
              placeholder="Label (e.g. Top packages)"
              onChange={(e) => update(i, 'label', e.target.value)}
            />
            <input
              className="input"
              value={q.url}
              placeholder="URL (e.g. /retreats)"
              onChange={(e) => update(i, 'url', e.target.value)}
            />
            <select
              className="input"
              value={q.icon || QUICK_ICON_CHOICES[0]}
              onChange={(e) => update(i, 'icon', e.target.value)}
            >
              {QUICK_ICON_CHOICES.map((ic) => (
                <option key={ic} value={ic}>{ic}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={q.tooltip}
              placeholder="Tooltip text shown on hover"
              onChange={(e) => update(i, 'tooltip', e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
              title="Remove"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-sm text-brand font-semibold hover:underline"
      >
        <Plus size={14} /> Add quick link
      </button>
      {items.length >= 6 && (
        <p className="text-xs text-amber-700">Up to 6 quick links — extras are ignored on save.</p>
      )}
    </div>
  );
}

export default function PersonalisedRecommendationPage() {
  const [form, setForm] = useState(BLANK);
  const [imageFile, setImageFile] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/personalised-recommendation');
      const cfg = res.data?.data?.personalisedRecommendation || {};
      setForm({
        heading: cfg.heading || '',
        subheading: cfg.subheading || '',
        primaryCtaLabel: cfg.primaryCtaLabel || '',
        primaryCtaUrl: cfg.primaryCtaUrl || '',
        whatsappCtaLabel: cfg.whatsappCtaLabel || '',
        whatsappUrl: cfg.whatsappUrl || '',
        liveMatchTitle: cfg.liveMatchTitle || '',
        liveMatchSubtitle: cfg.liveMatchSubtitle || '',
        topRatedTitle: cfg.topRatedTitle || '',
        topRatedSubtitle: cfg.topRatedSubtitle || '',
        bottomBadgeTitle: cfg.bottomBadgeTitle || '',
        bottomBadgeSubtitle: cfg.bottomBadgeSubtitle || '',
        ringBadgeText: cfg.ringBadgeText || '',
        ringBadgeLabel: cfg.ringBadgeLabel || '',
        quickLinks: cfg.quickLinks || [],
      });
      setExistingImage(cfg.centerImageUrl || null);
      setImageFile(null);
      setRemoveImage(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'quickLinks') fd.append(k, JSON.stringify(v));
      else fd.append(k, v ?? '');
    });
    if (imageFile) fd.append('centerImage', imageFile);
    if (removeImage && !imageFile) fd.append('removeCenterImage', 'true');

    setSaving(true);
    try {
      await api.put('/personalised-recommendation', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Section saved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Personalised retreat CTA</h1>
          <p className="text-ink-muted text-sm">
            The “Not sure which retreat is perfect for you?” block on the home page —
            heading, copy, image and quick-link cards.
          </p>
        </div>
        <button disabled={saving} className="btn-primary">
          <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <Section icon={Type} title="Headline & copy" hint="Defaults stay shown if you leave a field blank.">
        <div>
          <label className="label">Heading</label>
          <input
            className="input"
            value={form.heading}
            onChange={(e) => change('heading', e.target.value)}
            placeholder="Not sure which retreat is perfect for you?"
          />
        </div>
        <div>
          <label className="label">Subheading</label>
          <textarea
            className="input"
            rows={3}
            value={form.subheading}
            onChange={(e) => change('subheading', e.target.value)}
            placeholder="Tell us your mood…"
          />
        </div>
      </Section>

      <Section icon={Link2} title="Call-to-action buttons">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Primary CTA label</label>
            <input
              className="input"
              value={form.primaryCtaLabel}
              onChange={(e) => change('primaryCtaLabel', e.target.value)}
              placeholder="Get personalised recommendations"
            />
          </div>
          <div>
            <label className="label">Primary CTA URL</label>
            <input
              className="input"
              value={form.primaryCtaUrl}
              onChange={(e) => change('primaryCtaUrl', e.target.value)}
              placeholder="/retreats"
            />
          </div>
          <div>
            <label className="label">WhatsApp button label</label>
            <input
              className="input"
              value={form.whatsappCtaLabel}
              onChange={(e) => change('whatsappCtaLabel', e.target.value)}
              placeholder="WhatsApp expert"
            />
          </div>
          <div>
            <label className="label">WhatsApp URL (wa.me link)</label>
            <input
              className="input"
              value={form.whatsappUrl}
              onChange={(e) => change('whatsappUrl', e.target.value)}
              placeholder="https://wa.me/?text=…"
            />
          </div>
        </div>
      </Section>

      <Section icon={ImageIcon} title="Center image" hint="The circular image in the spinning rings.">
        <Dropzone
          accept="image/*"
          value={imageFile}
          onChange={(f) => { setImageFile(f); if (f) setRemoveImage(false); }}
          existingUrl={!removeImage ? existingImage : null}
          placeholder={existingImage ? 'Drag a new image to replace, or click' : 'Drag & drop an image, or click'}
        />
        {existingImage && !imageFile && (
          <label className="flex items-center gap-2 text-xs text-ink-muted mt-2">
            <input
              type="checkbox"
              checked={removeImage}
              onChange={(e) => setRemoveImage(e.target.checked)}
            />
            Remove existing image (fall back to the default)
          </label>
        )}
      </Section>

      <Section
        icon={Sparkles}
        title="Quick-link cards"
        hint="The three small cards under the CTAs. Tooltip text shows on hover."
      >
        <QuickLinksEditor
          items={form.quickLinks}
          onChange={(v) => change('quickLinks', v)}
        />
      </Section>

      <Section icon={Award} title="Floating badges" hint="The small overlay cards floating around the image.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">“Live match” title</label>
            <input className="input" value={form.liveMatchTitle} onChange={(e) => change('liveMatchTitle', e.target.value)} />
          </div>
          <div>
            <label className="label">“Live match” subtitle</label>
            <input className="input" value={form.liveMatchSubtitle} onChange={(e) => change('liveMatchSubtitle', e.target.value)} />
          </div>
          <div>
            <label className="label">“Top rated” title</label>
            <input className="input" value={form.topRatedTitle} onChange={(e) => change('topRatedTitle', e.target.value)} />
          </div>
          <div>
            <label className="label">“Top rated” subtitle</label>
            <input className="input" value={form.topRatedSubtitle} onChange={(e) => change('topRatedSubtitle', e.target.value)} />
          </div>
          <div>
            <label className="label">Bottom badge title</label>
            <input className="input" value={form.bottomBadgeTitle} onChange={(e) => change('bottomBadgeTitle', e.target.value)} />
          </div>
          <div>
            <label className="label">Bottom badge subtitle</label>
            <input className="input" value={form.bottomBadgeSubtitle} onChange={(e) => change('bottomBadgeSubtitle', e.target.value)} />
          </div>
          <div>
            <label className="label">Ring badge — big text</label>
            <input className="input" value={form.ringBadgeText} onChange={(e) => change('ringBadgeText', e.target.value)} placeholder="10+" />
          </div>
          <div>
            <label className="label">Ring badge — small label</label>
            <input className="input" value={form.ringBadgeLabel} onChange={(e) => change('ringBadgeLabel', e.target.value)} placeholder="wellness filters" />
          </div>
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end mt-6">
        <button disabled={saving} className="btn-primary shadow-card">
          <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
