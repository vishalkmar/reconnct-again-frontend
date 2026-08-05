import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
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

  const [act, setAct] = useState(blankActivity());
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const patch = (p) => setAct((a) => ({ ...a, ...p }));

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    api.get(`${basePath}/listings/${id}`)
      .then(({ data }) => { if (alive) setAct(hostFormToActivity((data.data || data).form || {})); })
      .catch(() => toast.error('Could not load listing'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [editing, id, basePath]);

  const submit = async (isReview) => {
    if (submitting) return;
    if (!act.name.trim() || !act.categoryIds?.length || !act.typeIds?.length) {
      return toast.error('Add a title, broad category and type first');
    }
    const form = activityToHostForm(act);
    if (isReview) {
      const photoCount = form.photos.filter(Boolean).length;
      if (photoCount < 6) return toast.error(`Add at least 6 photos before submitting — you have ${photoCount}.`);
    }
    setSubmitting(true);
    try {
      const payload = form.photos.length
        ? form
        : { ...form, photos: ['https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80'] };
      if (editing) await api.put(`${basePath}/listings/${id}`, { form: payload, submit: isReview });
      else await api.post(`${basePath}/listings`, { form: payload, submit: isReview });
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
    <div className="max-w-3xl mx-auto pb-28">
      <div className="mb-6">
        <button onClick={() => navigate(`${basePath}/listings`)} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3">
          <ArrowLeft size={16} /> Back to listings
        </button>
        <h1 className="text-2xl font-display font-bold mb-1">{editing ? 'Edit listing' : 'Create listing'}</h1>
        <p className="text-sm text-ink-muted">Fill in the details below, then save a draft or submit for review.</p>
      </div>

      {/* Same form body as the BD "New experience" — minus the supplier section. */}
      <ActivityBlock index={0} activity={act} total={1} editing={editing} onChange={patch} onRemove={() => {}} />

      {/* Action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 md:px-8 py-3 z-20">
        <div className="max-w-3xl mx-auto flex justify-end gap-3">
          <button onClick={() => submit(false)} disabled={submitting} className="px-5 py-2.5 rounded-lg border font-medium hover:bg-surface-alt disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={() => submit(true)} disabled={submitting} className="px-6 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </button>
        </div>
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
