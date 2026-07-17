import {
  Star, MapPin, Truck,
} from 'lucide-react';
import { fileUrl } from '../../services/api';

/* Shared per-section content renderers — used by the COPS review detail page
   and the submitter's "resolve objections" page so both show sections the same
   way (and the same way the builder/view page does). */

export const ytId = (url) => {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
};
export const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const METHOD_LABEL = { per_person: 'Per person', per_day: 'Per day', days: 'Days (multi-day)', per_hours: 'Price by hours' };

export function convenienceLabel(cf) {
  if (!cf || !cf.type) return null;
  if (cf.type === 'fixed' && Number(cf.value) > 0) return `₹${cf.value}`;
  if (cf.type === 'percentage' && Number(cf.value) > 0) return `${cf.value}%`;
  if (cf.type === 'free') return Number(cf.months) > 0 ? `Free for ${cf.months} month${cf.months > 1 ? 's' : ''}` : 'Free';
  return null;
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="font-semibold text-ink">{value}</div>
    </div>
  );
}

export const RENDERERS = {
  basic: (e) => (
    <div className="space-y-3">
      <h3 className="text-xl font-display font-bold">{e.name}</h3>
      <div className="flex items-center gap-4 text-sm text-ink-muted flex-wrap">
        {(e.location || e.city) && (
          <span className="inline-flex items-center gap-1"><MapPin size={14} /> {[e.location, e.city].filter(Boolean).join(', ')}{e.nearbyLocation ? ` · near ${e.nearbyLocation}` : ''}</span>
        )}
        <span className="capitalize px-2 py-0.5 rounded-full bg-surface-alt">{e.mode}</span>
        {Number(e.rating) > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-500">
            <Star size={14} className="fill-amber-400 text-amber-400" /> <span className="text-ink font-semibold">{Number(e.rating).toFixed(1)}</span>
          </span>
        )}
      </div>
    </div>
  ),
  taxonomy: (e) => {
    const group = (title, items, chipClass, emptyLabel) => (
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1.5">{title}</div>
        {items && items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map((it) => (
              <span key={it.id} className={`text-xs px-2.5 py-1 rounded-full ${chipClass}`}>
                {it.icon ? `${it.icon} ` : ''}{it.name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-ink-muted italic">{emptyLabel}</span>
        )}
      </div>
    );
    const audiences = e.audienceItems || [];
    return (
      <div className="space-y-4">
        {group('Who is this for?', audiences.length ? audiences : null, 'border border-gray-200 text-ink', 'All audiences')}
        {group('Broad category', e.categoryItems, 'bg-brand/10 text-brand', '—')}
        {group('Type of activity / event', e.typeItems, 'bg-surface-alt text-ink-muted', '—')}
      </div>
    );
  },
  supplier: (e) => (
    <div className="flex items-center gap-4">
      {e.supplier?.image && <img src={fileUrl(e.supplier.image)} alt="" className="w-14 h-14 rounded-lg object-cover border" />}
      <div className="text-sm">
        <div className="font-semibold text-ink inline-flex items-center gap-2"><Truck size={15} className="text-brand" /> {e.supplier?.companyName}</div>
        {e.supplier?.supplierName && <div className="text-ink-muted">{e.supplier.supplierName}</div>}
        <div className="text-ink-muted flex flex-wrap gap-x-4">
          {e.supplier?.email && <span>{e.supplier.email}</span>}
          {e.supplier?.phone && <span>{e.supplier.phone}</span>}
        </div>
      </div>
    </div>
  ),
  about: (e) => <div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.about || '' }} />,
  media: (e) => (
    <div className="space-y-4">
      {e.mainImage && <img src={fileUrl(e.mainImage)} alt="" className="w-full h-56 object-cover rounded-xl" />}
      {e.gallery?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {e.gallery.map((u, i) => <img key={i} src={fileUrl(u)} alt="" className="w-full aspect-[4/3] object-cover rounded-lg border" />)}
        </div>
      )}
      {e.videos?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {e.videos.map((v, i) => {
            const yid = ytId(v.url);
            return yid
              ? <iframe key={i} className="w-full aspect-video rounded-lg" src={`https://www.youtube.com/embed/${yid}`} title={`v${i}`} allowFullScreen />
              : <video key={i} src={fileUrl(v.url)} controls className="w-full aspect-video rounded-lg bg-black" />;
          })}
        </div>
      )}
    </div>
  ),
  pricing: (e) => {
    const p = e.pricing || {};
    const disc = e.discount && Number(e.discount.value) > 0
      ? (e.discount.type === 'fixed' ? `₹${e.discount.value}` : `${e.discount.value}%`) : null;
    const conv = convenienceLabel(e.convenienceFee);
    return (
      <div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Field label="Method" value={METHOD_LABEL[e.priceMethod] || e.priceMethod || '—'} />
          {e.priceMethod === 'days' && <Field label="Days" value={p.days || 1} />}
          <Field label="Adult" value={rupee(p.adultPrice)} />
          {Number(e.gstRate) > 0 && <Field label="GST" value={`${e.gstRate}%`} />}
          {disc && <Field label="Discount" value={disc} />}
          {conv && <Field label="Convenience fee" value={conv} />}
        </div>
        {p.childrenEnabled && p.childBands?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Children</div>
            <ul className="space-y-1 text-sm">
              {p.childBands.map((b, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-ink">{b.startAge}–{b.endAge} yrs</span>
                  <span className={b.charge ? 'font-semibold text-ink' : 'text-emerald-600 font-medium'}>{b.charge ? rupee(b.price) : 'Free'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
  duration: (e) => {
    const d = (e.pricing || {}).duration || {};
    return <div className="text-sm font-semibold text-ink">{d.hours || 0}h {d.minutes || 0}m</div>;
  },
  schedule: (e) => (
    <ul className="space-y-1.5 text-sm">
      {(e.schedule?.dates || []).map((d) => (
        <li key={d.date} className="flex flex-wrap gap-x-3">
          <span className="font-medium text-ink min-w-[120px]">{new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span className="text-ink-muted">{d.slots?.length ? d.slots.map((s) => `${s.start}–${s.end}`).join(', ') : 'No slots'}</span>
        </li>
      ))}
    </ul>
  ),
  inclusions: (e) => (
    <div className="space-y-4">
      {(e.inclusions || []).map((it, i) => (
        it.kind === 'title_image' ? (
          <div key={i} className="flex items-center gap-4">
            {it.image && <img src={fileUrl(it.image)} alt="" className="w-20 h-20 rounded-lg object-cover border" />}
            <div className="font-medium text-ink">{it.title}</div>
          </div>
        ) : <div key={i} className="rich-prose" dangerouslySetInnerHTML={{ __html: it.text || '' }} />
      ))}
    </div>
  ),
  facilities: (e) => (
    <div className="flex flex-wrap gap-2">
      {(e.facilities || []).map((f, i) => <span key={i} className="text-sm px-3 py-1 rounded-full bg-surface-alt text-ink">{typeof f === 'string' ? f : f.name}</span>)}
    </div>
  ),
  nearby: (e) => (
    <ul className="space-y-1 text-sm">
      {(e.nearbyPlaces || []).map((n, i) => {
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
  ),
  faqs: (e) => (
    <div className="space-y-3">
      {(e.faqs || []).map((f, i) => (
        <div key={i}>
          <div className="font-medium text-ink">{f.question}</div>
          <div className="text-sm text-ink-muted whitespace-pre-line">{f.answer}</div>
        </div>
      ))}
    </div>
  ),
  policies: (e) => {
    const refundCancellation = e.refundCancellationPolicy || [e.refundPolicy, e.cancellationPolicy].filter(Boolean).join('<br/><br/>');
    const policies = [
      ['Terms & Conditions', e.termsConditions],
      ['Privacy Policy', e.privacyPolicy],
      ['Refund & Cancellation Policy', refundCancellation],
    ].filter(([, html]) => html);
    return (
      <div className="space-y-3">
        {policies.map(([label, html]) => (
          <details key={label} className="border border-gray-100 rounded-lg p-3">
            <summary className="cursor-pointer font-medium text-ink">{label}</summary>
            <div className="rich-prose mt-2" dangerouslySetInnerHTML={{ __html: html }} />
          </details>
        ))}
      </div>
    );
  },
};

// Apply a snapshot's fields (possibly dotted keys like 'pricing.duration') onto
// a shallow clone of the experience, so a RENDERER shows the "before" state.
export function applyBefore(exp, beforeFields) {
  if (!beforeFields) return exp;
  const clone = { ...exp, pricing: { ...(exp.pricing || {}) } };
  for (const [k, v] of Object.entries(beforeFields)) {
    if (k.includes('.')) {
      const [root, child] = k.split('.');
      clone[root] = { ...(clone[root] || {}), [child]: v };
    } else {
      clone[k] = v;
    }
  }
  return clone;
}
