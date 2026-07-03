import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Loader2, Plus, Trash2, X, Upload, ImagePlus, Clock, CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

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
  audiences: [], categoryId: null, typeId: null, typeName: '',
  name: '', location: '', city: '', nearbyLocation: '', durationLabel: '',
  about: '', mode: 'offline',
  inclusions: [''], facilities: [], nearbyPlaces: [{ name: '', distance: '', unit: 'km' }], faqs: [],
  termsConditions: '', privacyPolicy: '', refundCancellationPolicy: '',
  priceMethod: 'per_person', adultPrice: '', childrenEnabled: false, childBands: [],
  capacity: 8, durationHours: 0, durationMinutes: 0,
  dateRows: [], photos: [], videos: [],
};

const pad = (n) => String(n).padStart(2, '0');
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const toHHMM = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const fmtTime = (s) => { const [h, m] = s.split(':').map(Number); const ap = h < 12 ? 'AM' : 'PM'; return `${h % 12 || 12}:${pad(m)} ${ap}`; };

export default function HostListingFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(blank);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  // Taxonomy (categories); types load when a category is picked.
  useEffect(() => {
    api.get('/public/taxonomy').then(({ data }) => setCategories((data.data || data).categories || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!form.categoryId) { setTypes([]); return; }
    api.get('/public/types', { params: { categoryId: form.categoryId } })
      .then(({ data }) => setTypes((data.data || data).types || []))
      .catch(() => {});
  }, [form.categoryId]);

  // Existing listing → prefill.
  useEffect(() => {
    if (!editing) return;
    let alive = true;
    api.get(`/host/listings/${id}`)
      .then(({ data }) => { if (alive) setForm({ ...blank, ...((data.data || data).form || {}) }); })
      .catch(() => toast.error('Could not load listing'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [editing, id]);

  const canNext = useMemo(() => {
    if (step === 1) return !!form.name.trim() && !!form.categoryId && !!form.typeId;
    return true;
  }, [step, form]);

  const goNext = () => {
    if (step === 1 && !canNext) { toast.error('Add a title, category and type to continue'); return; }
    setStep((s) => Math.min(4, s + 1));
  };

  const submit = async (isReview) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = form.photos.length ? form : { ...form, photos: ['https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80'] };
      if (editing) await api.put(`/host/listings/${id}`, { form: payload, submit: isReview });
      else await api.post('/host/listings', { form: payload, submit: isReview });
      toast.success(isReview ? 'Submitted for review' : 'Saved as draft');
      navigate('/host/listings');
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
          {step === 1 && <Step1 form={form} patch={patch} categories={categories} types={types} />}
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
function Step1({ form, patch, categories, types }) {
  return (
    <Card>
      <h2 className="text-xl font-display font-bold mb-4">Let’s start with the basics</h2>
      <div className="space-y-5">
        <div>
          <L>Broad category</L>
          <select className="win" value={form.categoryId || ''} onChange={(e) => patch({ categoryId: Number(e.target.value) || null, typeId: null, typeName: '' })}>
            <option value="">Select a category…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <L>Type of activity / event</L>
          <select className="win" value={form.typeId || ''} disabled={!form.categoryId} onChange={(e) => {
            const t = types.find((x) => x.id === Number(e.target.value));
            patch({ typeId: t ? t.id : null, typeName: t ? t.name : '' });
          }}>
            <option value="">{form.categoryId ? 'Select a type…' : 'Pick a category first'}</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
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
function Step2({ form, patch }) {
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
              <input className="win flex-1" value={it.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Place" />
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
function Step3({ form, patch }) {
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

      <Card><Availability form={form} patch={patch} /></Card>
    </>
  );
}

function Availability({ form, patch }) {
  const [newDate, setNewDate] = useState('');
  const dur = (Number(form.durationHours) || 0) * 60 + (Number(form.durationMinutes) || 0) || 60;
  const rows = form.dateRows;
  const addDate = () => {
    if (!newDate || rows.some((r) => r.date === newDate)) return;
    patch({ dateRows: [...rows, { date: newDate, slots: [] }].sort((a, b) => a.date.localeCompare(b.date)) });
    setNewDate('');
  };
  const setSlots = (date, slots) => patch({ dateRows: rows.map((r) => (r.date === date ? { ...r, slots } : r)) });
  const removeDate = (date) => patch({ dateRows: rows.filter((r) => r.date !== date) });

  return (
    <div>
      <L>Availability &amp; scheduling</L>
      <Hint>Pick dates, then add time slots. Each slot is {Math.floor(dur / 60)}h{dur % 60 ? ` ${dur % 60}m` : ''} long (from your duration).</Hint>
      <div className="flex gap-2 items-center mb-4">
        <input type="date" className="win max-w-[200px]" value={newDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setNewDate(e.target.value)} />
        <button type="button" onClick={addDate} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand text-ink font-semibold"><CalendarDays size={16} /> Add date</button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No dates yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => <DateSlots key={r.date} row={r} dur={dur} onChange={(slots) => setSlots(r.date, slots)} onRemove={() => removeDate(r.date)} />)}
        </div>
      )}
    </div>
  );
}

function DateSlots({ row, dur, onChange, onRemove }) {
  const [start, setStart] = useState('09:00');
  const [winStart, setWinStart] = useState('09:00');
  const [winEnd, setWinEnd] = useState('17:00');
  const add = (s) => { if (row.slots.some((x) => x.start === s)) return; onChange([...row.slots, { start: s, end: toHHMM(toMin(s) + dur) }].sort((a, b) => toMin(a.start) - toMin(b.start))); };
  const generate = () => {
    const ws = toMin(winStart); const we = toMin(winEnd);
    if (we <= ws) { toast.error('End time must be after start'); return; }
    const merged = [...row.slots];
    for (let t = ws; t + dur <= we; t += dur) { const s = toHHMM(t); if (!merged.some((x) => x.start === s)) merged.push({ start: s, end: toHHMM(t + dur) }); }
    onChange(merged.sort((a, b) => toMin(a.start) - toMin(b.start)));
  };
  return (
    <div className="border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm text-ink flex items-center gap-2"><Clock size={14} className="text-brand" /> {new Date(row.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <button type="button" onClick={onRemove} className="text-red-600"><Trash2 size={15} /></button>
      </div>
      <div className="flex flex-wrap items-end gap-2 mb-2">
        <div className="text-xs text-ink-muted">
          Auto-generate:
          <div className="flex items-center gap-2 mt-1">
            <input type="time" className="win w-28" value={winStart} onChange={(e) => setWinStart(e.target.value)} />
            <span>to</span>
            <input type="time" className="win w-28" value={winEnd} onChange={(e) => setWinEnd(e.target.value)} />
            <button type="button" onClick={generate} className="px-3 py-2 rounded-lg bg-brand/15 text-brand-dark font-semibold text-sm">Generate</button>
          </div>
        </div>
        <div className="text-xs text-ink-muted">
          Or add one:
          <div className="flex items-center gap-2 mt-1">
            <input type="time" className="win w-28" value={start} onChange={(e) => setStart(e.target.value)} />
            <button type="button" onClick={() => add(start)} className="px-3 py-2 rounded-lg border font-semibold text-sm inline-flex items-center gap-1"><Plus size={13} /> Add slot</button>
          </div>
        </div>
      </div>
      {row.slots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {row.slots.map((s, i) => (
            <button key={i} type="button" onClick={() => onChange(row.slots.filter((_, idx) => idx !== i))} className="text-xs font-medium bg-white border rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 hover:border-red-300">
              {fmtTime(s.start)}–{fmtTime(s.end)} <X size={12} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Step 4 ---------- */
function Step4({ form, patch }) {
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const upload = async (files) => {
    if (!files?.length) return;
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
        <Hint>The first photo is your cover. Great photos increase bookings by up to 3×.</Hint>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {form.photos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
              <img src={fileUrl(url)} alt="" className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute bottom-1.5 left-1.5 bg-brand text-ink text-[10px] font-bold px-1.5 py-0.5 rounded">Cover</span>}
              <button type="button" onClick={() => patch({ photos: form.photos.filter((_, idx) => idx !== i) })} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={13} /></button>
            </div>
          ))}
          <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-brand hover:text-brand transition">
            {uploading ? <Loader2 className="animate-spin" size={22} /> : <ImagePlus size={22} />}
            <span className="text-xs mt-1 font-medium">{uploading ? 'Uploading…' : 'Add photo'}</span>
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
          </label>
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
