import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import {
  MapPin, Sparkles, ChevronLeft, ChevronRight, ArrowRight, Users, BadgePercent,
} from 'lucide-react';
import { fileUrl } from '../../services/api';
import WishlistButton from './WishlistButton.jsx';
import { priceUnitLabel } from '../../utils/priceType.js';
import { calculateTaxPricing, taxIncludedLabel } from '../../utils/taxPricing.js';

/**
 * Reusable carousel for "Suggested add-on activities" used on Hotel, Package
 * and Event detail pages. Replaces the legacy grid layouts so the section
 * keeps a constant height regardless of how many add-ons match.
 *
 * Props:
 *   title       — section heading (default "Suggested add-on activities")
 *   subtitle    — optional one-liner under the heading
 *   addOns      — array of add-on objects
 *   viewAllHref — optional link target for the "View all" CTA
 *   icon        — lucide icon component for the heading badge (default Sparkles)
 */
export default function AddOnsCarousel({
  title = 'Suggested add-on activities',
  subtitle = 'Make a memorable trip — hand-picked extras you can add at booking.',
  addOns = [],
  viewAllHref,
  icon: Icon = Sparkles,
  // Optional: hotel detail page passes the stay picker's guest count so the
  // card can show a live multiplied total ("₹500 × 3 guests = ₹1,500").
  guestCount = 0,
}) {
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  if (!addOns?.length) return null;

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand to-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xl md:text-2xl leading-tight">{title}</h2>
            {subtitle && (
              <p className="text-sm text-ink-muted mt-0.5 line-clamp-2">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {viewAllHref && (
            <Link
              to={viewAllHref}
              className="text-sm text-brand font-semibold hover:underline whitespace-nowrap"
            >
              View all <ArrowRight size={14} className="inline -mt-0.5" />
            </Link>
          )}
          <button
            type="button"
            ref={prevRef}
            aria-label="Previous"
            className="w-9 h-9 rounded-full border-2 border-slate-200 hover:border-brand hover:bg-brand hover:text-white text-ink-muted flex items-center justify-center transition disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            ref={nextRef}
            aria-label="Next"
            className="w-9 h-9 rounded-full border-2 border-slate-200 hover:border-brand hover:bg-brand hover:text-white text-ink-muted flex items-center justify-center transition disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <Swiper
        modules={[Navigation, Autoplay]}
        slidesPerView={1.1}
        spaceBetween={16}
        breakpoints={{
          480: { slidesPerView: 1.4 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 2.2 },
        }}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        onBeforeInit={(swiper) => {
          // Swiper grabs refs before they mount on first render — rebind once
          // they exist so the external arrows actually trigger slide changes.
          // eslint-disable-next-line no-param-reassign
          swiper.params.navigation.prevEl = prevRef.current;
          // eslint-disable-next-line no-param-reassign
          swiper.params.navigation.nextEl = nextRef.current;
        }}
        autoplay={addOns.length > 4 ? { delay: 5000, disableOnInteraction: true } : false}
        loop={addOns.length > 4}
        className="!pb-2"
      >
        {addOns.map((a) => (
          <SwiperSlide key={a.id} className="!h-auto">
            <AddOnPremiumCard addOn={a} guestCount={guestCount} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}

function AddOnPremiumCard({ addOn: a, guestCount = 0 }) {
  const orig = Number(a.priceOriginal || 0);
  const now = Number(a.price || 0);
  const taxPricing = calculateTaxPricing(now, a.gstRate, a.tcsRate);
  const discountPct = orig > now && orig > 0 ? Math.round(((orig - now) / orig) * 100) : 0;
  // Live per-person multiplied total — only shows when the parent passes a
  // real guest count so the section stays clean on pages without a picker.
  const livePartyTotal = guestCount > 0 ? now * guestCount : 0;
  const livePartyPricing = calculateTaxPricing(livePartyTotal, a.gstRate, a.tcsRate);

  return (
    <article className="relative h-full rounded-2xl overflow-hidden bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] hover:shadow-[0_20px_40px_-16px_rgba(15,118,110,0.35)] transition-all duration-300 group flex flex-col border border-slate-100">
      {/* Whole-card link overlay */}
      <Link
        to={`/add-ons/${a.slug}`}
        aria-label={`View ${a.name}`}
        tabIndex={-1}
        className="absolute inset-0 z-10"
      />

      {/* Image with overlay badges */}
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        {a.mainImage ? (
          <img
            src={fileUrl(a.mainImage)}
            alt={a.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted bg-gradient-to-br from-brand-light/20 to-emerald-50">
            <Sparkles size={32} />
          </div>
        )}

        {/* Top-row badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-20">
          <div className="flex flex-col gap-1.5 items-start">
            {discountPct > 0 && (
              <span className="inline-flex items-center gap-1 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                <BadgePercent size={11} /> {discountPct}% OFF
              </span>
            )}
            {a.isFeatured && (
              <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                ★ POPULAR
              </span>
            )}
          </div>
          {a.location?.name && (
            <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur text-ink text-[10px] font-semibold px-2 py-1 rounded-full shadow">
              <MapPin size={10} /> {a.location.name}
            </span>
          )}
        </div>

        {/* Gradient overlay on bottom for legibility on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <WishlistButton type="addon" id={a.id} className="bottom-3 right-3" />
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-display font-semibold text-base leading-snug line-clamp-2 group-hover:text-brand transition">
          {a.name}
        </h3>
        {(a.address || a.cityName) && (
          <p className="mt-1 flex items-start gap-1 text-[11px] text-ink-muted line-clamp-2">
            <MapPin size={11} className="mt-0.5 shrink-0" />
            <span>{[a.address, a.cityName].filter(Boolean).join(', ')}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted mt-2">
          {(a.minAge || a.maxAge) && (
            <span className="inline-flex items-center gap-1">
              <Users size={11} /> Age {a.minAge || 0}–{a.maxAge || '∞'}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] text-ink-muted uppercase tracking-wide mr-1">From</span>
            <span className="text-lg font-bold text-brand">
              {a.currency} {Math.round(taxPricing.total).toLocaleString()}
            </span>
            {a.priceOriginal && Number(a.priceOriginal) > Number(a.price) && (
              <span className="text-xs line-through text-ink-muted">
                {Number(a.priceOriginal).toLocaleString()}
              </span>
            )}
            <span className="text-[10px] text-ink-muted">{priceUnitLabel(a.priceType, a.priceLabel) || 'per person'}</span>
          </div>
          {taxPricing.hasTaxes && (
            <div className="text-[10px] text-ink-muted mt-0.5">{taxIncludedLabel(taxPricing)}</div>
          )}
          {livePartyTotal > 0 && (
            <div className="text-[11px] mt-0.5">
              <span className="text-ink-muted">{guestCount} guests = </span>
              <span className="font-semibold text-ink">{a.currency} {Math.round(livePartyPricing.total).toLocaleString()}</span>
            </div>
          )}
          <Link
            to={`/add-ons/${a.slug}`}
            className="relative z-20 mt-2.5 w-full inline-flex items-center justify-center gap-1 text-xs font-semibold text-white bg-brand px-3 py-2 rounded-lg hover:bg-brand-dark transition"
          >
            View details <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </article>
  );
}
