import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Image as ImageIcon, Tag, MapPin, Calendar, Clock,
  DollarSign, Settings, FileText, Shield, ShieldCheck, Map as MapIcon,
  Plus, Trash2, Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { mapEmbedSrc } from '../../utils/mapEmbed.js';
import { onlyStateLocations } from '../../utils/indianStates.js';
import Dropzone from '../../components/admin/Dropzone.jsx';
import RichTextEditor from '../../components/admin/RichTextEditor.jsx';
import GstSelect from '../../components/admin/GstSelect.jsx';
import PriceTypeSelect from '../../components/admin/PriceTypeSelect.jsx';
import usePersistedForm from '../../hooks/usePersistedForm.js';
import DatePicker from '../../components/common/DatePicker.jsx';

const blankForm = {
  name: '', slug: '',
  eventTypeId: '', locationId: '', cityName: '', address: '',
  mainImageUrl: '', galleryUrls: [],
  eventDate: '', endDate: '',
  startTime: '', endTime: '',
  price: 0, priceOriginal: '', gstRate: 0, priceType: 'per_person', priceLabel: '', currency: 'INR',
  minAge: '', maxAge: '',
  mapEmbedHtml: '',
  aboutRich: '', highlightsRich: '',
  termsConditions: '', privacyPolicy: '',
  sports: [],   // [{ name, defaultPrice }]
  isFeatured: false, isActive: true, isRefundable: true,
  sortOrder: 0,
};

function Section({ icon: Icon, title, children, defaultOpen = true, subtitle }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
            <Icon size={18} />
          </div>
          <div>
            <h3 className="font-display font-semibold">{title}</h3>
            {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <span className="text-ink-muted text-xs">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t pt-5 space-y-4">{children}</div>}
    </div>
  );
}

export default function EventFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();

  const {
    value: form,
    setValue: setForm,
    hydrateFromServer,
    clearDraft,
    discardDraft,
    hasDraft,
  } = usePersistedForm(`event-form:${id || 'new'}`, blankForm, { editing });
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);

  const [replaceGallery, setReplaceGallery] = useState(false);

  const [eventTypes, setEventTypes] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/event-types/all').then((r) => setEventTypes(r.data.data.items)),
      api.get('/locations/all').then((r) => setLocations(r.data.data.items)),
    ]).catch(() => toast.error('Failed to load taxonomies'));
  }, []);

  const load = useCallback(async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const res = await api.get(`/events/admin/${id}`);
      const e = res.data.data.event;
      setEvent(e);
      hydrateFromServer({
        name: e.name || '',
        slug: e.slug || '',
        eventTypeId: e.eventTypeId || '',
        locationId: e.locationId || '',
        cityName: e.cityName || '',
        mainImageUrl: e.mainImage || '',
        galleryUrls: [],
        address: e.address || '',
        eventDate: e.eventDate || '',
        endDate: e.endDate || '',
        startTime: e.startTime || '',
        endTime: e.endTime || '',
        price: e.price ?? 0,
        priceOriginal: e.priceOriginal ?? '',
        gstRate: e.gstRate ?? 0,
        priceType: e.priceType || 'per_person',
        priceLabel: e.priceLabel ?? '',
        currency: e.currency || 'INR',
        minAge: e.minAge ?? '',
        maxAge: e.maxAge ?? '',
        mapEmbedHtml: e.mapEmbedHtml || '',
        aboutRich: e.aboutRich || '',
        highlightsRich: e.highlightsRich || '',
        termsConditions: e.termsConditions || '',
        privacyPolicy: e.privacyPolicy || '',
        sports: e.sports || [],
        isFeatured: !!e.isFeatured,
        isActive: e.isActive ?? true,
        isRefundable: e.isRefundable ?? true,
        sortOrder: e.sortOrder ?? 0,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [editing, id]);

  useEffect(() => { load(); }, [load]);

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const selectedType = eventTypes.find((t) => String(t.id) === String(form.eventTypeId));
  const isSportEvent = !!selectedType?.isSport;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return toast.error('Name is required');

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
        fd.append(k, JSON.stringify(v));
      } else {
        fd.append(k, v);
      }
    });
    // Images uploaded instantly → URLs travel in the form.
    if (editing && replaceGallery) fd.append('replaceGallery', 'true');

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/events/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Event saved');
        clearDraft();
      } else {
        const res = await api.post('/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Event created');
        clearDraft();
        navigate(`/admin/events/${res.data.data.event.id}/edit`, { replace: true });
        return;
      }
      load();
      change('galleryUrls', []);
      setReplaceGallery(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const removeGalleryImg = async (imageId) => {
    if (!confirm('Remove this image?')) return;
    try {
      await api.delete(`/events/${id}/gallery/${imageId}`);
      toast.success('Image removed');
      load();
    } catch (err) {
      toast.error('Remove failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/events" className="p-2 rounded-lg hover:bg-surface-alt">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">
              {editing ? 'Edit Event' : 'New Event'}
            </h1>
            {editing && event && (
              <p className="text-xs text-ink-muted">
                Public URL:{' '}
                <Link to={`/events/${event.slug}`} target="_blank" className="text-brand hover:underline">
                  /events/{event.slug}
                </Link>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <button
              type="button"
              onClick={() => {
                if (!confirm('Discard unsaved draft and reload from the server?')) return;
                discardDraft();
                if (editing) load();
              }}
              className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100"
            >
              Discard draft
            </button>
          )}
          <button disabled={submitting} className="btn-primary">
            <Save size={16} /> {submitting ? 'Saving…' : 'Save event'}
          </button>
        </div>
      </div>

      <Section icon={Tag} title="Basic info">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
          <div className="sm:col-span-2">
            <label className="label">Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => change('name', e.target.value)}
              placeholder="Sunset Cricket Box Cricket Tournament"
              required
            />
          </div>
          <div>
            <label className="label">Property name</label>
            <input
              className="input"
              value={form.slug}
              onChange={(e) => change('slug', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input
              type="number" className="input"
              value={form.sortOrder}
              onChange={(e) => change('sortOrder', parseInt(e.target.value || 0, 10))}
            />
          </div>
        </div>
      </Section>

      <Section icon={MapPin} title="Type, location & schedule">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
          <div>
            <label className="label">Event type</label>
            <select
              className="input"
              value={form.eventTypeId}
              onChange={(e) => change('eventTypeId', e.target.value)}
            >
              <option value="">— Select —</option>
              {eventTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.isSport ? ' (sport — slot booking)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-ink-muted mt-1">
              Manage in{' '}
              <Link to="/admin/content/event-types" className="text-brand hover:underline">Event Types</Link>
            </p>
          </div>
          <div>
            <label className="label">State</label>
            <select
              className="input"
              value={form.locationId}
              onChange={(e) => change('locationId', e.target.value)}
            >
              <option value="">— Select —</option>
              {onlyStateLocations(locations).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">City</label>
            <input
              className="input"
              value={form.cityName}
              onChange={(e) => change('cityName', e.target.value)}
              placeholder="Type the city name"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Full address</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => change('address', e.target.value)}
              placeholder="Venue, street, area…"
            />
          </div>
          <div>
            <label className="label flex items-center gap-1"><Calendar size={12} /> Event date</label>
            <DatePicker
              value={form.eventDate}
              onChange={(v) => change('eventDate', v)}
              placeholder="Pick the event date"
            />
          </div>
          <div>
            <label className="label">End date (multi-day)</label>
            <DatePicker
              value={form.endDate}
              min={form.eventDate || undefined}
              onChange={(v) => change('endDate', v)}
              placeholder="Optional — for multi-day"
            />
          </div>
          <div>
            <label className="label flex items-center gap-1"><Clock size={12} /> Start time</label>
            <input
              type="time" className="input"
              value={form.startTime}
              onChange={(e) => change('startTime', e.target.value)}
            />
          </div>
          <div>
            <label className="label">End time</label>
            <input
              type="time" className="input"
              value={form.endTime}
              onChange={(e) => change('endTime', e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section icon={DollarSign} title="Pricing & age limits">
        <div className="grid sm:grid-cols-4 gap-x-6 gap-y-6">
          <div>
            <label className="label">Currency</label>
            <input className="input" value={form.currency} onChange={(e) => change('currency', e.target.value)} />
          </div>
          <PriceTypeSelect
            priceType={form.priceType}
            priceLabel={form.priceLabel}
            onType={(v) => change('priceType', v)}
            onLabel={(v) => change('priceLabel', v)}
          />
          <div>
            <label className="label">Price</label>
            <input
              type="number" step="0.01" className="input"
              value={form.price}
              onChange={(e) => change('price', e.target.value)}
            />
            {isSportEvent && (
              <p className="text-[11px] text-ink-muted mt-1">Slot prices can override this.</p>
            )}
          </div>
          <div>
            <label className="label">Original price</label>
            <input
              type="number" step="0.01" className="input"
              value={form.priceOriginal}
              onChange={(e) => change('priceOriginal', e.target.value)}
            />
          </div>
          <GstSelect value={form.gstRate} onChange={(v) => change('gstRate', v)} />
          <div>
            <label className="label">Min age</label>
            <input
              type="number" min="0" className="input"
              value={form.minAge}
              onChange={(e) => change('minAge', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Max age</label>
            <input
              type="number" min="0" className="input"
              value={form.maxAge}
              onChange={(e) => change('maxAge', e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section icon={ImageIcon} title="Media — main image & gallery">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="label">Main image</label>
            <Dropzone
              accept="image/*"
              instant
              value={form.mainImageUrl}
              onChange={(u) => change('mainImageUrl', u || '')}
              placeholder="Drag & drop main image, or click"
            />
          </div>
          <div>
            <label className="label">Gallery (multiple)</label>
            <Dropzone
              accept="image/*"
              multiple
              instant
              value={form.galleryUrls}
              onChange={(v) => change('galleryUrls', v || [])}
              placeholder="Drag & drop images, or click"
            />
            {editing && event?.gallery?.length > 0 && (
              <label className="flex items-center gap-2 text-sm mt-2">
                <input type="checkbox" checked={replaceGallery} onChange={(e) => setReplaceGallery(e.target.checked)} />
                Replace existing gallery instead of appending
              </label>
            )}
          </div>
        </div>

        {editing && event?.gallery?.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
            {event.gallery.map((g) => (
              <div key={g.id} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
                <img src={fileUrl(g.url)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeGalleryImg(g.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Sport sub-list + slot manager — only when type isSport */}
      {isSportEvent && (
        <Section
          icon={Trophy}
          title="Sports & slot booking"
          subtitle="List the sub-sports users can pick (e.g. Cricket, Football). Then manage hour slots below."
        >
          <SportsEditor value={form.sports} onChange={(v) => change('sports', v)} currency={form.currency} />
          {editing && event?.id ? (
            <SlotManager eventId={event.id} sports={form.sports} currency={form.currency} />
          ) : (
            <p className="text-xs text-ink-muted italic">Save the event first to manage slots.</p>
          )}
        </Section>
      )}

      <Section icon={FileText} title="Description & highlights">
        <div>
          <label className="label">Highlights</label>
          <RichTextEditor value={form.highlightsRich} onChange={(v) => change('highlightsRich', v)} />
        </div>
        <div>
          <label className="label">About this event</label>
          <RichTextEditor value={form.aboutRich} onChange={(v) => change('aboutRich', v)} />
        </div>
      </Section>

      <Section icon={MapIcon} title="Map embed" defaultOpen={false}>
        <textarea
          className="input font-mono text-xs"
          rows={3}
          value={form.mapEmbedHtml}
          onChange={(e) => change('mapEmbedHtml', e.target.value)}
          placeholder='Paste the Google Maps "Embed a map" <iframe …> tag, OR a maps link / address'
        />
        <p className="text-[11px] text-ink-muted mt-1">
          In Google Maps → Share → <strong>Embed a map</strong> → copy the HTML and paste it. A plain link or address also works.
        </p>
        {mapEmbedSrc(form.mapEmbedHtml) && (
          <div className="mt-3 rounded-lg overflow-hidden border bg-surface-alt">
            <div className="text-[11px] text-ink-muted px-3 py-1.5 bg-white border-b">Preview</div>
            <iframe
              src={mapEmbedSrc(form.mapEmbedHtml)}
              title="Map preview"
              className="w-full h-[280px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </Section>

      <Section icon={Shield} title="Terms & policies" defaultOpen={false}>
        <div>
          <label className="label">Terms & conditions</label>
          <RichTextEditor value={form.termsConditions} onChange={(v) => change('termsConditions', v)} />
        </div>
        <div>
          <label className="label">Privacy policy</label>
          <RichTextEditor value={form.privacyPolicy} onChange={(v) => change('privacyPolicy', v)} />
        </div>
      </Section>

      <Section icon={Settings} title="Status">
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => change('isActive', e.target.checked)} />
            <span className="text-sm">Active / visible on site</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => change('isFeatured', e.target.checked)} />
            <span className="text-sm">Featured</span>
          </label>
          <label className="flex items-center gap-2" title="When off, cancellations on this event will not refund any money regardless of the platform refund tiers.">
            <input type="checkbox" checked={form.isRefundable} onChange={(e) => change('isRefundable', e.target.checked)} />
            <span className="text-sm">Refundable on cancellation</span>
          </label>
        </div>
      </Section>

      <div className="sticky bottom-0 bg-surface/95 backdrop-blur border-t -mx-6 px-6 py-4 flex justify-end gap-2">
        <Link to="/admin/events" className="btn-ghost">Cancel</Link>
        <button disabled={submitting} className="btn-primary">
          <Save size={16} /> {submitting ? 'Saving…' : 'Save event'}
        </button>
      </div>
    </form>
  );
}

/* ────────────── Sub-components ────────────── */

function SportsEditor({ value = [], onChange, currency }) {
  const update = (i, k, v) => {
    const next = [...value];
    next[i] = { ...next[i], [k]: v };
    onChange(next);
  };
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { name: '', defaultPrice: '' }]);

  return (
    <div>
      <label className="label">Sub-sports</label>
      <div className="space-y-2">
        {value.map((s, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              className="input col-span-6"
              placeholder="Sport name (e.g. Cricket)"
              value={s.name || ''}
              onChange={(e) => update(i, 'name', e.target.value)}
            />
            <input
              className="input col-span-5"
              placeholder={`Default price (${currency || 'INR'})`}
              type="number" step="0.01"
              value={s.defaultPrice || ''}
              onChange={(e) => update(i, 'defaultPrice', e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded"
              title="Remove"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="btn-ghost text-xs mt-2"
      >
        <Plus size={14} /> Add sport
      </button>
    </div>
  );
}

function SlotManager({ eventId, sports, currency }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({
    sportName: sports[0]?.name || '',
    slotDate: '',
    startTime: '',
    endTime: '',
    capacity: 10,
    price: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${eventId}/slots`);
      setSlots(res.data.data.items || []);
    } catch (err) {
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const addSlot = async () => {
    if (!draft.slotDate || !draft.startTime || !draft.endTime) {
      return toast.error('Date, start and end time are required');
    }
    try {
      await api.post(`/events/${eventId}/slots`, { slots: [draft] });
      toast.success('Slot added');
      setDraft({ ...draft, slotDate: '', startTime: '', endTime: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
    }
  };

  const removeSlot = async (slotId) => {
    if (!confirm('Remove this slot?')) return;
    try {
      await api.delete(`/events/slots/${slotId}`);
      load();
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  const toggleSlot = async (s) => {
    try {
      await api.put(`/events/slots/${s.id}`, { isActive: !s.isActive });
      load();
    } catch (err) {
      toast.error('Toggle failed');
    }
  };

  // Group slots by date for compact display
  const grouped = slots.reduce((acc, s) => {
    (acc[s.slotDate] = acc[s.slotDate] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="border-t pt-5 mt-5">
      <h4 className="font-display font-semibold text-sm mb-3">Hour slots</h4>

      {/* New-slot row */}
      <div className="grid grid-cols-12 gap-2 mb-3">
        <select
          className="input col-span-3"
          value={draft.sportName || ''}
          onChange={(e) => setDraft({ ...draft, sportName: e.target.value })}
        >
          <option value="">— Sport —</option>
          {(sports || []).map((s, i) => s.name ? (
            <option key={i} value={s.name}>{s.name}</option>
          ) : null)}
        </select>
        <div className="col-span-3">
          <DatePicker
            value={draft.slotDate}
            onChange={(v) => setDraft({ ...draft, slotDate: v })}
            placeholder="Slot date"
          />
        </div>
        <input
          type="time" className="input col-span-2"
          value={draft.startTime}
          onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
        />
        <input
          type="time" className="input col-span-2"
          value={draft.endTime}
          onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
        />
        <input
          type="number" min="1" className="input col-span-1"
          placeholder="Cap"
          value={draft.capacity}
          onChange={(e) => setDraft({ ...draft, capacity: parseInt(e.target.value || 10, 10) })}
        />
        <button
          type="button"
          onClick={addSlot}
          className="btn-primary col-span-1 text-xs"
          title="Add slot"
        >
          <Plus size={14} />
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-ink-muted">Loading slots…</p>
      ) : slots.length === 0 ? (
        <p className="text-xs text-ink-muted italic">No slots yet. Add the first one above.</p>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => (
          <div key={date} className="mb-3">
            <div className="text-xs font-semibold text-ink-muted mb-1.5">
              {new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div className="flex flex-wrap gap-2">
              {list.map((s) => (
                <div
                  key={s.id}
                  className={`inline-flex items-center gap-2 border rounded-lg px-3 py-1.5 text-xs ${
                    !s.isActive ? 'opacity-50' : ''
                  } ${s.bookedCount >= s.capacity ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                >
                  <span className="font-medium">{s.startTime}–{s.endTime}</span>
                  {s.sportName && <span className="text-ink-muted">· {s.sportName}</span>}
                  <span className="text-ink-muted">· {s.bookedCount}/{s.capacity}</span>
                  {s.price && <span className="text-brand font-semibold">{currency || 'INR'} {s.price}</span>}
                  <button
                    type="button"
                    onClick={() => toggleSlot(s)}
                    className="text-[10px] text-ink-muted hover:text-ink"
                    title={s.isActive ? 'Disable' : 'Enable'}
                  >
                    {s.isActive ? 'on' : 'off'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSlot(s.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
