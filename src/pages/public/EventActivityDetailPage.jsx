import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Users, Ticket, Star, ArrowLeft, Route, Car, ChevronDown } from 'lucide-react';
import api, { fileUrl } from '../../services/api';
import { mapEmbedSrc } from '../../utils/mapEmbed.js';
import useRequireLogin from '../../hooks/useRequireLogin.js';
import { CATEGORY_SCHEMA, categoryLabel } from '../../config/eventActivitySchema.js';

export default function EventActivityDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const requireLogin = useRequireLogin();
  const [e, setE] = useState(null);
  const [loading, setLoading] = useState(true);

  const book = () => {
    if (!e) return;
    const target = `/book/event_activity/${e.id}`;
    requireLogin(() => navigate(target), { redirectTo: target });
  };

  useEffect(() => {
    setLoading(true);
    api.get(`/event-activities/${slug}`)
      .then((r) => setE(r.data?.data?.event || null))
      .catch(() => setE(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="container-app py-20 text-center text-ink-muted">Loading…</div>;
  if (!e) return <div className="container-app py-20 text-center text-ink-muted">Event not found.</div>;

  const catSchema = CATEGORY_SCHEMA[e.category] || [];
  const catData = e.categoryData || {};
  const renderCatValue = (f) => {
    const v = catData[f.key];
    if (v === undefined || v === null || v === '') return null;
    const display = Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
    return <div key={f.key}><dt className="text-[11px] uppercase tracking-wide text-ink-muted">{f.label}</dt><dd className="text-sm">{display}</dd></div>;
  };
  const banner = e.mainBanner || e.thumbnail;
  const gallery = Array.isArray(e.gallery) ? e.gallery : [];

  return (
    <div>
      {/* Banner */}
      <div className="relative h-[280px] md:h-[380px] bg-slate-200">
        {banner && <img src={fileUrl(banner)} alt={e.title} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 container-app pb-6 text-white">
          <Link to="/events-activities" className="inline-flex items-center gap-1 text-sm opacity-90 hover:opacity-100 mb-2"><ArrowLeft size={14} /> All events</Link>
          <span className="block text-xs font-semibold bg-white/20 backdrop-blur w-max px-2 py-0.5 rounded-full mb-2">{categoryLabel(e.category)}</span>
          <h1 className="text-2xl md:text-4xl font-display font-bold">{e.title}</h1>
          {e.subtitle && <p className="mt-1 text-white/90">{e.subtitle}</p>}
        </div>
      </div>

      <div className="container-app py-8 grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {e.startDate && <Fact icon={Calendar} label="Date" value={e.startDate} />}
            {(e.startTime || e.duration) && <Fact icon={Clock} label="Time" value={[e.startTime, e.duration].filter(Boolean).join(' · ')} />}
            {(e.venueName || e.city) && <Fact icon={MapPin} label="Venue" value={[e.venueName, e.city].filter(Boolean).join(', ')} />}
            {e.maxParticipants && <Fact icon={Users} label="Capacity" value={e.maxParticipants} />}
          </div>

          <QuickDetails schedule={e.schedule} />

          {e.shortDescription && <p className="text-ink-muted">{e.shortDescription}</p>}
          {e.longDescription && <Block title="About"><div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.longDescription }} /></Block>}
          {e.highlights && <Block title="Highlights"><div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.highlights }} /></Block>}
          {e.whatMakesSpecial && <Block title="What makes it special"><div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.whatMakesSpecial }} /></Block>}

          {/* Category-specific */}
          {catSchema.some((f) => catData[f.key] !== undefined && catData[f.key] !== '' && catData[f.key] !== null) && (
            <Block title={`${categoryLabel(e.category)} details`}>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">{catSchema.map(renderCatValue)}</dl>
            </Block>
          )}

          {(e.inclusions || e.exclusions) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {e.inclusions && <Block title="Inclusions"><div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.inclusions }} /></Block>}
              {e.exclusions && <Block title="Exclusions"><div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.exclusions }} /></Block>}
            </div>
          )}

          {gallery.length > 0 && (
            <Block title="Gallery">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {gallery.map((u, i) => <img key={i} src={fileUrl(u)} alt="" className="aspect-square w-full rounded-lg object-cover" />)}
              </div>
            </Block>
          )}

          {mapEmbedSrc(e.mapEmbed) && (
            <Block title="Location">
              <div className="rounded-xl overflow-hidden border">
                <iframe src={mapEmbedSrc(e.mapEmbed)} title="map" className="w-full h-72 border-0" loading="lazy" />
              </div>
              {e.venueAddress && <p className="text-sm text-ink-muted mt-2">{e.venueAddress}</p>}
            </Block>
          )}

          {e.hostName && (
            <Block title="Host">
              <div className="flex items-center gap-3">
                {e.hostImage && <img src={fileUrl(e.hostImage)} alt={e.hostName} className="w-14 h-14 rounded-full object-cover" />}
                <div>
                  <div className="font-semibold">{e.hostName}</div>
                  {e.hostBio && <p className="text-sm text-ink-muted">{e.hostBio}</p>}
                </div>
              </div>
            </Block>
          )}

          {Array.isArray(e.faqs) && e.faqs.length > 0 && (
            <Block title="FAQs">
              <div className="space-y-2">
                {e.faqs.map((f, i) => <Faq key={i} q={f.question || f.key} a={f.answer || f.value} />)}
              </div>
            </Block>
          )}

          {/* Policies */}
          {e.refundPolicy && <Block title="Refund policy"><div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.refundPolicy }} /></Block>}
          {e.cancellationPolicy && <Block title="Cancellation policy"><div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.cancellationPolicy }} /></Block>}
          {e.termsConditions && <Block title="Terms & conditions"><div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.termsConditions }} /></Block>}
        </div>

        {/* Sidebar: pricing + tickets + addons */}
        <aside className="space-y-4">
          <div className="card p-5 sticky top-20">
            <div className="text-xs text-ink-muted">Starting from</div>
            <div className="text-3xl font-bold text-brand">
              {e.isPaid && Number(e.adultPrice) > 0 ? `${e.currency} ${Number(e.adultPrice).toLocaleString()}` : 'Free'}
            </div>
            {e.rating > 0 && <div className="mt-1 inline-flex items-center gap-1 text-sm"><Star size={14} className="fill-amber-400 text-amber-400" /> {Number(e.rating).toFixed(1)}</div>}

            {Array.isArray(e.tickets) && e.tickets.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2 flex items-center gap-1"><Ticket size={13} /> Tickets</p>
                <div className="space-y-2">
                  {e.tickets.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <div className="font-medium">{t.ticketName || 'Ticket'}</div>
                        {t.benefits && <div className="text-[11px] text-ink-muted">{t.benefits}</div>}
                      </div>
                      <div className="font-bold text-brand">{e.currency} {Number(t.price || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(e.addons) && e.addons.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Add-ons</p>
                <div className="space-y-1.5">
                  {e.addons.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{a.addonName}</span>
                      <span className="text-ink-muted">{e.currency} {Number(a.price || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={book} className="btn-primary w-full mt-4">Book now</button>
            <p className="text-[11px] text-ink-muted text-center mt-2">Apply coupon codes at checkout.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="card p-3 text-center">
      <Icon size={16} className="mx-auto text-brand" />
      <div className="text-[10px] uppercase tracking-wide text-ink-muted mt-1">{label}</div>
      <div className="text-sm font-medium mt-0.5 line-clamp-2">{value}</div>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section>
      <h2 className="font-display font-semibold text-lg mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  if (!q) return null;
  return (
    <div className="border rounded-lg">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium">
        {q} <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && a && <div className="px-3 pb-3 text-sm text-ink-muted">{a}</div>}
    </div>
  );
}

// 24h "15:00" → "3:00 PM"
const fmtTime = (t) => {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return t || '';
  let [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
};

const dayGroupShort = (r) => {
  const g = r.dayGroup;
  if (g === 'Custom') return (r.customDays || []).join(', ') || 'Custom';
  if (g === 'Specific dates') return (r.dates || []).join(', ') || 'Specific dates';
  if (g === 'Weekends (Sat–Sun)') return 'Sat–Sun';
  if (g === 'Weekdays (Mon–Fri)') return 'Mon–Fri';
  return g;
};

// Renders the "Quick Details" panel from the schedule JSON (matches the
// availability / duration / travel-time / pickup layout).
function QuickDetails({ schedule }) {
  const s = schedule && typeof schedule === 'object' ? schedule : {};
  const avail = Array.isArray(s.availability) ? s.availability : [];
  const availText = avail
    .map((r) => {
      const label = r.note ? `${r.note}: ` : '';
      const days = dayGroupShort(r);
      const times = (r.times || []).map(fmtTime).join(', ');
      return times ? `${label}${days} (${times})` : `${label}${days}`;
    })
    .filter(Boolean)
    .join('; ');
  const durText = [s.durationMin, s.durationMax].filter(Boolean).join(' - ');
  const validity = [s.availableFrom, s.availableTo].filter(Boolean).join(' – ');
  const hasAny = availText || durText || s.travelTime || s.pickupDrop || validity || s.confirmation === 'on_request' || s.minNoticeHours;
  if (!hasAny) return null;

  return (
    <Block title="Quick Details">
      <div className="card p-5 space-y-4">
        {availText && <Row icon={Calendar} title={availText} />}
        {validity && <Row icon={Calendar} title={`Bookable: ${validity}`} />}
        {durText && <Row icon={Clock} title={`Duration: ${durText}`} />}
        {s.travelTime && <Row icon={Route} title={`Travel time: ${s.travelTime}`} sub="Average calculated from city centre" />}
        {s.pickupDrop && <Row icon={Car} title="Pickup & drop in premium cabs" sub={s.pickupDropNote || 'Add on at the time of booking'} />}
        {Number(s.minNoticeHours) > 0 && <Row icon={Clock} title={`Book at least ${s.minNoticeHours} hours in advance`} />}
        {s.confirmation === 'on_request' && <Row icon={Clock} title="Confirmation on request" sub="Subject to availability approval" />}
        {s.note && <Row icon={Calendar} title={s.note} />}
      </div>
    </Block>
  );
}

function Row({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} className="text-ink-muted mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold text-ink leading-snug">{title}</div>
        {sub && <div className="text-sm text-ink-muted">{sub}</div>}
      </div>
    </div>
  );
}
