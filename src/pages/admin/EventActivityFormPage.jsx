import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Image as ImageIcon, MapPin, FileText, Settings,
  Ticket, PlusCircle, Plus, Trash2, Sparkles, User, Search, Star,
  CalendarClock, HelpCircle, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Dropzone from '../../components/admin/Dropzone.jsx';
import RichTextEditor from '../../components/admin/RichTextEditor.jsx';
import { GST_OPTIONS } from '../../utils/gst.js';
import DatePicker from '../../components/common/DatePicker.jsx';
import StarRatingInput from '../../components/admin/StarRatingInput.jsx';
import { FaqEditor } from '../../components/admin/KeyValueListEditor.jsx';
import usePersistedForm from '../../hooks/usePersistedForm.js';
import { mapEmbedSrc } from '../../utils/mapEmbed.js';
import {
  CATEGORIES, AUDIENCE_OPTIONS, COMMON_SECTIONS, CATEGORY_SCHEMA,
  HOST_FIELDS, SEO_FIELDS, REVIEW_FIELDS, categoryLabel,
  DAY_GROUPS, WEEK_DAYS, SCHEDULE_MODES, SLOT_INTERVALS, CONFIRMATION_OPTIONS,
} from '../../config/eventActivitySchema.js';

const blankForm = {
  title: '', subtitle: '', category: '', subCategory: '', activityType: 'offline', status: 'draft',
  audience: [],
  mainBanner: '', mobileBanner: '', thumbnail: '', youtubeUrl: '', gallery: [], promoVideos: [],
  venueName: '', venueAddress: '', landmark: '', city: '', state: '', country: 'India', pincode: '',
  mapEmbed: '', latitude: '', longitude: '',
  startDate: '', endDate: '', startTime: '', endTime: '', duration: '',
  totalSeats: '', availableSeats: '', minParticipants: '', maxParticipants: '',
  isPaid: true, currency: 'INR', gstRate: 0, adultPrice: '', childPrice: '', couplePrice: '', groupPrice: '',
  shortDescription: '', longDescription: '', highlights: '', whatMakesSpecial: '', inclusions: '', exclusions: '',
  refundPolicy: '', cancellationPolicy: '', termsConditions: '',
  faqs: [],
  schedule: {
    mode: 'fixed_slots', availability: [],
    availableFrom: '', availableTo: '',
    durationMin: '', durationMax: '',
    windowStart: '', windowEnd: '', minHours: '', maxHours: '', slotInterval: 60,
    totalCapacity: '', minNoticeHours: '', confirmation: 'instant',
    travelTime: '', pickupDrop: false, pickupDropNote: '', note: '',
  },
  hostName: '', hostBio: '', hostImage: '', hostInstagram: '', hostFacebook: '', hostWebsite: '',
  metaTitle: '', metaDescription: '', metaKeywords: [],
  rating: 0, userImages: [],
  tickets: [], addons: [],
  categoryData: {},
};

function Section({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-5">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center"><Icon size={18} /></div>
          <h3 className="font-display font-semibold">{title}</h3>
        </div>
        <span className="text-ink-muted text-xs">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t pt-5">{children}</div>}
    </div>
  );
}

// Generic field renderer driven by the schema `type`.
function EventField({ field, value, onChange }) {
  const { label, type, options, required } = field;
  const Lbl = <label className="label">{label}{required && ' *'}</label>;

  if (type === 'bool') {
    return (
      <label className="flex items-center gap-2 mt-6">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-sm">{label}</span>
      </label>
    );
  }
  if (type === 'textarea') {
    return <div>{Lbl}<textarea className="input" rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} /></div>;
  }
  if (type === 'richtext') {
    return <div>{Lbl}<RichTextEditor value={value || ''} onChange={onChange} /></div>;
  }
  if (type === 'select') {
    return (
      <div>{Lbl}
        <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— select —</option>
          {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (type === 'gst') {
    return (
      <div>{Lbl}
        <select className="input" value={Number(value) || 0} onChange={(e) => onChange(Number(e.target.value))}>
          {GST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  if (type === 'multi') {
    const sel = Array.isArray(value) ? value : [];
    const toggle = (o) => onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
    return (
      <div>{Lbl}
        <div className="flex flex-wrap gap-1.5">
          {(options || []).map((o) => (
            <button key={o} type="button" onClick={() => toggle(o)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${sel.includes(o) ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-ink-muted hover:border-brand/40'}`}>
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (type === 'tags') {
    const arr = Array.isArray(value) ? value : [];
    return <div>{Lbl}<input className="input" value={arr.join(', ')} onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Comma-separated" /></div>;
  }
  if (type === 'date') {
    return <div>{Lbl}<DatePicker value={value || ''} onChange={onChange} /></div>;
  }
  if (type === 'time') {
    return <div>{Lbl}<input type="time" className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} /></div>;
  }
  if (type === 'image') {
    return <div>{Lbl}<Dropzone accept="image/*" instant value={value} onChange={(u) => onChange(u || '')} /></div>;
  }
  if (type === 'gallery') {
    return <div>{Lbl}<Dropzone accept="image/*" multiple instant value={Array.isArray(value) ? value : []} onChange={(v) => onChange(v || [])} /></div>;
  }
  if (type === 'rating') {
    return <div>{Lbl}<div className="input !p-2.5"><StarRatingInput value={Number(value) || 0} onChange={onChange} /></div></div>;
  }
  if (type === 'map') {
    return (
      <div>{Lbl}
        <textarea className="input font-mono text-xs" rows={2} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder='Paste Google Maps "Embed a map" iframe, link or address' />
        {mapEmbedSrc(value) && (
          <iframe src={mapEmbedSrc(value)} title="map" className="w-full h-40 border-0 rounded-lg mt-2" loading="lazy" />
        )}
      </div>
    );
  }
  // text / number / price / video
  return (
    <div>{Lbl}
      <input
        type={type === 'number' || type === 'price' ? 'number' : type === 'video' ? 'url' : 'text'}
        step={type === 'price' ? '0.01' : undefined}
        className="input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={type === 'video' ? 'https://…' : type === 'price' ? '₹' : ''}
      />
    </div>
  );
}

const fieldCol = (f) => (f.col === 2 ? 'sm:col-span-2' : '');

export default function EventActivityFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const {
    value: form, setValue: setForm, hydrateFromServer, clearDraft, discardDraft, hasDraft,
  } = usePersistedForm(`event-activity-form:${id || 'new'}`, blankForm, { editing });
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const res = await api.get(`/event-activities/admin/${id}`);
      const e = res.data.data.event;
      hydrateFromServer({ ...blankForm, ...e, categoryData: e.categoryData || {} });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [editing, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const changeCat = (k, v) => setForm((s) => ({ ...s, categoryData: { ...(s.categoryData || {}), [k]: v } }));
  const toggleAudience = (a) => setForm((s) => ({ ...s, audience: (s.audience || []).includes(a) ? s.audience.filter((x) => x !== a) : [...(s.audience || []), a] }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) return toast.error('Title is required');
    if (!form.category) return toast.error('Pick a category');
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/event-activities/${id}`, form);
        toast.success('Saved'); clearDraft(); load();
      } else {
        const res = await api.post('/event-activities', form);
        toast.success('Created'); clearDraft();
        navigate(`/admin/event-activities/${res.data.data.event.id}/edit`, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  }

  const catFields = CATEGORY_SCHEMA[form.category] || [];

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/event-activities" className="p-2 rounded-lg hover:bg-surface-alt"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-display font-bold">{editing ? 'Edit Event / Activity' : 'New Event / Activity'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <button type="button" onClick={() => { if (confirm('Discard draft and reload?')) { discardDraft(); if (editing) load(); } }}
              className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100">Discard draft</button>
          )}
          <button disabled={submitting} className="btn-primary"><Save size={16} /> {submitting ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {/* Category + audience — always first */}
      <Section icon={Sparkles} title="Category & audience">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={(e) => change('category', e.target.value)}>
              <option value="">— select category —</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label flex items-center gap-1"><Search size={13} /> Who is it for?</label>
            <div className="flex flex-wrap gap-1.5">
              {AUDIENCE_OPTIONS.map((a) => (
                <button key={a} type="button" onClick={() => toggleAudience(a)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${(form.audience || []).includes(a) ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-ink-muted hover:border-brand/40'}`}>{a}</button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Common sections */}
      {COMMON_SECTIONS.map((sec) => (
        <Section key={sec.title} icon={iconFor(sec.title)} title={sec.title}>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
            {sec.fields.map((f) => (
              <div key={f.key} className={fieldCol(f)}>
                <EventField field={f} value={form[f.key]} onChange={(v) => change(f.key, v)} />
              </div>
            ))}
          </div>
        </Section>
      ))}

      {/* Media */}
      <Section icon={ImageIcon} title="Media">
        <div className="grid sm:grid-cols-3 gap-5">
          <div><label className="label">Main banner</label><Dropzone accept="image/*" instant value={form.mainBanner} onChange={(u) => change('mainBanner', u || '')} /></div>
          <div><label className="label">Mobile banner</label><Dropzone accept="image/*" instant value={form.mobileBanner} onChange={(u) => change('mobileBanner', u || '')} /></div>
          <div><label className="label">Thumbnail</label><Dropzone accept="image/*" instant value={form.thumbnail} onChange={(u) => change('thumbnail', u || '')} /></div>
        </div>
        <div className="mt-5">
          <label className="label">Gallery (multiple)</label>
          <Dropzone accept="image/*" multiple instant value={form.gallery} onChange={(v) => change('gallery', v || [])} />
        </div>
        <div className="mt-5">
          <label className="label">YouTube URL</label>
          <input className="input" value={form.youtubeUrl} onChange={(e) => change('youtubeUrl', e.target.value)} placeholder="https://youtube.com/…" />
        </div>
      </Section>

      {/* Availability & scheduling */}
      <Section icon={CalendarClock} title="Availability & scheduling">
        <ScheduleBuilder value={form.schedule} onChange={(v) => change('schedule', v)} />
      </Section>

      {/* FAQs */}
      <Section icon={HelpCircle} title="FAQs" defaultOpen={false}>
        <FaqEditor value={form.faqs} onChange={(v) => change('faqs', v)} />
      </Section>

      {/* Category-specific */}
      {form.category && (
        <Section icon={Sparkles} title={`${categoryLabel(form.category)} details`}>
          {catFields.length === 0 ? (
            <p className="text-sm text-ink-muted">No extra fields for this category.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
              {catFields.map((f) => (
                <div key={f.key} className={fieldCol(f)}>
                  <EventField field={f} value={form.categoryData?.[f.key]} onChange={(v) => changeCat(f.key, v)} />
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Tickets */}
      <Section icon={Ticket} title="Ticket builder" defaultOpen={false}>
        <RepeatableBuilder
          rows={form.tickets} onChange={(v) => change('tickets', v)}
          blank={{ ticketName: '', price: '', quantity: '', saleStartDate: '', saleEndDate: '', benefits: '' }}
          fields={[
            { key: 'ticketName', label: 'Ticket name', type: 'text' },
            { key: 'price', label: 'Price', type: 'number' },
            { key: 'quantity', label: 'Quantity', type: 'number' },
            { key: 'benefits', label: 'Benefits', type: 'text' },
          ]}
          addLabel="Add ticket"
        />
      </Section>

      {/* Add-ons */}
      <Section icon={PlusCircle} title="Add-on builder" defaultOpen={false}>
        <RepeatableBuilder
          rows={form.addons} onChange={(v) => change('addons', v)}
          blank={{ addonName: '', price: '', description: '' }}
          fields={[
            { key: 'addonName', label: 'Add-on name', type: 'text' },
            { key: 'price', label: 'Price', type: 'number' },
            { key: 'description', label: 'Description', type: 'text' },
          ]}
          addLabel="Add add-on"
        />
      </Section>

      {/* Host */}
      <Section icon={User} title="Host" defaultOpen={false}>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
          {HOST_FIELDS.map((f) => (
            <div key={f.key} className={fieldCol(f)}><EventField field={f} value={form[f.key]} onChange={(v) => change(f.key, v)} /></div>
          ))}
        </div>
      </Section>

      {/* SEO */}
      <Section icon={Search} title="SEO" defaultOpen={false}>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
          {SEO_FIELDS.map((f) => (
            <div key={f.key} className={fieldCol(f)}><EventField field={f} value={form[f.key]} onChange={(v) => change(f.key, v)} /></div>
          ))}
        </div>
      </Section>

      {/* Reviews */}
      <Section icon={Star} title="Reviews" defaultOpen={false}>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
          {REVIEW_FIELDS.map((f) => (
            <div key={f.key} className={fieldCol(f)}><EventField field={f} value={form[f.key]} onChange={(v) => change(f.key, v)} /></div>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-0 bg-surface/95 backdrop-blur border-t -mx-6 px-6 py-4 flex justify-end gap-2">
        <Link to="/admin/event-activities" className="btn-ghost">Cancel</Link>
        <button disabled={submitting} className="btn-primary"><Save size={16} /> {submitting ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

// Availability builder — day-groups with times, duration range, hourly window,
// travel time and pickup/drop. Renders the data behind the public "Quick Details".
function ScheduleBuilder({ value, onChange }) {
  const s = value && typeof value === 'object' ? value : {};
  const set = (patch) => onChange({ ...s, ...patch });
  const avail = Array.isArray(s.availability) ? s.availability : [];
  const setAvail = (next) => set({ availability: next });
  const addRow = () => setAvail([...avail, { dayGroup: 'All days', customDays: [], times: [] }]);
  const updRow = (i, patch) => setAvail(avail.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const delRow = (i) => setAvail(avail.filter((_, idx) => idx !== i));
  const mode = s.mode || 'fixed_slots';

  const showTimes = mode === 'fixed_slots' || mode === 'multi_day';

  return (
    <div className="space-y-5">
      {/* Mode */}
      <div>
        <label className="label">Booking mode</label>
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_MODES.map((m) => (
            <button key={m.value} type="button" onClick={() => set({ mode: m.value })}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${mode === m.value ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-ink-muted hover:border-brand/40'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Validity window — bookable only between these dates (optional) */}
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
        <div><label className="label">Bookable from (optional)</label><DatePicker value={s.availableFrom || ''} onChange={(v) => set({ availableFrom: v })} placeholder="Any time" /></div>
        <div><label className="label">Bookable until (optional)</label><DatePicker value={s.availableTo || ''} onChange={(v) => set({ availableTo: v })} placeholder="No end" /></div>
      </div>

      {/* Day-group + times rows */}
      <div>
        <label className="label">When is it available?</label>
        <div className="space-y-2">
          {avail.length === 0 && <p className="text-xs italic text-ink-muted">No availability rows yet.</p>}
          {avail.map((r, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <select className="input" value={r.dayGroup} onChange={(e) => updRow(i, { dayGroup: e.target.value })}>
                  {DAY_GROUPS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input className="input" value={r.note || ''} onChange={(e) => updRow(i, { note: e.target.value })} placeholder="Label (e.g. Morning batch)" />
                <input type="number" min="0" className="input w-24" value={r.seats ?? ''} onChange={(e) => updRow(i, { seats: e.target.value })} placeholder="Seats" title="Seats for this slot group" />
                <button type="button" onClick={() => delRow(i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
              {r.dayGroup === 'Custom' && (
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((d) => {
                    const on = (r.customDays || []).includes(d);
                    return (
                      <button key={d} type="button"
                        onClick={() => updRow(i, { customDays: on ? r.customDays.filter((x) => x !== d) : [...(r.customDays || []), d] })}
                        className={`rounded-full border px-2.5 py-1 text-xs ${on ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-ink-muted'}`}>{d}</button>
                    );
                  })}
                </div>
              )}
              {r.dayGroup === 'Specific dates' && (
                <DateChips dates={r.dates || []} onChange={(d) => updRow(i, { dates: d })} />
              )}
              {showTimes && <TimeChips times={r.times || []} onChange={(t) => updRow(i, { times: t })} />}
            </div>
          ))}
        </div>
        <button type="button" onClick={addRow} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><Plus size={15} /> Add availability</button>
      </div>

      {/* Duration */}
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
        <div><label className="label">Duration (min)</label><input className="input" value={s.durationMin || ''} onChange={(e) => set({ durationMin: e.target.value })} placeholder="e.g. 1 hr" /></div>
        <div><label className="label">Duration (max)</label><input className="input" value={s.durationMax || ''} onChange={(e) => set({ durationMax: e.target.value })} placeholder="e.g. 1 hr 15 mins" /></div>
      </div>

      {/* Hourly / range window */}
      {(mode === 'hourly' || mode === 'range') && (
        <div className="grid sm:grid-cols-4 gap-x-6 gap-y-4">
          <div><label className="label">Window start</label><input type="time" className="input" value={s.windowStart || ''} onChange={(e) => set({ windowStart: e.target.value })} /></div>
          <div><label className="label">Window end</label><input type="time" className="input" value={s.windowEnd || ''} onChange={(e) => set({ windowEnd: e.target.value })} /></div>
          <div><label className="label">Min hours</label><input type="number" min="1" className="input" value={s.minHours || ''} onChange={(e) => set({ minHours: e.target.value })} /></div>
          <div><label className="label">Max hours</label><input type="number" min="1" className="input" value={s.maxHours || ''} onChange={(e) => set({ maxHours: e.target.value })} /></div>
          {mode === 'hourly' && (
            <div><label className="label">Slot interval</label>
              <select className="input" value={s.slotInterval || 60} onChange={(e) => set({ slotInterval: parseInt(e.target.value, 10) })}>
                {SLOT_INTERVALS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Booking rules */}
      <div className="grid sm:grid-cols-3 gap-x-6 gap-y-4">
        <div><label className="label">Total capacity (optional)</label><input type="number" min="0" className="input" value={s.totalCapacity ?? ''} onChange={(e) => set({ totalCapacity: e.target.value })} placeholder="Across all slots" /></div>
        <div><label className="label">Advance notice (hours)</label><input type="number" min="0" className="input" value={s.minNoticeHours ?? ''} onChange={(e) => set({ minNoticeHours: e.target.value })} placeholder="e.g. 24" /></div>
        <div><label className="label">Confirmation</label>
          <select className="input" value={s.confirmation || 'instant'} onChange={(e) => set({ confirmation: e.target.value })}>
            {CONFIRMATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Logistics */}
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
        <div><label className="label">Travel time</label><input className="input" value={s.travelTime || ''} onChange={(e) => set({ travelTime: e.target.value })} placeholder="e.g. 37 mins from city center" /></div>
        <div className="flex flex-col">
          <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={!!s.pickupDrop} onChange={(e) => set({ pickupDrop: e.target.checked })} /><span className="text-sm">Pickup &amp; drop available</span></label>
          {s.pickupDrop && <input className="input mt-2" value={s.pickupDropNote || ''} onChange={(e) => set({ pickupDropNote: e.target.value })} placeholder="e.g. Add on at booking" />}
        </div>
      </div>

      {/* Free-text availability note */}
      <div>
        <label className="label">Availability note (optional)</label>
        <input className="input" value={s.note || ''} onChange={(e) => set({ note: e.target.value })} placeholder="Any extra timing info shown to guests" />
      </div>
    </div>
  );
}

// Specific-date adder (stores ISO YYYY-MM-DD strings).
function DateChips({ dates, onChange }) {
  const [d, setD] = useState('');
  const add = () => { if (d && !dates.includes(d)) onChange([...dates, d]); setD(''); };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {dates.map((x) => (
          <span key={x} className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-xs text-white">
            {x}<button type="button" onClick={() => onChange(dates.filter((y) => y !== x))}><X size={11} /></button>
          </span>
        ))}
        {dates.length === 0 && <span className="text-[11px] text-ink-muted">Add specific dates</span>}
      </div>
      <div className="flex gap-2 items-end">
        <div className="w-44"><DatePicker value={d} onChange={setD} placeholder="Pick a date" /></div>
        <button type="button" onClick={add} disabled={!d} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Add date</button>
      </div>
    </div>
  );
}

// Simple time-chip adder (HH:MM 24h → stored as strings).
function TimeChips({ times, onChange }) {
  const [t, setT] = useState('');
  const add = () => { if (t && !times.includes(t)) onChange([...times, t]); setT(''); };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {times.map((x) => (
          <span key={x} className="inline-flex items-center gap-1 rounded-full bg-brand-700/90 bg-brand px-2 py-0.5 text-xs text-white">
            {x}<button type="button" onClick={() => onChange(times.filter((y) => y !== x))}><X size={11} /></button>
          </span>
        ))}
        {times.length === 0 && <span className="text-[11px] text-ink-muted">No times — add slots below</span>}
      </div>
      <div className="flex gap-2">
        <input type="time" className="input w-36" value={t} onChange={(e) => setT(e.target.value)} />
        <button type="button" onClick={add} disabled={!t} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Add time</button>
      </div>
    </div>
  );
}

function RepeatableBuilder({ rows, onChange, blank, fields, addLabel }) {
  const list = Array.isArray(rows) ? rows : [];
  const update = (idx, patch) => onChange(list.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const add = () => onChange([...list, { ...blank }]);
  const remove = (idx) => onChange(list.filter((_, i) => i !== idx));
  return (
    <div className="space-y-3">
      {list.length === 0 && <p className="text-sm italic text-ink-muted">None yet.</p>}
      {list.map((r, idx) => (
        <div key={idx} className="rounded-xl border border-slate-200 p-3 grid sm:grid-cols-[repeat(4,1fr)_auto] gap-3 items-end">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input type={f.type === 'number' ? 'number' : 'text'} className="input" value={r[f.key] ?? ''} onChange={(e) => update(idx, { [f.key]: e.target.value })} />
            </div>
          ))}
          <button type="button" onClick={() => remove(idx)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><Plus size={15} /> {addLabel}</button>
    </div>
  );
}

function iconFor(title) {
  if (title.includes('Location')) return MapPin;
  if (title.includes('Description')) return FileText;
  if (title.includes('Pricing')) return Settings;
  if (title.includes('Date')) return Settings;
  return Settings;
}
