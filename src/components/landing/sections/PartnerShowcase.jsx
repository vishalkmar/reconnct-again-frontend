import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Handshake, Tag, ShieldCheck, BadgePercent, Headphones, ChevronLeft, ChevronRight,
  ArrowRight, MapPin, Clock, Star, Send,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { iconForCategory } from '../../../utils/categoryIcons';
import {
  categoriesOf, imageOf, expHref, formatMoney, strikePrice, optimizeImg,
} from '../../../utils/format';
import { WishHeart } from '../cards/parts';

/*
  "Connect With Your Travel Partner" (replaces the app-style partner band on
  Home; same data rule — partner-audience or open-to-all listings). Scenic
  lake backdrop, four trust pills, polaroids, a handwritten "Together We
  Travel Further", and photo cards framed by an ANIMATED border: a light
  sweeps round each frame continuously (gold and brighter on the
  highlighted card). The sweep is a rotating conic-gradient (`.rc-sweep` in
  index.css, @property --rc-angle); browsers without @property show a static
  frame, and reduced-motion users get no movement.
*/
const PILL_TINTS = [
  [/adventure|explor/, 'bg-[#FFC629] text-rc-navy'],
  [/wellness|heal/, 'bg-[#FBD3EA] text-[#6B1D47]'],
  [/spiritual|heritage/, 'bg-white/90 text-[#5B3A12]'],
  [/food|culture/, 'bg-[#BFF0C9] text-[#14532D]'],
  [/sport|fun|water/, 'bg-[#DCEBFF] text-[#0B3B66]'],
  [/art|creativ/, 'bg-[#E4D7FF] text-[#3B1E7A]'],
  [/learn|growth/, 'bg-[#D9F2F2] text-[#134E4A]'],
  [/relationship|communit|group|corporate/, 'bg-[#FFE0CC] text-[#7A2E0B]'],
];
const pillTint = (name) => (PILL_TINTS.find(([re]) => re.test((name || '').toLowerCase())) || [null, 'bg-white/90 text-rc-navy'])[1];

const TRUST = [
  { icon: Tag, line1: 'Exclusive', line2: 'Partner Deals' },
  { icon: ShieldCheck, line1: 'Trusted &', line2: 'Verified Partners' },
  { icon: BadgePercent, line1: 'Best', line2: 'Prices' },
  { icon: Headphones, line1: 'Dedicated', line2: 'Partner Support' },
];

function PartnerCard({ item, highlighted, onHover, index }) {
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
      className={`rc-sweep ${highlighted ? 'rc-sweep--gold' : ''} shrink-0 snap-start w-[270px] sm:w-[300px] lg:w-[318px] rounded-[26px] p-[3px] transition-transform duration-300 ${highlighted ? '-translate-y-1.5' : ''}`}
      style={{ '--rc-sweep-delay': `${-index * 0.9}s` }}
    >
      <div
        onClick={() => navigate(href)}
        onKeyDown={(e) => { if (e.key === 'Enter') navigate(href); }}
        role="link"
        tabIndex={0}
        aria-label={`${item.name}${price ? `, ${formatMoney(price, item.currency)}` : ''}`}
        className="group relative h-[420px] sm:h-[452px] rounded-[23px] overflow-hidden bg-[#0f1a33] cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-rc-brand/60"
      >
        <img src={imageOf(item)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition duration-700" />
        <span className="absolute inset-0 bg-[linear-gradient(0deg,#0b1430_0%,rgba(11,20,48,0.85)_30%,rgba(11,20,48,0.25)_60%,transparent_100%)]" />

        {cat && (
          <span className={`absolute top-4 left-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-bold max-w-[70%] shadow-sm ${pillTint(cat.name)}`}>
            {CatIcon && <CatIcon size={15} className="shrink-0" />}<span className="truncate">{cat.name}</span>
          </span>
        )}
        <WishHeart item={item} size={38} className="absolute top-4 right-4" />

        <div className="absolute left-5 right-5 bottom-5 text-white">
          {off > 0 && (
            <span className="inline-flex items-center h-7 px-3 rounded-full bg-[#FF2056] text-white text-xs font-extrabold tracking-wide shadow-[0_6px_14px_-6px_rgba(255,32,86,0.8)]">{off}% OFF</span>
          )}
          <h3 className="font-sans text-lg sm:text-[20px] font-extrabold leading-snug mt-3 line-clamp-2">{item.name}</h3>
          {!!item.city && <div className="flex items-center gap-1.5 text-sm text-white/85 mt-1.5"><MapPin size={14} />{item.city}</div>}
          <div className="flex items-center gap-5 text-sm text-white/90 mt-2.5">
            {!!item.durationLabel && <span className="flex items-center gap-1.5"><Clock size={15} />{item.durationLabel}</span>}
            <span className="flex items-center gap-1.5"><Star size={15} className="text-rc-brand" />{Number(item.rating || 0).toFixed(1)}{item.reviewsCount ? ` (${item.reviewsCount})` : ''}</span>
          </div>
          <div className="h-px bg-white/20 my-3.5" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-end gap-1.5 min-w-0 whitespace-nowrap">
              {off > 0 && <span className="text-[13px] sm:text-sm text-[#FF5277] line-through font-bold">{formatMoney(was, item.currency)}</span>}
              <span className="text-[22px] sm:text-[24px] font-black leading-none">{price ? formatMoney(price, item.currency) : 'Contact'}</span>
              {!!price && <span className="text-xs sm:text-[13px] text-white/75">/{item.priceUnit || 'person'}</span>}
            </div>
            <span className={`grid place-items-center w-11 h-11 rounded-full shrink-0 transition ${highlighted ? 'bg-rc-brand text-white' : 'bg-white text-rc-navy group-hover:bg-rc-brand group-hover:text-white'}`}>
              <ArrowRight size={20} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartnerShowcase({ data = [] }) {
  const reduce = useReducedMotion();
  const railRef = useRef(null);
  const [hi, setHi] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = railRef.current;
    if (!el) return undefined;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [data.length]);

  if (!data.length) return null;
  const scroll = (dir) => railRef.current?.scrollBy({ left: dir * Math.max(320, railRef.current.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' });

  return (
    <motion.section
      className="relative isolate mt-6 sm:mt-10 pt-10 sm:pt-14 pb-10 overflow-hidden"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="partner-title"
    >
      {/* Scenic backdrop + veils for legible copy */}
      <picture className="absolute inset-0 -z-20" aria-hidden="true">
        <source type="image/webp" srcSet="/partner/lake-800.webp 800w, /partner/lake-1400.webp 1400w, /partner/lake-2000.webp 2000w" sizes="100vw" />
        <img src="/partner/lake-1400.webp" alt="" loading="lazy" className="w-full h-full object-cover object-[center_60%]" />
      </picture>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.6)_28%,rgba(255,255,255,0.15)_55%,rgba(11,20,48,0.35)_100%)]" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-[760px]">
            <div className="flex items-center gap-2.5 text-[11px] sm:text-xs font-bold tracking-[0.22em] uppercase text-rc-navy/85">
              <span className="h-[3px] w-7 rounded-full bg-rc-brand" /><Handshake size={18} className="text-rc-brand" /> Partner experiences
            </div>
            <h2 id="partner-title" className="font-display font-bold text-[30px] sm:text-[46px] leading-[1.05] mt-2.5 text-rc-navy">
              Connect With Your<br /><span className="text-rc-brand">Travel</span> Partner
            </h2>
            <p className="text-sm sm:text-lg text-rc-navy/80 mt-2.5">Discover exclusive experiences from our trusted partners.</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {TRUST.map((t) => (
                <li key={t.line2} className="inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full bg-white/75 backdrop-blur border border-white shadow-[0_6px_18px_-10px_rgba(16,24,40,0.35)]">
                  <span className="grid place-items-center w-8 h-8 rounded-full bg-rc-brand-soft text-rc-brand-dark shrink-0"><t.icon size={17} /></span>
                  <span className="text-[12px] sm:text-[13px] font-semibold leading-tight text-rc-navy whitespace-nowrap">{t.line1}<br />{t.line2}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Script + polaroids (wide screens) */}
          <div className="hidden lg:flex items-start gap-6 select-none pointer-events-none" aria-hidden="true">
            <div className="relative mt-6">
              <svg viewBox="0 0 200 90" className="absolute -left-48 top-8 w-[190px] h-[84px] text-rc-brand" fill="none">
                <path d="M4 80 C 40 82, 70 40, 100 50 C 130 60, 150 30, 190 8" stroke="currentColor" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
              </svg>
              <Send size={34} strokeWidth={1.8} className="absolute -left-10 -top-2 text-rc-brand rotate-[8deg]" />
              <p className="font-script text-[42px] leading-[0.95] text-rc-navy -rotate-[8deg] whitespace-nowrap">Together<br /><span className="ml-8">We Travel Further</span></p>
              <svg viewBox="0 0 260 30" className="w-[230px] h-[24px] ml-6 -mt-1 text-rc-brand" fill="none">
                <path d="M4 26 C 80 10, 160 4, 256 6" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="relative w-[230px] h-[190px]">
              <img src={optimizeImg('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=360&q=75')} alt="" className="absolute left-0 top-4 w-[130px] h-[160px] object-cover rounded-md border-[6px] border-white shadow-card -rotate-[8deg]" />
              <img src={optimizeImg('https://images.unsplash.com/photo-1503104834685-7205e8607eb9?w=360&q=75')} alt="" className="absolute left-[96px] top-0 w-[130px] h-[160px] object-cover rounded-md border-[6px] border-white shadow-card rotate-[6deg]" />
              <svg viewBox="0 0 50 50" className="absolute -right-3 -top-3 w-10 h-10 text-rc-brand"><path d="M10 22 L16 6 M26 26 L40 14 M30 38 L46 36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto mt-8 sm:mt-10">
        <div ref={railRef} className="rc-rail gap-4 sm:gap-6 px-4 sm:px-6 scroll-px-4 sm:scroll-px-6 py-4" onMouseLeave={() => setHi(0)} aria-label="Partner experiences">
          {data.map((it, i) => <PartnerCard key={it.id || i} item={it} index={i} highlighted={i === hi} onHover={() => setHi(i)} />)}
        </div>
        {!edges.start && (
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous partner experiences" className="hidden md:grid absolute -left-3 top-1/2 -translate-y-1/2 z-20 place-items-center w-14 h-14 rounded-full bg-white text-rc-navy shadow-card hover:scale-105 transition">
            <ChevronLeft size={24} />
          </button>
        )}
        {!edges.end && (
          <button type="button" onClick={() => scroll(1)} aria-label="Next partner experiences" className="hidden md:grid absolute -right-3 top-1/2 -translate-y-1/2 z-20 place-items-center w-14 h-14 rounded-full bg-white text-rc-navy shadow-card hover:scale-105 transition">
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </motion.section>
  );
}
