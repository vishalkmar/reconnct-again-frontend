import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import publicApi from '../../../services/publicApi';
import { resolveImage, srcSetFor, DUMMY_IMAGE } from '../../../utils/format';

const AUTO_MS = 5000;

// Shown only if the offer-banners endpoint can't be reached, so the section
// never disappears.
const FALLBACK = [
  { id: 'f1', type: 'image_text', image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=75', badge: 'Featured experience', title: 'Weekend escapes', subtitle: 'Slow down and reconnect somewhere new.', ctaText: 'Explore Experience', ctaLink: '/experiences' },
  { id: 'f2', type: 'image_text', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=75', badge: 'Featured experience', title: 'Sun, sea & together time', subtitle: 'Coastal experiences for the whole family.', ctaText: 'Explore Experience', ctaLink: '/experiences' },
];

/*
  Where a banner goes. Admin enters `ctaLink` (Admin → App Screens Control →
  Offer Banners): an in-site path (/experiences/…), a full URL on this same
  site (turned into a path), or an external URL (opens in a new tab).
*/
function targetOf(banner) {
  const raw = String(banner.ctaLink || banner.link || banner.url || '').trim();
  if (!raw) return { to: '/experiences' };
  if (raw.startsWith('/')) return { to: raw };
  try {
    const u = new URL(raw);
    if (u.origin === window.location.origin) return { to: `${u.pathname}${u.search}${u.hash}` };
    return { href: u.href };
  } catch {
    return { to: `/${raw.replace(/^\/*/, '')}` };
  }
}

function BannerLink({ banner, className, children, tabIndex, ariaLabel }) {
  const t = targetOf(banner);
  if (t.href) {
    return <a href={t.href} target="_blank" rel="noopener noreferrer" className={className} tabIndex={tabIndex} aria-label={ariaLabel}>{children}</a>;
  }
  return <Link to={t.to} className={className} tabIndex={tabIndex} aria-label={ariaLabel}>{children}</Link>;
}

/*
  "Featured" banner carousel under the hero — admin-managed Offer Banners
  (/public/offer-banners, the same list the Android app shows). Each slide:
  photo, optional badge pill, title, subtitle and button; the whole banner and
  the button open the banner's redirect URL. Cross-fade, 5 s autoplay (paused
  on hover/focus and for reduced motion), swipe on touch, arrows, dots and a
  thumbnail strip on wide screens.
*/
export default function OfferBannerCarousel() {
  const [banners, setBanners] = useState(FALLBACK);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const touchX = useRef(null);

  useEffect(() => {
    let alive = true;
    publicApi.offerBanners()
      .then((d) => { if (alive && d?.banners?.length) { setBanners(d.banners); setIndex(0); } })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const count = banners.length;
  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || reduce) return undefined;
    const t = setTimeout(() => go(index + 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [index, count, paused, reduce, go]);

  if (!count) return null;
  const current = banners[index] || banners[0];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-5 sm:mt-8" aria-roledescription="carousel" aria-label="Featured experiences">
      <div
        className="relative isolate overflow-hidden rounded-[22px] sm:rounded-[28px] bg-rc-navy h-[190px] sm:h-[250px] lg:h-[340px] shadow-card"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        {/* Slides (cross-fade). The photo itself links to the banner's URL. */}
        {banners.map((b, i) => {
          const active = i === index;
          return (
            <div key={b.id || i} className={`absolute inset-0 transition-opacity duration-700 ${active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`} aria-hidden={!active}>
              <BannerLink banner={b} className="absolute inset-0 block" tabIndex={active ? 0 : -1} ariaLabel={b.title || b.ctaText || 'Open offer'}>
                <img
                  src={resolveImage(b.image, 1600) || DUMMY_IMAGE}
                  srcSet={srcSetFor(b.image, [640, 1000, 1600])}
                  sizes="(min-width: 1280px) 1232px, calc(100vw - 32px)"
                  alt={b.title || 'Featured experience'}
                  className={`w-full h-full object-cover ${active && !reduce ? 'animate-[rcKenBurns_9s_ease-out_forwards]' : ''}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchpriority={i === 0 ? 'high' : 'auto'}
                  decoding="async"
                />
                {b.type !== 'image' && <span className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />}
              </BannerLink>
            </div>
          );
        })}

        {/* Copy for the active slide (image + text banners only) */}
        {current.type !== 'image' && (
          <div key={current.id || index} className="absolute z-20 left-5 sm:left-20 lg:left-[100px] right-5 sm:right-auto top-1/2 -translate-y-1/2 max-w-[520px] text-white pointer-events-none animate-[fadeIn_450ms_ease-out]">
            {!!current.badge && (
              <span className="inline-flex items-center gap-2 h-7 sm:h-8 px-3 sm:px-4 rounded-full bg-black/30 backdrop-blur border border-white/25 text-[10px] sm:text-[12px] font-semibold tracking-[0.16em] uppercase">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rc-brand" />{current.badge}
              </span>
            )}
            {!!current.title && (
              <h2 className="font-sans font-black text-[22px] sm:text-[30px] lg:text-[40px] leading-[1.08] mt-2 sm:mt-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] line-clamp-2">
                {current.title}
              </h2>
            )}
            {!!current.subtitle && (
              <p className="mt-1.5 sm:mt-2.5 text-[13px] sm:text-base lg:text-lg text-white/95 line-clamp-2 max-w-[440px]">{current.subtitle}</p>
            )}
            {!!current.ctaText && (
              <BannerLink
                banner={current}
                className="pointer-events-auto mt-3 sm:mt-5 inline-flex items-center gap-2 h-9 sm:h-12 px-4 sm:px-6 rounded-full bg-rc-brand text-rc-navy text-sm sm:text-base font-bold hover:bg-rc-brand-dark shadow-[0_10px_30px_-10px_rgba(255,185,0,0.7)] transition"
              >
                {current.ctaText} <ArrowRight size={18} />
              </BannerLink>
            )}
          </div>
        )}

        {count > 1 && (
          <>
            {/* Arrows */}
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous banner" className="absolute z-30 left-3 sm:left-5 top-1/2 -translate-y-1/2 hidden sm:grid place-items-center w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-white text-rc-navy shadow-card hover:scale-105 transition">
              <ChevronLeft size={26} strokeWidth={2.4} />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next banner" className="absolute z-30 right-3 sm:right-5 top-1/2 -translate-y-1/2 hidden sm:grid place-items-center w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-white text-rc-navy shadow-card hover:scale-105 transition">
              <ChevronRight size={26} strokeWidth={2.4} />
            </button>

            {/* Thumbnails (wide screens) */}
            <div className="absolute z-30 right-24 bottom-6 hidden lg:flex gap-2.5" role="tablist" aria-label="Choose banner">
              {banners.slice(0, 6).map((b, i) => (
                <button
                  key={b.id || i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={b.title || `Banner ${i + 1}`}
                  onClick={() => go(i)}
                  className={`w-[86px] h-[62px] rounded-xl overflow-hidden border-[3px] transition ${i === index ? 'border-rc-brand scale-105' : 'border-white/70 opacity-85 hover:opacity-100'}`}
                >
                  <img src={resolveImage(b.image, 240) || DUMMY_IMAGE} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Dots */}
            <div className="absolute z-30 left-1/2 -translate-x-1/2 bottom-2 sm:bottom-5 flex items-center">
              {banners.map((b, i) => (
                <button key={b.id || i} type="button" aria-label={`Show banner ${i + 1}`} aria-current={i === index} onClick={() => go(i)} className="grid place-items-center h-6 min-w-[22px] px-1">
                  <span className={`block h-2.5 sm:h-3 rounded-full transition-all ${i === index ? 'w-7 sm:w-8 bg-rc-brand' : 'w-2.5 sm:w-3 bg-white/90'}`} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
