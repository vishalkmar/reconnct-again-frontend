import { useEffect, useState, useCallback } from 'react';
import {
  Save, Image as ImageIcon, LayoutGrid, BedDouble, MountainSnow, PartyPopper,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import Dropzone from '../../components/admin/Dropzone.jsx';

const TAB_META = {
  all:       { defaultIcon: LayoutGrid, color: 'from-brand to-wellness' },
  hotels:    { defaultIcon: BedDouble, color: 'from-sky-500 to-indigo-500' },
  packages:  { defaultIcon: MountainSnow, color: 'from-emerald-500 to-teal-600' },
  events:    { defaultIcon: PartyPopper, color: 'from-amber-500 to-orange-500' },
};

export default function FeaturedTabsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/featured-tabs');
      setItems(res.data.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Featured Retreats Tabs</h1>
        <p className="text-ink-muted text-sm">
          Customise the four tabs (All, Hotels, Packages, Events) shown in the homepage Featured Retreats section.
          Upload a banner image and tweak the headline for each.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {items.map((it) => (
            <FeaturedTabCard key={it.id} tab={it} onSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedTabCard({ tab, onSaved }) {
  const meta = TAB_META[tab.tabKey] || TAB_META.all;
  const Icon = meta.defaultIcon;
  const [form, setForm] = useState({
    label: tab.label || '',
    sublabel: tab.sublabel || '',
    headline: tab.headline || '',
    subheadline: tab.subheadline || '',
    isActive: tab.isActive !== false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [clearImage, setClearImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, typeof v === 'boolean' ? String(v) : (v || '')));
      if (imageFile) fd.append('image', imageFile);
      if (clearImage) fd.append('clearImage', 'true');
      await api.put(`/featured-tabs/${tab.tabKey}`, fd);
      toast.success('Saved');
      setImageFile(null);
      setClearImage(false);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={save} className="card overflow-hidden">
      <div className={`relative bg-gradient-to-br ${meta.color} text-white px-5 py-6 flex items-center gap-3`}>
        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
          <Icon size={22} />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest opacity-80">Tab key</div>
          <div className="font-display font-bold text-xl capitalize">{tab.tabKey}</div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Label</label>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. All"
            />
          </div>
          <div>
            <label className="label">Sub-label</label>
            <input
              className="input"
              value={form.sublabel}
              onChange={(e) => setForm({ ...form, sublabel: e.target.value })}
              placeholder="e.g. Everything"
            />
          </div>
        </div>

        <div>
          <label className="label">Headline (shown above tab content)</label>
          <input
            className="input"
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
            placeholder="Tab section headline"
          />
        </div>

        <div>
          <label className="label">Subheadline</label>
          <textarea
            rows={2}
            className="input"
            value={form.subheadline}
            onChange={(e) => setForm({ ...form, subheadline: e.target.value })}
            placeholder="One-line tagline shown under the headline"
          />
        </div>

        <div>
          <label className="label flex items-center gap-1"><ImageIcon size={12} /> Banner image</label>
          <Dropzone
            accept="image/*"
            value={imageFile}
            onChange={setImageFile}
            existingUrl={!clearImage && tab.imageUrl ? fileUrl(tab.imageUrl) : ''}
            onClearExisting={() => setClearImage(true)}
            placeholder="Upload banner image"
            subLabel="Wide-format works best (1600×600 or similar)"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Tab is active on the homepage
        </label>

        <div className="flex justify-end">
          <button type="submit" disabled={submitting} className="btn-primary text-sm">
            <Save size={14} /> {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
}
