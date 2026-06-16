import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Globe, Loader2, Building2, Package as PackageIcon, CalendarDays,
  Plus, Trash2, ChevronDown, ChevronUp, Check, X, ArrowLeft, BedDouble, Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import Dropzone from '../../components/admin/Dropzone.jsx';
import RichTextEditor from '../../components/admin/RichTextEditor.jsx';
import { GST_OPTIONS, withGst, gstAmount } from '../../utils/gst.js';

/* ───────────────────────── helpers ───────────────────────── */

const TYPE_OPTIONS = [
  { value: 'hotel', label: 'Hotel', icon: Building2 },
  { value: 'package', label: 'Package', icon: PackageIcon },
  { value: 'event', label: 'Event', icon: CalendarDays },
  { value: 'custom', label: 'Custom', icon: Globe },
];

const roomsOf = (property) => {
  const f = (property?.fields || []).find((x) => x.sectionKey === 'rooms');
  return Array.isArray(f?.deepDiveData?.rooms) ? f.deepDiveData.rooms : [];
};

// Flatten a PWA room's photos ({ categoryKey: [url,…] }) into a url list.
const roomPhotosOf = (room) => {
  const out = [];
  Object.values(room?.photos || {}).forEach((arr) => { if (Array.isArray(arr)) out.push(...arr); });
  return out.filter(Boolean);
};

const sectionsOf = (property) => (property?.fields || []).filter((f) => f.sectionKey !== 'rooms');

const inr = (n) => `₹${Number(n || 0).toLocaleString()}`;

// Mirror of the backend price modifier so the admin sees the live final price.
const applyMod = (price, mk) => {
  const p = Number(price) || 0;
  if (!mk) return p;
  const v = Number(mk.value) || 0;
  if (!v) return p;
  const delta = mk.type === 'fixed' ? v : p * (v / 100);
  return Math.max(0, mk.kind === 'discount' ? p - delta : p + delta);
};

const roomModFor = (markup, key) => {
  if (markup?.mode === 'per_room' && markup.perRoom?.[key]) return markup.perRoom[key];
  return { kind: markup?.kind || 'markup', type: markup?.type || 'percent', value: markup?.value || 0 };
};

/* ───────────────────────── page ───────────────────────── */

export default function PwaListingConfigPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);

  const [propertyType, setPropertyType] = useState('');
  const [customType, setCustomType] = useState('');
  const [markup, setMarkup] = useState({ mode: 'per_room', kind: 'markup', type: 'percent', value: 0, gstRate: 0, perRoom: {} });
  const [customFields, setCustomFields] = useState([]);
  const [gallery, setGallery] = useState({ removed: [], added: [] });
  const [roomConfig, setRoomConfig] = useState({});
  const [sectionConfig, setSectionConfig] = useState({});
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [highlights, setHighlights] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const draftKey = `pwa-listing-draft:${propertyId}`;
  const didInitDraft = useRef(false);
  // The server config version (updatedAt) the current edits are based on. A
  // draft is only valid for the EXACT version it was started from — this makes
  // persistence bulletproof regardless of clock/precision quirks.
  const baseVersionRef = useRef('');

  const load = useCallback(async () => {
    setLoading(true);
    setHydrated(false);
    didInitDraft.current = false;
    try {
      const res = await api.get(`/pwa/admin/listings/${propertyId}`);
      const prop = res.data.data.property;
      setProperty(prop);
      const cfg = prop.listingConfig || {};
      setPropertyType(cfg.propertyType || '');
      setCustomType(cfg.customType || '');
      setMarkup({ mode: 'per_room', kind: 'markup', type: 'percent', value: 0, gstRate: 0, perRoom: {}, ...(cfg.markup || {}) });
      setCustomFields(Array.isArray(cfg.customFields) ? cfg.customFields : []);
      setGallery({ removed: [], added: [], ...(cfg.gallery || {}) });
      setRoomConfig(cfg.roomConfig && typeof cfg.roomConfig === 'object' ? cfg.roomConfig : {});
      setSectionConfig(cfg.sectionConfig && typeof cfg.sectionConfig === 'object' ? cfg.sectionConfig : {});
      setShortDescription(cfg.shortDescription || '');
      setLongDescription(cfg.longDescription || '');
      setHighlights(cfg.highlights || '');

      // Record the server version these edits are based on.
      const serverVersion = cfg.updatedAt ? String(cfg.updatedAt) : '';
      baseVersionRef.current = serverVersion;

      // Restore a local draft ONLY when it was started from the SAME server
      // version that just loaded — i.e. genuine unsaved edits on top of the
      // current saved config. Any other draft is stale and is discarded so it
      // can never shadow the saved data (that looked like "data loss").
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && d.baseVersion === serverVersion && d.dirty) {
            if (d.propertyType !== undefined) setPropertyType(d.propertyType);
            if (d.customType !== undefined) setCustomType(d.customType);
            if (d.markup) setMarkup(d.markup);
            if (d.customFields) setCustomFields(d.customFields);
            if (d.gallery) setGallery(d.gallery);
            if (d.roomConfig) setRoomConfig(d.roomConfig);
            if (d.sectionConfig) setSectionConfig(d.sectionConfig);
            if (d.shortDescription !== undefined) setShortDescription(d.shortDescription);
            if (d.longDescription !== undefined) setLongDescription(d.longDescription);
            if (d.highlights !== undefined) setHighlights(d.highlights);
            toast('Restored your unsaved changes', { icon: '↩️' });
          } else {
            localStorage.removeItem(draftKey);
          }
        }
      } catch { localStorage.removeItem(draftKey); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load property');
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, [propertyId, draftKey]);

  useEffect(() => { load(); }, [load]);

  const rooms = roomsOf(property);
  const sections = sectionsOf(property);
  const listed = property?.listingConfig?.listingStatus === 'listed';
  const payload = () => ({
    propertyType, customType, markup, customFields, gallery, roomConfig, sectionConfig,
    shortDescription, longDescription, highlights,
  });

  // Persist an unsaved draft to localStorage so a refresh never loses edits.
  // We skip the very first run (triggered when the page finishes hydrating) so
  // simply opening a saved listing doesn't create a phantom draft. Drafts carry
  // the base server version + a `dirty` flag so only real unsaved edits restore.
  useEffect(() => {
    if (!hydrated) return;
    if (!didInitDraft.current) { didInitDraft.current = true; return; }
    try {
      localStorage.setItem(draftKey, JSON.stringify({ ...payload(), baseVersion: baseVersionRef.current, dirty: true, _ts: Date.now() }));
    } catch { /* quota */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, propertyType, customType, markup, customFields, gallery, roomConfig, sectionConfig, shortDescription, longDescription, highlights]);

  const clearDraft = () => { try { localStorage.removeItem(draftKey); } catch { /* */ } };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/pwa/admin/listings/${propertyId}/config`, payload());
      // Advance the base version so any further edits become a valid new draft.
      const savedAt = res?.data?.data?.config?.updatedAt;
      if (savedAt) baseVersionRef.current = String(savedAt);
      clearDraft();
      toast.success('Configuration saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!propertyType) return toast.error('Pick a property type first');
    setBusy('publish');
    try {
      await api.put(`/pwa/admin/listings/${propertyId}/config`, payload());
      await api.post(`/pwa/admin/listings/${propertyId}/publish`);
      clearDraft();
      toast.success('Property is now live on the website');
      navigate('/admin/pwa/listings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publish failed');
    } finally {
      setBusy(null);
    }
  };

  const unlist = async () => {
    setBusy('unlist');
    try {
      await api.post(`/pwa/admin/listings/${propertyId}/unlist`);
      toast.success('Removed from website');
      navigate('/admin/pwa/listings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unlist failed');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }
  if (!property) return null;

  const onlyHotel = propertyType === 'hotel' || propertyType === 'custom';

  return (
    <div className="max-w-5xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/admin/pwa/listings')} className="p-2 rounded-lg hover:bg-surface-alt">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-display font-bold truncate">{property.name}</h1>
          <p className="text-xs text-ink-muted truncate">
            {property.propertyCode || `#${property.id}`} · {property.address}
            {listed && <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold text-[11px]">LISTED</span>}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Property summary */}
        <PropertySummary property={property} />

        {/* Type */}
        <Card title="Property type" hint="Decides which website category it lists under.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPropertyType(value)}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-sm font-medium transition ${
                  propertyType === value ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-ink-muted hover:border-brand/40'
                }`}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
          </div>
          {propertyType === 'custom' && (
            <input className="input mt-3" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Custom type label (lists as a hotel)" />
          )}
        </Card>

        {/* Predefined listing content — shows as proper About / Highlights on
            the website (so PWA listings read like normal hotels). */}
        <Card title="Listing content" hint="These show as the website's headline, About and Highlights sections. Leave blank to skip a section.">
          <label className="label">Short description (one-liner under the title)</label>
          <RichTextEditor value={shortDescription} onChange={setShortDescription} placeholder="A short teaser shown on the card and at the top of the detail page" minHeight={90} />
          <label className="label mt-3">Long description (“About this property”)</label>
          <RichTextEditor value={longDescription} onChange={setLongDescription} placeholder="Full description shown in the About section" minHeight={140} />
          <label className="label mt-3">Highlights</label>
          <RichTextEditor value={highlights} onChange={setHighlights} placeholder="Key highlights — bullet list works great" minHeight={120} />
        </Card>

        {/* Pricing mode */}
        <Card title="Pricing — markup / discount" hint="Markup adds to, discount subtracts from the onboarded price before it shows on the website. In per-room mode each room has its own control next to its price below.">
          <div className="flex gap-2 mb-3">
            {[['per_room', 'Per room'], ['total', 'Same for all']].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMarkup((m) => ({ ...m, mode }))}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                  markup.mode === mode ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-ink-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {markup.mode === 'total' && (
            <ModControl v={markup} onChange={(val) => setMarkup((m) => ({ ...m, ...val }))} />
          )}
          {markup.mode === 'per_room' && (
            <p className="text-xs text-ink-muted">Open each room below to set its markup / discount.</p>
          )}
          {/* Global GST — default for every room; each room can override below. */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <label className="text-xs text-ink-muted">Default GST (added to every price)</label>
            <select
              className="input w-32"
              value={markup.gstRate || 0}
              onChange={(e) => setMarkup((m) => ({ ...m, gstRate: Number(e.target.value) }))}
            >
              {GST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="text-[11px] text-ink-muted">Off by default. Per-room override available in each room.</span>
          </div>
        </Card>

        {/* Rooms / price tiers — full details, images, fields + inline markup.
            Shown for every type because the room base-prices set the listing's
            "from" price (packages/events take the cheapest). For hotels each row
            also becomes a bookable room with its own photos & fields. */}
        {rooms.length > 0 && (
          <div>
            <SectionHeading
              icon={BedDouble}
              title={`${onlyHotel ? 'Rooms' : 'Rooms / price tiers'} (${rooms.length})`}
              subtitle={onlyHotel
                ? 'Each room exactly as captured in the PWA — details, photos, fields. Set its price, add markup/discount, swap images and add your own fields.'
                : 'Set a price per tier — the cheapest becomes the listing’s "from" price. Add markup/discount per tier.'}
            />
            <div className="space-y-2.5">
              {rooms.map((r, i) => (
                <RoomCard
                  key={r.rid || i}
                  room={r}
                  index={i}
                  markup={markup}
                  setMarkup={setMarkup}
                  cfg={roomConfig[r.rid || String(i)] || {}}
                  onCfg={(patch) => {
                    const key = r.rid || String(i);
                    setRoomConfig((rc) => ({ ...rc, [key]: { mainImage: '', removed: [], added: [], customFields: [], ...(rc[key] || {}), ...patch } }));
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sections — section-by-section, mirroring the PWA */}
        {sections.length > 0 && (
          <div>
            <SectionHeading icon={ImageIcon} title={`Sections (${sections.length})`} subtitle="Every onboarded section. Drop photos you don't want, add your own, and attach extra fields." />
            <div className="space-y-2.5">
              {sections.map((s) => (
                <SectionCard
                  key={s.sectionKey}
                  section={s}
                  cfg={sectionConfig[s.sectionKey] || {}}
                  onCfg={(patch) => setSectionConfig((sc) => ({ ...sc, [s.sectionKey]: { removed: [], added: [], customFields: [], ...(sc[s.sectionKey] || {}), ...patch } }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Extra website photos — section photos already feed the gallery; this
            is only for adding your own extra images. */}
        <Card title="Extra website photos" hint="Section photos above already publish to the website gallery. Add any extra images here.">
          <Dropzone accept="image/*" multiple instant value={gallery.added || []} onChange={(v) => setGallery((g) => ({ ...g, added: v || [] }))} placeholder="Drag, drop, upload or paste a link" />
        </Card>

        {/* Global additional fields */}
        <Card title="Additional fields (whole property)" hint="Extra text or images shown as their own titled blocks on the website — not merged into the description.">
          <CustomFieldsEditor fields={customFields} setFields={setCustomFields} />
        </Card>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur border-t px-5 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-end gap-2">
          <button onClick={() => navigate('/admin/pwa/listings')} className="btn-ghost text-sm">Cancel</button>
          <button onClick={saveConfig} disabled={saving} className="btn-ghost text-sm">{saving ? 'Saving…' : 'Save config'}</button>
          {listed && (
            <button onClick={unlist} disabled={busy} className="btn-ghost text-sm text-red-600">{busy === 'unlist' ? 'Removing…' : 'Unlist'}</button>
          )}
          <button onClick={publish} disabled={busy} className="btn-primary text-sm">
            <Globe size={15} /> {busy === 'publish' ? 'Publishing…' : listed ? 'Re-publish' : 'List on website'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── property summary ───────────────────────── */

function PropertySummary({ property }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between p-4">
        <span className="font-semibold text-sm">Property overview (from PWA)</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <dl className="px-4 pb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-t pt-4">
          <Field label="Owner" value={property.ownerName || property.owner?.name} />
          <Field label="Owner email" value={property.ownerEmail || property.owner?.email} />
          <Field label="Owner phone" value={property.ownerPhone || property.owner?.phone} />
          <Field label="Auditor" value={property.auditor?.name} />
          <Field label="Rooms" value={property.numberOfRooms} />
          <Field label="Status" value={property.status} />
          <div className="col-span-2"><Field label="Address" value={property.address} /></div>
        </dl>
      )}
    </div>
  );
}

/* ───────────────────────── room card ───────────────────────── */

function RoomCard({ room, index, markup, setMarkup, cfg, onCfg }) {
  const [open, setOpen] = useState(false);
  const key = room.rid || String(index);
  const photos = roomPhotosOf(room);
  const removed = new Set(cfg.removed || []);
  const perRoom = markup.mode === 'per_room';
  const mod = roomModFor(markup, key);
  // PWA doesn't capture room prices — admin types the base price here (falls
  // back to any PWA value if one exists).
  const basePrice = cfg.price != null && cfg.price !== '' ? Number(cfg.price) : (Number(room.price) || 0);
  const afterMod = applyMod(basePrice, mod);
  // Per-room GST → falls back to the global markup GST.
  const gstRate = cfg.gstRate != null ? cfg.gstRate : (markup.gstRate || 0);
  const finalPrice = withGst(afterMod, gstRate);
  const flags = ['ac', 'wifi', 'heater', 'hotWater', 'isWindow'].filter((k) => room[k]);

  const setRoomMod = (val) => setMarkup((m) => ({ ...m, perRoom: { ...(m.perRoom || {}), [key]: val } }));
  const togglePhoto = (u) => {
    const n = new Set(removed); n.has(u) ? n.delete(u) : n.add(u);
    onCfg({ removed: [...n] });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {photos[0] && <img src={fileUrl(photos[0])} alt="" className="h-11 w-14 rounded-lg object-cover shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{room.category || `Room ${index + 1}`}</div>
          <div className="text-xs text-ink-muted">
            {basePrice > 0 ? `${inr(basePrice)}/night` : 'Set a price'}
            {basePrice > 0 && finalPrice !== basePrice && (
              <span className="text-brand font-semibold"> → {inr(finalPrice)}</span>
            )}
            {photos.length > 0 ? ` · ${photos.length} 📷` : ''}
          </div>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t pt-3 space-y-4 text-sm">
          {/* Editable room name (defaults to PWA category) */}
          <div>
            <label className="label">Room name</label>
            <input className="input" value={cfg.name ?? (room.category || '')} onChange={(e) => onCfg({ name: e.target.value })} placeholder="Room name shown on the website" />
          </div>

          {/* Full PWA specs (as captured) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
            {room.sizeSqft != null && <Detail label="Size" value={`${room.sizeSqft} sqft`} />}
            {room.washroomType && <Detail label="Washroom" value={room.washroomType} />}
            {room.bedType && <Detail label="Bed" value={room.bedType} />}
            {room.maxOccupancy != null && <Detail label="Occupancy" value={room.maxOccupancy} />}
          </div>
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {flags.map((k) => <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{k}</span>)}
            </div>
          )}

          {/* Extra-person pricing — exactly as captured in the PWA */}
          {Array.isArray(room.extraPersonTiers) && room.extraPersonTiers.length > 0 && (
            <div>
              <label className="label">Extra-person pricing (from PWA)</label>
              <div className="rounded-lg border border-slate-200 divide-y text-xs">
                {room.extraPersonTiers.map((t, ti) => (
                  <div key={ti} className="flex items-center justify-between px-3 py-1.5">
                    <span>Age {t.ageFrom}{t.ageTo != null ? `–${t.ageTo}` : '+'} · {t.bed === 'with' ? 'With bed' : 'Without bed'}</span>
                    <span className="font-semibold">{t.priceType === 'custom' ? `₹${Number(t.price || 0).toLocaleString()}/person` : 'Complimentary'}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-ink-muted mt-1">Carried to the website room automatically.</p>
            </div>
          )}

          {/* Inline pricing — base price + markup/discount + GST */}
          <div className="rounded-lg bg-surface-alt p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Price on website</span>
              <span className="text-sm font-bold text-brand">{inr(finalPrice)}<span className="text-[11px] font-normal text-ink-muted">/night</span></span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs text-ink-muted">Base price ₹</label>
              <input
                type="number" min="0" className="input w-28"
                value={cfg.price ?? ''}
                onChange={(e) => onCfg({ price: e.target.value })}
                placeholder={Number(room.price) > 0 ? String(room.price) : '0'}
              />
              {perRoom ? (
                <ModControl compact v={markup.perRoom?.[key]} onChange={setRoomMod} />
              ) : (
                <span className="text-[11px] text-ink-muted">Markup/discount: Same-for-all (set above).</span>
              )}
              <select
                className="input w-28"
                value={cfg.gstRate != null ? cfg.gstRate : (markup.gstRate || 0)}
                onChange={(e) => onCfg({ gstRate: Number(e.target.value) })}
              >
                {GST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {/* Auto-calculated breakdown */}
            <div className="text-[11px] text-ink-muted">
              Base {inr(basePrice)}
              {afterMod !== basePrice && <> → after markup/discount {inr(afterMod)}</>}
              {gstRate > 0 && <> · +GST {gstRate}% ({inr(gstAmount(afterMod, gstRate))})</>}
              <> = <b className="text-brand">{inr(finalPrice)}</b></>
            </div>
          </div>

          {/* Onboarding photos — drop unwanted */}
          {photos.length > 0 && (
            <div>
              <label className="label">Room photos (untick to drop)</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {photos.map((u) => {
                  const off = removed.has(u);
                  return (
                    <button key={u} type="button" onClick={() => togglePhoto(u)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 ${off ? 'border-red-400 opacity-40' : 'border-transparent'}`}>
                      <img src={fileUrl(u)} alt="" className="w-full h-full object-cover" />
                      <span className={`absolute top-1 right-1 rounded-full p-0.5 ${off ? 'bg-slate-500' : 'bg-green-600'} text-white`}>{off ? <X size={10} /> : <Check size={10} />}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="label">Replace main image (optional)</label>
            <Dropzone accept="image/*" instant value={cfg.mainImage || ''} onChange={(u) => onCfg({ mainImage: u || '' })} placeholder="Drag, upload or paste a link" />
          </div>
          <div>
            <label className="label">Add more room images</label>
            <Dropzone accept="image/*" multiple instant value={cfg.added || []} onChange={(v) => onCfg({ added: v || [] })} placeholder="Drag, upload or paste a link" />
          </div>

          {/* Facilities — ONE merged editor: PWA facilities are pre-loaded and
              you can add/remove your own (no separate "theirs vs ours"). */}
          <div>
            <label className="label">Facilities (PWA + your additions)</label>
            <StringChips
              value={cfg.facilities ?? (Array.isArray(room.facilities) ? room.facilities : [])}
              onChange={(v) => onCfg({ facilities: v })}
              suggestions={['Air Conditioning', 'Wi-Fi', 'TV', 'Room Service', 'Mini Fridge', 'Electric Kettle', 'Hair Dryer', 'Wardrobe', '24/7 Hot Water', 'Toiletries', 'Work Desk', 'Balcony', 'Bathtub', 'Heater', 'Towels', 'Slippers']}
            />
          </div>

          {/* Per-room content — same predefined fields as the property level */}
          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Room content</p>
            <div>
              <label className="label">Short description</label>
              <RichTextEditor value={cfg.shortDescription ?? ''} onChange={(v) => onCfg({ shortDescription: v })} placeholder="One-liner shown under the room name" minHeight={80} />
            </div>
            <div>
              <label className="label">Long description</label>
              <RichTextEditor value={cfg.longDescription ?? ''} onChange={(v) => onCfg({ longDescription: v })} placeholder="Full room description" minHeight={120} />
            </div>
            <div>
              <label className="label">Highlights</label>
              <RichTextEditor value={cfg.highlights ?? (room.highlights || '')} onChange={(v) => onCfg({ highlights: v })} placeholder="Key highlights for this room" minHeight={100} />
            </div>
            <div>
              <label className="label">Inclusions</label>
              <RichTextEditor value={cfg.inclusions ?? ''} onChange={(v) => onCfg({ inclusions: v })} placeholder="What's included with this room" minHeight={100} />
            </div>
            <div>
              <label className="label">Exclusions</label>
              <RichTextEditor value={cfg.exclusions ?? ''} onChange={(v) => onCfg({ exclusions: v })} placeholder="What's not included" minHeight={100} />
            </div>
          </div>

          <div>
            <label className="label">Extra fields for this room</label>
            <CustomFieldsEditor fields={cfg.customFields || []} setFields={(fn) => onCfg({ customFields: typeof fn === 'function' ? fn(cfg.customFields || []) : fn })} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── string chips (facilities) ───────────────────────── */

function StringChips({ value = [], onChange, suggestions = [] }) {
  const [input, setInput] = useState('');
  const list = Array.isArray(value) ? value : [];
  const add = (v) => {
    const t = String(v || '').trim();
    if (!t || list.includes(t)) return;
    onChange([...list, t]);
    setInput('');
  };
  const remove = (v) => onChange(list.filter((x) => x !== v));
  const unused = suggestions.filter((s) => !list.includes(s));
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {list.map((f) => (
          <span key={f} className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand text-xs px-2.5 py-1">
            {f}
            <button type="button" onClick={() => remove(f)} className="hover:text-red-600"><X size={11} /></button>
          </span>
        ))}
        {list.length === 0 && <span className="text-xs text-ink-muted">No facilities yet.</span>}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
          placeholder="Add a facility and press Enter"
        />
        <button type="button" onClick={() => add(input)} className="btn-ghost text-xs">Add</button>
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-slate-200 text-ink-muted text-[11px] px-2 py-0.5 hover:border-brand/40 hover:text-brand">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── section card ───────────────────────── */

function SectionCard({ section, cfg, onCfg }) {
  const [open, setOpen] = useState(false);
  const photos = (Array.isArray(section.photoUrls) ? section.photoUrls : []).filter(Boolean);
  const removed = new Set(cfg.removed || []);
  const enabled = cfg.enabled !== false;
  const deep = Object.entries(section.deepDiveData || {}).filter(([k, v]) => k !== 'rooms' && v != null && v !== '' && typeof v !== 'object');

  const togglePhoto = (u) => {
    const n = new Set(removed); n.has(u) ? n.delete(u) : n.add(u);
    onCfg({ removed: [...n] });
  };

  return (
    <div className={`rounded-xl border bg-white ${enabled ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}>
      <div className="w-full flex items-center gap-3 px-4 py-3">
        {photos[0] && <img src={fileUrl(photos[0])} alt="" className="h-11 w-14 rounded-lg object-cover shrink-0" />}
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="font-semibold text-sm capitalize truncate">{section.sectionKey}</div>
          <div className="text-xs text-ink-muted">{photos.length > 0 ? `${photos.length} 📷` : 'No photos'}{!enabled && ' · hidden from website'}</div>
        </button>
        {/* Show-on-website toggle */}
        <button
          type="button"
          onClick={() => onCfg({ enabled: !enabled })}
          title={enabled ? 'Listed on website — click to hide' : 'Hidden — click to list'}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition shrink-0 ${enabled ? 'bg-brand' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="shrink-0 text-ink-muted">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t pt-3 space-y-4 text-sm">
          {section.description && <p className="text-xs text-ink-muted whitespace-pre-wrap">{section.description}</p>}
          {deep.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {deep.map(([k, v]) => <div key={k}><span className="text-ink-muted capitalize">{k}:</span> {String(v)}</div>)}
            </div>
          )}
          {photos.length > 0 && (
            <div>
              <label className="label">Section photos (untick to drop)</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {photos.map((u) => {
                  const off = removed.has(u);
                  return (
                    <button key={u} type="button" onClick={() => togglePhoto(u)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 ${off ? 'border-red-400 opacity-40' : 'border-transparent'}`}>
                      <img src={fileUrl(u)} alt="" className="w-full h-full object-cover" />
                      <span className={`absolute top-1 right-1 rounded-full p-0.5 ${off ? 'bg-slate-500' : 'bg-green-600'} text-white`}>{off ? <X size={10} /> : <Check size={10} />}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label className="label">Add images to this section</label>
            <Dropzone accept="image/*" multiple instant value={cfg.added || []} onChange={(v) => onCfg({ added: v || [] })} placeholder="Drag, upload or paste a link" />
          </div>
          <div>
            <label className="label">Extra fields for this section</label>
            <CustomFieldsEditor fields={cfg.customFields || []} setFields={(fn) => onCfg({ customFields: typeof fn === 'function' ? fn(cfg.customFields || []) : fn })} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── mod control ───────────────────────── */

function ModControl({ v, onChange, compact }) {
  const m = { kind: 'markup', type: 'percent', value: 0, ...(v || {}) };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select className={`input ${compact ? 'w-28' : 'w-32'}`} value={m.kind} onChange={(e) => onChange({ ...m, kind: e.target.value })}>
        <option value="markup">Markup +</option>
        <option value="discount">Discount −</option>
      </select>
      <select className="input w-20" value={m.type} onChange={(e) => onChange({ ...m, type: e.target.value })}>
        <option value="percent">%</option>
        <option value="fixed">₹</option>
      </select>
      <input type="number" min="0" className="input w-24" value={m.value}
        onChange={(e) => onChange({ ...m, value: e.target.value })} placeholder={m.type === 'percent' ? '15' : '500'} />
    </div>
  );
}

/* ───────────────────────── custom fields (rich text) ───────────────────────── */

function CustomFieldsEditor({ fields, setFields }) {
  const add = (kind) => setFields((f) => [...f, { id: `cf-${Date.now()}`, kind, name: '', value: '' }]);
  const update = (idx, patch) => setFields((f) => f.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const remove = (idx) => setFields((f) => f.filter((_, i) => i !== idx));

  return (
    <>
      <div className="space-y-3">
        {fields.map((f, idx) => (
          <div key={f.id || idx} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold uppercase">{f.kind}</span>
              <input className="input flex-1" value={f.name} onChange={(e) => update(idx, { name: e.target.value })} placeholder="Field title (e.g. About, Special note)" />
              <button onClick={() => remove(idx)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
            </div>
            {f.kind === 'image' ? (
              <Dropzone accept="image/*" instant value={f.value || ''} onChange={(u) => update(idx, { value: u || '' })} placeholder="Drag, upload or paste a link" />
            ) : (
              <RichTextEditor value={f.value} onChange={(v) => update(idx, { value: v })} placeholder="Write the content — formatting supported" minHeight={120} />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => add('text')} className="btn-ghost text-xs"><Plus size={14} /> Text field</button>
        <button onClick={() => add('image')} className="btn-ghost text-xs"><Plus size={14} /> Image field</button>
      </div>
    </>
  );
}

/* ───────────────────────── small bits ───────────────────────── */

function Card({ title, hint, children }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold text-sm">{title}</h3>
      {hint && <p className="text-[11px] text-ink-muted mt-0.5 mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-2 mb-2.5 mt-1">
      {Icon && <Icon size={18} className="text-brand mt-0.5" />}
      <div>
        <h2 className="font-display font-semibold">{title}</h2>
        {subtitle && <p className="text-[11px] text-ink-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink break-words">{value == null || value === '' ? '—' : String(value)}</dd>
    </div>
  );
}

function Detail({ label, value }) {
  return <div><span className="text-ink-muted">{label}:</span> <b>{String(value)}</b></div>;
}
