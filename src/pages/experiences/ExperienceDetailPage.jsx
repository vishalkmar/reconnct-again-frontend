import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MapPin, Star, Clock, Users, Check, ChevronLeft, ChevronRight, Share2, X, Plus, Minus,
  BadgeCheck, CalendarDays, Images,
} from 'lucide-react';
import toast from 'react-hot-toast';
import publicApi from '../../services/publicApi';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useGeo } from '../../context/GeoContext.jsx';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import useOnline from '../../hooks/useOnline';
import sanitizeHtml from '../../utils/sanitizeHtml';
import {
  formatMoney, resolveImage, DUMMY_IMAGE, categoriesOf, strikePrice,
} from '../../utils/format';
import { bookableDates, slotsForDate, prettyDate } from '../../utils/schedule';
import { WishHeart } from '../../components/landing/cards/parts';
import { Section, SectionHead, Rail } from '../../components/landing/Rail.jsx';
import ExperienceCard from '../../components/landing/cards/ExperienceCard.jsx';

const plain = (html) => {
  if (!html) return '';
  const d = document.createElement('div');
  d.innerHTML = sanitizeHtml(String(html));
  return (d.textContent || '').trim();
};

/*
  /experiences/:idOrSlug — the app's DetailScreen for the web: gallery, facts,
  about, what's included, FAQs, policies (collapsed), reviews, map, and a
  sticky booking box (date → slot → guests → Book now) that hands off to the
  existing /book/experience/:id checkout flow.
*/
export default function ExperienceDetailPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, requestLogin } = useUserAuth();
  const { coords } = useGeo();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [similar, setSimilar] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [openPolicy, setOpenPolicy] = useState(null);
  const [dateKey, setDateKey] = useState('');
  const [slot, setSlot] = useState(null);
  const [guests, setGuests] = useState(1);
  const online = useOnline();

  useEffect(() => {
    let alive = true;
    setItem(null); setError('');
    window.scrollTo(0, 0);
    publicApi.getExperience(idOrSlug)
      .then((d) => { if (alive) { if (d?.item) setItem(d.item); else setError('Experience not found'); } })
      .catch((e) => { if (alive) setError(e?.response?.status === 404 ? 'Experience not found' : (e?.response?.data?.message || 'Could not load this experience')); });
    return () => { alive = false; };
  }, [idOrSlug]);

  // "Similar experiences" — same first category, excluding this one.
  useEffect(() => {
    const cat = item && categoriesOf(item)[0];
    if (!cat) { setSimilar([]); return; }
    publicApi.listExperiences({ categoryIds: cat.id })
      .then((d) => setSimilar((d?.items || []).filter((x) => x.id !== item.id).slice(0, 12)))
      .catch(() => setSimilar([]));
  }, [item]);

  const dates = useMemo(() => bookableDates(item?.schedule), [item]);
  const slots = useMemo(() => slotsForDate(item?.schedule, dateKey), [item, dateKey]);
  useEffect(() => { setSlot(null); }, [dateKey]);
  useEffect(() => { if (dates.length && !dateKey) setDateKey(dates[0]); }, [dates, dateKey]);

  const images = useMemo(() => {
    if (!item) return [];
    const list = [item.mainImage, ...(item.gallery || [])].map((x) => resolveImage(typeof x === 'string' ? x : x?.url)).filter(Boolean);
    return list.length ? [...new Set(list)] : [DUMMY_IMAGE];
  }, [item]);

  const about = item?.about ? sanitizeHtml(item.about) : '';
  useDocumentMeta({
    title: item ? `${item.name} · Reconnct` : 'Experience · Reconnct',
    description: item ? (plain(item.about).slice(0, 155) || `${item.name} in ${item.city || 'India'} on Reconnct`) : undefined,
    image: images[0],
  });

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-sans text-2xl font-black text-rc-navy">{error}</h1>
        <p className="text-rc-ink-muted mt-2">It may have been taken offline or the link is wrong.</p>
        <Link to="/experiences" className="inline-flex mt-6 h-11 px-6 items-center rounded-full bg-rc-brand text-white font-bold">Browse experiences</Link>
      </div>
    );
  }
  if (!item) return <DetailSkeleton />;

  const inclusions = (item.inclusions || [])
    .map((x) => plain(typeof x === 'string' ? x : (x.title || x.text || '')))
    .filter((t) => t && t.length <= 80);
  const facilities = (item.facilities || []).map((f) => (typeof f === 'string' ? f : (f.name || f.title || ''))).filter(Boolean);
  const faqs = (item.faqs || []).map((f) => ({ q: plain(f.question), a: plain(f.answer) })).filter((f) => f.q);
  const policies = [
    { key: 'terms', label: 'Terms & Conditions', text: plain(item.termsConditions) },
    { key: 'privacy', label: 'Privacy Policy', text: plain(item.privacyPolicy) },
    { key: 'refund', label: 'Refund & Cancellation Policy', text: plain(item.refundCancellationPolicy) },
  ].filter((p) => p.text);
  const reviews = item.reviews || [];
  const distanceKm = item.distanceKm ?? (coords && item.latitude != null
    ? Math.round(haversine(coords.lat, coords.lon, Number(item.latitude), Number(item.longitude)) * 10) / 10
    : null);
  const hasMap = item.latitude != null && item.longitude != null;
  const price = Number(item.fromPrice) || 0;
  const needsSlot = slots.length > 0;
  const maxGuests = item.capacity || 30;

  const book = () => {
    if (!online) { toast.error('You’re offline. Connect to the internet to book.'); return; }
    if (dates.length && !dateKey) { toast.error('Pick a date'); return; }
    if (needsSlot && !slot) { toast.error('Choose a time slot for your date'); return; }
    const qs = new URLSearchParams({ guests: String(guests) });
    if (dateKey) qs.set('from', dateKey);
    if (slot) qs.set('slot', slot.label);
    const target = `/book/experience/${item.id}?${qs.toString()}`;
    if (!isAuthenticated) { requestLogin({ redirectTo: target }); return; }
    navigate(target);
  };

  const share = async () => {
    const data = { title: item.name, text: `${item.name} on Reconnct`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="pb-28 lg:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <nav className="text-xs text-rc-ink-muted flex items-center gap-1" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-rc-ink">Home</Link><ChevronRight size={12} />
          <Link to="/experiences" className="hover:text-rc-ink">Experiences</Link><ChevronRight size={12} />
          <span className="truncate text-rc-ink">{item.name}</span>
        </nav>

        {/* Gallery: big + 4 thumbs on desktop, swipe strip on mobile */}
        <div className="mt-3 relative">
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[440px] rounded-3xl overflow-hidden">
            {images.slice(0, 5).map((src, i) => (
              <button key={src} type="button" onClick={() => setLightbox(i)} className={`relative bg-[#DCE0E6] overflow-hidden ${i === 0 ? 'col-span-2 row-span-2' : ''} ${images.length === 1 ? 'col-span-4' : ''}`}>
                <img src={src} alt={i === 0 ? item.name : ''} className="w-full h-full object-cover hover:scale-[1.03] transition duration-500" />
              </button>
            ))}
          </div>
          <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory rc-no-scrollbar -mx-4 px-4 gap-2">
            {images.map((src, i) => (
              <button key={src} type="button" onClick={() => setLightbox(i)} className="snap-center shrink-0 w-[88%] h-64 rounded-2xl overflow-hidden bg-[#DCE0E6]">
                <img src={src} alt={i === 0 ? item.name : ''} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <button type="button" onClick={share} aria-label="Share" className="grid place-items-center w-9 h-9 rounded-full bg-white/95 shadow-soft"><Share2 size={16} /></button>
            <WishHeart item={item} size={36} />
          </div>
          {images.length > 1 && (
            <button type="button" onClick={() => setLightbox(0)} className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-white/95 text-rc-ink text-xs font-bold px-3 py-1.5 rounded-full shadow-soft">
              <Images size={14} />{images.length} photos
            </button>
          )}
        </div>

        <div className="mt-6 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              {categoriesOf(item).map((c) => (
                <Link key={c.id} to={`/experiences?categoryIds=${c.id}`} className="rc-brand-grad text-rc-navy text-[11px] font-black px-2.5 py-1 rounded-lg">{c.name}</Link>
              ))}
              {(item.audiences || []).map((a) => (
                <Link key={a.id} to={`/experiences?audienceIds=${a.id}`} className="bg-white border border-rc-border text-rc-ink text-[11px] font-bold px-2.5 py-1 rounded-lg">For {a.name}</Link>
              ))}
            </div>
            <h1 className="font-sans text-2xl sm:text-4xl font-black text-rc-navy mt-3 leading-tight">{item.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-rc-ink">
              <span className="flex items-center gap-1"><Star size={15} className="fill-rc-brand text-rc-brand" /><b>{Number(item.rating || 0).toFixed(1)}</b>{item.reviewsCount ? <span className="text-rc-ink-muted">({item.reviewsCount} reviews)</span> : null}</span>
              {!!(item.location || item.city) && <span className="flex items-center gap-1 text-rc-ink-muted"><MapPin size={15} />{[item.location, item.city].filter(Boolean).join(', ')}</span>}
              {distanceKm != null && <span className="text-rc-ink-muted">{distanceKm} km away</span>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
              {!!item.durationLabel && <Fact icon={Clock} label="Duration" value={item.durationLabel} />}
              {!!item.capacity && <Fact icon={Users} label="Group size" value={`Up to ${item.capacity}`} />}
              {!!item.mode && <Fact icon={CalendarDays} label="Mode" value={String(item.mode).replace(/_/g, ' ')} />}
            </div>

            {!!item.supplier && (
              <div className="flex items-center gap-3 mt-6 p-4 bg-white rounded-2xl shadow-soft">
                {item.supplier.image
                  ? <img src={resolveImage(item.supplier.image)} alt="" className="w-12 h-12 rounded-full object-cover" />
                  : <span className="grid place-items-center w-12 h-12 rounded-full bg-rc-navy text-white font-bold">{(item.supplier.name || 'H').charAt(0)}</span>}
                <div>
                  <div className="text-xs text-rc-ink-muted">Hosted by</div>
                  <div className="font-bold text-rc-ink flex items-center gap-1">{item.supplier.name}{item.supplier.verified && <BadgeCheck size={16} className="text-rc-brand-dark" />}</div>
                </div>
              </div>
            )}

            {!!about && (
              <Block title="About this experience">
                <div className="prose prose-sm max-w-none text-rc-ink leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: about }} />
              </Block>
            )}

            {inclusions.length > 0 && (
              <Block title="What’s included">
                <ul className="grid sm:grid-cols-2 gap-2.5">
                  {inclusions.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm"><Check size={16} className="text-green-600 mt-0.5 shrink-0" />{inc}</li>
                  ))}
                </ul>
              </Block>
            )}

            {facilities.length > 0 && (
              <Block title="Facilities">
                <div className="flex flex-wrap gap-2">
                  {facilities.map((f) => <span key={f} className="bg-white border border-rc-border text-sm px-3 py-1.5 rounded-full">{f}</span>)}
                </div>
              </Block>
            )}

            {faqs.length > 0 && (
              <Block title="FAQs">
                <div className="space-y-2">
                  {faqs.map((f, i) => (
                    <details key={i} className="group bg-white rounded-2xl px-4 py-3 shadow-soft">
                      <summary className="cursor-pointer list-none flex items-center justify-between font-semibold text-sm text-rc-ink">
                        {f.q}<Plus size={16} className="shrink-0 group-open:rotate-45 transition" />
                      </summary>
                      {!!f.a && <p className="text-sm text-rc-ink-muted mt-2 whitespace-pre-line">{f.a}</p>}
                    </details>
                  ))}
                </div>
              </Block>
            )}

            {policies.length > 0 && (
              <Block title="Policies & terms">
                <div className="bg-white rounded-2xl shadow-soft divide-y divide-rc-border">
                  {policies.map((p) => {
                    const open = openPolicy === p.key;
                    return (
                      <div key={p.key} className="px-4">
                        <button type="button" aria-expanded={open} onClick={() => setOpenPolicy(open ? null : p.key)} className="w-full flex items-center justify-between py-3.5 text-sm font-semibold text-rc-ink">
                          {p.label}<span className="grid place-items-center w-6 h-6 rounded-full bg-rc-bg">{open ? <Minus size={13} /> : <Plus size={13} />}</span>
                        </button>
                        {open && <p className="pb-4 text-sm text-rc-ink-muted whitespace-pre-line">{p.text}</p>}
                      </div>
                    );
                  })}
                </div>
              </Block>
            )}

            {hasMap && (
              <Block title="Where you’ll be">
                <div className="rounded-2xl overflow-hidden h-64 bg-rc-bg">
                  <iframe
                    title="Map"
                    loading="lazy"
                    className="w-full h-full border-0"
                    src={`https://maps.google.com/maps?q=${item.latitude},${item.longitude}&z=14&output=embed`}
                  />
                </div>
              </Block>
            )}

            {reviews.length > 0 && (
              <Block title={`Reviews (${reviews.length})`}>
                <div className="grid sm:grid-cols-2 gap-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl p-4 shadow-soft">
                      <div className="flex items-center gap-3">
                        <span className="grid place-items-center w-9 h-9 rounded-full bg-rc-brand-soft text-rc-brand-text font-bold text-sm">{(r.name || 'G').charAt(0).toUpperCase()}</span>
                        <div className="flex-1">
                          <div className="text-sm font-bold">{r.name || 'Guest'}</div>
                          <div className="text-xs text-rc-brand-dark">{'★'.repeat(Math.round(r.rating || 5))}</div>
                        </div>
                        {!!r.date && <span className="text-xs text-rc-ink-muted">{r.date}</span>}
                      </div>
                      {!!plain(r.comment) && <p className="text-sm text-rc-ink-muted mt-2">{plain(r.comment)}</p>}
                    </div>
                  ))}
                </div>
              </Block>
            )}
          </div>

          {/* Booking box — sticky on desktop */}
          <aside id="book" className="lg:sticky lg:top-24 bg-white rounded-3xl shadow-card p-5 scroll-mt-24">
            <div className="flex items-end gap-2">
              {!!price && <span className="text-sm text-rc-strike-dark line-through font-bold">{formatMoney(strikePrice(price), item.currency)}</span>}
              <span className="text-2xl font-black text-rc-navy">{price ? formatMoney(price, item.currency) : 'Contact'}</span>
              {!!price && <span className="text-sm text-rc-ink-muted mb-0.5">/{item.priceUnit || 'person'}</span>}
            </div>
            <p className="text-xs text-rc-ink-muted mt-1">Taxes & fees shown at checkout.</p>

            {dates.length > 0 ? (
              <>
                <div className="text-sm font-bold mt-5 mb-2">Choose a date</div>
                <div className="flex gap-2 overflow-x-auto rc-no-scrollbar pb-1">
                  {dates.slice(0, 30).map((d) => (
                    <button key={d} type="button" onClick={() => setDateKey(d)} className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-bold ${dateKey === d ? 'bg-rc-brand border-rc-brand text-white' : 'border-rc-border hover:border-rc-brand'}`}>
                      {prettyDate(d)}
                    </button>
                  ))}
                </div>
                {needsSlot && (
                  <>
                    <div className="text-sm font-bold mt-4 mb-2">Available time slots</div>
                    <div className="flex flex-wrap gap-2">
                      {slots.map((t) => {
                        const on = slot && slot.start === t.start && slot.end === t.end;
                        return (
                          <button key={`${t.start}-${t.end}`} type="button" onClick={() => setSlot(t)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold ${on ? 'bg-rc-brand-soft border-rc-brand text-rc-brand-text' : 'border-rc-border hover:border-rc-brand'}`}>
                            <Clock size={13} />{t.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-rc-ink-muted mt-5">Pick your preferred date at checkout.</p>
            )}

            <div className="flex items-center justify-between mt-5">
              <span className="text-sm font-bold">Guests</span>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Fewer guests" disabled={guests <= 1} onClick={() => setGuests((g) => g - 1)} className="grid place-items-center w-9 h-9 rounded-full border border-rc-border disabled:opacity-40"><Minus size={15} /></button>
                <span className="w-6 text-center font-bold" aria-live="polite">{guests}</span>
                <button type="button" aria-label="More guests" disabled={guests >= maxGuests} onClick={() => setGuests((g) => g + 1)} className="grid place-items-center w-9 h-9 rounded-full border border-rc-border disabled:opacity-40"><Plus size={15} /></button>
              </div>
            </div>

            {!!price && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-rc-border text-sm">
                <span className="text-rc-ink-muted">{formatMoney(price, item.currency)} × {guests}</span>
                <span className="font-bold">{formatMoney(price * guests, item.currency)}</span>
              </div>
            )}

            <button type="button" onClick={book} disabled={!online} className="w-full h-12 mt-5 rounded-full bg-rc-brand text-white font-extrabold hover:bg-rc-brand-dark transition disabled:opacity-50 disabled:cursor-not-allowed">
              {online ? 'Book now' : 'Offline — connect to book'}
            </button>
          </aside>
        </div>
      </div>

      {similar.length > 0 && (
        <Section>
          <SectionHead title="Similar experiences" seeAllTo={`/experiences?categoryIds=${categoriesOf(item)[0]?.id}`} />
          <Rail ariaLabel="Similar experiences">
            {similar.map((s) => <ExperienceCard key={s.id} item={s} className="w-[200px]" />)}
          </Rail>
        </Section>
      )}

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-rc-border px-4 py-3 flex items-center gap-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-black text-rc-navy leading-tight">{price ? formatMoney(price, item.currency) : 'Contact'}</div>
          {!!price && <div className="text-xs text-rc-ink-muted">per {item.priceUnit || 'person'}</div>}
        </div>
        <a href="#book" className="h-12 px-5 rounded-full border border-rc-border font-bold grid place-items-center text-sm">Dates</a>
        <button type="button" onClick={book} disabled={!online} className="h-12 px-6 rounded-full bg-rc-brand text-white font-extrabold disabled:opacity-50">{online ? 'Book now' : 'Offline'}</button>
      </div>

      {lightbox != null && <Lightbox images={images} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl p-3.5 shadow-soft">
      <Icon size={17} className="text-rc-brand-dark" />
      <div className="text-xs text-rc-ink-muted mt-1.5">{label}</div>
      <div className="text-sm font-bold text-rc-ink capitalize">{value}</div>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="font-sans text-lg font-black text-rc-navy mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Lightbox({ images, index, onIndex, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [index, images.length, onIndex, onClose]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Photos">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 grid place-items-center w-10 h-10 rounded-full bg-white/15 text-white"><X size={20} /></button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => onIndex((index - 1 + images.length) % images.length)} aria-label="Previous photo" className="absolute left-3 grid place-items-center w-11 h-11 rounded-full bg-white/15 text-white"><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => onIndex((index + 1) % images.length)} aria-label="Next photo" className="absolute right-3 grid place-items-center w-11 h-11 rounded-full bg-white/15 text-white"><ChevronRight size={22} /></button>
        </>
      )}
      <img src={images[index]} alt="" className="max-w-[92vw] max-h-[86vh] object-contain rounded-lg" />
      <div className="absolute bottom-5 text-white/80 text-sm">{index + 1} / {images.length}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6" aria-hidden="true">
      <div className="rc-skeleton h-64 md:h-[440px] rounded-3xl" />
      <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-6">
        <div className="space-y-3"><div className="rc-skeleton h-8 w-2/3 rounded-lg" /><div className="rc-skeleton h-4 w-1/2 rounded" /><div className="rc-skeleton h-40 rounded-2xl" /></div>
        <div className="rc-skeleton h-72 rounded-3xl" />
      </div>
    </div>
  );
}
