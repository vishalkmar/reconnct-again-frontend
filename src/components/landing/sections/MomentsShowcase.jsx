import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { categoriesOf } from '../../../utils/format';
import { categoryImage } from '../../../constants/categoryImages';

/*
  "Experiences for every moment" — one card per category (taxonomy) in a
  coverflow carousel: the centred card is larger and in front, neighbours
  tilt away in 3D. Each card shows the category, the live number of
  experiences in it and opens /experiences?categoryIds=… . Arrows, dots,
  swipe/drag (native scroll-snap) and keyboard ←/→.
  Photos: public/moments/*.webp (from the design), matched by name; any other
  category falls back to the keyword photo map.
*/
const PHOTOS = [
  [/wellness|heal|spa|yoga/, '/moments/wellness.webp'],
  [/learn|growth|personal/, '/moments/learning.webp'],
  [/art|creativ|craft/, '/moments/art.webp'],
  [/adventure|explor|outdoor|trek/, '/moments/adventure.webp'],
  [/sport|fun|game|play/, '/moments/sports.webp'],
  [/food|culinar|cuisine|culture/, '/moments/food.webp'],
  [/spiritual|heritage|histor/, '/moments/spiritual.webp'],
  [/relationship|communit|social/, '/moments/relationship.webp'],
  [/group/, '/moments/group.webp'],
];
const photoFor = (cat) => {
  const k = `${cat.slug || ''} ${cat.name || ''}`.toLowerCase();
  const hit = PHOTOS.find(([re]) => re.test(k));
  return hit ? hit[1] : categoryImage(cat.slug, cat.name);
};

const CARD_W = { base: 172, sm: 196 };
const GAP = 18;

function useCardWidth() {
  const get = () => (typeof window !== 'undefined' && window.innerWidth >= 640 ? CARD_W.sm : CARD_W.base);
  const [w, setW] = useState(get);
  useEffect(() => {
    const on = () => setW(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

export default function MomentsShowcase({ categories = [], loaded = true, items = [] }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const railRef = useRef(null);
  const cardW = useCardWidth();
  const step = cardW + GAP;
  const [pos, setPos] = useState(0); // fractional index of the centred card
  const [side, setSide] = useState(0);
  const startIdx = Math.min(3, Math.max(0, categories.length - 1));

  // Live counts per category (a listing counts under every category it carries).
  const counts = useMemo(() => {
    const m = {};
    items.forEach((e) => categoriesOf(e).forEach((c) => { m[c.id] = (m[c.id] || 0) + 1; }));
    return m;
  }, [items]);

  // Side padding so the first/last card can sit in the centre.
  const measure = useCallback(() => {
    const el = railRef.current;
    if (el) setSide(Math.max(16, (el.clientWidth - cardW) / 2));
  }, [cardW]);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Start with a card in the middle (like the design) once sizes are known.
  const started = useRef(false);
  useEffect(() => {
    const el = railRef.current;
    if (!el || !side || !categories.length || started.current) return;
    started.current = true;
    el.scrollLeft = startIdx * step;
    setPos(startIdx);
  }, [side, categories.length, startIdx, step]);

  const goTo = (i) => {
    const el = railRef.current;
    const n = categories.length;
    if (!el || !n) return;
    const idx = Math.max(0, Math.min(n - 1, i));
    el.scrollTo({ left: idx * step, behavior: reduce ? 'auto' : 'smooth' });
  };
  const active = Math.round(pos);

  if (loaded && !categories.length) return null;

  return (
    <motion.section
      className="relative isolate mt-6 sm:mt-10 pt-8 sm:pt-12 pb-6 overflow-hidden"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="moments-title"
    >
      {/* airy blue/peach backdrop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#F3F8FF] via-[#FBF8F4] to-[#FFF6EC]" aria-hidden="true" />
      <div className="absolute -left-20 top-1/3 w-80 h-80 rounded-full bg-[#DDE6FF]/60 blur-3xl -z-10" aria-hidden="true" />
      <div className="absolute left-1/3 top-10 w-96 h-72 rounded-full bg-[#FFE7C2]/50 blur-3xl -z-10" aria-hidden="true" />
      <div className="absolute right-0 bottom-0 w-[30rem] h-56 rounded-full bg-[#FFE2CC]/60 blur-3xl -z-10" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-start justify-between gap-6">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/70 border border-white text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-rc-navy/80 shadow-[0_2px_10px_rgba(16,24,40,0.05)]">
            <Globe size={15} className="text-rc-brand" /> Explore by interest
          </span>
          <h2 id="moments-title" className="font-sans font-black text-[30px] sm:text-5xl leading-[1.04] mt-3 text-rc-navy">
            Experiences for<br /><span className="text-rc-brand">every moment</span>
          </h2>
          <p className="text-sm sm:text-lg text-rc-ink-muted mt-3 leading-relaxed">
            From peaceful getaways to thrilling adventures, discover experiences that fit every mood and milestone.
          </p>
        </div>

        <div className="hidden lg:flex items-start gap-1 text-[#A9BBD0] select-none pointer-events-none mt-6" aria-hidden="true">
          <span className="font-script text-[46px] leading-[0.95] -rotate-[8deg]">Moments<br /><span className="ml-10">that Matter</span></span>
          <svg viewBox="0 0 160 120" className="w-[140px] h-[105px] -ml-6 mt-4" fill="none">
            <path d="M6 110 C 60 120, 110 92, 118 60 C 124 36, 132 22, 150 8" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 5" strokeLinecap="round" />
          </svg>
          <Send size={32} strokeWidth={1.6} className="text-rc-brand -ml-6 -mt-1 rotate-[6deg]" />
        </div>

        <Link to="/experiences" className="hidden sm:inline-flex shrink-0 mt-8 items-center gap-2 h-10 sm:h-12 px-4 sm:px-6 rounded-full bg-rc-brand/85 text-rc-navy text-sm sm:text-base font-bold hover:bg-rc-brand shadow-[0_10px_24px_-12px_rgba(255,185,0,0.8)] transition">
          See all <ArrowRight size={18} />
        </Link>
      </div>

      {/* Coverflow rail — full width so side cards run off the screen edges */}
      <div className="relative mt-4 sm:mt-6">
        <div
          ref={railRef}
          onScroll={(e) => setPos(e.currentTarget.scrollLeft / step)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
          }}
          className="flex items-center overflow-x-auto snap-x snap-mandatory rc-no-scrollbar py-12 sm:py-14"
          style={{ paddingLeft: side, paddingRight: side, scrollPaddingLeft: side, gap: GAP, perspective: 1100 }}
          role="list"
          aria-label="Experience categories"
        >
          {loaded
            ? categories.map((c, i) => {
              const d = i - pos; // signed distance from the centre, in cards
              const ad = Math.min(Math.abs(d), 2);
              const isActive = i === active;
              const scale = 1 + 0.26 * Math.max(0, 1 - Math.abs(d));
              const rotate = Math.max(-16, Math.min(16, -d * 9));
              const lift = ad * 10;
              const n = counts[c.id] || 0;
              return (
                <div
                  key={c.id}
                  role="listitem"
                  className="snap-start shrink-0"
                  style={{
                    width: cardW,
                    transform: reduce ? undefined : `translateY(${lift}px) rotateY(${rotate}deg) scale(${scale})`,
                    zIndex: 50 - Math.round(ad * 10),
                    transition: 'transform 120ms linear',
                  }}
                >
                  <div
                    onClick={() => navigate(`/experiences?categoryIds=${c.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/experiences?categoryIds=${c.id}`); }}
                    role="link"
                    tabIndex={0}
                    aria-label={`${c.name}${n ? `, ${n} experiences` : ''}`}
                    className={`group relative block cursor-pointer h-[248px] sm:h-[282px] rounded-[24px] overflow-hidden bg-rc-navy focus:outline-none focus-visible:ring-4 focus-visible:ring-rc-brand/60 ${
                      isActive ? 'shadow-[0_26px_50px_-18px_rgba(16,24,40,0.6)]' : 'shadow-[0_14px_28px_-16px_rgba(16,24,40,0.45)]'
                    }`}
                  >
                    <img src={photoFor(c)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition duration-700" />
                    <span className="absolute inset-0 bg-gradient-to-t from-[#141425] via-[#141425]/30 to-transparent" />
                    <span className="absolute left-3.5 right-3.5 bottom-3.5 text-white">
                      <span className="block font-sans text-[17px] sm:text-lg font-extrabold leading-tight line-clamp-2 drop-shadow-sm">{c.name}</span>
                      <span className="mt-2.5 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center h-7 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap ${isActive ? 'bg-rc-brand text-rc-navy' : 'bg-white/20 backdrop-blur text-white'}`}>
                          {n ? `${n} experience${n === 1 ? '' : 's'}` : 'Explore'}
                        </span>
                        <span className="grid place-items-center w-7 h-7 rounded-full bg-white text-rc-navy shrink-0"><ChevronRight size={15} strokeWidth={2.6} /></span>
                      </span>
                    </span>
                    {/* sparkle accent on the centred card */}
                    {isActive && !reduce && (
                      <svg viewBox="0 0 60 60" className="absolute -top-0 right-1 w-10 h-10 text-rc-brand pointer-events-none" aria-hidden="true">
                        <path d="M12 20 L18 6 M28 24 L42 12 M34 36 L52 32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })
            : Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="rc-skeleton shrink-0 rounded-[24px] h-[248px] sm:h-[282px]" style={{ width: cardW }} />
            ))}
        </div>

        {loaded && categories.length > 1 && (
          <>
            <button type="button" onClick={() => goTo(active - 1)} disabled={active <= 0} aria-label="Previous category" className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-[60] hidden sm:grid place-items-center w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white text-rc-navy shadow-card disabled:opacity-40 hover:scale-105 transition">
              <ChevronLeft size={24} strokeWidth={2.4} />
            </button>
            <button type="button" onClick={() => goTo(active + 1)} disabled={active >= categories.length - 1} aria-label="Next category" className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-[60] hidden sm:grid place-items-center w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white text-rc-navy shadow-card disabled:opacity-40 hover:scale-105 transition">
              <ChevronRight size={24} strokeWidth={2.4} />
            </button>
          </>
        )}
      </div>

      {loaded && categories.length > 1 && (
        <div className="flex justify-center items-center -mt-2" role="tablist" aria-label="Choose category">
          {categories.map((c, i) => (
            <button key={c.id} type="button" role="tab" aria-selected={i === active} aria-label={c.name} onClick={() => goTo(i)} className="grid place-items-center h-6 min-w-[20px] px-0.5">
              <span className={`block h-2 rounded-full transition-all ${i === active ? 'w-8 bg-rc-brand' : 'w-2 bg-rc-navy/20 hover:bg-rc-navy/40'}`} />
            </button>
          ))}
        </div>
      )}
      {/* Phones: See all sits under the carousel (the header is too narrow for it). */}
      <div className="sm:hidden text-center mt-3">
        <Link to="/experiences" className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-rc-brand/85 text-rc-navy text-sm font-bold">
          See all experiences <ArrowRight size={16} />
        </Link>
      </div>
    </motion.section>
  );
}
