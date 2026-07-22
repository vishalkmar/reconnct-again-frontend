import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Loader2, ChevronLeft, MapPin, Clock, Pencil, CalendarCheck, Star, Users,
} from 'lucide-react';
import api, { fileUrl } from '../../services/api';

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Pending review', cls: 'bg-amber-100 text-amber-700' },
};
const METHOD_LABEL = {
  per_person: 'Per person', per_day: 'Per day', days: 'Days (multi-day)', per_hours: 'Price by hours',
};
const MODE_LABEL = { offline: 'Offline', online: 'Online', hybrid: 'Hybrid' };

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Edit only while it's still a plain draft. Once submitted (objections
// included) it's read-only here — fixes go through the resolve page.
const canEditOf = (l) => (
  typeof l.canEdit === 'boolean'
    ? l.canEdit
    : (l.reviewStatus === 'draft' && l.status === 'draft' && !l.review?.stage)
);
const ytId = (url) => (String(url).match(/(?:youtu\.be\/|v=)([\w-]{11})/) || [])[1];

const durationText = (f) => {
  const h = Number(f.durationHours) || 0;
  const m = Number(f.durationMinutes) || 0;
  if (!h && !m) return f.durationLabel || '';
  return [h ? `${h} hr` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
};

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 sm:p-6">
      <h2 className="font-semibold text-lg mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="text-ink mt-0.5">{value}</div>
    </div>
  );
}

/*
  Read-only detail view of one of MY listings (host or supplier portal — the
  basePath prop picks which). The wizard at /listings/:id/edit is for changing
  things; this is purely "what does this listing actually say", reachable from
  the listing card and its bookings page.

  Everything comes from the `form` half of GET /listings/:id, which the edit
  wizard already consumes — so no new endpoint, and the two can never drift.
*/
export default function HostListingViewPage({ basePath = '/host' }) {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get(`${basePath}/listings/${id}`)
      .then(({ data }) => {
        if (!alive) return;
        const d = data.data || data;
        setListing(d.listing || null);
        setForm(d.form || null);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, basePath]);

  if (loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" size={24} /></div>;
  if (!listing || !form) {
    return (
      <div className="max-w-3xl">
        <p className="text-ink-muted">Listing not found.</p>
        <Link to={`${basePath}/listings`} className="text-brand font-semibold">Back to listings</Link>
      </div>
    );
  }

  const badge = listing.isPublished
    ? { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' }
    : (STATUS_BADGE[listing.status] || STATUS_BADGE.draft);
  const photos = form.photos || [];
  const videos = form.videos || [];
  const inclusions = (form.inclusions || []).filter((it) => (it.kind === 'title_image' ? it.title || it.image : it.text));
  const nearby = (form.nearbyPlaces || []).filter((n) => n.name);
  const faqs = (form.faqs || []).filter((f) => f.question);
  const dur = durationText(form);

  return (
    <div className="max-w-3xl">
      <Link to={`${basePath}/listings`} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4">
        <ChevronLeft size={16} /> Back to My Listings
      </Link>

      {/* Hero */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-4 flex flex-col sm:flex-row">
        <div className="sm:w-56 h-40 bg-surface-alt shrink-0">
          {listing.image ? <img src={fileUrl(listing.image)} alt="" className="w-full h-full object-cover" /> : null}
        </div>
        <div className="p-5 flex-1">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
          <h1 className="text-xl font-display font-bold mt-2">{form.name || listing.title}</h1>
          <div className="flex items-center gap-3 text-sm text-ink-muted mt-1 flex-wrap">
            {(form.city || form.location) && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {[form.location, form.city].filter(Boolean).join(', ')}</span>}
            {dur && <span className="inline-flex items-center gap-1"><Clock size={13} /> {dur}</span>}
            {Number(listing.rating) > 0 && <span className="inline-flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" /> {listing.rating}</span>}
          </div>
          <div className="mt-2 text-brand-dark font-bold">
            {form.adultPrice ? rupee(form.adultPrice) : '—'}
            <span className="text-xs font-normal text-ink-muted"> / {listing.priceUnit}</span>
          </div>
          {/* Edit only survives while the listing is still the owner's to
              change (a plain draft). Once it's been submitted for review this
              page is read-only — matching the BD board, where a submitted
              experience has no Edit action at all. */}
          <div className="flex gap-2 mt-4">
            {canEditOf(listing) && (
              <Link to={`${basePath}/listings/${id}/edit`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-surface-alt transition">
                <Pencil size={14} /> Edit
              </Link>
            )}
            {/* Same rule as the listing card — bookings only exist once live. */}
            {listing.isPublished && (
              <Link to={`${basePath}/listings/${id}/bookings`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-ink text-sm font-bold hover:brightness-105 transition">
                <CalendarCheck size={14} /> See Bookings
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Card title="Basic details">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Field label="Name" value={form.name || '—'} />
            <Field label="Category" value={listing.category || form.typeName || '—'} />
            <Field label="Location" value={form.location || '—'} />
            <Field label="City" value={form.city || '—'} />
            {form.nearbyLocation && <Field label="Nearby location" value={form.nearbyLocation} />}
            <Field label="Mode" value={MODE_LABEL[form.mode] || form.mode || '—'} />
          </div>
        </Card>

        {form.about && (
          <Card title="About">
            <div className="rich-prose text-sm" dangerouslySetInnerHTML={{ __html: form.about }} />
          </Card>
        )}

        {(photos.length > 0 || videos.length > 0) && (
          <Card title="Photos & videos">
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.map((p, i) => <img key={i} src={fileUrl(p)} alt="" className="w-full h-28 rounded-lg object-cover border" />)}
              </div>
            )}
            {videos.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {videos.map((v, i) => {
                  const yid = ytId(v);
                  return (
                    <li key={i}>
                      <a href={v} target="_blank" rel="noreferrer" className="text-brand-dark hover:underline break-all">
                        {yid ? `YouTube · ${yid}` : v}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        <Card title="Pricing">
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Field label="Method" value={METHOD_LABEL[form.priceMethod] || form.priceMethod || '—'} />
            <Field label="Adult" value={form.adultPrice ? rupee(form.adultPrice) : '—'} />
            {dur && <Field label="Duration" value={dur} />}
            {form.capacity ? <Field label="Capacity" value={<span className="inline-flex items-center gap-1"><Users size={13} /> {form.capacity}</span>} /> : null}
          </div>
          {form.childrenEnabled && (form.childBands || []).length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Children</div>
              <ul className="space-y-1 text-sm">
                {form.childBands.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="text-ink">{b.from ?? b.minAge}–{b.to ?? b.maxAge} yrs</span>
                    <span className="text-ink-muted">{rupee(b.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Availability & slots intentionally hidden in this read-only view —
            a dense slot schedule reads as an unusable wall of times. Slots are
            managed in the edit wizard instead. */}

        {inclusions.length > 0 && (
          <Card title="Inclusions">
            <div className="space-y-4">
              {inclusions.map((it, i) => (
                it.kind === 'title_image' ? (
                  <div key={i} className="flex items-center gap-4">
                    {it.image && <img src={fileUrl(it.image)} alt="" className="w-20 h-20 rounded-lg object-cover border" />}
                    <div className="font-medium text-ink">{it.title}</div>
                  </div>
                ) : <div key={i} className="rich-prose text-sm" dangerouslySetInnerHTML={{ __html: it.text || '' }} />
              ))}
            </div>
          </Card>
        )}

        {(form.facilities || []).length > 0 && (
          <Card title="Facilities">
            <div className="flex flex-wrap gap-2">
              {form.facilities.map((f, i) => (
                <span key={i} className="text-sm px-3 py-1 rounded-full bg-surface-alt text-ink">{typeof f === 'string' ? f : f.name}</span>
              ))}
            </div>
          </Card>
        )}

        {nearby.length > 0 && (
          <Card title="Nearby places">
            <ul className="space-y-1 text-sm">
              {nearby.map((n, i) => {
                const dist = n.distance ?? n.distanceKm;
                const unit = n.unit || 'km';
                const unitLabel = unit === 'km' ? 'km' : unit === 'hr' ? 'hrs away' : 'min away';
                return (
                  <li key={i} className="flex items-center gap-2">
                    <MapPin size={14} className="text-ink-muted" /> {n.name}
                    {dist !== '' && dist != null && <span className="text-ink-muted">· {dist} {unitLabel}</span>}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {faqs.length > 0 && (
          <Card title="FAQs">
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={i}>
                  <div className="font-medium text-ink">{f.question}</div>
                  <div className="text-sm text-ink-muted whitespace-pre-line">{f.answer}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {(form.termsConditions || form.privacyPolicy || form.refundCancellationPolicy) && (
          <Card title="Policies & terms">
            <div className="space-y-3">
              {[
                ['Terms & Conditions', form.termsConditions],
                ['Privacy Policy', form.privacyPolicy],
                ['Refund & Cancellation Policy', form.refundCancellationPolicy],
              ].filter(([, v]) => v).map(([label, html]) => (
                <details key={label} className="group">
                  <summary className="cursor-pointer font-medium text-ink text-sm">{label}</summary>
                  <div className="rich-prose text-sm mt-2" dangerouslySetInnerHTML={{ __html: html }} />
                </details>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
