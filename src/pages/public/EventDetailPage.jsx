import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Calendar, Clock, Share2, Trophy,
  Shield, ShieldCheck, ChevronDown, Users,
  Sparkles, CalendarDays, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/pagination';

import api, { fileUrl } from '../../services/api';
import { mapEmbedSrc } from '../../utils/mapEmbed.js';
import ReviewsBlock from '../../components/public/ReviewsBlock.jsx';
import AddOnsCarousel from '../../components/public/AddOnsCarousel.jsx';
import WishlistButton from '../../components/public/WishlistButton.jsx';
import useRequireLogin from '../../hooks/useRequireLogin.js';
import LivePriceEstimator from '../../components/public/LivePriceEstimator.jsx';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EventDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const requireLogin = useRequireLogin();
  const [event, setEvent] = useState(null);
  const [addOns, setAddOns] = useState([]);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thumbsSwiper, setThumbsSwiper] = useState(null);

  // Slot state (only meaningful for sport events)
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/events/${slug}`)
      .then((res) => {
        if (cancelled) return;
        const e = res.data?.data?.event;
        setEvent(e);
        const firstSport = (e?.sports || [])[0]?.name || '';
        setSelectedSport(firstSport);
        setSelectedDate(e?.eventDate || '');

        if (e?.id) {
          // Suggested add-ons — try location-matched first, then any active
          // add-on so the section is helpful even when admin tagging is sparse.
          const loadAddOns = async () => {
            try {
              if (e.location?.slug) {
                const r1 = await api.get('/add-ons', { params: { location: e.location.slug, limit: 6 } });
                const matched = r1.data?.data?.items || [];
                if (matched.length > 0) {
                  if (!cancelled) setAddOns(matched);
                  return;
                }
              }
              const r2 = await api.get('/add-ons', { params: { limit: 6 } });
              if (!cancelled) setAddOns(r2.data?.data?.items || []);
            } catch { /* swallow */ }
          };
          loadAddOns();

          // Similar events — prefer same event-type, then same location, then any.
          const loadSimilar = async () => {
            try {
              let pool = [];
              if (e.eventType?.slug) {
                const r1 = await api.get('/events', { params: { eventType: e.eventType.slug, limit: 12 } });
                pool = (r1.data?.data?.items || []).filter((x) => x.id !== e.id);
              }
              if (pool.length === 0 && e.location?.slug) {
                const r2 = await api.get('/events', { params: { location: e.location.slug, limit: 12 } });
                pool = (r2.data?.data?.items || []).filter((x) => x.id !== e.id);
              }
              if (pool.length === 0) {
                const r3 = await api.get('/events', { params: { limit: 12 } });
                pool = (r3.data?.data?.items || []).filter((x) => x.id !== e.id);
              }
              if (!cancelled) setSimilarEvents(pool.slice(0, 8));
            } catch { /* swallow */ }
          };
          loadSimilar();
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const isSportEvent = !!event?.eventType?.isSport;

  // Fetch slots when sport / date changes
  useEffect(() => {
    if (!isSportEvent || !event?.id) return;
    setSlotsLoading(true);
    const params = {};
    if (selectedDate) params.date = selectedDate;
    if (selectedSport) params.sportName = selectedSport;
    api.get(`/events/${event.id}/slots`, { params })
      .then((r) => setSlots(r.data?.data?.items || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [isSportEvent, event?.id, selectedDate, selectedSport]);

  // Live ticket count lifted up so the booking CTA can pass it along.
  const [tickets, setTickets] = useState(1);

  const handleBook = () => {
    if (!event) return;
    const target = `/book/event/${event.id}?guests=${Math.max(1, tickets)}`;
    requireLogin(() => navigate(target), { redirectTo: target });
  };

  const onShare = () => {
    if (navigator.share) {
      navigator.share({ title: event?.name, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const bookSlot = async (slotId) => {
    try {
      await api.post(`/events/slots/${slotId}/book`);
      toast.success('Slot booked! Confirmation will be sent shortly.');
      // refresh slots
      const params = {};
      if (selectedDate) params.date = selectedDate;
      if (selectedSport) params.sportName = selectedSport;
      const r = await api.get(`/events/${event.id}/slots`, { params });
      setSlots(r.data?.data?.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    }
  };

  // Generate date list for date picker — from eventDate to endDate (inclusive)
  const availableDates = useMemo(() => {
    if (!event?.eventDate) return [];
    const from = new Date(event.eventDate);
    const to = event.endDate ? new Date(event.endDate) : from;
    const out = [];
    const d = new Date(from);
    while (d <= to && out.length < 60) {
      out.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [event?.eventDate, event?.endDate]);

  if (loading) {
    return (
      <div className="container-app py-12">
        <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container-app section text-center">
        <h1 className="heading">Event not found</h1>
        <Link to="/events" className="btn-primary mt-6 inline-flex">Browse all events</Link>
      </div>
    );
  }

  const galleryImages = [
    ...(event.mainImage ? [{ id: 'main', url: event.mainImage }] : []),
    ...(event.gallery || []),
  ];

  return (
    <>
      <div className="bg-surface-alt">
        <div className="container-app py-6">
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Gallery */}
            <div className="lg:col-span-2">
              {galleryImages.length > 0 ? (
                <div className="rounded-2xl overflow-hidden bg-slate-100">
                  <Swiper
                    modules={[Navigation, Thumbs, Pagination]}
                    navigation
                    thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                    pagination={{ clickable: true }}
                    className="aspect-[16/10]"
                  >
                    {galleryImages.map((g) => (
                      <SwiperSlide key={g.id}>
                        <img src={fileUrl(g.url)} alt="" className="w-full h-full object-cover" />
                      </SwiperSlide>
                    ))}
                  </Swiper>

                  {galleryImages.length > 1 && (
                    <Swiper
                      modules={[Thumbs]}
                      onSwiper={setThumbsSwiper}
                      slidesPerView={6}
                      spaceBetween={6}
                      watchSlidesProgress
                      className="px-2 py-2"
                    >
                      {galleryImages.map((g) => (
                        <SwiperSlide key={g.id} className="cursor-pointer">
                          <img
                            src={fileUrl(g.url)}
                            alt=""
                            className="aspect-square object-cover rounded-md"
                          />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  )}
                </div>
              ) : (
                <div className="aspect-[16/10] rounded-2xl bg-slate-100 flex items-center justify-center text-ink-muted">
                  <Calendar size={48} />
                </div>
              )}
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-2">
                  {event.eventType?.name && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isSportEvent ? 'bg-emerald-500 text-white' : 'bg-brand/10 text-brand'
                    }`}>
                      {isSportEvent && <Trophy size={10} className="inline mr-1" />}
                      {event.eventType.name.toUpperCase()}
                    </span>
                  )}
                  {event.isFeatured && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 font-semibold">
                      FEATURED
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-display font-bold leading-tight">{event.name}</h1>

                <div className="space-y-2 mt-4 text-sm">
                  {event.location?.name && (
                    <div className="flex items-center gap-2 text-ink-muted">
                      <MapPin size={14} /> {event.location.name}
                      {event.location.country && `, ${event.location.country}`}
                    </div>
                  )}
                  {event.eventDate && (
                    <div className="flex items-center gap-2 text-ink-muted">
                      <Calendar size={14} /> {formatDate(event.eventDate)}
                      {event.endDate && event.endDate !== event.eventDate && ` → ${formatDate(event.endDate)}`}
                    </div>
                  )}
                  {(event.startTime || event.endTime) && (
                    <div className="flex items-center gap-2 text-ink-muted">
                      <Clock size={14} /> {event.startTime || '—'}{event.endTime ? ` – ${event.endTime}` : ''}
                    </div>
                  )}
                  {(event.minAge || event.maxAge) && (
                    <div className="flex items-center gap-2 text-ink-muted">
                      <Users size={14} /> Age {event.minAge || 0}–{event.maxAge || '∞'}
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t pt-4">
                  <div className="text-xs text-ink-muted">From</div>
                  <div>
                    <span className="text-3xl font-bold text-brand">
                      {event.currency} {Number(event.price).toLocaleString()}
                    </span>
                    {event.priceOriginal && Number(event.priceOriginal) > Number(event.price) && (
                      <span className="ml-2 line-through text-ink-muted">
                        {Number(event.priceOriginal).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">per ticket</div>
                </div>

                <div className="mt-4">
                  <LivePriceEstimator
                    unitPrice={Number(event.price) || 0}
                    currency={event.currency || 'INR'}
                    unitLabel={isSportEvent ? 'slot' : 'ticket'}
                    defaultUnits={tickets}
                    maxUnits={20}
                    gstRate={event.gstRate}
                    onChange={setTickets}
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary w-full mt-4"
                  onClick={handleBook}
                >
                  {isSportEvent
                    ? <><Trophy size={16} /> Book {tickets} slot{tickets === 1 ? '' : 's'}</>
                    : `Book ${tickets} ticket${tickets === 1 ? '' : 's'}`}
                </button>

                <div className="flex items-center gap-3 mt-3 text-xs text-ink-muted">
                  <button onClick={onShare} className="inline-flex items-center gap-1 hover:text-brand">
                    <Share2 size={14} /> Share
                  </button>
                  <WishlistButton type="event" id={event.id} variant="pill" size={14} className="!py-1 !px-2.5 !text-xs" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-app py-8 space-y-6">
        {/* Highlights */}
        {event.highlightsRich && (
          <Section title="Highlights">
            <div className="rich-prose" dangerouslySetInnerHTML={{ __html: event.highlightsRich }} />
          </Section>
        )}

        {/* About */}
        {event.aboutRich && (
          <Section title="About this event">
            <div className="rich-prose" dangerouslySetInnerHTML={{ __html: event.aboutRich }} />
          </Section>
        )}

        {/* Slot booking (sport events only) */}
        {isSportEvent && (
          <div id="book" className="scroll-mt-24">
            <Section icon={Trophy} title="Pick a sport & slot">
              {/* Sport picker */}
              {event.sports?.length > 1 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-ink-muted mb-2">Sport</div>
                  <div className="flex flex-wrap gap-2">
                    {event.sports.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedSport(s.name)}
                        className={`px-4 py-2 rounded-full border text-sm transition ${
                          selectedSport === s.name
                            ? 'bg-brand text-white border-brand'
                            : 'bg-white border-slate-200 hover:border-brand'
                        }`}
                      >
                        {s.name}
                        {s.defaultPrice ? (
                          <span className="ml-2 opacity-80 text-xs">
                            {event.currency} {Number(s.defaultPrice).toLocaleString()}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date picker */}
              {availableDates.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-ink-muted mb-2">Date</div>
                  <div className="flex flex-wrap gap-2 overflow-x-auto">
                    {availableDates.map((d) => {
                      const dt = new Date(d);
                      const active = selectedDate === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDate(d)}
                          className={`px-3 py-2 rounded-lg border text-center min-w-[68px] transition ${
                            active
                              ? 'bg-brand text-white border-brand'
                              : 'bg-white border-slate-200 hover:border-brand'
                          }`}
                        >
                          <div className="text-[10px] uppercase">
                            {dt.toLocaleDateString(undefined, { weekday: 'short' })}
                          </div>
                          <div className="text-sm font-bold">
                            {dt.toLocaleDateString(undefined, { day: '2-digit' })}
                          </div>
                          <div className="text-[10px] opacity-80">
                            {dt.toLocaleDateString(undefined, { month: 'short' })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Slots grid */}
              <div className="mt-4">
                <div className="text-xs font-medium text-ink-muted mb-2">Available hour slots</div>
                {slotsLoading ? (
                  <div className="text-sm text-ink-muted">Loading slots…</div>
                ) : slots.length === 0 ? (
                  <div className="card p-6 text-center text-sm text-ink-muted">
                    No slots available for this selection.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {slots.map((s) => {
                      const full = s.bookedCount >= s.capacity;
                      const disabled = full || !s.isActive;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => bookSlot(s.id)}
                          className={`p-3 rounded-lg border text-left transition ${
                            disabled
                              ? 'bg-slate-50 border-slate-200 text-ink-muted cursor-not-allowed'
                              : 'bg-white border-slate-200 hover:border-brand hover:shadow-soft'
                          }`}
                        >
                          <div className="font-semibold text-sm">{s.startTime} – {s.endTime}</div>
                          <div className="text-[11px] text-ink-muted mt-0.5">
                            {full ? 'Fully booked' : `${s.capacity - s.bookedCount} left`}
                          </div>
                          {s.price && (
                            <div className="text-brand text-xs font-semibold mt-1">
                              {event.currency} {Number(s.price).toLocaleString()}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* Map */}
        {mapEmbedSrc(event.mapEmbedHtml) && (
          <Section title="Location on map">
            <div className="rounded-2xl overflow-hidden border">
              <iframe
                src={mapEmbedSrc(event.mapEmbedHtml)}
                title={`${event.title || event.name || 'Event'} location`}
                className="w-full h-[400px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </Section>
        )}

        {/* Suggested add-on activities */}
        <AddOnsCarousel
          addOns={addOns}
          subtitle="Make a weekend of it with these popular nearby experiences."
          viewAllHref={event.location?.slug ? `/add-ons?location=${event.location.slug}` : '/add-ons'}
        />

        {/* Similar events */}
        {similarEvents.length > 0 && (
          <Section icon={CalendarDays} title="Similar events you may like">
            <p className="text-sm text-ink-muted -mt-1 mb-4">
              {event.eventType?.name
                ? `More ${event.eventType.name} events you might enjoy.`
                : 'Hand-picked events you might enjoy.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {similarEvents.map((e) => (
                <SimilarEventCard key={e.id} event={e} />
              ))}
            </div>
          </Section>
        )}

        {/* Reviews */}
        <ReviewsBlock
          entityType="event"
          entityId={event.id}
          reviews={event.reviews}
          reviewCount={event.reviewCount}
          averageRating={event.rating}
        />

        {/* Terms & privacy */}
        {(event.termsConditions || event.privacyPolicy) && (
          <div className="grid md:grid-cols-2 gap-5">
            {event.termsConditions && (
              <Section icon={Shield} title="Terms & conditions" compact>
                <div className="rich-prose text-sm" dangerouslySetInnerHTML={{ __html: event.termsConditions }} />
              </Section>
            )}
            {event.privacyPolicy && (
              <Section icon={ShieldCheck} title="Privacy policy" compact>
                <div className="rich-prose text-sm" dangerouslySetInnerHTML={{ __html: event.privacyPolicy }} />
              </Section>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Section({ icon: Icon, title, children, compact }) {
  return (
    <section className={`card ${compact ? 'p-4' : 'p-6'}`}>
      <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
        {Icon && <Icon size={18} className="text-brand" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function SuggestedAddOnCard({ addOn }) {
  return (
    <Link
      to={`/add-ons/${addOn.slug}`}
      className="card overflow-hidden hover:shadow-lg transition group block"
    >
      <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
        {addOn.mainImage ? (
          <img
            src={fileUrl(addOn.mainImage)}
            alt={addOn.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <Sparkles size={28} />
          </div>
        )}
        {addOn.isFeatured && (
          <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 font-semibold">
            POPULAR
          </span>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-semibold leading-tight line-clamp-2 group-hover:text-brand transition">
          {addOn.name}
        </h4>
        {addOn.location?.name && (
          <div className="text-xs text-ink-muted mt-1 flex items-center gap-1">
            <MapPin size={11} /> {addOn.location.name}
          </div>
        )}
        <div className="mt-3 pt-3 border-t flex items-baseline justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-brand">
              {addOn.currency} {Number(addOn.price).toLocaleString()}
            </span>
            <div className="text-[10px] text-ink-muted">per person</div>
          </div>
          <span className="text-xs text-brand font-semibold">View →</span>
        </div>
      </div>
    </Link>
  );
}

function SimilarEventCard({ event: e }) {
  return (
    <Link
      to={`/events/${e.slug}`}
      className="card overflow-hidden hover:shadow-lg transition group block"
    >
      <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
        {e.mainImage ? (
          <img
            src={fileUrl(e.mainImage)}
            alt={e.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <CalendarDays size={28} />
          </div>
        )}
        {Number(e.rating) > 0 && (
          <span className="absolute top-2 right-2 bg-emerald-600 text-white font-bold rounded px-1.5 py-0.5 text-[11px] inline-flex items-center gap-1">
            <Star size={10} className="fill-current" />
            {Number(e.rating).toFixed(1)}
          </span>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-semibold leading-tight line-clamp-2 group-hover:text-brand transition">
          {e.name}
        </h4>
        {e.eventDate && (
          <div className="text-xs text-ink-muted mt-1 flex items-center gap-1">
            <Calendar size={11} /> {new Date(e.eventDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        )}
        {e.location?.name && (
          <div className="text-xs text-ink-muted mt-0.5 flex items-center gap-1">
            <MapPin size={11} /> {e.location.name}
          </div>
        )}
        {Number(e.price) > 0 && (
          <div className="mt-2 text-base font-bold text-brand">
            {e.currency} {Number(e.price).toLocaleString()}
          </div>
        )}
      </div>
    </Link>
  );
}
