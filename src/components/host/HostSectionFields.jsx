import { useState } from 'react';
import { Plus, Trash2, X, ImagePlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import ExperienceScheduling from '../admin/ExperienceScheduling.jsx';
import ExperienceTaxonomyPicker from '../admin/ExperienceTaxonomyPicker.jsx';
import {
  L, Hint, Chip, AddCustom, Stepper,
  DURATIONS, FACILITIES, PRICE_METHODS, MODES, MAX_IMAGE_BYTES,
} from '../../pages/host/HostListingFormPage.jsx';

/*
  ONE review section's fields, in the host/supplier `form` shape.

  The listing wizard groups fields into four broad steps, but Center Ops
  objects to a single SECTION ("About", "Nearby places"). Rendering the whole
  step under each objection repeats unrelated inputs and, with two objections,
  shows the same fields twice — so this maps each section to exactly the
  inputs it owns, matching the backend's SECTION_FIELDS registry.

  Presentation (Chip/L/Hint/Stepper/…) is imported from the wizard rather than
  restyled here, so the resolve page and the wizard always look the same.
*/

/*
  Which `form` keys each section owns — the host-form counterpart of the
  backend's SECTION_FIELDS. Lets a caller tell whether THIS section was edited
  and save only its fields, so two open objections stay independent.
  `supplier` is deliberately absent — a supplier can't rewrite their own
  supplier record.
*/
export const SECTION_FORM_FIELDS = {
  basic: ['name', 'location', 'city', 'nearbyLocation', 'mode'],
  taxonomy: ['audiences', 'categoryIds', 'typeIds'],
  about: ['about'],
  media: ['photos', 'videos'],
  pricing: ['priceMethod', 'adultPrice', 'childrenEnabled', 'childBands', 'capacity'],
  duration: ['durationLabel', 'durationHours', 'durationMinutes'],
  schedule: ['schedule'],
  inclusions: ['inclusions'],
  facilities: ['facilities'],
  nearby: ['nearbyPlaces'],
  faqs: ['faqs'],
  policies: ['termsConditions', 'privacyPolicy', 'refundCancellationPolicy'],
};

export const EDITABLE_SECTIONS = Object.keys(SECTION_FORM_FIELDS);

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Has this particular section been edited, comparing against the last saved copy?
export const sectionDirty = (section, form, base) => (
  (SECTION_FORM_FIELDS[section] || []).some((f) => !same(form?.[f], base?.[f]))
);

// This section's fields lifted off the working form, for a scoped save.
export const pickSection = (section, form) => (
  (SECTION_FORM_FIELDS[section] || []).reduce((a, f) => { a[f] = form?.[f]; return a; }, {})
);

export default function HostSectionFields({ section, form, patch }) {
  switch (section) {
    case 'basic':
      return (
        <div className="space-y-4">
          <div>
            <L>Experience title</L>
            <input className="win" value={form.name || ''} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Sunrise Kayaking at Goa Beach" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><L>Location</L><input className="win" value={form.location || ''} onChange={(e) => patch({ location: e.target.value })} placeholder="City, State, Country" /></div>
            <div><L>City</L><input className="win" value={form.city || ''} onChange={(e) => patch({ city: e.target.value })} placeholder="e.g. Goa" /></div>
          </div>
          <div>
            <L>Nearby location</L>
            <input className="win" value={form.nearbyLocation || ''} onChange={(e) => patch({ nearbyLocation: e.target.value })} placeholder="e.g. near Baga Beach" />
          </div>
          <div>
            <L>Mode</L>
            <div className="flex gap-2">{MODES.map((m) => <Chip key={m} active={form.mode === m} onClick={() => patch({ mode: m })}>{m[0].toUpperCase() + m.slice(1)}</Chip>)}</div>
          </div>
        </div>
      );

    case 'taxonomy':
      return (
        <ExperienceTaxonomyPicker
          source="public"
          value={{ audiences: form.audiences, categoryIds: form.categoryIds, typeIds: form.typeIds }}
          onChange={patch}
        />
      );

    case 'about':
      return (
        <div>
          <L>About this activity / event</L>
          <textarea className="win min-h-[140px]" value={form.about || ''} onChange={(e) => patch({ about: e.target.value })} placeholder="What will guests experience? What makes it unique?" />
        </div>
      );

    case 'duration':
      return (
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
      );

    case 'inclusions':
      return <InclusionsFields form={form} patch={patch} />;

    case 'facilities':
      return (
        <div>
          <L>Facilities</L>
          <Hint>Pick from the list or add your own.</Hint>
          <div className="flex flex-wrap gap-2">
            {[...FACILITIES, ...(form.facilities || []).filter((f) => !FACILITIES.includes(f))].map((f) => {
              const on = (form.facilities || []).includes(f);
              return <Chip key={f} active={on} onClick={() => patch({ facilities: on ? form.facilities.filter((x) => x !== f) : [...(form.facilities || []), f] })}>{on ? '✓ ' : ''}{f}</Chip>;
            })}
          </div>
          <AddCustom placeholder="Add facility" onAdd={(t) => !(form.facilities || []).includes(t) && patch({ facilities: [...(form.facilities || []), t] })} />
        </div>
      );

    case 'nearby':
      return <NearbyFields form={form} patch={patch} />;

    case 'faqs':
      return <FaqFields form={form} patch={patch} />;

    case 'policies':
      return (
        <div className="space-y-4">
          <div><span className="text-xs font-medium text-ink-muted">Terms &amp; Conditions</span><textarea className="win min-h-[90px] mt-1" value={form.termsConditions || ''} onChange={(e) => patch({ termsConditions: e.target.value })} placeholder="e.g. Arrive 15 minutes early…" /></div>
          <div><span className="text-xs font-medium text-ink-muted">Privacy Policy</span><textarea className="win min-h-[90px] mt-1" value={form.privacyPolicy || ''} onChange={(e) => patch({ privacyPolicy: e.target.value })} placeholder="How you handle guest data…" /></div>
          <div><span className="text-xs font-medium text-ink-muted">Refund &amp; Cancellation Policy</span><textarea className="win min-h-[90px] mt-1" value={form.refundCancellationPolicy || ''} onChange={(e) => patch({ refundCancellationPolicy: e.target.value })} placeholder="e.g. Free cancellation up to 24 hrs before…" /></div>
        </div>
      );

    case 'pricing':
      return <PricingFields form={form} patch={patch} />;

    case 'schedule':
      return (
        <div>
          <L>Availability &amp; scheduling</L>
          <ExperienceScheduling
            value={form.schedule}
            onChange={(s) => patch({ schedule: s })}
            durationMinutes={(Number(form.durationHours) || 0) * 60 + (Number(form.durationMinutes) || 0)}
          />
        </div>
      );

    case 'media':
      return <MediaFields form={form} patch={patch} />;

    default:
      return (
        <p className="text-sm text-ink-muted">
          This section can’t be changed from your portal — please reply to your account manager instead.
        </p>
      );
  }
}

function InclusionsFields({ form, patch }) {
  const list = form.inclusions || [];
  return (
    <div>
      <L>What’s included</L>
      {list.map((v, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input className="win" value={v} onChange={(e) => patch({ inclusions: list.map((x, idx) => (idx === i ? e.target.value : x)) })} placeholder="Describe what's included…" />
          <button type="button" onClick={() => patch({ inclusions: list.filter((_, idx) => idx !== i) })} className="px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
        </div>
      ))}
      <button type="button" onClick={() => patch({ inclusions: [...list, ''] })} className="text-sm font-semibold text-brand inline-flex items-center gap-1"><Plus size={14} /> Add inclusion</button>
    </div>
  );
}

function NearbyFields({ form, patch }) {
  const list = form.nearbyPlaces || [];
  return (
    <div>
      <L>Nearby places</L>
      <Hint>Famous spots near the location and how far they are.</Hint>
      {list.map((it, i) => {
        const upd = (p) => patch({ nearbyPlaces: list.map((x, idx) => (idx === i ? { ...x, ...p } : x)) });
        return (
          <div key={i} className="flex gap-2 mb-2">
            <input className="win flex-1" value={it.name || ''} onChange={(e) => upd({ name: e.target.value })} placeholder="Place name" />
            <input className="win w-20" value={it.distance ?? ''} onChange={(e) => upd({ distance: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" />
            <select className="win w-24" value={it.unit || 'km'} onChange={(e) => upd({ unit: e.target.value })}>
              <option value="km">km</option><option value="min">min</option><option value="hr">hrs</option>
            </select>
            <button type="button" onClick={() => patch({ nearbyPlaces: list.filter((_, idx) => idx !== i) })} className="px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
          </div>
        );
      })}
      <button type="button" onClick={() => patch({ nearbyPlaces: [...list, { name: '', distance: '', unit: 'km' }] })} className="text-sm font-semibold text-brand inline-flex items-center gap-1"><Plus size={14} /> Add nearby place</button>
    </div>
  );
}

function FaqFields({ form, patch }) {
  const list = form.faqs || [];
  return (
    <div>
      <L>FAQs</L>
      {list.map((it, i) => {
        const upd = (p) => patch({ faqs: list.map((x, idx) => (idx === i ? { ...x, ...p } : x)) });
        return (
          <div key={i} className="bg-surface-alt rounded-xl p-3 mb-3">
            <input className="win font-semibold mb-2" value={it.question || ''} onChange={(e) => upd({ question: e.target.value })} placeholder="Question" />
            <textarea className="win min-h-[70px]" value={it.answer || ''} onChange={(e) => upd({ answer: e.target.value })} placeholder="Answer" />
            <button type="button" onClick={() => patch({ faqs: list.filter((_, idx) => idx !== i) })} className="text-xs text-red-600 font-semibold mt-2">Remove</button>
          </div>
        );
      })}
      <button type="button" onClick={() => patch({ faqs: [...list, { question: '', answer: '' }] })} className="text-sm font-semibold text-brand inline-flex items-center gap-1"><Plus size={14} /> Add FAQ</button>
    </div>
  );
}

function PricingFields({ form, patch }) {
  const bands = form.childBands || [];
  const perDay = form.priceMethod === 'per_day' || form.priceMethod === 'days';
  const setBand = (i, p) => patch({ childBands: bands.map((b, idx) => (idx === i ? { ...b, ...p } : b)) });
  const addBand = () => {
    const last = bands[bands.length - 1];
    const start = last ? Math.min(14, Number(last.endAge) + 1) : 0;
    patch({ childBands: [...bands, { startAge: start, endAge: Math.min(14, start + 4), charge: true, price: '' }] });
  };
  return (
    <div className="space-y-5">
      <div>
        <L>Price method</L>
        <div className="flex flex-wrap gap-2">{PRICE_METHODS.map((m) => <Chip key={m.value} active={form.priceMethod === m.value} onClick={() => patch({ priceMethod: m.value })}>{m.label}</Chip>)}</div>
      </div>
      <div className="max-w-xs">
        <L>Adult price</L>
        <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 focus-within:ring-brand/20">
          <span className="text-ink-muted">₹</span>
          <input className="flex-1 px-2 py-2.5 outline-none text-sm" value={form.adultPrice || ''} onChange={(e) => patch({ adultPrice: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" />
          <span className="text-xs text-ink-muted">/ {perDay ? 'day' : 'person'}</span>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <L>Add children pricing</L>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={!!form.childrenEnabled} onChange={(e) => patch({ childrenEnabled: e.target.checked, childBands: e.target.checked && bands.length === 0 ? [{ startAge: 0, endAge: 5, charge: false, price: '' }] : bands })} />
            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-brand peer-checked:after:translate-x-5 after:content-[''] after:absolute after:mt-0.5 after:ml-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition relative" />
          </label>
        </div>
        {form.childrenEnabled && (
          <div className="mt-3 space-y-3">
            <Hint>Define age bands (years). Turn “Set a price” off to make a band free.</Hint>
            {bands.map((b, i) => (
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
                <button type="button" onClick={() => patch({ childBands: bands.filter((_, idx) => idx !== i) })} className="ml-auto text-red-600"><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" onClick={addBand} className="text-sm font-semibold text-brand inline-flex items-center gap-1"><Plus size={14} /> Add age band</button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <L>Guests per session</L>
        <Stepper value={form.capacity || 1} onChange={(v) => patch({ capacity: v })} />
      </div>
    </div>
  );
}

function MediaFields({ form, patch }) {
  const photos = form.photos || [];
  const videos = form.videos || [];
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const upload = async (picked) => {
    if (!picked?.length) return;
    const oversized = picked.filter((f) => f.size > MAX_IMAGE_BYTES);
    oversized.forEach((f) => toast.error(`"${f.name}" is ${(f.size / (1024 * 1024)).toFixed(1)}MB — images must be smaller than 5MB.`));
    const files = picked.filter((f) => f.size <= MAX_IMAGE_BYTES);
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
      if (urls.length) patch({ photos: [...photos, ...urls] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <L>Photos</L>
        <Hint>The first photo is your cover. <strong>At least 6 photos are required</strong> before you can send it back. Each image must be under 5MB.</Hint>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: Math.max(6, photos.length + 1) }).map((_, i) => {
            const url = photos[i];
            if (url) {
              return (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                  <img src={fileUrl(url)} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute bottom-1.5 left-1.5 bg-brand text-ink text-[10px] font-bold px-1.5 py-0.5 rounded">Cover</span>}
                  <button type="button" onClick={() => patch({ photos: photos.filter((_, idx) => idx !== i) })} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={13} /></button>
                </div>
              );
            }
            const isCover = i === 0 && photos.length === 0;
            return (
              <label key={i} className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${isCover ? 'border-brand/40 bg-brand/5 text-brand' : 'border-slate-300 text-slate-400 hover:border-brand hover:text-brand'}`}>
                {uploading ? <Loader2 className="animate-spin" size={22} /> : <ImagePlus size={22} />}
                <span className="text-xs mt-1 font-medium">{uploading ? 'Uploading…' : isCover ? 'Cover' : 'Add photo'}</span>
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
              </label>
            );
          })}
        </div>
      </div>
      <div>
        <L>Videos</L>
        <Hint>Paste a YouTube or MP4 link.</Hint>
        <div className="flex gap-2">
          <input className="win" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
          <button type="button" onClick={() => { const u = videoUrl.trim(); if (u) { patch({ videos: [...videos, u] }); setVideoUrl(''); } }} className="px-4 rounded-lg bg-brand text-ink font-semibold inline-flex items-center gap-1"><Plus size={15} /> Add</button>
        </div>
        {videos.length > 0 && (
          <div className="mt-3 space-y-2">
            {videos.map((v, i) => (
              <div key={i} className="flex items-center gap-2 bg-surface-alt rounded-lg px-3 py-2 text-sm">
                <span className="flex-1 truncate">{v}</span>
                <button type="button" onClick={() => patch({ videos: videos.filter((_, idx) => idx !== i) })} className="text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
