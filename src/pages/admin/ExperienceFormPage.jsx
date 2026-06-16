import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Trash2, Plus, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import usePersistedForm from '../../hooks/usePersistedForm.js';
import ExperienceTaxonomyPicker from '../../components/admin/ExperienceTaxonomyPicker.jsx';
import StarRatingInput from '../../components/admin/StarRatingInput.jsx';
import RichTextEditor from '../../components/admin/RichTextEditor.jsx';
import Dropzone from '../../components/admin/Dropzone.jsx';
import MediaVideosField from '../../components/admin/MediaVideosField.jsx';
import ExperiencePricing from '../../components/admin/ExperiencePricing.jsx';
import ExperienceInclusions from '../../components/admin/ExperienceInclusions.jsx';
import ExperienceFacilities from '../../components/admin/ExperienceFacilities.jsx';
import ExperienceScheduling from '../../components/admin/ExperienceScheduling.jsx';
import ExperienceTaxPricing from '../../components/admin/ExperienceTaxPricing.jsx';
import { FaqEditor } from '../../components/admin/KeyValueListEditor.jsx';

const blankPricing = {
  adultPrice: 0,
  childrenEnabled: false,
  childBands: [],
  duration: { hours: 0, minutes: 0 },
  days: 1,
};

const blank = {
  name: '',
  audiences: [],
  categoryId: null,
  typeId: null,
  location: '',
  city: '',
  nearbyLocation: '',
  rating: 0,
  about: '',
  mainImage: '',
  gallery: [],
  videos: [],
  mode: 'offline',
  status: 'draft',
  priceMethod: 'per_person',
  pricing: blankPricing,
  inclusions: [],
  faqs: [],
  facilities: [],
  nearbyPlaces: [],
  termsConditions: '',
  privacyPolicy: '',
  refundPolicy: '',
  cancellationPolicy: '',
  schedule: { dates: [] },
  gstRate: 0,
  tcsRate: 0,
  discount: { type: 'percentage', value: 0 },
};

export default function ExperienceFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const { value, setValue, hydrateFromServer, clearDraft, discardDraft, hasDraft } =
    usePersistedForm(`experience-form:${id || 'new'}`, blank, { editing });

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  // On edit, fetch the record then hand it to the persistence hook (draft wins
  // if the admin was mid-edit — see usePersistedForm).
  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/experiences/${id}`);
        const e = res.data?.data?.item;
        if (!cancelled && e) {
          hydrateFromServer({
            name: e.name || '',
            audiences: Array.isArray(e.audiences) ? e.audiences : [],
            categoryId: e.categoryId || null,
            typeId: e.typeId || null,
            location: e.location || '',
            city: e.city || '',
            nearbyLocation: e.nearbyLocation || '',
            rating: Number(e.rating) || 0,
            about: e.about || '',
            mainImage: e.mainImage || '',
            gallery: Array.isArray(e.gallery) ? e.gallery : [],
            videos: Array.isArray(e.videos) ? e.videos : [],
            mode: e.mode || 'offline',
            status: e.status || 'draft',
            priceMethod: e.priceMethod || 'per_person',
            pricing: e.pricing && Object.keys(e.pricing).length ? { ...blankPricing, ...e.pricing } : blankPricing,
            inclusions: Array.isArray(e.inclusions) ? e.inclusions : [],
            faqs: Array.isArray(e.faqs) ? e.faqs : [],
            facilities: Array.isArray(e.facilities) ? e.facilities : [],
            nearbyPlaces: Array.isArray(e.nearbyPlaces) ? e.nearbyPlaces : [],
            termsConditions: e.termsConditions || '',
            privacyPolicy: e.privacyPolicy || '',
            refundPolicy: e.refundPolicy || '',
            cancellationPolicy: e.cancellationPolicy || '',
            schedule: e.schedule && Array.isArray(e.schedule.dates) ? e.schedule : { dates: [] },
            gstRate: Number(e.gstRate) || 0,
            tcsRate: Number(e.tcsRate) || 0,
            discount: e.discount && e.discount.type ? e.discount : { type: 'percentage', value: 0 },
          });
        }
      } catch {
        toast.error('Could not load experience');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editing, id, hydrateFromServer]);

  const patch = useCallback((p) => setValue((v) => ({ ...v, ...p })), [setValue]);

  const save = async () => {
    if (!value.name.trim()) return toast.error('Name is required');
    if (!value.categoryId) return toast.error('Pick a broad category');
    if (!value.typeId) return toast.error('Pick a type');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/experiences/${id}`, value);
        toast.success('Experience updated');
      } else {
        await api.post('/experiences', value);
        toast.success('Experience saved');
      }
      clearDraft();
      navigate('/admin/experiences');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-ink-muted"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/admin/experiences')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3">
          <ArrowLeft size={16} /> Back to experiences
        </button>
        <h1 className="text-2xl font-display font-bold mb-1">{editing ? 'Edit experience' : 'New experience'}</h1>
        <p className="text-sm text-ink-muted">
          Start by tagging who it's for and choosing the category &amp; type. Everything you type auto-saves as a draft.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-2">
      {/* Step 1 — taxonomy cascade (Task 1) */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mb-5">
        <ExperienceTaxonomyPicker value={value} onChange={patch} />
      </div>

      {/* Core basics — the rest of the field set (media, pricing, scheduling,
          GST…) lands here in the next build passes. */}
      <div className="bg-white rounded-2xl shadow-soft p-6 space-y-4">
        <div>
          <label className="label">Name <span className="text-rose-500">*</span></label>
          <input
            className="input"
            value={value.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g. Sunrise Himalayan Yoga Retreat"
          />
        </div>
        <div>
          <label className="label">Location</label>
          <input
            className="input"
            value={value.location}
            onChange={(e) => patch({ location: e.target.value })}
            placeholder="e.g. Rishikesh, Uttarakhand"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4 items-start">
          <div>
            <label className="label">City</label>
            <input className="input" value={value.city} onChange={(e) => patch({ city: e.target.value })} placeholder="e.g. Rishikesh" />
          </div>
          <div>
            <label className="label">Nearby location</label>
            <input className="input" value={value.nearbyLocation} onChange={(e) => patch({ nearbyLocation: e.target.value })} placeholder="e.g. Near Laxman Jhula" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 items-start">
          <div>
            <label className="label">Mode</label>
            <select className="input" value={value.mode} onChange={(e) => patch({ mode: e.target.value })}>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="label">Rating</label>
            <StarRatingInput value={value.rating} onChange={(r) => patch({ rating: r })} />
          </div>
        </div>
      </div>

      {/* About — rich text (same editor as retreats) */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-5">
        <label className="label">About this activity / event</label>
        <RichTextEditor value={value.about} onChange={(v) => patch({ about: v })} placeholder="Describe the experience…" />
      </div>

      {/* Media — main image, gallery, video */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-5 space-y-6">
        <div>
          <label className="label">Main image</label>
          <Dropzone
            instant
            value={value.mainImage}
            onChange={(url) => patch({ mainImage: url })}
            existingUrl={value.mainImage}
            onClearExisting={() => patch({ mainImage: '' })}
            placeholder="Drag & drop the cover image, click to browse, or paste a link"
          />
        </div>
        <div>
          <label className="label">Gallery images</label>
          <Dropzone
            instant
            multiple
            value={value.gallery}
            onChange={(urls) => patch({ gallery: urls })}
            placeholder="Add multiple images — drag & drop, browse, or paste links"
          />
        </div>
        <div>
          <label className="label">Videos</label>
          <MediaVideosField value={value.videos} onChange={(v) => patch({ videos: v })} />
        </div>
      </div>

      {/* Pricing (Task 4 #9) */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-5">
        <h2 className="font-semibold text-lg mb-4">Pricing</h2>
        <ExperiencePricing
          priceMethod={value.priceMethod}
          pricing={value.pricing}
          onChange={patch}
        />
      </div>

      {/* Inclusions */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-5">
        <h2 className="font-semibold text-lg mb-1">Inclusions</h2>
        <p className="text-sm text-ink-muted mb-4">Add what's included — as a text block, or a title with an image.</p>
        <ExperienceInclusions value={value.inclusions} onChange={(v) => patch({ inclusions: v })} />
      </div>

      {/* Facilities */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-5">
        <h2 className="font-semibold text-lg mb-1">Facilities</h2>
        <p className="text-sm text-ink-muted mb-4">Pick from the shared list or add your own.</p>
        <ExperienceFacilities value={value.facilities} onChange={(v) => patch({ facilities: v })} />
      </div>

      {/* Nearby places */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-5">
        <h2 className="font-semibold text-lg mb-1">Nearby places</h2>
        <p className="text-sm text-ink-muted mb-4">Famous spots near the location and how far they are.</p>
        <NearbyPlacesEditor value={value.nearbyPlaces} onChange={(v) => patch({ nearbyPlaces: v })} />
      </div>

      {/* Availability & scheduling */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-5">
        <h2 className="font-semibold text-lg mb-1">Availability &amp; scheduling</h2>
        <p className="text-sm text-ink-muted mb-4">Set the session duration, pick available dates, then build time slots per date. Auto-generated slots use this duration.</p>

        {/* Duration drives slot generation */}
        <div className="mb-5">
          <label className="label">Each session duration</label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input type="number" min={0} className="input w-24 pr-9"
                value={value.pricing?.duration?.hours ?? 0}
                onChange={(e) => patch({ pricing: { ...value.pricing, duration: { ...(value.pricing?.duration || {}), hours: Number(e.target.value) || 0 } } })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">hrs</span>
            </div>
            <div className="relative">
              <input type="number" min={0} max={59} className="input w-24 pr-9"
                value={value.pricing?.duration?.minutes ?? 0}
                onChange={(e) => patch({ pricing: { ...value.pricing, duration: { ...(value.pricing?.duration || {}), minutes: Math.min(59, Number(e.target.value) || 0) } } })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">min</span>
            </div>
          </div>
        </div>

        <ExperienceScheduling
          value={value.schedule}
          onChange={(s) => patch({ schedule: s })}
          durationMinutes={(value.pricing?.duration?.hours || 0) * 60 + (value.pricing?.duration?.minutes || 0)}
        />
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-5">
        <h2 className="font-semibold text-lg mb-4">FAQs</h2>
        <FaqEditor value={value.faqs} onChange={(v) => patch({ faqs: v })} />
      </div>

      {/* Policies — rich text */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-5 space-y-5">
        <h2 className="font-semibold text-lg">Policies &amp; terms</h2>
        <div>
          <label className="label">Terms &amp; Conditions</label>
          <RichTextEditor value={value.termsConditions} onChange={(v) => patch({ termsConditions: v })} minHeight={160} />
        </div>
        <div>
          <label className="label">Privacy Policy</label>
          <RichTextEditor value={value.privacyPolicy} onChange={(v) => patch({ privacyPolicy: v })} minHeight={160} />
        </div>
        <div>
          <label className="label">Refund Policy</label>
          <RichTextEditor value={value.refundPolicy} onChange={(v) => patch({ refundPolicy: v })} minHeight={160} />
        </div>
        <div>
          <label className="label">Cancellation Policy</label>
          <RichTextEditor value={value.cancellationPolicy} onChange={(v) => patch({ cancellationPolicy: v })} minHeight={160} />
        </div>
      </div>

      {/* GST + discount + TCS (live calc) */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-5">
        <h2 className="font-semibold text-lg mb-1">GST, discount &amp; TCS</h2>
        <p className="text-sm text-ink-muted mb-4">Discount applies before GST; the totals update instantly using the adult price from Pricing.</p>
        <ExperienceTaxPricing
          gstRate={value.gstRate}
          tcsRate={value.tcsRate}
          discount={value.discount}
          basePrice={value.pricing?.adultPrice || 0}
          onChange={patch}
        />
      </div>

        </div>{/* /main column */}

        {/* Publish / actions — sticky sidebar */}
        <aside className="lg:col-span-1 lg:sticky lg:top-6 space-y-4">
          <div className="bg-white rounded-2xl shadow-soft p-5">
            <h3 className="font-semibold mb-3">Publish</h3>
            <label className="label">Status</label>
            <select className="input mb-4" value={value.status} onChange={(e) => patch({ status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <button onClick={save} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editing ? 'Update experience' : 'Save experience'}
            </button>
            <button onClick={() => navigate('/admin/experiences')} className="w-full mt-2 px-5 py-2.5 rounded-lg border border-gray-200 font-medium hover:bg-surface-alt">Cancel</button>
            {hasDraft && (
              <button onClick={discardDraft} className="w-full mt-3 inline-flex items-center justify-center gap-1.5 text-xs text-rose-600 hover:underline">
                <Trash2 size={13} /> Discard draft
              </button>
            )}
            <p className="text-[11px] text-ink-muted mt-3 text-center">Changes auto-save as a draft.</p>
          </div>
        </aside>
      </div>{/* /grid */}
    </div>
  );
}

// Nearby famous places. Distance value + a unit chosen from a dropdown — either
// physical distance (km) or travel time (min / hr). Stored as
// [{ name, distance, unit }] (unit: 'km' | 'min' | 'hr').
const NEARBY_UNITS = [
  { value: 'km', label: 'km' },
  { value: 'min', label: 'min away' },
  { value: 'hr', label: 'hrs away' },
];
function NearbyPlacesEditor({ value = [], onChange }) {
  const list = Array.isArray(value) ? value : [];
  // Back-compat: older rows stored `distanceKm` — read it as a km value.
  const norm = (it) => ({
    name: it.name || '',
    distance: it.distance ?? it.distanceKm ?? '',
    unit: it.unit || 'km',
  });
  const update = (i, patch) => onChange(list.map((it, idx) => (idx === i ? { ...norm(it), ...patch } : norm(it))));
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list.map(norm), { name: '', distance: '', unit: 'km' }]);

  return (
    <div className="space-y-2">
      {list.map((raw, i) => {
        const it = norm(raw);
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="relative flex-1">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input className="input pl-8" value={it.name} placeholder="Place (e.g. Laxman Jhula)"
                onChange={(e) => update(i, { name: e.target.value })} />
            </div>
            <input type="number" min={0} step="0.1" className="input w-24" value={it.distance} placeholder="0"
              onChange={(e) => update(i, { distance: e.target.value === '' ? '' : Number(e.target.value) })} />
            <select className="input w-28" value={it.unit} onChange={(e) => update(i, { unit: e.target.value })}>
              {NEARBY_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <button type="button" onClick={() => remove(i)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={15} /></button>
          </div>
        );
      })}
      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <Plus size={14} /> Add nearby place
      </button>
    </div>
  );
}
