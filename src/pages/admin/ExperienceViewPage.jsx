import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Loader2, Star, MapPin, IndianRupee } from 'lucide-react';
import api, { fileUrl } from '../../services/api';

const ytId = (url) => {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
};

const METHOD_LABEL = { per_person: 'Per person', per_day: 'Per day', days: 'Days (multi-day)', per_hours: 'Price by hours' };
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function convenienceLabel(cf) {
  if (!cf || !cf.type) return null;
  if (cf.type === 'fixed' && Number(cf.value) > 0) return `₹${cf.value}`;
  if (cf.type === 'percentage' && Number(cf.value) > 0) return `${cf.value}%`;
  if (cf.type === 'free') return Number(cf.months) > 0 ? `Free for ${cf.months} month${cf.months > 1 ? 's' : ''}` : 'Free';
  return null;
}

function PricingSummary({ priceMethod, pricing, gstRate, discount, convenienceFee }) {
  const p = pricing || {};
  const d = p.duration || {};
  const hasDuration = (priceMethod === 'per_day' || priceMethod === 'per_hours') && (d.hours || d.minutes);
  const disc = discount && Number(discount.value) > 0
    ? (discount.type === 'fixed' ? `₹${discount.value}` : `${discount.value}%`)
    : null;
  const conv = convenienceLabel(convenienceFee);
  return (
    <div className="bg-white rounded-2xl shadow-soft p-6 mb-5">
      <h2 className="font-semibold text-lg mb-3 inline-flex items-center gap-2"><IndianRupee size={18} className="text-brand" /> Pricing</h2>
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <Field label="Method" value={METHOD_LABEL[priceMethod] || priceMethod || '—'} />
        {priceMethod === 'days' && <Field label="Days" value={p.days || 1} />}
        {hasDuration && <Field label="Duration" value={`${d.hours || 0}h ${d.minutes || 0}m`} />}
        <Field label="Adult" value={rupee(p.adultPrice)} />
        {Number(gstRate) > 0 && <Field label="GST" value={`${gstRate}%`} />}
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
                <span className={b.charge ? 'font-semibold text-ink' : 'text-emerald-600 font-medium'}>
                  {b.charge ? rupee(b.price) : 'Free'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="font-semibold text-ink">{value}</div>
    </div>
  );
}

export default function ExperienceViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [e, setE] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    api.get(`/experiences/${id}`)
      .then((res) => { if (!off) setE(res.data?.data?.item || null); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [id]);

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  if (!e) return <div className="p-10 text-center text-ink-muted">Experience not found.</div>;

  const rating = Number(e.rating) || 0;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-3 mb-6">
        <button onClick={() => navigate('/admin/experiences')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand">
          <ArrowLeft size={16} /> Back
        </button>
        <Link to={`/admin/experiences/${e.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-ink font-semibold">
          <Pencil size={15} /> Edit
        </Link>
      </div>

      {/* Hero */}
      {e.mainImage && (
        <img src={fileUrl(e.mainImage)} alt={e.name} className="w-full h-64 object-cover rounded-2xl mb-5" />
      )}

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand capitalize">{e.status}</span>
        {e.category?.name && <span className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-ink-muted">{e.category.name}{e.type?.name ? ` · ${e.type.name}` : ''}</span>}
        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-ink-muted capitalize">{e.mode}</span>
      </div>

      <h1 className="text-3xl font-display font-bold mb-2">{e.name}</h1>

      <div className="flex items-center gap-4 text-sm text-ink-muted mb-5">
        {(e.location || e.city) && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {[e.location, e.city].filter(Boolean).join(', ')}{e.nearbyLocation ? ` · near ${e.nearbyLocation}` : ''}</span>}
        {rating > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-500">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={14} className={i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
            ))}
            <span className="text-ink font-semibold ml-1">{rating.toFixed(1)}</span>
          </span>
        )}
      </div>

      {/* Audiences */}
      {e.audienceItems?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {e.audienceItems.map((a) => (
            <span key={a.id} className="text-xs px-3 py-1 rounded-full border border-gray-200 text-ink">
              {a.name}
            </span>
          ))}
        </div>
      )}

      {/* About */}
      {e.about && (
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-5">
          <h2 className="font-semibold text-lg mb-3">About</h2>
          <div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.about }} />
        </div>
      )}

      {/* Pricing */}
      {(e.priceMethod || e.pricing) && (
        <PricingSummary priceMethod={e.priceMethod} pricing={e.pricing || {}}
          gstRate={e.gstRate} discount={e.discount} convenienceFee={e.convenienceFee} />
      )}

      {/* Gallery */}
      {e.gallery?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-5">
          <h2 className="font-semibold text-lg mb-3">Gallery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {e.gallery.map((u, i) => (
              <img key={i} src={fileUrl(u)} alt="" className="w-full aspect-[4/3] object-cover rounded-lg border" />
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {e.videos?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-5">
          <h2 className="font-semibold text-lg mb-3">Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {e.videos.map((v, i) => {
              const yid = ytId(v.url);
              return yid ? (
                <iframe key={i} className="w-full aspect-video rounded-lg" src={`https://www.youtube.com/embed/${yid}`} title={`video-${i}`} allowFullScreen />
              ) : (
                <video key={i} src={fileUrl(v.url)} controls className="w-full aspect-video rounded-lg bg-black" />
              );
            })}
          </div>
        </div>
      )}

      {/* Inclusions */}
      {e.inclusions?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-5">
          <h2 className="font-semibold text-lg mb-3">Inclusions</h2>
          <div className="space-y-4">
            {e.inclusions.map((it, i) => (
              it.kind === 'title_image' ? (
                <div key={i} className="flex items-center gap-4">
                  {it.image && <img src={fileUrl(it.image)} alt="" className="w-20 h-20 rounded-lg object-cover border" />}
                  <div className="font-medium text-ink">{it.title}</div>
                </div>
              ) : (
                <div key={i} className="rich-prose" dangerouslySetInnerHTML={{ __html: it.text || '' }} />
              )
            ))}
          </div>
        </div>
      )}

      {/* Facilities */}
      {e.facilities?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-5">
          <h2 className="font-semibold text-lg mb-3">Facilities</h2>
          <div className="flex flex-wrap gap-2">
            {e.facilities.map((f, i) => <span key={i} className="text-sm px-3 py-1 rounded-full bg-surface-alt text-ink">{f}</span>)}
          </div>
        </div>
      )}

      {/* Nearby places */}
      {e.nearbyPlaces?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-5">
          <h2 className="font-semibold text-lg mb-3">Nearby places</h2>
          <ul className="space-y-1 text-sm">
            {e.nearbyPlaces.map((n, i) => {
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
        </div>
      )}

      {/* Availability */}
      {e.schedule?.dates?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-5">
          <h2 className="font-semibold text-lg mb-3">Availability</h2>
          <ul className="space-y-1.5 text-sm">
            {e.schedule.dates.map((d) => (
              <li key={d.date} className="flex flex-wrap gap-x-3">
                <span className="font-medium text-ink min-w-[120px]">
                  {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span className="text-ink-muted">
                  {d.slots?.length ? d.slots.map((s) => `${s.start}–${s.end}`).join(', ') : 'No slots'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* FAQs */}
      {e.faqs?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-5">
          <h2 className="font-semibold text-lg mb-3">FAQs</h2>
          <div className="space-y-3">
            {e.faqs.map((f, i) => (
              <div key={i}>
                <div className="font-medium text-ink">{f.question}</div>
                <div className="text-sm text-ink-muted whitespace-pre-line">{f.answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policies */}
      {(() => {
        const refundCancellation = e.refundCancellationPolicy
          || [e.refundPolicy, e.cancellationPolicy].filter(Boolean).join('<br/><br/>');
        const policies = [
          ['Terms & Conditions', e.termsConditions],
          ['Privacy Policy', e.privacyPolicy],
          ['Refund & Cancellation Policy', refundCancellation],
        ];
        return policies.some(([, html]) => html) && (
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-5 space-y-4">
          <h2 className="font-semibold text-lg">Policies &amp; terms</h2>
          {policies.filter(([, html]) => html).map(([label, html]) => (
            <details key={label} className="border border-gray-100 rounded-lg p-3">
              <summary className="cursor-pointer font-medium text-ink">{label}</summary>
              <div className="rich-prose mt-2" dangerouslySetInnerHTML={{ __html: html }} />
            </details>
          ))}
        </div>
        );
      })()}
    </div>
  );
}
