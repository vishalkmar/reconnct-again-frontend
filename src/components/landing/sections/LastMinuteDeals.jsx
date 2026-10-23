import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, ArrowRight, ChevronLeft, ChevronRight, MapPin, Clock, Star, Send,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { iconForCategory } from '../../../utils/categoryIcons';
import {
  categoriesOf, imageOf, expHref, formatMoney, strikePrice,
} from '../../../utils/format';
import { WishHeart } from '../cards/parts';

/*
  "Last Minute Deals — Unmissable Experiences" (replaces the first app-style
  deal rail on Home). Card: photo with a tinted category pill, heart and a
  "% OFF" badge; navy panel with price (+ struck "was" price), city, title,
  duration, rating and an arrow button. The highlighted card (first, or the
  one under the pointer) gets a gold frame.
  The "was" price is the same decorative rule the app and the other deal
  cards use (strikePrice); "% OFF" is derived from it.
*/
const PILL_TINTS = [
  [/adventure|explor/, 'bg-[#FFC629] text-rc-navy'],
  [/wellness|heal/, 'bg-[#FBD3EA] text-[#6B1D47]'],
  [/spiritual|heritage/, 'bg-[#F6E7D2] text-[#5B3A12]'],
  [/food|culture/, 'bg-[#BFF0C9] text-[#14532D]'],
  [/sport|fun/, 'bg-[#BFE3FF] text-[#0B3B66]'],
  [/art|creativ/, 'bg-[#E4D7FF] text-[#3B1E7A]'],
  [/learn|growth/, 'bg-[#D9F2F2] text-[#134E4A]'],
  [/relationship|communit|group|corporate/, 'bg-[#FFE0CC] text-[#7A2E0B]'],
];
const pillTint = (name) => (PILL_TINTS.find(([re]) => re.test((name || '').toLowerCase())) || [null, 'bg-white/90 text-rc-navy'])[1];

function DealCard({ item, highlighted, onHover }) {
  const navigate = useNavigate();
  const cat = categoriesOf(item)[0];
  const CatIcon = cat ? iconForCategory(cat.name) : null;
  const price = Number(item.fromPrice) || 0;
  const was = strikePrice(price);
  const off = price && was > price ? Math.round(((was - price) / was) * 100) : 0;
  const href = expHref(item);

  return (
    <div
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={() => navigate(href)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(href); }}
      role="link"
      tabIndex={0}
      aria-label={`${item.name}${price ? `, ${formatMoney(price, item.currency)}` : ''}`}
      className={`group shrink-0 snap-start w-[270px] sm:w-[300px] lg:w-[310px] rounded-[22px] overflow-hidden bg-[#13203D] cursor-pointer transition duration-300 focus:outline-none ${
        highlighted
          ? 'ring-[3px] ring-rc-brand shadow-[0_0_0_6px_rgba(255,185,0,0.18),0_24px_44px_-18px_rgba(255,185,0,0.55)] -translate-y-1'
          : 'shadow-[0_18px_36px_-20px_rgba(16,24,40,0.6)]'
      } focus-visible:ring-[3px] focus-visible:ring-rc-brand`}
    >
      <div className="relative h-[210px] sm:h-[230px] overflow-hidden">
        <img src={imageOf(item)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.06] transition duration-700" />
        {cat && (
          <span className={`absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-bold max-w-[70%] ${pillTint(cat.name)}`}>
            {CatIcon && <CatIcon size={15} className="shrink-0" />}<span className="truncate">{cat.name}</span>
          </span>
        )}
        <WishHeart item={item} size={38} className="absolute top-3.5 right-3.5" />
        {off > 0 && (
          <span className="absolute left-3.5 bottom-3.5 inline-flex items-center h-7 px-3 rounded-full bg-[#FF2056] text-white text-xs font-extrabold tracking-wide shadow-[0_6px_14px_-6px_rgba(255,32,86,0.8)]">
            {off}% OFF
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#13203D] to-transparent" />
      </div>

      <div className="relative px-5 pt-2 pb-5 text-white">
        <div className="flex items-end gap-2 flex-wrap">
          <span className="text-2xl sm:text-[28px] font-black leading-none">{price ? formatMoney(price, item.currency) : 'Contact'}</span>
          {off > 0 && <span className="text-sm text-white/55 line-through">{formatMoney(was, item.currency)}</span>}
          {!!price && <span className="text-sm text-white/70">/{item.priceUnit || 'person'}</span>}
        </div>
        {!!item.city && <div className="flex items-center gap-1.5 text-sm text-white/80 mt-2"><MapPin size={14} />{item.city}</div>}
        <div className="flex items-end justify-between gap-3 mt-1.5">
          <div className="min-w-0">
            <h3 className="font-sans text-[17px] sm:text-lg font-extrabold leading-snug line-clamp-2 min-h-[2.75rem]">{item.name}</h3>
            <div className="flex items-center gap-4 text-sm text-white/85 mt-2">
              {!!item.durationLabel && <span className="flex items-center gap-1.5"><Clock size={15} />{item.durationLabel}</span>}
              <span className="flex items-center gap-1.5"><Star size={15} className="text-rc-brand" />{Number(item.rating || 0).toFixed(1)}{item.reviewsCount ? ` (${item.reviewsCount})` : ''}</span>
            </div>
          </div>
          <span className={`grid place-items-center w-11 h-11 rounded-full shrink-0 transition ${highlighted ? 'bg-rc-brand text-white' : 'bg-white text-rc-navy group-hover:bg-rc-brand group-hover:text-white'}`}>
            <ArrowRight size={20} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LastMinuteDeals({ data = [] }) {
  const reduce = useReducedMotion();
  const railRef = useRef(null);
  const [hi, setHi] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return undefined;
    const update = () => {
      setPages(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.05)));
      setPage(Math.round(el.scrollLeft / el.clientWidth));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [data.length]);

  if (!data.length) return null;
  const scrollTo = (p) => railRef.current?.scrollTo({ left: p * railRef.current.clientWidth, behavior: reduce ? 'auto' : 'smooth' });

  return (
    <motion.section
      className="relative isolate mt-6 sm:mt-10 py-8 sm:py-12 overflow-hidden"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="deals-title"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFAF2] to-[#FFF1DC]" aria-hidden="true" />
      <div className="absolute -right-16 top-10 w-80 h-80 rounded-full bg-[#FFE2A8]/50 blur-3xl -z-10" aria-hidden="true" />
      <div className="absolute left-1/4 bottom-0 w-[30rem] h-48 rounded-full bg-[#FFE8C8]/60 blur-3xl -z-10" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 text-[11px] sm:text-sm font-semibold tracking-[0.12em] uppercase text-rc-navy/85">
            <span className="h-1.5 w-8 rounded-full bg-rc-brand" /><Sparkles size={16} className="text-rc-brand" /> Last minute deals
          </div>
          <h2 id="deals-title" className="relative font-sans font-black text-[28px] sm:text-[44px] leading-[1.08] mt-2.5 text-rc-navy tracking-tight">
            Unmissable <span className="text-rc-brand">Experiences</span>
            <svg viewBox="0 0 60 60" className="hidden sm:block absolute -top-5 -right-12 w-12 h-12 text-rc-brand" aria-hidden="true">
              <path d="M12 26 L18 8 M30 30 L46 16 M34 44 L54 42" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
          </h2>
          <p className="text-sm sm:text-lg text-rc-ink-muted mt-2">Exclusive last minute deals, handpicked for your next adventure.</p>
        </div>
        <div className="hidden lg:flex items-start gap-1 text-[#F2C24E] select-none pointer-events-none mt-3" aria-hidden="true">
          <span className="font-script text-[44px] leading-[0.92] -rotate-[10deg]">Plan<br /><span className="ml-6">Pack</span><br /><span className="ml-12">Go!</span></span>
          <svg viewBox="0 0 230 110" className="w-[200px] h-[96px] -ml-4 mt-8" fill="none">
            <path d="M4 100 C 30 60, 60 20, 110 30 C 150 38, 160 80, 196 60 C 210 52, 218 36, 226 20" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 6" strokeLinecap="round" />
          </svg>
          <Send size={36} strokeWidth={1.6} className="text-rc-brand -ml-6 mt-1 rotate-[4deg]" />
        </div>
        <Link to="/experiences" className="hidden sm:inline-flex shrink-0 mt-10 items-center gap-2 h-12 px-6 rounded-full bg-rc-brand text-white font-bold hover:bg-rc-brand-dark shadow-[0_10px_24px_-12px_rgba(255,185,0,0.9)] transition">
          See all <ArrowRight size={18} />
        </Link>
      </div>

      <div className="relative max-w-7xl mx-auto mt-6 sm:mt-8">
        <div
          ref={railRef}
          className="rc-rail gap-4 sm:gap-5 px-4 sm:px-6 scroll-px-4 sm:scroll-px-6 py-4"
          onMouseLeave={() => setHi(0)}
          aria-label="Last minute deals"
        >
          {data.map((it, i) => <DealCard key={it.id || i} item={it} highlighted={i === hi} onHover={() => setHi(i)} />)}
        </div>
        {pages > 1 && (
          <>
            {page > 0 && (
            <button type="button" onClick={() => scrollTo(page - 1)} aria-label="Previous deals" className="hidden md:grid absolute -left-3 top-1/2 -translate-y-1/2 z-20 place-items-center w-14 h-14 rounded-full bg-white text-rc-navy shadow-card disabled:opacity-40 hover:scale-105 transition">
              <ChevronLeft size={24} />
            </button>
            )}
            {page < pages - 1 && (
            <button type="button" onClick={() => scrollTo(page + 1)} aria-label="Next deals" className="hidden md:grid absolute -right-3 top-1/2 -translate-y-1/2 z-20 place-items-center w-14 h-14 rounded-full bg-white text-rc-navy shadow-card disabled:opacity-40 hover:scale-105 transition">
              <ChevronRight size={24} />
            </button>
            )}
          </>
        )}
      </div>

      {pages > 1 && (
        <div className="flex justify-center items-center mt-2" role="tablist" aria-label="Deal pages">
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === page} aria-label={`Page ${i + 1}`} onClick={() => scrollTo(i)} className="grid place-items-center h-6 min-w-[24px] px-1">
              <span className={`block h-2 rounded-full transition-all ${i === page ? 'w-8 bg-rc-brand' : 'w-7 bg-rc-navy/10 hover:bg-rc-navy/20'}`} />
            </button>
          ))}
        </div>
      )}
      <div className="sm:hidden text-center mt-3">
        <Link to="/experiences" className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-rc-brand text-white text-sm font-bold">See all deals <ArrowRight size={16} /></Link>
      </div>
    </motion.section>
  );
}
