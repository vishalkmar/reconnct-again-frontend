import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Trash2, Plus, MapPin, Truck } from 'lucide-react';
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

// One "activity" = one Experience record. Everything here is per-activity;
// supplier + audiences + status are shared across all activities in the form.
const blankActivity = () => ({
  audiences: [],
  categoryIds: [],
  typeIds: [],
  name: '',
  location: '',
  city: '',
  nearbyLocation: '',
  rating: 0,
  about: '',
  mainImage: '',
  gallery: [],
  videos: [],
  mode: 'offline',
  priceMethod: 'per_person',
  pricing: { ...blankPricing },
  inclusions: [],
  faqs: [],
  facilities: [],
  nearbyPlaces: [],
  termsConditions: '',
  privacyPolicy: '',
  refundCancellationPolicy: '',
  schedule: { dates: [] },
  gstRate: 0,
  discount: { type: 'percentage', value: 0 },
  convenienceFee: { type: 'free', value: 0, months: 0, cutThrough: 0 },
});

const blank = {
  supplierId: null,
  showSupplierPublic: true,
  status: 'draft',
  activities: [blankActivity()],
};

// Map a server experience record → one activity object.
const toActivity = (e) => ({
  audiences: Array.isArray(e.audiences) ? e.audiences : [],
  categoryIds: Array.isArray(e.categoryIds) && e.categoryIds.length ? e.categoryIds : (e.categoryId ? [e.categoryId] : []),
  typeIds: Array.isArray(e.typeIds) && e.typeIds.length ? e.typeIds : (e.typeId ? [e.typeId] : []),
  name: e.name || '',
  location: e.location || '',
  city: e.city || '',
  nearbyLocation: e.nearbyLocation || '',
  rating: Number(e.rating) || 0,
  about: e.about || '',
  mainImage: e.mainImage || '',
  gallery: Array.isArray(e.gallery) ? e.gallery : [],
  videos: Array.isArray(e.videos) ? e.videos : [],
  mode: e.mode || 'offline',
  priceMethod: e.priceMethod || 'per_person',
  pricing: e.pricing && Object.keys(e.pricing).length ? { ...blankPricing, ...e.pricing } : { ...blankPricing },
  inclusions: Array.isArray(e.inclusions) ? e.inclusions : [],
  faqs: Array.isArray(e.faqs) ? e.faqs : [],
  facilities: Array.isArray(e.facilities) ? e.facilities : [],
  nearbyPlaces: Array.isArray(e.nearbyPlaces) ? e.nearbyPlaces : [],
  termsConditions: e.termsConditions || '',
  privacyPolicy: e.privacyPolicy || '',
  refundCancellationPolicy: e.refundCancellationPolicy
    || [e.refundPolicy, e.cancellationPolicy].filter(Boolean).join('<br/><br/>')
    || '',
  schedule: e.schedule && Array.isArray(e.schedule.dates) ? e.schedule : { dates: [] },
  gstRate: Number(e.gstRate) || 0,
  discount: e.discount && e.discount.type ? e.discount : { type: 'percentage', value: 0 },
  convenienceFee: e.convenienceFee && e.convenienceFee.type
    ? { type: 'free', value: 0, months: 0, cutThrough: 0, ...e.convenienceFee }
    : { type: 'free', value: 0, months: 0, cutThrough: 0 },
});

export default function ExperienceFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  // BD/team submissions always go for review; admin publishing also needs it.
  const isTeamPath = location.pathname.startsWith('/team');
  // Where to go after save/cancel — the correct LIST for whichever portal we're
  // in. Using a relative '..' broke on the edit route (…/:id/edit → …/:id has no
  // route → fell through to home, forcing a re-login).
  const listPath = isTeamPath ? '/team/experiences' : '/admin/experiences';

  const { value, setValue, hydrateFromServer, clearDraft, discardDraft, hasDraft } =
    usePersistedForm(`experience-form:${id || 'new'}`, blank, { editing });

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  // Suppliers for the dropdown (active only).
  useEffect(() => {
    api.get('/suppliers', { params: { active: 'true' } })
      .then((res) => setSuppliers(res.data?.data?.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/experiences/${id}`);
        const e = res.data?.data?.item;
        if (!cancelled && e) {
          hydrateFromServer({
            supplierId: e.supplierId || null,
            showSupplierPublic: e.showSupplierPublic !== false,
            status: e.status || 'draft',
            activities: [toActivity(e)],
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

  const patchActivity = useCallback((idx, p) => setValue((v) => ({
    ...v,
    activities: v.activities.map((a, i) => (i === idx ? { ...a, ...p } : a)),
  })), [setValue]);

  const addActivity = () => setValue((v) => ({ ...v, activities: [...v.activities, blankActivity()] }));
  const removeActivity = (idx) => setValue((v) => ({ ...v, activities: v.activities.filter((_, i) => i !== idx) }));

  const save = async () => {
    const acts = value.activities || [];
    for (let i = 0; i < acts.length; i++) {
      const a = acts[i];
      const tag = acts.length > 1 ? ` (activity ${i + 1})` : '';
      if (!a.name.trim()) return toast.error(`Name is required${tag}`);
      if (!a.categoryIds?.length) return toast.error(`Pick at least one broad category${tag}`);
      if (!a.typeIds?.length) return toast.error(`Pick at least one type${tag}`);
      // At least 6 images (main + gallery) before it can go for review/publish.
      const needsImages = isTeamPath || value.status === 'published';
      if (needsImages) {
        const imgCount = (a.mainImage ? 1 : 0) + (Array.isArray(a.gallery) ? a.gallery.filter(Boolean).length : 0);
        if (!a.mainImage) return toast.error(`Add a main image${tag}`);
        if (imgCount < 6) return toast.error(`At least 6 images are required — you have ${imgCount}${tag}`);
      }
    }
    setSaving(true);
    try {
      // Audiences are now per-activity (each activity carries its own); only
      // supplier + status are shared across the activities being saved.
      const shared = { supplierId: value.supplierId || null, showSupplierPublic: value.showSupplierPublic !== false, status: value.status };
      if (editing) {
        await api.put(`/experiences/${id}`, { ...acts[0], ...shared });
        toast.success('Experience updated');
      } else {
        for (const a of acts) {
          // eslint-disable-next-line no-await-in-loop
          await api.post('/experiences', { ...a, ...shared });
        }
        toast.success(acts.length > 1 ? `${acts.length} experiences saved` : 'Experience saved');
      }
      clearDraft();
      navigate(listPath);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-ink-muted"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  }

  const activities = value.activities || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(listPath)} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3">
          <ArrowLeft size={16} /> Back to experiences
        </button>
        <h1 className="text-2xl font-display font-bold mb-1">{editing ? 'Edit experience' : 'New experience'}</h1>
        <p className="text-sm text-ink-muted">
          Pick the supplier once, then add one or more activities below — set <strong>who each is for</strong> and its category inside the activity. Each activity is saved as its own experience. Everything auto-saves as a draft.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Shared — supplier only (audiences moved into each activity) */}
          <div className="bg-white rounded-2xl shadow-soft p-6 space-y-6">
            <div>
              <label className="label inline-flex items-center gap-1.5"><Truck size={14} /> Supplier <span className="text-ink-muted font-normal">(optional)</span></label>
              <select className="input" value={value.supplierId || ''} onChange={(e) => patch({ supplierId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— No supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.companyName}{s.supplierName ? ` · ${s.supplierName}` : ''}</option>
                ))}
              </select>
              <p className="text-[11px] text-ink-muted mt-1">Tells you which supplier runs this/these activities. Manage suppliers from the Suppliers tab.</p>

              {/* Show / hide the supplier's info publicly (website + app). */}
              <button
                type="button"
                onClick={() => patch({ showSupplierPublic: !(value.showSupplierPublic !== false) })}
                className="mt-3 w-full flex items-center justify-between rounded-xl border border-gray-200 px-3.5 py-2.5 hover:border-brand/40 transition"
              >
                <span className="text-sm font-medium text-ink text-left">
                  Show supplier on website &amp; app
                  <span className="block text-[11px] text-ink-muted font-normal">
                    {value.showSupplierPublic !== false ? 'Visible to users (host shown on the listing)' : 'Hidden from users'}
                  </span>
                </span>
                <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${value.showSupplierPublic !== false ? 'bg-brand' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${value.showSupplierPublic !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                </span>
              </button>
            </div>
          </div>

          {/* Activity blocks */}
          {activities.map((a, i) => (
            <ActivityBlock
              key={i}
              index={i}
              activity={a}
              total={activities.length}
              editing={editing}
              onChange={(p) => patchActivity(i, p)}
              onRemove={() => removeActivity(i)}
            />
          ))}

          {!editing && (
            <button type="button" onClick={addActivity}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed border-brand/50 text-brand font-semibold hover:bg-brand/5">
              <Plus size={18} /> Add another activity
            </button>
          )}
        </div>{/* /main column */}

        {/* Publish / actions — sticky sidebar */}
        <aside className="lg:col-span-1 lg:sticky lg:top-6 space-y-4">
          <div className="bg-white rounded-2xl shadow-soft p-5">
            <h3 className="font-semibold mb-3">{isTeamPath ? 'Save' : 'Publish'}</h3>
            {isTeamPath ? (
              <p className="text-xs text-ink-muted mb-4">This goes to Center Ops for review — it can’t be published directly from here.</p>
            ) : (
              <>
                <label className="label">Status</label>
                <select className="input mb-4" value={value.status} onChange={(e) => patch({ status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </>
            )}
            {!editing && activities.length > 1 && (
              <p className="text-[11px] text-ink-muted mb-3">{activities.length} activities will be saved as separate experiences{value.supplierId ? ' under the chosen supplier' : ''}.</p>
            )}
            <button onClick={save} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editing ? 'Update experience' : (activities.length > 1 ? `Save ${activities.length} activities` : 'Save experience')}
            </button>
            <button onClick={() => navigate(listPath)} className="w-full mt-2 px-5 py-2.5 rounded-lg border border-gray-200 font-medium hover:bg-surface-alt">Cancel</button>
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

// ─── One activity = one Experience ─────────────────────────────────────────
function ActivityBlock({ index, activity, total, editing, onChange, onRemove }) {
  const value = activity;
  const patch = (p) => onChange(p);

  return (
    <div className="relative bg-white rounded-2xl shadow-soft p-6 space-y-5 border border-brand/10">
      {total > 1 && (
        <div className="flex items-center justify-between -mt-1 mb-1">
          <span className="text-xs font-bold uppercase tracking-wide text-brand">Activity {index + 1}</span>
          {!editing && (
            <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline">
              <Trash2 size={13} /> Remove
            </button>
          )}
        </div>
      )}

      {/* Per-activity: Who is this for? → audience-filtered category → type. */}
      <ExperienceTaxonomyPicker value={{ audiences: value.audiences, categoryIds: value.categoryIds, typeIds: value.typeIds }} onChange={patch} />

      {/* Basics */}
      <div className="space-y-4 pt-2 border-t border-gray-100">
        <div>
          <label className="label">Name <span className="text-rose-500">*</span></label>
          <input className="input" value={value.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Sunrise Himalayan Yoga Retreat" />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" value={value.location} onChange={(e) => patch({ location: e.target.value })} placeholder="e.g. Rishikesh, Uttarakhand" />
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

      {/* About */}
      <div className="pt-2 border-t border-gray-100">
        <label className="label">About this activity / event</label>
        <RichTextEditor value={value.about} onChange={(v) => patch({ about: v })} placeholder="Describe the experience…" />
      </div>

      {/* Media */}
      <div className="pt-2 border-t border-gray-100 space-y-6">
        <div>
          <label className="label">Main image</label>
          <Dropzone instant value={value.mainImage} onChange={(url) => patch({ mainImage: url })}
            existingUrl={value.mainImage} onClearExisting={() => patch({ mainImage: '' })}
            placeholder="Drag & drop the cover image, click to browse, or paste a link" />
        </div>
        <div>
          <label className="label">Gallery images</label>
          <Dropzone instant multiple value={value.gallery} onChange={(urls) => patch({ gallery: urls })}
            placeholder="Add multiple images — drag & drop, browse, or paste links" />
        </div>
        <div>
          <label className="label">Videos</label>
          <MediaVideosField value={value.videos} onChange={(v) => patch({ videos: v })} />
        </div>
      </div>

      {/* Pricing */}
      <div className="pt-2 border-t border-gray-100">
        <h2 className="font-semibold text-lg mb-4">Pricing</h2>
        <ExperiencePricing priceMethod={value.priceMethod} pricing={value.pricing} onChange={patch} />
      </div>

      {/* Inclusions */}
      <div className="pt-2 border-t border-gray-100">
        <h2 className="font-semibold text-lg mb-1">Inclusions</h2>
        <p className="text-sm text-ink-muted mb-4">Add what's included — as a text block, or a title with an image.</p>
        <ExperienceInclusions value={value.inclusions} onChange={(v) => patch({ inclusions: v })} />
      </div>

      {/* Facilities */}
      <div className="pt-2 border-t border-gray-100">
        <h2 className="font-semibold text-lg mb-1">Facilities</h2>
        <p className="text-sm text-ink-muted mb-4">Pick from the shared list or add your own.</p>
        <ExperienceFacilities value={value.facilities} onChange={(v) => patch({ facilities: v })} />
      </div>

      {/* Nearby places */}
      <div className="pt-2 border-t border-gray-100">
        <h2 className="font-semibold text-lg mb-1">Nearby places</h2>
        <p className="text-sm text-ink-muted mb-4">Famous spots near the location and how far they are.</p>
        <NearbyPlacesEditor value={value.nearbyPlaces} onChange={(v) => patch({ nearbyPlaces: v })} />
      </div>

      {/* Availability & scheduling */}
      <div className="pt-2 border-t border-gray-100">
        <h2 className="font-semibold text-lg mb-1">Availability &amp; scheduling</h2>
        <p className="text-sm text-ink-muted mb-4">Set the session duration, pick available dates, then build time slots per date.</p>
        <div className="mb-5">
          <label className="label">Each session duration</label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input type="number" min={0} className="input w-24 pr-9" placeholder="0"
                value={value.pricing?.duration?.hours || ''}
                onChange={(e) => patch({ pricing: { ...value.pricing, duration: { ...(value.pricing?.duration || {}), hours: Number(e.target.value) || 0 } } })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">hrs</span>
            </div>
            <div className="relative">
              <input type="number" min={0} max={59} className="input w-24 pr-9" placeholder="0"
                value={value.pricing?.duration?.minutes || ''}
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
      <div className="pt-2 border-t border-gray-100">
        <h2 className="font-semibold text-lg mb-4">FAQs</h2>
        <FaqEditor value={value.faqs} onChange={(v) => patch({ faqs: v })} />
      </div>

      {/* Policies */}
      <div className="pt-2 border-t border-gray-100 space-y-5">
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
          <label className="label">Refund &amp; Cancellation Policy</label>
          <RichTextEditor value={value.refundCancellationPolicy} onChange={(v) => patch({ refundCancellationPolicy: v })} minHeight={200} />
        </div>
      </div>

      {/* GST + discount + convenience fee */}
      <div className="pt-2 border-t border-gray-100">
        <h2 className="font-semibold text-lg mb-1">GST, discount &amp; convenience fee</h2>
        <p className="text-sm text-ink-muted mb-4">Discount applies before GST; the convenience fee is added on the final amount.</p>
        <ExperienceTaxPricing
          gstRate={value.gstRate}
          discount={value.discount}
          convenienceFee={value.convenienceFee}
          basePrice={value.pricing?.adultPrice || 0}
          onChange={patch}
        />
      </div>
    </div>
  );
}

// Nearby famous places — [{ name, distance, unit }] (unit: 'km' | 'min' | 'hr').
const NEARBY_UNITS = [
  { value: 'km', label: 'km' },
  { value: 'min', label: 'min away' },
  { value: 'hr', label: 'hrs away' },
];
function NearbyPlacesEditor({ value = [], onChange }) {
  const list = Array.isArray(value) ? value : [];
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
