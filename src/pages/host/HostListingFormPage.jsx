import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Loader2, Plus, Trash2, X, Upload, ImagePlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ExperienceScheduling from '../../components/admin/ExperienceScheduling.jsx';
import ExperienceTaxonomyPicker from '../../components/admin/ExperienceTaxonomyPicker.jsx';

// Global rule: every image upload must be under 5MB.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const STEPS = ['Basic info', 'Description', 'Pricing', 'Photos'];
const DURATIONS = [{ label: '1 hr', h: 1 }, { label: '2 hrs', h: 2 }, { label: '3 hrs', h: 3 }, { label: '4 hrs', h: 4 }];
const FACILITIES = ['Restrooms', 'Parking', 'Locker', 'Wifi', 'Cafe', 'First Aid', 'Changing Room', 'Guide', 'Equipment'];
const PRICE_METHODS = [
  { value: 'per_person', label: 'Per person' },
  { value: 'per_day', label: 'Per day' },
  { value: 'days', label: 'Days (multi-day)' },
  { value: 'per_hours', label: 'By hours' },
];
const MODES = ['offline', 'online', 'hybrid'];

const blank = {
  audiences: [], categoryIds: [], typeIds: [],
  name: '', location: '', city: '', nearbyLocation: '', durationLabel: '',
  about: '', mode: 'offline',
  inclusions: [''], facilities: [], nearbyPlaces: [{ name: '', distance: '', unit: 'km' }], faqs: [],
  termsConditions: '', privacyPolicy: '', refundCancellationPolicy: '',
  priceMethod: 'per_person', adultPrice: '', childrenEnabled: false, childBands: [],
  capacity: 8, durationHours: 0, durationMinutes: 0,
  schedule: { dates: [] }, photos: [], videos: [],
};

// basePath lets the Supplier Portal (Phase 4) reuse this exact wizard
// against /supplier/listings instead of /host/listings — same controller
// functions on the backend (host.controller.js resolves ownership from
// req.user vs req.supplier), same form, same everything else.
export default function HostListingFormPage({ basePath = '/host' }) {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  // Existing listing → prefill.
  useEffect(() => {
    if (!editing) return;
    let alive = true;
    api.get(`${basePath}/listings/${id}`)
      .then(({ data }) => { if (alive) setForm({ ...blank, ...((data.data || data).form || {}) }); })
      .catch(() => toast.error('Could not load listing'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [editing, id]);

  const canNext = useMemo(() => {
    if (step === 1) return !!form.name.trim() && !!form.categoryIds?.length && !!form.typeIds?.length;
    return true;
  }, [step, form]);

  const goNext = () => {
    if (step === 1 && !canNext) { toast.error('Add a title, category and type to continue'); return; }
    setStep((s) => Math.min(4, s + 1));
  };

  const submit = async (isReview) => {
    if (submitting) return;
    // At least 6 photos are mandatory before submitting for review.
    if (isReview && form.photos.filter(Boolean).length < 6) {
      return toast.error(`Add at least 6 photos before submitting — you have ${form.photos.filter(Boolean).length}.`);
    }
    setSubmitting(true);
    try {
      const payload = form.photos.length ? form : { ...form, photos: ['https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80'] };
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

  if (loading) return <div className="flex justify-center py-24 text-slate-400"><Loader2 className="animate-spin" size={26} /></div>;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-surface-alt">
      {/* Header + progress */}
      <div className="bg-white border-b px-4 md:px-8 py-4 sticky top-16 z-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate('/host/listings'))} className="w-9 h-9 rounded-full bg-surface-alt flex items-center justify-center hover:bg-slate-200">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight">{editing ? 'Edit listing' : STEPS[step - 1]}</h1>
              <p className="text-xs text-ink-muted">Step {step} of 4 · {STEPS[step - 1]}</p>
            </div>
          </div>
          <div className="flex gap-1.5 mt-3">
            {[1, 2, 3, 4].map((s) => <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-brand' : 'bg-slate-200'}`} />)}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto">
          {step === 1 && <Step1 form={form} patch={patch} />}
          {step === 2 && <Step2 form={form} patch={patch} />}
          {step === 3 && <Step3 form={form} patch={patch} />}
          {step === 4 && <Step4 form={form} patch={patch} />}
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-white border-t px-4 md:px-8 py-3 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex gap-3">
          {step < 4 ? (
            <button onClick={goNext} className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 disabled:opacity-50" disabled={!canNext}>
              Next
            </button>
          ) : (
            <>
              <button onClick={() => submit(false)} disabled={submitting} className="ml-auto px-5 py-2.5 rounded-lg border font-medium hover:bg-surface-alt disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save Draft'}
              </button>
              <button onClick={() => submit(true)} disabled={submitting} className="px-6 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit for Review'}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .win { width:100%; padding:0.625rem 0.875rem; border-radius:0.5rem; border:1px solid #d1d5db; outline:none; font-size:0.875rem; background:#fff; }
        .win:focus { border-color: rgb(var(--brand)); box-shadow: 0 0 0 3px rgb(var(--brand) / 0.15); }
      `}</style>
    </div>
  );
}

/* ---------- shared bits ---------- */
function Card({ children }) { return <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6 mb-4">{children}</div>; }
function L({ children }) { return <label className="text-sm font-semibold text-ink mb-1.5 block">{children}</label>; }
function Hint({ children }) { return <p className="text-xs text-ink-muted mb-2">{children}</p>; }
function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${active ? 'bg-brand text-ink border-brand' : 'bg-white text-ink border-slate-300 hover:border-slate-400'}`}>{children}</button>
  );
}

/* ---------- Step 1 ---------- */
export function Step1({ form, patch }) {
  return (
    <Card>
      <h2 className="text-xl font-display font-bold mb-4">Let’s start with the basics</h2>
      <div className="space-y-5">
        <ExperienceTaxonomyPicker
          source="public"
          value={{ audiences: form.audiences, categoryIds: form.categoryIds, typeIds: form.typeIds }}
          onChange={patch}
        />
        <div>
          <L>Experience title</L>
          <input className="win" value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Sunrise Kayaking at Goa Beach" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><L>Location</L><input className="win" value={form.location} onChange={(e) => patch({ location: e.target.value })} placeholder="City, State, Country" /></div>
          <div><L>City</L><input className="win" value={form.city} onChange={(e) => patch({ city: e.target.value })} placeholder="e.g. Goa" /></div>
        </div>
        <div>
          <L>Duration</L>
          <Hint>Used as the time-slot length in availability.</Hint>
          <div className="flex flex-wrap gap-2 items-center">
            {DURATIONS.map((d) => (
              <Chip key={d.label} active={form.durationLabel === d.label} onClick={() => patch({ durationLabel: d.label, durationHours: d.h, durationMinutes: 0 })}>{d.label}</Chip>
            ))}
            <div className="inline-flex items-center gap-2 ml-1">
              <input type="number" min="0" className="win w-20" value={form.durationHours || ''} onChange={(e) => patch({ durationHours: Number(e.target.value) || 0, durationLabel: `${Number(e.target.value) || 0}h${form.durationMinutes ? ` ${form.durationMinutes}m` : ''}` })} placeholder="hrs" />
              <input type="number" min="0" max="59" className="win w-20" value={form.durationMinutes || ''} onChange={(e) => patch({ durationMinutes: Math.min(59, Number(e.target.value) || 0), durationLabel: `${form.durationHours || 0}h${Number(e.target.value) ? ` ${Number(e.target.value)}m` : ''}` })} placeholder="min" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Step 2 ---------- */
export function Step2({ form, patch }) {
  const setInclusion = (i, v) => patch({ inclusions: form.inclusions.map((x, idx) => (idx === i ? v : x)) });
  return (
    <>
      <Card>
        <h2 className="text-xl font-display font-bold mb-4">Describe your experience</h2>
        <L>About this activity / event</L>
        <textarea className="win min-h-[110px]" value={form.about} onChange={(e) => patch({ about: e.target.value })} placeholder="What will guests experience? What makes it unique?" />
        <div className="mt-5">
          <L>Mode</L>
          <div className="flex gap-2">{MODES.map((m) => <Chip key={m} active={form.mode === m} onClick={() => patch({ mode: m })}>{m[0].toUpperCase() + m.slice(1)}</Chip>)}</div>
        </div>
      </Card>

      <Card>
        <L>What’s included</L>
        {form.inclusions.map((v, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input className="win" value={v} onChange={(e) => setInclusion(i, e.target.value)} placeholder="Describe what's included…" />
            <button type="button" onClick={() => patch({ inclusions: form.inclusions.filter((_, idx) => idx !== i) })} className="px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
          </div>
        ))}
        <button type="button" onClick={() => patch({ inclusions: [...form.inclusions, ''] })} className="text-sm font-semibold text-brand inline-flex items-center gap-1"><Plus size={14} /> Add inclusion</button>
      </Card>

      <Card>
        <L>Facilities</L>
        <Hint>Pick from the list or add your own.</Hint>
        <div className="flex flex-wrap gap-2">
          {[...FACILITIES, ...form.facilities.filter((f) => !FACILITIES.includes(f))].map((f) => {
            const on = form.facilities.includes(f);
            return <Chip key={f} active={on} onClick={() => patch({ facilities: on ? form.facilities.filter((x) => x !== f) : [...form.facilities, f] })}>{on ? '✓ ' : ''}{f}</Chip>;
          })}
        </div>
        <AddCustom placeholder="Add facility" onAdd={(t) => !form.facilities.includes(t) && patch({ facilities: [...form.facilities, t] })} />
      </Card>

      <Card>
        <L>Nearby places</L>
        <Hint>Famous spots near the location and how far they are.</Hint>
        {form.nearbyPlaces.map((it, i) => {
          const upd = (p) => patch({ nearbyPlaces: form.nearbyPlaces.map((x, idx) => (idx === i ? { ...x, ...p } : x)) });
          return (
            <div key={i} className="flex gap-2 mb-2">
              <input className="win flex-1" value={it.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Place name" />
              <input className="win w-20" value={it.distance} onChange={(e) => upd({ distance: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" />
              <select className="win w-24" value={it.unit || 'km'} onChange={(e) => upd({ unit: e.target.value })}>
                <option value="km">km</option><option value="min">min</option><option value="hr">hrs</option>
              </select>
              <button type="button" onClick={() => patch({ nearbyPlaces: form.nearbyPlaces.filter((_, idx) => idx !== i) })} className="px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
            </div>
          );
        })}
        <button type="button" onClick={() => patch({ nearbyPlaces: [...form.nearbyPlaces, { name: '', distance: '', unit: 'km' }] })} className="text-sm font-semibold text-brand inline-flex items-center gap-1"><Plus size={14} /> Add nearby place</button>
      </Card>

      <Card>
        <L>FAQs</L>
        {form.faqs.map((it, i) => {
          const upd = (p) => patch({ faqs: form.faqs.map((x, idx) => (idx === i ? { ...x, ...p } : x)) });
          return (
            <div key={i} className="bg-surface-alt rounded-xl p-3 mb-3">
              <input className="win font-semibold mb-2" value={it.question || ''} onChange={(e) => upd({ question: e.target.value })} placeholder="Question" />
              <textarea className="win min-h-[70px]" value={it.answer || ''} onChange={(e) => upd({ answer: e.target.value })} placeholder="Answer" />
              <button type="button" onClick={() => patch({ faqs: form.faqs.filter((_, idx) => idx !== i) })} className="text-xs text-red-600 font-semibold mt-2">Remove</button>
            </div>
          );
        })}
        <button type="button" onClick={() => patch({ faqs: [...form.faqs, { question: '', answer: '' }] })} className="text-sm font-semibold text-brand inline-flex items-center gap-1"><Plus size={14} /> Add FAQ</button>
      </Card>

      <Card>
        <L>Policies &amp; terms</L>
        <div className="space-y-4 mt-1">
          <div><span className="text-xs font-medium text-ink-muted">Terms &amp; Conditions</span><textarea className="win min-h-[70px] mt-1" value={form.termsConditions} onChange={(e) => patch({ termsConditions: e.target.value })} placeholder="e.g. Arrive 15 minutes early…" /></div>
          <div><span className="text-xs font-medium text-ink-muted">Privacy Policy</span><textarea className="win min-h-[70px] mt-1" value={form.privacyPolicy} onChange={(e) => patch({ privacyPolicy: e.target.value })} placeholder="How you handle guest data…" /></div>
          <div><span className="text-xs font-medium text-ink-muted">Refund &amp; Cancellation Policy</span><textarea className="win min-h-[70px] mt-1" value={form.refundCancellationPolicy} onChange={(e) => patch({ refundCancellationPolicy: e.target.value })} placeholder="e.g. Free cancellation up to 24 hrs before…" /></div>
        </div>
      </Card>
    </>
  );
}

/* ---------- Step 3 ---------- */
export function Step3({ form, patch }) {
  const perDay = form.priceMethod === 'per_day' || form.priceMethod === 'days';
  const addBand = () => {
    const last = form.childBands[form.childBands.length - 1];
    const start = last ? Math.min(14, Number(last.endAge) + 1) : 0;
    patch({ childBands: [...form.childBands, { startAge: start, endAge: Math.min(14, start + 4), charge: true, price: '' }] });
  };
  const setBand = (i, p) => patch({ childBands: form.childBands.map((b, idx) => (idx === i ? { ...b, ...p } : b)) });
  return (
    <>
      <Card>
        <h2 className="text-xl font-display font-bold mb-4">Set your price</h2>
        <L>Price method</L>
        <div className="flex flex-wrap gap-2">{PRICE_METHODS.map((m) => <Chip key={m.value} active={form.priceMethod === m.value} onClick={() => patch({ priceMethod: m.value })}>{m.label}</Chip>)}</div>
        <div className="mt-5 max-w-xs">
          <L>Adult price</L>
          <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 focus-within:ring-brand/20">
            <span className="text-ink-muted">₹</span>
            <input className="flex-1 px-2 py-2.5 outline-none text-sm" value={form.adultPrice} onChange={(e) => patch({ adultPrice: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" />
            <span className="text-xs text-ink-muted">/ {perDay ? 'day' : 'person'}</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <L>Add children pricing</L>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={form.childrenEnabled} onChange={(e) => patch({ childrenEnabled: e.target.checked, childBands: e.target.checked && form.childBands.length === 0 ? [{ startAge: 0, endAge: 5, charge: false, price: '' }] : form.childBands })} />
            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-brand peer-checked:after:translate-x-5 after:content-[''] after:absolute after:mt-0.5 after:ml-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition relative" />
          </label>
        </div>
        {form.childrenEnabled && (
          <div className="mt-3 space-y-3">
            <Hint>Define age bands (years). Turn “Set a price” off to make a band free.</Hint>
            {form.childBands.map((b, i) => (
              <div key={i} className="bg-surface-alt rounded-xl p-3 flex flex-wrap items-center gap-3">
                <input type="number" className="win w-20" value={b.startAge} onChange={(e) => setBand(i, { startAge: Number(e.target.value) || 0 })} />
                <span className="text-ink-muted text-sm">to</span>
                <input type="number" className="win w-20" value={b.endAge} onChange={(e) => setBand(i, { endAge: Number(e.target.value) || 0 })} />
                <label className="inline-flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={b.charge} onChange={(e) => setBand(i, { charge: e.target.checked })} /> Set a price
                </label>
                {b.charge ? (
                  <div className="inline-flex items-center border rounded-lg px-2"><span className="text-ink-muted text-sm">₹</span><input className="w-20 px-1 py-1.5 outline-none text-sm" value={b.price} onChange={(e) => setBand(i, { price: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>
                ) : <span className="text-emerald-600 font-semibold text-sm">Free</span>}
                <button type="button" onClick={() => patch({ childBands: form.childBands.filter((_, idx) => idx !== i) })} className="ml-auto text-red-600"><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" onClick={addBand} className="text-sm font-semibold text-brand inline-flex items-center gap-1"><Plus size={14} /> Add age band</button>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <L>Guests per session</L>
          <Stepper value={form.capacity} onChange={(v) => patch({ capacity: v })} />
        </div>
      </Card>

      <Card>
        <L>Availability &amp; scheduling</L>
        <ExperienceScheduling
          value={form.schedule}
          onChange={(s) => patch({ schedule: s })}
          durationMinutes={(Number(form.durationHours) || 0) * 60 + (Number(form.durationMinutes) || 0)}
        />
      </Card>
    </>
  );
}

/* ---------- Step 4 ---------- */
export function Step4({ form, patch }) {
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const upload = async (files) => {
    if (!files?.length) return;
    const oversized = files.filter((f) => f.size > MAX_IMAGE_BYTES);
    if (oversized.length) {
      oversized.forEach((f) => toast.error(`"${f.name}" is ${(f.size / (1024 * 1024)).toFixed(1)}MB — images must be smaller than 5MB.`));
      files = files.filter((f) => f.size <= MAX_IMAGE_BYTES);
    }
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        // eslint-disable-next-line no-await-in-loop
        const res = await api.post('/uploads/user-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const url = res.data?.data?.url;
        if (url) urls.push(url);
      }
      if (urls.length) patch({ photos: [...form.photos, ...urls] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Card>
        <h2 className="text-xl font-display font-bold mb-1">Add photos &amp; videos</h2>
        <Hint>The first photo is your cover. <strong>At least 6 photos are required</strong> before you can submit for review. Each image must be under 5MB.</Hint>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* At least 6 slots shown by default; a trailing "add more" tile once
              all 6 are filled — mirrors the app's photo grid. */}
          {Array.from({ length: Math.max(6, form.photos.length + 1) }).map((_, i) => {
            const url = form.photos[i];
            if (url) {
              return (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                  <img src={fileUrl(url)} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute bottom-1.5 left-1.5 bg-brand text-ink text-[10px] font-bold px-1.5 py-0.5 rounded">Cover</span>}
                  <button type="button" onClick={() => patch({ photos: form.photos.filter((_, idx) => idx !== i) })} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={13} /></button>
                </div>
              );
            }
            const isCover = i === 0 && form.photos.length === 0;
            return (
              <label key={i} className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${isCover ? 'border-brand/40 bg-brand/5 text-brand' : 'border-slate-300 text-slate-400 hover:border-brand hover:text-brand'}`}>
                {uploading ? <Loader2 className="animate-spin" size={22} /> : <ImagePlus size={22} />}
                <span className="text-xs mt-1 font-medium">{uploading ? 'Uploading…' : isCover ? 'Cover' : 'Add photo'}</span>
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
              </label>
            );
          })}
        </div>
      </Card>

      <Card>
        <L>Videos</L>
        <Hint>Paste a YouTube or MP4 link.</Hint>
        <div className="flex gap-2">
          <input className="win" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
          <button type="button" onClick={() => { const u = videoUrl.trim(); if (u) { patch({ videos: [...form.videos, u] }); setVideoUrl(''); } }} className="px-4 rounded-lg bg-brand text-ink font-semibold inline-flex items-center gap-1"><Plus size={15} /> Add</button>
        </div>
        {form.videos.length > 0 && (
          <div className="mt-3 space-y-2">
            {form.videos.map((v, i) => (
              <div key={i} className="flex items-center gap-2 bg-surface-alt rounded-lg px-3 py-2 text-sm">
                <span className="flex-1 truncate">{v}</span>
                <button type="button" onClick={() => patch({ videos: form.videos.filter((_, idx) => idx !== i) })} className="text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

/* ---------- tiny inputs ---------- */
function AddCustom({ placeholder, onAdd }) {
  const [t, setT] = useState('');
  return (
    <div className="flex gap-2 mt-3">
      <input className="win" value={t} onChange={(e) => setT(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (t.trim()) { onAdd(t.trim()); setT(''); } } }} />
      <button type="button" onClick={() => { if (t.trim()) { onAdd(t.trim()); setT(''); } }} className="px-4 rounded-lg bg-brand text-ink font-semibold">Add</button>
    </div>
  );
}
function Stepper({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-4">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="w-9 h-9 rounded-full border border-brand text-brand font-bold">−</button>
      <span className="font-bold text-lg w-6 text-center">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(100, value + 1))} className="w-9 h-9 rounded-full bg-brand text-ink font-bold">+</button>
    </div>
  );
}
