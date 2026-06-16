import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Bed, Maximize2, Users, ArrowLeft, Share2,
  Wifi, Mountain, Plus, X as XIcon, Minus, Baby,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/pagination';

import api, { fileUrl } from '../../services/api';
import WishlistButton from '../../components/public/WishlistButton.jsx';
import useRequireLogin from '../../hooks/useRequireLogin.js';
import { computeRoomEstimate, matchTier } from '../../utils/roomPricing.js';
import { occupancyLabel } from '../../utils/occupancy.js';
import { priceUnitLabel } from '../../utils/priceType.js';
import { calculateTaxPricing, taxIncludedLabel } from '../../utils/taxPricing.js';

export default function RoomDetailPage() {
  const { hotelSlug, roomSlug } = useParams();
  const navigate = useNavigate();
  const requireLogin = useRequireLogin();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  // Booking estimate state — mirrors the MMT-style flow so the user picks
  // everything here and lands on the checkout with the right quote.
  const [nights, setNights] = useState(1);
  const [adults, setAdults] = useState(1);
  const [extraPersons, setExtraPersons] = useState([]); // { age, bed }

  const tiers = Array.isArray(room?.extraPersonTiers) ? room.extraPersonTiers : [];
  const estimate = computeRoomEstimate({
    price: Number(room?.price) || 0,
    maxOccupancy: room?.maxOccupancy || 2,
    tiers,
    nights,
    adults,
    extraPersons,
  });
  const unitPricing = calculateTaxPricing(room?.price, room?.gstRate, room?.tcsRate);
  const estimatePricing = calculateTaxPricing(estimate.subtotal, room?.gstRate, room?.tcsRate);

  const handleBook = () => {
    if (!room) return;
    const params = new URLSearchParams();
    params.set('nights', String(Math.max(1, nights)));
    params.set('guests', String(Math.max(1, adults)));
    params.set('rooms', String(estimate.rooms));
    if (extraPersons.length) params.set('extra', JSON.stringify(extraPersons));
    const target = `/book/room/${room.id}?${params.toString()}`;
    requireLogin(() => navigate(target), { redirectTo: target });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/rooms/by-slug', { params: { hotelSlug, roomSlug } })
      .then((res) => { if (!cancelled) setRoom(res.data?.data?.room); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hotelSlug, roomSlug]);

  const onShare = () => {
    if (navigator.share) {
      navigator.share({ title: room?.name, url: window.location.href }).catch(() => {});
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

  if (!room) {
    return (
      <div className="container-app section text-center">
        <h1 className="heading">Room not found</h1>
        <Link to={`/hotels/${hotelSlug}`} className="btn-primary mt-6 inline-flex">
          Back to hotel
        </Link>
      </div>
    );
  }

  const galleryImages = [
    ...(room.mainImage ? [{ id: 'main', url: room.mainImage }] : []),
    ...(room.gallery || []),
  ];

  return (
    <>
      <div className="bg-surface-alt">
        <div className="container-app py-4">
          <Link
            to={`/hotels/${hotelSlug}#rooms`}
            className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand"
          >
            <ArrowLeft size={14} /> Back to {room.hotel?.name || 'hotel'}
          </Link>
        </div>

        <div className="container-app pb-6">
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
                  <Bed size={48} />
                </div>
              )}
            </div>

            {/* Booking card */}
            <div className="space-y-4">
              <div className="card p-5">
                <h1 className="text-2xl font-display font-bold leading-tight">{room.name}</h1>
                {room.hotel && (
                  <Link
                    to={`/hotels/${room.hotel.slug}`}
                    className="text-sm text-brand hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <MapPin size={12} /> {room.hotel.name}
                  </Link>
                )}

                <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                  <Spec icon={Maximize2} label="Size" value={room.roomSize || '—'} />
                  <Spec icon={Users} label="Occupancy" value={occupancyLabel(room.maxOccupancy)} />
                  <Spec icon={Bed} label="Type" value="Private room" />
                </div>

                <div className="mt-5 border-t pt-4">
                  <div className="text-xs text-ink-muted">{priceUnitLabel(room.priceType, room.priceLabel) || 'per night'}</div>
                  <div>
                    <span className="text-3xl font-bold text-brand">
                      {room.currency} {Math.round(unitPricing.total).toLocaleString()}
                    </span>
                    {room.priceOriginal && Number(room.priceOriginal) > Number(room.price) && (
                      <span className="ml-2 line-through text-ink-muted">
                        {Number(room.priceOriginal).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {unitPricing.hasTaxes && (
                    <div className="text-[11px] text-ink-muted mt-0.5">{taxIncludedLabel(unitPricing)}</div>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Estimate your total</p>

                  {/* Nights + adults steppers */}
                  <div className="grid grid-cols-2 gap-3">
                    <Stepper label="Nights" value={nights} min={1} max={30} onChange={setNights} />
                    <Stepper label={`Adults (max ${room.maxOccupancy}/room)`} value={adults} min={1} max={30} onChange={setAdults} />
                  </div>

                  {/* Extra guests (only when the room configures pricing for them) */}
                  {tiers.length > 0 && (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-ink inline-flex items-center gap-1.5">
                          <Baby size={14} className="text-brand" /> Extra guests
                        </span>
                        <button
                          type="button"
                          onClick={() => setExtraPersons((p) => [...p, { age: '', bed: 'without' }])}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          <Plus size={13} /> Add person
                        </button>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1">
                        Add children/extra guests with their age &amp; bed — price updates live and an extra
                        room is added automatically when occupancy is exceeded.
                      </p>
                      <div className="mt-2 space-y-2">
                        {extraPersons.map((p, idx) => {
                          const tier = matchTier(tiers, p);
                          const label = p.age === ''
                            ? 'Pick age'
                            : !tier || tier.priceType === 'free'
                              ? 'Complementary'
                              : `${room.currency} ${Number(tier.price).toLocaleString()}/night`;
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <select
                                value={p.age}
                                onChange={(e) => setExtraPersons((arr) => arr.map((x, i) => i === idx ? { ...x, age: e.target.value === '' ? '' : parseInt(e.target.value, 10) } : x))}
                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs w-24"
                              >
                                <option value="">Age…</option>
                                {Array.from({ length: 16 }, (_, a) => (
                                  <option key={a} value={a}>{a >= 15 ? '15+ (adult)' : `${a} yr`}</option>
                                ))}
                              </select>
                              <select
                                value={p.bed}
                                onChange={(e) => setExtraPersons((arr) => arr.map((x, i) => i === idx ? { ...x, bed: e.target.value } : x))}
                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                              >
                                <option value="without">Without bed</option>
                                <option value="with">With bed</option>
                              </select>
                              <span className="flex-1 text-[11px] text-ink-muted truncate">{label}</span>
                              <button type="button" onClick={() => setExtraPersons((arr) => arr.filter((_, i) => i !== idx))} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Remove">
                                <XIcon size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Live total */}
                  <div className="border-t pt-3 text-sm space-y-1">
                    {estimate.rooms > 1 && (
                      <div className="text-[11px] text-amber-700">
                        Party needs {estimate.rooms} rooms — added automatically.
                      </div>
                    )}
                    <div className="flex justify-between text-ink-muted text-xs">
                      <span>{room.currency} {Number(room.price).toLocaleString()} × {nights} night{nights === 1 ? '' : 's'} × {estimate.rooms} room{estimate.rooms === 1 ? '' : 's'}</span>
                      <span>{room.currency} {estimate.base.toLocaleString()}</span>
                    </div>
                    {estimate.extra > 0 && (
                      <div className="flex justify-between text-ink-muted text-xs">
                        <span>Extra guests</span>
                        <span>{room.currency} {estimate.extra.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-ink pt-1">
                      <span>{estimatePricing.hasTaxes ? 'Total' : 'Subtotal'}</span>
                      <span className="text-brand">{room.currency} {Math.round(estimatePricing.total).toLocaleString()}</span>
                    </div>
                    {estimatePricing.hasTaxes && (
                      <div className="text-[10px] text-ink-muted">{taxIncludedLabel(estimatePricing)}</div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary w-full mt-4"
                  onClick={handleBook}
                >
                  Book {estimate.rooms > 1 ? `${estimate.rooms} rooms · ` : ''}{nights} night{nights === 1 ? '' : 's'}
                </button>

                <div className="flex items-center gap-3 mt-3 text-xs text-ink-muted">
                  <button onClick={onShare} className="inline-flex items-center gap-1 hover:text-brand">
                    <Share2 size={14} /> Share
                  </button>
                  <WishlistButton type="room" id={room.id} variant="pill" size={14} className="!py-1 !px-2.5 !text-xs" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-app py-8 space-y-6">
        {/* Views */}
        {room.views?.length > 0 && (
          <Section icon={Mountain} title="Room views">
            <div className="flex flex-wrap gap-2">
              {room.views.map((v) => (
                <span key={v.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-wellness/10 text-wellness text-sm">
                  {v.name}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Facilities — taxonomy objects ({id,name}) and/or PWA string list. */}
        {(() => {
          const facNames = [
            ...(Array.isArray(room.facilities) ? room.facilities.map((f) => f.name) : []),
            ...(Array.isArray(room.facilitiesList) ? room.facilitiesList : []),
          ].filter(Boolean);
          if (!facNames.length) return null;
          return (
            <Section icon={Wifi} title="Room facilities">
              <div className="flex flex-wrap gap-2">
                {facNames.map((name, i) => (
                  <span key={`${name}-${i}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-sm">{name}</span>
                ))}
              </div>
            </Section>
          );
        })()}

        {/* Short description */}
        {room.shortDescription && (
          <div className="rich-prose text-ink-muted" dangerouslySetInnerHTML={{ __html: room.shortDescription }} />
        )}

        {/* Highlights */}
        {room.highlightsRich && (
          <Section title="Highlights">
            <div className="rich-prose" dangerouslySetInnerHTML={{ __html: room.highlightsRich }} />
          </Section>
        )}

        {/* Description */}
        {room.descriptionRich && (
          <Section title="About this room">
            <div className="rich-prose" dangerouslySetInnerHTML={{ __html: room.descriptionRich }} />
          </Section>
        )}

        {/* Inclusions / Exclusions */}
        {(room.inclusionsRich || room.exclusionsRich) && (
          <div className="grid md:grid-cols-2 gap-5">
            {room.inclusionsRich && (
              <Section title="Inclusions">
                <div className="rich-prose" dangerouslySetInnerHTML={{ __html: room.inclusionsRich }} />
              </Section>
            )}
            {room.exclusionsRich && (
              <Section title="Exclusions">
                <div className="rich-prose" dangerouslySetInnerHTML={{ __html: room.exclusionsRich }} />
              </Section>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="card p-6">
      <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
        {Icon && <Icon size={18} className="text-brand" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Spec({ icon: Icon, label, value }) {
  return (
    <div className="text-center">
      <Icon size={16} className="mx-auto text-ink-muted" />
      <div className="text-[10px] uppercase tracking-wide text-ink-muted mt-1">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

function Stepper({ label, value, min = 0, max = 99, onChange }) {
  const clamp = (n) => Math.max(min, Math.min(max, n));
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-muted mb-1">{label}</div>
      <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
        <button type="button" onClick={() => onChange(clamp(value - 1))} className="px-2.5 py-1.5 text-ink-muted hover:bg-slate-100" aria-label="decrease">
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || min))}
          className="w-full text-center text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" onClick={() => onChange(clamp(value + 1))} className="px-2.5 py-1.5 text-ink-muted hover:bg-slate-100" aria-label="increase">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
