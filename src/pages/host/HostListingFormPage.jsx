import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import usePersistedForm from '../../hooks/usePersistedForm.js';
import { validateExperience } from '../../utils/validateExperience.js';
import { ActivityBlock, blankActivity } from '../admin/ExperienceFormPage.jsx';

/*
  Host & Supplier "Create listing" — renders the EXACT same form body as the
  BD/admin "New experience" page (the shared <ActivityBlock/>), just WITHOUT the
  supplier picker + "show supplier" section (that's BD-only). The host/supplier
  ownership + API stay their own (/host/listings or /supplier/listings), so we
  map the flat host-form shape ↔ the nested activity shape here.

  basePath lets the Supplier Portal reuse this against /supplier/listings.
*/
const durLabel = (h, m) => {
  const hh = Number(h) || 0; const mm = Number(m) || 0;
  if (!hh && !mm) return '';
  return `${hh ? `${hh} hr` : ''}${hh && mm ? ' ' : ''}${mm ? `${mm} min` : ''}`.trim();
};

// flat host form (host.controller shape) → nested activity (ActivityBlock shape)
const hostFormToActivity = (f = {}) => ({
  ...blankActivity(),
  audiences: f.audiences || [],
  categoryIds: f.categoryIds || [],
  typeIds: f.typeIds || [],
  name: f.name || '',
  location: f.location || '',
  city: f.city || '',
  pincode: f.pincode || '',
  nearbyLocation: f.nearbyLocation || '',
  about: f.about || '',
  mode: f.mode || 'offline',
  mainImage: (Array.isArray(f.photos) && f.photos[0]) || '',
  gallery: Array.isArray(f.photos) ? f.photos.slice(1) : [],
  videos: Array.isArray(f.videos) ? f.videos : [],
  priceMethod: f.priceMethod || 'per_person',
  pricing: {
    adultPrice: Number(f.adultPrice) || 0,
    childrenEnabled: !!f.childrenEnabled,
    childBands: f.childBands || [],
    capacity: f.capacity || 8,
    duration: { hours: f.durationHours || 0, minutes: f.durationMinutes || 0 },
    days: 1,
  },
  b2cPriceMethod: f.b2cPriceMethod || 'per_person',
  b2cPricing: {
    adultPrice: Number(f.b2cAdultPrice) || 0,
    childrenEnabled: !!f.b2cChildrenEnabled,
    childBands: f.b2cChildBands || [],
  },
  sourceName: f.sourceName || '',
  sourceLink: f.sourceLink || '',
  inclusions: Array.isArray(f.inclusions) ? f.inclusions : [],
  faqs: Array.isArray(f.faqs) ? f.faqs : [],
  facilities: Array.isArray(f.facilities) ? f.facilities : [],
  nearbyPlaces: Array.isArray(f.nearbyPlaces) ? f.nearbyPlaces : [],
  termsConditions: f.termsConditions || '',
  privacyPolicy: f.privacyPolicy || '',
  refundCancellationPolicy: f.refundCancellationPolicy || '',
  schedule: f.schedule && Array.isArray(f.schedule.dates) ? f.schedule : { dates: [] },
});

// nested activity → flat host form (what host.controller.mapFormToExperience wants)
const activityToHostForm = (a = {}) => ({
  audiences: a.audiences || [],
  categoryIds: a.categoryIds || [],
  typeIds: a.typeIds || [],
  name: a.name || '',
  location: a.location || '',
  city: a.city || '',
  pincode: a.pincode || '',
  nearbyLocation: a.nearbyLocation || '',
  about: a.about || '',
  mode: a.mode || 'offline',
  priceMethod: a.priceMethod || 'per_person',
  adultPrice: a.pricing?.adultPrice ?? '',
  childrenEnabled: !!a.pricing?.childrenEnabled,
  childBands: a.pricing?.childBands || [],
  b2cPriceMethod: a.b2cPriceMethod || 'per_person',
  b2cAdultPrice: a.b2cPricing?.adultPrice ?? '',
  b2cChildrenEnabled: !!a.b2cPricing?.childrenEnabled,
  b2cChildBands: a.b2cPricing?.childBands || [],
  sourceName: a.sourceName || '',
  sourceLink: a.sourceLink || '',
  capacity: a.pricing?.capacity || 8,
  durationHours: a.pricing?.duration?.hours || 0,
  durationMinutes: a.pricing?.duration?.minutes || 0,
  durationLabel: durLabel(a.pricing?.duration?.hours, a.pricing?.duration?.minutes),
  inclusions: a.inclusions || [],
  facilities: a.facilities || [],
  nearbyPlaces: a.nearbyPlaces || [],
  faqs: a.faqs || [],
  termsConditions: a.termsConditions || '',
  privacyPolicy: a.privacyPolicy || '',
  refundCancellationPolicy: a.refundCancellationPolicy || '',
  schedule: a.schedule || { dates: [] },
  photos: [a.mainImage, ...(Array.isArray(a.gallery) ? a.gallery : [])].filter(Boolean),
  videos: a.videos || [],
});

export default function HostListingFormPage({ basePath = '/host' }) {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  // Auto-persist to localStorage so a refresh / accidental navigation never
  // loses the work (same behaviour as the BD/admin experience form).
  const {
    value: act, setValue: setAct, hydrateFromServer, clearDraft, discardDraft, hasDraft,
  } = usePersistedForm(`${basePath.replace(/\//g, '')}-listing:${id || 'new'}`, blankActivity(), { editing });
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const patch = (p) => setAct((a) => ({ ...a, ...p }));

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    api.get(`${basePath}/listings/${id}`)
      .then(({ data }) => { if (alive) hydrateFromServer(hostFormToActivity((data.data || data).form || {})); })
      .catch(() => toast.error('Could not load listing'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [editing, id, basePath, hydrateFromServer]);

  const submit = async (isReview) => {
    if (submitting) return;
    const form = activityToHostForm(act);
    if (isReview) {
      // Submitting for review → every field required (video is the only
      // optional one). Each shows its own message.
      const err = validateExperience(act, { forReview: true, photoCount: form.photos.filter(Boolean).length });
      if (err) return toast.error(err);
    } else if (!act.name.trim()) {
      return toast.error('Please add the experience title to save a draft');
    }
    setSubmitting(true);
    try {
      const payload = form.photos.length
        ? form
        : { ...form, photos: ['https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80'] };
      if (editing) await api.put(`${basePath}/listings/${id}`, { form: payload, submit: isReview });
      else await api.post(`${basePath}/listings`, { form: payload, submit: isReview });
      clearDraft();
      toast.success(isReview ? 'Submitted for review' : 'Saved as draft');
      navigate(`${basePath}/listings`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-ink-muted"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(`${basePath}/listings`)} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3">
          <ArrowLeft size={16} /> Back to listings
        </button>
        <h1 className="text-2xl font-display font-bold mb-1">{editing ? 'Edit listing' : 'Create listing'}</h1>
        <p className="text-sm text-ink-muted">Fill in the details below, then save a draft or submit for review. Everything auto-saves as a draft.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Main column — the same form body as the BD "New experience", minus
            the supplier section. */}
        <div className="lg:col-span-2 space-y-5">
          <ActivityBlock index={0} activity={act} total={1} editing={editing} onChange={patch} onRemove={() => {}} />
        </div>

        {/* Save — sticky sidebar (same place as the BD form). */}
        <aside className="lg:col-span-1 lg:sticky lg:top-6 space-y-4">
          <div className="bg-white rounded-2xl shadow-soft p-5">
            <h3 className="font-semibold mb-3">Save</h3>
            <p className="text-xs text-ink-muted mb-4">This goes to Center Ops for review — it can’t be published directly from here.</p>
            <button onClick={() => submit(true)} disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Submit for Review
            </button>
            <button onClick={() => submit(false)} disabled={submitting} className="w-full mt-2 px-5 py-2.5 rounded-lg border border-gray-200 font-medium hover:bg-surface-alt disabled:opacity-60">
              {submitting ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={() => navigate(`${basePath}/listings`)} className="w-full mt-2 px-5 py-2.5 rounded-lg border border-gray-200 font-medium hover:bg-surface-alt">Cancel</button>
            {hasDraft && (
              <button onClick={discardDraft} className="w-full mt-3 inline-flex items-center justify-center gap-1.5 text-xs text-rose-600 hover:underline">
                <Trash2 size={13} /> Discard draft
              </button>
            )}
            <p className="text-[11px] text-ink-muted mt-3 text-center">Changes auto-save as a draft.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- shared form bits (used by HostSectionFields' objection editor) ---------- */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const DURATIONS = [{ label: '1 hr', h: 1 }, { label: '2 hrs', h: 2 }, { label: '3 hrs', h: 3 }, { label: '4 hrs', h: 4 }];
export const FACILITIES = ['Restrooms', 'Parking', 'Locker', 'Wifi', 'Cafe', 'First Aid', 'Changing Room', 'Guide', 'Equipment'];
export const PRICE_METHODS = [
  { value: 'per_person', label: 'Per person' },
  { value: 'per_day', label: 'Per day' },
  { value: 'days', label: 'Days (multi-day)' },
  { value: 'per_hours', label: 'By hours' },
];
export const MODES = ['offline', 'online', 'hybrid'];

export function L({ children }) { return <label className="text-sm font-semibold text-ink mb-1.5 block">{children}</label>; }
export function Hint({ children }) { return <p className="text-xs text-ink-muted mb-2">{children}</p>; }
export function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${active ? 'bg-brand text-ink border-brand' : 'bg-white text-ink border-slate-300 hover:border-slate-400'}`}>{children}</button>
  );
}
export function Stepper({ value, onChange, min = 1, max = 100 }) {
  const v = Number(value) || 0;
  return (
    <div className="inline-flex items-center gap-3 border border-gray-200 rounded-lg px-2 py-1">
      <button type="button" onClick={() => onChange(Math.max(min, v - 1))} className="w-8 h-8 rounded-md border border-gray-200 text-lg leading-none hover:bg-surface-alt">−</button>
      <span className="min-w-[2ch] text-center font-semibold text-ink">{v}</span>
      <button type="button" onClick={() => onChange(Math.min(max, v + 1))} className="w-8 h-8 rounded-md bg-brand text-ink text-lg leading-none">+</button>
    </div>
  );
}
export function AddCustom({ placeholder, onAdd }) {
  const [t, setT] = useState('');
  const add = () => { const s = t.trim(); if (s) { onAdd(s); setT(''); } };
  return (
    <div className="flex gap-2 mt-2">
      <input className="win flex-1" value={t} onChange={(e) => setT(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
      <button type="button" onClick={add} className="px-4 rounded-lg bg-brand text-ink font-semibold text-sm">Add</button>
    </div>
  );
}
