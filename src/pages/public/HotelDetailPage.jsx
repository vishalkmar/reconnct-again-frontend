import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Heart, Share2, Play,
  Wifi, Landmark, Shield, ShieldCheck, ChevronDown, Bed, Maximize2,
  Sparkles, Hotel as HotelSuggestIcon,
  Waves, Mountain, TreePine, Building2, Utensils, ShoppingBag, Plane, Train,
} from 'lucide-react';

// Pick a sensible icon for a nearby place from its name (used when it has no
// photo, so the card shows a tidy themed icon instead of an empty box).
const NEARBY_ICONS = [
  [/(river|lake|beach|sea|water|ganga|ghat)/i, Waves],
  [/(mountain|hill|valley|peak|trek)/i, Mountain],
  [/(forest|garden|park|nature|tree|wood)/i, TreePine],
  [/(temple|church|mosque|shrine|spiritual|yoga|ashram|meditat)/i, Sparkles],
  [/(wellness|spa|retreat|health)/i, Heart],
  [/(restaurant|cafe|food|dining)/i, Utensils],
  [/(market|mall|shop|bazaar)/i, ShoppingBag],
  [/(airport|flight)/i, Plane],
  [/(station|railway|train|metro)/i, Train],
  [/(hotel|resort|stay)/i, Building2],
];
const nearbyIcon = (name) => {
  const found = NEARBY_ICONS.find(([re]) => re.test(name || ''));
  return found ? found[1] : Landmark;
};
import toast from 'react-hot-toast';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/pagination';

import api, { fileUrl } from '../../services/api';
import { mapEmbedSrc } from '../../utils/mapEmbed.js';
import { occupancyLabel } from '../../utils/occupancy.js';
import ReviewsBlock from '../../components/public/ReviewsBlock.jsx';
import AddOnsCarousel from '../../components/public/AddOnsCarousel.jsx';
import WishlistButton from '../../components/public/WishlistButton.jsx';
import HotelStayPicker, { todayISO, addDaysISO, nightsBetween } from '../../components/public/HotelStayPicker.jsx';
import useRequireLogin from '../../hooks/useRequireLogin.js';
import { fromPriceLabel, hasPrice, hotelFromPrice } from '../../utils/price.js';
import { addressShort } from '../../utils/address.js';
import { priceUnitLabel } from '../../utils/priceType.js';
import { calculateTaxPricing, taxIncludedLabel } from '../../utils/taxPricing.js';

const stripHtml = (s) =>
  (s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export default function HotelDetailPage() {
  const { slug } = useParams();
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [insideAddOns, setInsideAddOns] = useState([]);
  const [outsideAddOns, setOutsideAddOns] = useState([]);
  const [similarHotels, setSimilarHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [showVideo, setShowVideo] = useState(false);

  // Stay picker — the source of truth for dates + guest counts the booking
  // flow uses. Persists through navigation via the /book route query string.
  const [stay, setStay] = useState(() => ({
    checkIn: todayISO(),
    checkOut: addDaysISO(todayISO(), 1),
    adults: 2,
    children: 0,
    rooms: 1,
  }));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/hotels/${slug}`)
      .then((res) => {
        if (cancelled) return;
        const h = res.data?.data?.hotel;
        setHotel(h);
        if (h?.id) {
          api.get('/rooms', { params: { hotelId: h.id } })
            .then((r) => { if (!cancelled) setRooms(r.data?.data?.items || []); })
            .catch(() => {});

          // Suggested add-on activities split into two groups:
          //   • Inside  → activities the admin attached to THIS hotel.
          //   • Outside → activities physically in the same city (matched on
          //     cityName), shown with their full address as "nearby".
          const loadAddOns = async () => {
            try {
              const inside = await api.get('/add-ons', { params: { hotelId: h.id, exclusive: true, limit: 12 } });
              const insideItems = inside.data?.data?.items || [];
              if (!cancelled) setInsideAddOns(insideItems);

              const insideIds = new Set(insideItems.map((i) => i.id));
              if (h.cityName) {
                const out = await api.get('/add-ons', { params: { city: h.cityName, limit: 12 } });
                const outItems = (out.data?.data?.items || []).filter((i) => !insideIds.has(i.id));
                if (!cancelled) setOutsideAddOns(outItems);
              } else if (insideItems.length === 0) {
                // No hotel-specific & no city → fall back to general suggestions.
                const gen = await api.get('/add-ons', { params: { scope: 'general', limit: 8 } });
                if (!cancelled) setOutsideAddOns(gen.data?.data?.items || []);
              }
            } catch { /* swallow — sections just hide if it fails */ }
          };
          loadAddOns();

          // Similar hotels — prefer same-location, then any other hotels.
          const loadSimilar = async () => {
            try {
              let pool = [];
              if (h.location?.slug) {
                const r1 = await api.get('/hotels', { params: { location: h.location.slug, limit: 12 } });
                pool = (r1.data?.data?.items || []).filter((x) => x.id !== h.id);
              }
              if (pool.length === 0) {
                const r2 = await api.get('/hotels', { params: { limit: 12 } });
                pool = (r2.data?.data?.items || []).filter((x) => x.id !== h.id);
              }
              if (!cancelled) setSimilarHotels(pool.slice(0, 8));
            } catch { /* swallow */ }
          };
          loadSimilar();
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const onShare = () => {
    if (navigator.share) {
      navigator.share({ title: hotel?.name, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="container-app py-12">
        <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="container-app section text-center">
        <h1 className="heading">Hotel not found</h1>
        <Link to="/hotels" className="btn-primary mt-6 inline-flex">Browse all hotels</Link>
      </div>
    );
  }

  const galleryImages = [
    ...(hotel.primaryImage ? [{ id: 'primary', url: hotel.primaryImage }] : []),
    ...(hotel.gallery || []),
  ];

  const hasVideo = !!hotel.videoUrl;
  const isYoutube = hasVideo && /youtube\.com|youtu\.be/.test(hotel.videoUrl);
  const isVimeo = hasVideo && /vimeo\.com/.test(hotel.videoUrl);
  const youtubeId = isYoutube ? hotel.videoUrl.split(/(?:v=|\/)/).pop().split('?')[0] : null;

  const locLabel = hotel.location?.name
    ? `${hotel.location.name}${hotel.location.country ? `, ${hotel.location.country}` : ''}`
    : (hotel.city?.name || hotel.cityName || addressShort(hotel.address) || '');

  return (
    <>
      {/* Hero — gallery + meta */}
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
                  No images yet
                </div>
              )}
            </div>

            {/* Meta + booking CTA */}
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-start gap-2">
                  <h1 className="text-2xl font-display font-bold leading-tight flex-1">
                    {hotel.name}
                  </h1>
                  {hotel.starRating && (
                    <span className="text-amber-500 text-base shrink-0 mt-1">
                      {'★'.repeat(hotel.starRating)}
                    </span>
                  )}
                </div>

                {locLabel && (
                  <div className="text-sm text-ink-muted mt-2 flex items-center gap-1">
                    <MapPin size={14} /> {locLabel}
                  </div>
                )}

                {Number(hotel.rating) > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="bg-emerald-600 text-white font-bold rounded px-2 py-1 text-sm">
                      {Number(hotel.rating).toFixed(1)}
                    </span>
                    {hotel.reviewCount > 0 && (
                      <span className="text-xs text-ink-muted">
                        ({hotel.reviewCount} reviews)
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-5 border-t pt-4">
                  <div className="text-xs text-ink-muted">From</div>
                  <div>
                    <span className="text-3xl font-bold text-brand">
                      {fromPriceLabel(hotelFromPrice(hotel, rooms), hotel.currency)}
                    </span>
                    {hasPrice(hotelFromPrice(hotel, rooms)) && hotel.priceOriginal && Number(hotel.priceOriginal) > hotelFromPrice(hotel, rooms) && (
                      <span className="ml-2 line-through text-ink-muted">
                        {Number(hotel.priceOriginal).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {hasPrice(hotelFromPrice(hotel, rooms)) && (
                    <div className="text-[11px] text-ink-muted mt-0.5">per night</div>
                  )}
                </div>

                <a href="#rooms" className="btn-primary w-full mt-4">
                  Choose your room
                </a>

                <div className="flex items-center gap-3 mt-3 text-xs text-ink-muted">
                  <button onClick={onShare} className="inline-flex items-center gap-1 hover:text-brand">
                    <Share2 size={14} /> Share
                  </button>
                  <button className="inline-flex items-center gap-1 hover:text-brand">
                    <Heart size={14} /> Save
                  </button>
                </div>
              </div>

              {hasVideo && (
                <div className="card p-3">
                  <button
                    onClick={() => setShowVideo((s) => !s)}
                    className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-brand py-2"
                  >
                    <Play size={16} /> {showVideo ? 'Hide video' : 'Watch overview video'}
                  </button>
                  {showVideo && (
                    <div className="aspect-video mt-2 rounded-lg overflow-hidden bg-black">
                      {isYoutube ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${youtubeId}`}
                          title="Hotel video"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : isVimeo ? (
                        <iframe
                          src={hotel.videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                          title="Hotel video"
                          className="w-full h-full"
                          allow="autoplay; fullscreen"
                          allowFullScreen
                        />
                      ) : (
                        <video src={hotel.videoUrl} controls className="w-full h-full" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container-app py-8 space-y-8">
        {/* About */}
        {hotel.description && (
          <Section title="About this property">
            <div className="rich-prose" dangerouslySetInnerHTML={{ __html: hotel.description }} />
          </Section>
        )}

        {/* Admin-added additional fields — each as its own block */}
        <ExtraSections sections={hotel.extraSections} />

        {/* Facilities */}
        {hotel.facilities?.length > 0 && (
          <Section icon={Wifi} title="Facilities">
            <div className="flex flex-wrap gap-2">
              {hotel.facilities.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-sm">
                  {f.name}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Highlights / Inclusions / Exclusions */}
        {(hotel.highlightsRich || hotel.inclusionsRich || hotel.exclusionsRich) && (
          <div className="grid md:grid-cols-3 gap-5">
            {hotel.highlightsRich && (
              <Section title="Highlights" compact>
                <div className="rich-prose" dangerouslySetInnerHTML={{ __html: hotel.highlightsRich }} />
              </Section>
            )}
            {hotel.inclusionsRich && (
              <Section title="Inclusions" compact>
                <div className="rich-prose" dangerouslySetInnerHTML={{ __html: hotel.inclusionsRich }} />
              </Section>
            )}
            {hotel.exclusionsRich && (
              <Section title="Exclusions" compact>
                <div className="rich-prose" dangerouslySetInnerHTML={{ __html: hotel.exclusionsRich }} />
              </Section>
            )}
          </div>
        )}

        {/* Available Rooms */}
        <div id="rooms" className="scroll-mt-24">
          <h2 className="text-2xl font-display font-bold mb-4">Available rooms</h2>

          <div className="mb-5">
            <HotelStayPicker value={stay} onChange={setStay} />
          </div>

          {(() => {
            const guests = (stay.adults || 0) + (stay.children || 0);
            const nights = nightsBetween(stay.checkIn, stay.checkOut);
            // A room "fits" when N rooms × its maxOccupancy can cover the party.
            const fitting = rooms.filter((r) => {
              const cap = (Number(r.maxOccupancy) || 2) * (stay.rooms || 1);
              return cap >= guests;
            });
            const tooSmall = rooms.length - fitting.length;

            if (rooms.length === 0) {
              return (
                <div className="card p-8 text-center text-ink-muted">
                  No rooms listed yet for this property.
                </div>
              );
            }
            if (fitting.length === 0) {
              return (
                <div className="card p-8 text-center">
                  <p className="text-ink-muted">
                    None of the room types fit {guests} guest{guests > 1 ? 's' : ''} in {stay.rooms} room
                    {stay.rooms > 1 ? 's' : ''}.
                  </p>
                  <p className="text-xs text-ink-muted mt-2">
                    Try adding another room or reducing guests.
                  </p>
                </div>
              );
            }
            return (
              <>
                {tooSmall > 0 && (
                  <p className="text-xs text-ink-muted mb-3">
                    {tooSmall} room type{tooSmall > 1 ? 's' : ''} hidden — too small for {guests} guests
                    across {stay.rooms} room{stay.rooms > 1 ? 's' : ''}.
                  </p>
                )}
                <div className="space-y-4">
                  {fitting.map((r) => (
                    <RoomRow key={r.id} hotel={hotel} room={r} stay={stay} nights={nights} />
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Inside-the-hotel activities — admin-attached to this hotel. */}
        <AddOnsCarousel
          title="Activities inside the hotel"
          addOns={insideAddOns}
          subtitle="Curated experiences offered right here at the property."
          guestCount={(stay.adults || 0) + (stay.children || 0)}
        />

        {/* Nearby — activities physically in the same city, shown with address. */}
        <AddOnsCarousel
          title={hotel.cityName ? `Activities nearby in ${hotel.cityName}` : 'Other suggested activities'}
          addOns={outsideAddOns}
          subtitle="Popular experiences around the hotel you can add to your trip."
          viewAllHref={hotel.location?.slug ? `/add-ons?location=${hotel.location.slug}` : '/add-ons'}
          guestCount={(stay.adults || 0) + (stay.children || 0)}
        />

        {/* Similar hotels */}
        {similarHotels.length > 0 && (
          <Section icon={HotelSuggestIcon} title="Other hotels you may like">
            <div className="flex items-end justify-between mb-4 -mt-1">
              <p className="text-sm text-ink-muted">
                {hotel.location?.name
                  ? `More stays in ${hotel.location.name}.`
                  : 'Hand-picked stays from our collection.'}
              </p>
              <Link
                to={hotel.location?.slug ? `/hotels?location=${hotel.location.slug}` : '/hotels'}
                className="text-sm text-brand font-semibold hover:underline whitespace-nowrap"
              >
                View all hotels →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {similarHotels.map((h) => (
                <SimilarHotelCard key={h.id} hotel={h} />
              ))}
            </div>
          </Section>
        )}

        {/* Nearby places */}
        {hotel.nearbyPlaces?.length > 0 && (
          <Section icon={Landmark} title="Nearby places">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {hotel.nearbyPlaces.map((n) => {
                const NIcon = nearbyIcon(n.name);
                return (
                  <div key={n.id} className="card overflow-hidden">
                    {n.imageUrl ? (
                      <div className="aspect-[4/3] bg-slate-100">
                        <img src={fileUrl(n.imageUrl)} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-gradient-to-br from-brand/10 via-white to-sky-100/50 flex items-center justify-center">
                        <span className="w-14 h-14 rounded-full bg-white shadow-sm ring-1 ring-brand/10 flex items-center justify-center text-brand">
                          <NIcon size={24} />
                        </span>
                      </div>
                    )}
                    <div className="p-2.5">
                      <div className="text-sm font-medium leading-tight">{n.name}</div>
                      {n.description && (
                        <p className="text-[11px] text-ink-muted line-clamp-2 mt-0.5">
                          {stripHtml(n.description)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Map */}
        {mapEmbedSrc(hotel.mapEmbedHtml) && (
          <Section title="Location on map">
            <div className="rounded-2xl overflow-hidden border">
              <iframe
                src={mapEmbedSrc(hotel.mapEmbedHtml)}
                title={`${hotel.name} location`}
                className="w-full h-[400px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            {hotel.address && (
              <p className="text-sm text-ink-muted mt-2 flex items-center gap-1">
                <MapPin size={14} /> {hotel.address}
              </p>
            )}
          </Section>
        )}

        {/* FAQs */}
        {hotel.faqs?.length > 0 && (
          <Section title="Frequently asked questions">
            <div className="space-y-2">
              {hotel.faqs.map((f, i) => (
                <FaqItem key={i} q={f.question} a={f.answer} />
              ))}
            </div>
          </Section>
        )}

        {/* Reviews */}
        <ReviewsBlock
          entityType="hotel"
          entityId={hotel.id}
          reviews={hotel.reviews}
          reviewCount={hotel.reviewCount}
          averageRating={hotel.rating}
        />

        {/* Terms & Privacy */}
        {(hotel.termsConditions || hotel.privacyPolicy) && (
          <div className="grid md:grid-cols-2 gap-5">
            {hotel.termsConditions && (
              <Section icon={Shield} title="Terms & conditions" compact>
                <div className="rich-prose text-sm" dangerouslySetInnerHTML={{ __html: hotel.termsConditions }} />
              </Section>
            )}
            {hotel.privacyPolicy && (
              <Section icon={ShieldCheck} title="Privacy policy" compact>
                <div className="rich-prose text-sm" dangerouslySetInnerHTML={{ __html: hotel.privacyPolicy }} />
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

// Renders the admin's "additional fields" — each a standalone titled block.
// Text values are rich-text HTML; image values are URLs.
export function ExtraSections({ sections }) {
  const list = (Array.isArray(sections) ? sections : []).filter((s) => s && s.value);
  if (!list.length) return null;
  return (
    <>
      {list.map((s, i) => (
        <Section key={i} title={s.name || 'More information'}>
          {s.type === 'image' ? (
            <img src={fileUrl(s.value)} alt={s.name || ''} className="rounded-xl max-h-[28rem] w-full object-cover" />
          ) : (
            <div className="rich-prose" dangerouslySetInnerHTML={{ __html: s.value }} />
          )}
        </Section>
      ))}
    </>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3.5 text-left bg-white hover:bg-surface-alt/50"
      >
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown size={16} className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 text-sm text-ink-muted rich-prose" dangerouslySetInnerHTML={{ __html: a }} />
      )}
    </div>
  );
}

function SimilarHotelCard({ hotel }) {
  return (
    <Link
      to={`/hotels/${hotel.slug}`}
      className="card group block overflow-hidden hover:shadow-lg transition"
    >
      <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
        {hotel.primaryImage ? (
          <img
            src={fileUrl(hotel.primaryImage)}
            alt={hotel.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <HotelSuggestIcon size={28} />
          </div>
        )}
        {hotel.starRating ? (
          <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-white/95 text-amber-700 font-semibold">
            {'★'.repeat(hotel.starRating)}
          </span>
        ) : null}
        {Number(hotel.rating) > 0 && (
          <span className="absolute top-2 right-2 bg-emerald-600 text-white font-bold rounded px-1.5 py-0.5 text-[11px]">
            {Number(hotel.rating).toFixed(1)}
          </span>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-semibold leading-tight line-clamp-2 group-hover:text-brand transition">
          {hotel.name}
        </h4>
        {hotel.location?.name && (
          <div className="text-xs text-ink-muted mt-1 flex items-center gap-1">
            <MapPin size={11} /> {hotel.location.name}
          </div>
        )}
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-base font-bold text-brand">
            {fromPriceLabel(hotel.priceFrom, hotel.currency)}
          </span>
          {hasPrice(hotel.priceFrom) && hotel.priceOriginal && Number(hotel.priceOriginal) > Number(hotel.priceFrom) && (
            <span className="line-through text-ink-muted text-xs">
              {Number(hotel.priceOriginal).toLocaleString()}
            </span>
          )}
          {hasPrice(hotel.priceFrom) && <span className="text-[10px] text-ink-muted ml-auto">/ night</span>}
        </div>
      </div>
    </Link>
  );
}

function AddOnCard({ addOn }) {
  return (
    <article className="card overflow-hidden hover:shadow-lg transition group">
      <Link to={`/add-ons/${addOn.slug}`} className="block aspect-[16/10] bg-slate-100 relative overflow-hidden">
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
      </Link>
      <div className="p-4">
        <Link to={`/add-ons/${addOn.slug}`} className="block">
          <h4 className="font-semibold leading-tight line-clamp-2 hover:text-brand transition">
            {addOn.name}
          </h4>
        </Link>
        {addOn.location?.name && (
          <div className="text-xs text-ink-muted mt-1 flex items-center gap-1">
            <MapPin size={11} /> {addOn.location.name}
          </div>
        )}
        {(addOn.minAge || addOn.maxAge) && (
          <div className="text-[11px] text-ink-muted mt-1">
            Age {addOn.minAge || 0}–{addOn.maxAge || '∞'}
          </div>
        )}
        <div className="flex items-end justify-between gap-2 mt-3 pt-3 border-t">
          <div>
            <span className="text-lg font-bold text-brand">
              {addOn.currency} {Number(addOn.price).toLocaleString()}
            </span>
            {addOn.priceOriginal && Number(addOn.priceOriginal) > Number(addOn.price) && (
              <span className="ml-1.5 line-through text-ink-muted text-xs">
                {Number(addOn.priceOriginal).toLocaleString()}
              </span>
            )}
            <div className="text-[10px] text-ink-muted">per person</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Link
              to={`/add-ons/${addOn.slug}`}
              className="btn-outline text-xs whitespace-nowrap"
            >
              Details
            </Link>
            <button
              type="button"
              className="btn-primary text-xs whitespace-nowrap"
              onClick={() => toast.success('Booking flow coming soon')}
            >
              Book
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function RoomRow({ hotel, room, stay, nights }) {
  const navigate = useNavigate();
  const requireLogin = useRequireLogin();
  // Bill preview built from the stay-picker state: nights × rooms × rate.
  const roomsBooked = Math.max(1, stay?.rooms || 1);
  const stayNights = Math.max(1, nights || 1);
  const totalPerStay = Number(room.price || 0) * stayNights * roomsBooked;
  const unitPricing = calculateTaxPricing(room.price, room.gstRate, room.tcsRate);
  const stayPricing = calculateTaxPricing(totalPerStay, room.gstRate, room.tcsRate);
  const unitLabel = priceUnitLabel(room.priceType, room.priceLabel) || 'per night';
  const guests = (stay?.adults || 0) + (stay?.children || 0);

  const handleBook = () => {
    const params = new URLSearchParams();
    if (stay?.checkIn)  params.set('from', stay.checkIn);
    if (stay?.checkOut) params.set('to', stay.checkOut);
    if (guests > 0)     params.set('guests', String(guests));
    if (roomsBooked)    params.set('rooms', String(roomsBooked));
    const target = `/book/room/${room.id}?${params.toString()}`;
    requireLogin(() => navigate(target), { redirectTo: target });
  };
  return (
    <article className="card flex flex-col md:flex-row overflow-hidden max-w-4xl">
      <div className="md:w-72 h-44 md:h-auto shrink-0 bg-slate-100 relative">
        {room.mainImage ? (
          <img src={fileUrl(room.mainImage)} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <Bed size={24} />
          </div>
        )}
        <WishlistButton type="room" id={room.id} className="bottom-3 right-3" />
      </div>
      <div className="flex-1 p-4 flex flex-col">
        <h4 className="font-display font-semibold text-lg leading-tight">{room.name}</h4>
        <div className="flex items-center flex-wrap gap-2 text-xs text-ink-muted mt-1">
          {room.roomSize && (
            <span className="inline-flex items-center gap-1">
              <Maximize2 size={11} /> {room.roomSize}
            </span>
          )}
          {room.maxOccupancy && (
            <>
              <span>·</span>
              <span>{occupancyLabel(room.maxOccupancy)}</span>
            </>
          )}
          {room.views?.length > 0 && (
            <>
              <span>·</span>
              <span>{room.views.map((v) => v.name).join(', ')}</span>
            </>
          )}
        </div>

        {(() => {
          // Facilities come either as taxonomy objects ({id,name}) or — for
          // PWA-published rooms — as a plain string list (facilitiesList).
          const facNames = [
            ...(Array.isArray(room.facilities) ? room.facilities.map((f) => f.name) : []),
            ...(Array.isArray(room.facilitiesList) ? room.facilitiesList : []),
          ].filter(Boolean);
          if (!facNames.length) return null;
          return (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {facNames.slice(0, 6).map((name, i) => (
                <span key={`${name}-${i}`} className="text-[11px] px-2 py-0.5 rounded-full bg-brand/10 text-brand">{name}</span>
              ))}
              {facNames.length > 6 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-ink-muted">+{facNames.length - 6}</span>}
            </div>
          );
        })()}

        {room.highlightsRich && (
          <div
            className="rich-prose text-xs text-ink-muted line-clamp-3 mt-2"
            dangerouslySetInnerHTML={{ __html: room.highlightsRich }}
          />
        )}

        {Array.isArray(room.extraPersonTiers) && room.extraPersonTiers.length > 0 && (
          <div className="mt-2 text-[11px] text-ink-muted">
            <span className="font-semibold text-ink">Extra guest:</span>{' '}
            {room.extraPersonTiers.map((t, i) => {
              const band = `${t.ageFrom}${t.ageTo != null ? `–${t.ageTo}` : '+'}y`;
              const price = t.priceType === 'custom' ? `₹${Number(t.price || 0).toLocaleString()}` : 'Free';
              return <span key={i}>{i > 0 ? ' · ' : ''}{band} {t.bed === 'with' ? '(bed)' : ''} {price}</span>;
            })}
          </div>
        )}

        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div>
            <span className="text-xl font-bold text-brand">
              {room.currency} {Math.round(unitPricing.total).toLocaleString()}
            </span>
            {room.priceOriginal && Number(room.priceOriginal) > Number(room.price) && (
              <span className="ml-2 line-through text-ink-muted text-sm">
                {Number(room.priceOriginal).toLocaleString()}
              </span>
            )}
            <div className="text-[11px] text-ink-muted">
              {unitPricing.hasTaxes ? `${taxIncludedLabel(unitPricing)} · ` : ''}{unitLabel}
            </div>
            <div className="mt-1 text-xs">
              <span className="text-ink-muted">{stayNights} night{stayNights > 1 ? 's' : ''} × {roomsBooked} room{roomsBooked > 1 ? 's' : ''} = </span>
              <span className="font-semibold text-ink">{room.currency} {Math.round(stayPricing.total).toLocaleString()}</span>
              {stayPricing.hasTaxes && <span className="text-[10px] text-ink-muted ml-1">tax included</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-stretch">
            <Link
              to={`/hotels/${hotel.slug}/rooms/${room.slug}`}
              className="btn-outline text-xs whitespace-nowrap"
            >
              View details
            </Link>
            <button type="button" className="btn-primary text-xs whitespace-nowrap" onClick={handleBook}>
              Book now
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
