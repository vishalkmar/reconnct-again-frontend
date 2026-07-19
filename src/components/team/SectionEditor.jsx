import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ExperienceTaxonomyPicker from '../admin/ExperienceTaxonomyPicker.jsx';
import StarRatingInput from '../admin/StarRatingInput.jsx';
import RichTextEditor from '../admin/RichTextEditor.jsx';
import Dropzone from '../admin/Dropzone.jsx';
import MediaVideosField from '../admin/MediaVideosField.jsx';
import ExperiencePricing from '../admin/ExperiencePricing.jsx';
import ExperienceInclusions from '../admin/ExperienceInclusions.jsx';
import ExperienceFacilities from '../admin/ExperienceFacilities.jsx';
import ExperienceScheduling from '../admin/ExperienceScheduling.jsx';
import ExperienceTaxPricing from '../admin/ExperienceTaxPricing.jsx';
import { FaqEditor } from '../admin/KeyValueListEditor.jsx';

// The slice of the experience each section edits (initial draft).
const sliceFor = (key, e) => {
  switch (key) {
    case 'basic': return { name: e.name || '', location: e.location || '', city: e.city || '', nearbyLocation: e.nearbyLocation || '', mode: e.mode || 'offline', rating: Number(e.rating) || 0 };
    case 'taxonomy': return { audiences: e.audiences || [], categoryIds: e.categoryIds || [], typeIds: e.typeIds || [] };
    case 'about': return { about: e.about || '' };
    case 'media': return { mainImage: e.mainImage || '', gallery: Array.isArray(e.gallery) ? e.gallery : [], videos: Array.isArray(e.videos) ? e.videos : [] };
    case 'pricing': return { priceMethod: e.priceMethod || 'per_person', pricing: e.pricing || {}, gstRate: Number(e.gstRate) || 0, discount: e.discount || { type: 'percentage', value: 0 }, convenienceFee: e.convenienceFee || { type: 'free', value: 0 } };
    case 'duration': return { pricing: e.pricing || {} };
    case 'schedule': return { schedule: e.schedule && Array.isArray(e.schedule.dates) ? e.schedule : { dates: [] } };
    case 'inclusions': return { inclusions: Array.isArray(e.inclusions) ? e.inclusions : [] };
    case 'facilities': return { facilities: Array.isArray(e.facilities) ? e.facilities : [] };
    case 'nearby': return { nearbyPlaces: Array.isArray(e.nearbyPlaces) ? e.nearbyPlaces : [] };
    case 'faqs': return { faqs: Array.isArray(e.faqs) ? e.faqs : [] };
    case 'policies': return { termsConditions: e.termsConditions || '', privacyPolicy: e.privacyPolicy || '', refundCancellationPolicy: e.refundCancellationPolicy || '' };
    default: return {};
  }
};

const NEARBY_UNITS = [['km', 'km'], ['min', 'min away'], ['hr', 'hrs away']];

function Editor({ sectionKey: key, draft, patch, exp }) {
  switch (key) {
    case 'basic':
      return (
        <div className="space-y-3">
          <div><label className="label">Name</label><input className="input" value={draft.name} onChange={(e) => patch({ name: e.target.value })} /></div>
          <div><label className="label">Location</label><input className="input" value={draft.location} onChange={(e) => patch({ location: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">City</label><input className="input" value={draft.city} onChange={(e) => patch({ city: e.target.value })} /></div>
            <div><label className="label">Nearby location</label><input className="input" value={draft.nearbyLocation} onChange={(e) => patch({ nearbyLocation: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-start">
            <div><label className="label">Mode</label><select className="input" value={draft.mode} onChange={(e) => patch({ mode: e.target.value })}><option value="offline">Offline</option><option value="online">Online</option><option value="hybrid">Hybrid</option></select></div>
            <div><label className="label">Rating</label><StarRatingInput value={draft.rating} onChange={(r) => patch({ rating: r })} /></div>
          </div>
        </div>
      );
    case 'taxonomy':
      return <ExperienceTaxonomyPicker value={{ audiences: draft.audiences, categoryIds: draft.categoryIds, typeIds: draft.typeIds }} onChange={patch} />;
    case 'about':
      return <RichTextEditor value={draft.about} onChange={(v) => patch({ about: v })} placeholder="Describe the experience…" />;
    case 'media':
      return (
        <div className="space-y-5">
          <div><label className="label">Main image</label><Dropzone instant value={draft.mainImage} onChange={(url) => patch({ mainImage: url })} existingUrl={draft.mainImage} onClearExisting={() => patch({ mainImage: '' })} placeholder="Drag & drop the cover image" /></div>
          <div><label className="label">Gallery images</label><Dropzone instant multiple value={draft.gallery} onChange={(urls) => patch({ gallery: urls })} placeholder="Add multiple images" /></div>
          <div><label className="label">Videos</label><MediaVideosField value={draft.videos} onChange={(v) => patch({ videos: v })} /></div>
        </div>
      );
    case 'pricing':
      return (
        <div className="space-y-6">
          <ExperiencePricing priceMethod={draft.priceMethod} pricing={draft.pricing} onChange={patch} />
          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-semibold mb-2">GST, discount &amp; convenience fee</h3>
            <ExperienceTaxPricing gstRate={draft.gstRate} discount={draft.discount} convenienceFee={draft.convenienceFee} basePrice={draft.pricing?.adultPrice || 0} onChange={patch} />
          </div>
        </div>
      );
    case 'duration':
      return (
        <div>
          <label className="label">Each session duration</label>
          <div className="flex items-center gap-2">
            <div className="relative"><input type="number" min={0} className="input w-24 pr-9" value={draft.pricing?.duration?.hours || ''} onChange={(e) => patch({ pricing: { ...draft.pricing, duration: { ...(draft.pricing?.duration || {}), hours: Number(e.target.value) || 0 } } })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">hrs</span></div>
            <div className="relative"><input type="number" min={0} max={59} className="input w-24 pr-9" value={draft.pricing?.duration?.minutes || ''} onChange={(e) => patch({ pricing: { ...draft.pricing, duration: { ...(draft.pricing?.duration || {}), minutes: Math.min(59, Number(e.target.value) || 0) } } })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">min</span></div>
          </div>
        </div>
      );
    case 'schedule':
      return <ExperienceScheduling value={draft.schedule} onChange={(s) => patch({ schedule: s })} durationMinutes={(exp.pricing?.duration?.hours || 0) * 60 + (exp.pricing?.duration?.minutes || 0)} />;
    case 'inclusions':
      return <ExperienceInclusions value={draft.inclusions} onChange={(v) => patch({ inclusions: v })} />;
    case 'facilities':
      return <ExperienceFacilities value={draft.facilities} onChange={(v) => patch({ facilities: v })} />;
    case 'nearby':
      return <NearbyEditor value={draft.nearbyPlaces} onChange={(v) => patch({ nearbyPlaces: v })} />;
    case 'faqs':
      return <FaqEditor value={draft.faqs} onChange={(v) => patch({ faqs: v })} />;
    case 'policies':
      return (
        <div className="space-y-4">
          <div><label className="label">Terms &amp; Conditions</label><RichTextEditor value={draft.termsConditions} onChange={(v) => patch({ termsConditions: v })} minHeight={140} /></div>
          <div><label className="label">Privacy Policy</label><RichTextEditor value={draft.privacyPolicy} onChange={(v) => patch({ privacyPolicy: v })} minHeight={140} /></div>
          <div><label className="label">Refund &amp; Cancellation Policy</label><RichTextEditor value={draft.refundCancellationPolicy} onChange={(v) => patch({ refundCancellationPolicy: v })} minHeight={160} /></div>
        </div>
      );
    default:
      return <div className="text-sm text-ink-muted">This section can’t be edited inline — use the full form.</div>;
  }
}

function NearbyEditor({ value = [], onChange }) {
  const list = Array.isArray(value) ? value : [];
  const norm = (it) => ({ name: it.name || '', distance: it.distance ?? it.distanceKm ?? '', unit: it.unit || 'km' });
  const update = (i, p) => onChange(list.map((it, idx) => (idx === i ? { ...norm(it), ...p } : norm(it))));
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list.map(norm), { name: '', distance: '', unit: 'km' }]);
  return (
    <div className="space-y-2">
      {list.map((raw, i) => {
        const it = norm(raw);
        return (
          <div key={i} className="flex items-center gap-2">
            <input className="input flex-1" placeholder="Place name" value={it.name} onChange={(e) => update(i, { name: e.target.value })} />
            <input className="input w-20" placeholder="0" value={it.distance} onChange={(e) => update(i, { distance: e.target.value })} />
            <select className="input w-28" value={it.unit} onChange={(e) => update(i, { unit: e.target.value })}>{NEARBY_UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <button type="button" onClick={() => remove(i)} className="text-rose-500 text-sm px-2">✕</button>
          </div>
        );
      })}
      <button type="button" onClick={add} className="text-sm font-semibold text-brand">+ Add place</button>
    </div>
  );
}

export default function SectionEditor({ sectionKey, exp, onSaved }) {
  const [draft, setDraft] = useState(() => sliceFor(sectionKey, exp));
  const [saving, setSaving] = useState(false);
  const patch = (p) => setDraft((d) => ({ ...d, ...p }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/experiences/${exp.id}`, draft);
      toast.success('Saved');
      onSaved && onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Editor sectionKey={sectionKey} draft={draft} patch={patch} exp={exp} />
      <div className="flex justify-end mt-3">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-105 disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save changes
        </button>
      </div>
    </div>
  );
}
