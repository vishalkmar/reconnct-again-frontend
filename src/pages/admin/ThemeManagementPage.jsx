import { useEffect, useState } from 'react';
import { Save, RotateCcw, Eye, Palette, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext.jsx';
import { rgbToHex, hexToRgb } from '../../utils/color.js';

const COLOR_GROUPS = [
  {
    title: 'Brand (primary blue)',
    description: 'Used for primary CTAs, links and brand highlights.',
    keys: [
      { key: 'brand', label: 'Brand' },
      { key: 'brandLight', label: 'Brand light' },
      { key: 'brandDark', label: 'Brand dark' },
    ],
  },
  {
    title: 'Wellness (green)',
    description: 'Used for wellness-only sections (yoga, ayurveda, detox).',
    keys: [
      { key: 'wellness', label: 'Wellness' },
      { key: 'wellnessLight', label: 'Wellness light' },
      { key: 'wellnessDark', label: 'Wellness dark' },
    ],
  },
  {
    title: 'Accent & text',
    description: 'Highlights, body text and muted text.',
    keys: [
      { key: 'accent', label: 'Accent (stars)' },
      { key: 'ink', label: 'Body text' },
      { key: 'inkMuted', label: 'Muted text' },
    ],
  },
  {
    title: 'Surfaces',
    description: 'Page and section backgrounds.',
    keys: [
      { key: 'surface', label: 'Surface' },
      { key: 'surfaceAlt', label: 'Surface alt' },
    ],
  },
];

export default function ThemeManagementPage() {
  const { theme, replaceTheme, previewTheme, defaultTheme } = useTheme();
  const [draft, setDraft] = useState(theme);
  const [presets, setPresets] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(theme);
  }, [theme]);

  useEffect(() => {
    api.get('/theme/presets')
      .then((res) => setPresets(res.data?.data?.presets || []))
      .catch(() => {});
  }, []);

  const change = (key, hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    setDraft((d) => {
      const next = { ...d, [key]: rgb };
      previewTheme(next);
      return next;
    });
  };

  const applyPreset = (preset) => {
    setDraft(preset.theme);
    previewTheme(preset.theme);
    toast.success(`Previewing: ${preset.name}`);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/theme', { theme: draft });
      replaceTheme(res.data.data.theme);
      toast.success('Theme saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm('Reset to default theme?')) return;
    try {
      const res = await api.post('/theme/reset');
      replaceTheme(res.data.data.theme);
      setDraft(res.data.data.theme);
      toast.success('Theme reset');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    }
  };

  const cancelPreview = () => {
    setDraft(theme);
    previewTheme(theme);
  };

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(theme);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Palette className="text-brand" /> Theme Manager
          </h1>
          <p className="text-ink-muted text-sm">
            Live-preview and save the colors of your entire site.
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <button onClick={cancelPreview} className="btn-ghost">
              <Eye size={16} /> Discard preview
            </button>
          )}
          <button onClick={reset} className="btn-ghost">
            <RotateCcw size={16} /> Reset to default
          </button>
          <button onClick={save} disabled={saving || !hasChanges} className="btn-primary">
            <Save size={16} /> {saving ? 'Saving…' : 'Save theme'}
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="card p-6 mb-6">
        <h3 className="font-display font-semibold mb-1">Presets</h3>
        <p className="text-sm text-ink-muted mb-4">
          Click a preset to instantly preview. Save to apply for everyone.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {presets.map((p) => {
            const active = JSON.stringify(p.theme) === JSON.stringify(draft);
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`text-left p-4 rounded-xl border-2 transition relative ${
                  active ? 'border-brand shadow-soft' : 'border-slate-200 hover:border-brand/50'
                }`}
              >
                <div className="flex gap-1.5 mb-3">
                  {[p.theme.brand, p.theme.wellness, p.theme.accent, p.theme.brandDark, p.theme.wellnessDark].map((c, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border border-white shadow-sm"
                      style={{ background: `rgb(${c})` }}
                    />
                  ))}
                </div>
                <div className="font-medium text-sm">{p.name}</div>
                {active && (
                  <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color groups */}
      <div className="grid lg:grid-cols-2 gap-6">
        {COLOR_GROUPS.map((group) => (
          <div key={group.title} className="card p-6">
            <h3 className="font-display font-semibold mb-1">{group.title}</h3>
            <p className="text-sm text-ink-muted mb-4">{group.description}</p>
            <div className="space-y-3">
              {group.keys.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={rgbToHex(draft[key])}
                    onChange={(e) => change(key, e.target.value)}
                    className="w-12 h-12 rounded-lg border cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <code className="text-xs text-ink-muted">
                        {rgbToHex(draft[key]).toUpperCase()} · rgb({draft[key]})
                      </code>
                    </div>
                    <input
                      type="text"
                      value={rgbToHex(draft[key])}
                      onChange={(e) => change(key, e.target.value)}
                      className="input mt-1 font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Live preview block */}
      <div className="card p-6 mt-6">
        <h3 className="font-display font-semibold mb-4">Live preview</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-6 bg-brand text-white rounded-xl">
            <div className="text-xs uppercase tracking-widest opacity-80">Primary</div>
            <div className="text-xl font-bold mt-1">Brand block</div>
            <button className="mt-3 px-4 py-1.5 rounded-full bg-white text-brand font-semibold text-sm">
              Action
            </button>
          </div>
          <div className="p-6 bg-wellness text-white rounded-xl">
            <div className="text-xs uppercase tracking-widest opacity-80">Wellness</div>
            <div className="text-xl font-bold mt-1">Wellness block</div>
            <button className="mt-3 px-4 py-1.5 rounded-full bg-white text-wellness font-semibold text-sm">
              Action
            </button>
          </div>
          <div className="p-6 bg-surface-alt rounded-xl">
            <div className="text-xs uppercase tracking-widest text-ink-muted">Surface alt</div>
            <div className="text-xl font-bold mt-1 text-ink">Heading text</div>
            <p className="text-sm text-ink-muted mt-1">
              Muted body text on surface alt background.
            </p>
          </div>
          <div className="p-6 bg-white rounded-xl border">
            <div className="flex gap-2">
              <button className="btn-primary">Primary</button>
              <button className="btn-wellness">Wellness</button>
              <button className="btn-outline">Outline</button>
            </div>
            <div className="flex items-center gap-1 mt-4 text-accent">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i}>★</span>
              ))}
              <span className="ml-2 text-xs text-ink-muted">accent color</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
