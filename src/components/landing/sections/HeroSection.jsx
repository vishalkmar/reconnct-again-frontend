import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Gem, ShieldCheck, CalendarDays, ChevronLeft, ChevronRight, Plane } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

/*
  Landing hero — full-bleed photo slider with the brand line
  "Reconnct. Explore. Together.", a search bar that opens the experiences
  list, three trust points, a handwritten "More Meaningful Journeys" accent
  and slide dots + arrows. Slide 1 is the brand photo shipped in
  public/hero/ (WebP in three widths + JPG fallback).
*/
const SLIDES = [
  {
    key: 'santorini',
    sources: [
      { type: 'image/webp', srcSet: '/hero/santorini-640.webp 640w, /hero/santorini-1024.webp 1024w, /hero/santorini-1795.webp 1795w' },
    ],
    src: '/hero/santorini-1600.jpg',
    alt: 'A couple watching the sunset over the sea from an infinity pool',
    position: '62% center',
  },
  {
    key: 'coast',
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1800&q=75&auto=format&fit=crop',
    alt: 'Turquoise sea meeting a quiet beach',
    position: 'center',
  },
  {
    key: 'road',
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1800&q=75&auto=format&fit=crop',
    alt: 'Sunlight over a mountain valley',
    position: 'center',
  },
];
const AUTO_MS = 6500;

const FEATURES = [
  { icon: Gem, line1: 'Handpicked', line2: 'Experiences' },
  { icon: ShieldCheck, line1: 'Trusted', line2: 'Partners' },
  { icon: CalendarDays, line1: 'Seamless', line2: 'Booking' },
];

export default function HeroSection() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  const go = useCallback((i) => setIndex((i + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (reduce || paused || SLIDES.length < 2) return undefined;
    timer.current = setTimeout(() => go(index + 1), AUTO_MS);
    return () => clearTimeout(timer.current);
  }, [index, paused, reduce, go]);

  const submit = (e) => {
    e.preventDefault();
    const t = q.trim();
    navigate(t ? `/experiences?q=${encodeURIComponent(t)}` : '/experiences');
  };

  return (
    <section
      className="relative isolate overflow-hidden bg-rc-navy text-white h-[540px] sm:h-[580px] lg:h-[calc(100vh-88px)] lg:min-h-[560px] lg:max-h-[720px]"
      aria-roledescription="carousel"
      aria-label="Featured journeys"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides (cross-fade) */}
      {SLIDES.map((s, i) => (
        <picture key={s.key} className={`absolute inset-0 -z-20 transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i !== index}>
          {(s.sources || []).map((src) => <source key={src.type} type={src.type} srcSet={src.srcSet} sizes="100vw" />)}
          <img
            src={s.src}
            alt={i === index ? s.alt : ''}
            className={`w-full h-full object-cover ${i === index && !reduce ? 'animate-[rcKenBurns_14s_ease-out_forwards]' : ''}`}
            style={{ objectPosition: s.position }}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchpriority={i === 0 ? 'high' : 'auto'}
            decoding="async"
          />
        </picture>
      ))}
      {/* Legibility: dark on the left where the copy sits, soft at the bottom */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b1020]/80 via-[#0b1020]/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 -z-10 bg-gradient-to-t from-black/45 to-transparent" />

      {/* Handwritten accent — wide screens */}
      <div className="hidden lg:block absolute right-[4%] top-[14%] w-[260px] text-white/95 select-none pointer-events-none" aria-hidden="true">
        <p className="font-script text-[38px] leading-[1.05] -rotate-[8deg] drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
          More<br /><span className="ml-[-10px]">Meaningful</span><br /><span className="ml-10">Journeys</span>
        </p>
        <svg viewBox="0 0 220 140" className="absolute -right-2 top-10 w-[200px] h-[130px]" fill="none">
          <path d="M150 128 C 200 110, 215 70, 196 30" stroke="currentColor" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
        </svg>
        <Plane size={34} strokeWidth={1.6} className="absolute -right-4 top-8 rotate-[-35deg]" />
      </div>

      {/* Copy + search */}
      <div className="h-full px-5 sm:px-8 lg:px-16 2xl:px-[116px] flex flex-col justify-center pt-4 pb-20">
        <p className="text-[10px] sm:text-xs font-medium tracking-[0.3em] uppercase text-white/90">
          Curated experiences for every connection
        </p>
        <h1 className="font-sans font-black tracking-tight leading-[1.02] mt-3 sm:mt-4 text-[36px] sm:text-[50px] lg:text-[62px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
          Reconnct.<br />
          Explore. <span className="text-rc-brand">Together.</span>
        </h1>
        <div className="flex items-center gap-6 mt-3 sm:mt-4" aria-hidden="true">
          <span className="block h-1 w-8 rounded-full bg-rc-brand" />
          <span className="block h-[3px] w-12 rounded-full bg-rc-brand/80" />
        </div>
        <p className="mt-3 sm:mt-4 max-w-[540px] text-[15px] sm:text-lg lg:text-xl leading-snug text-white/95">
          Discover handpicked experiences that bring you closer to what (and who) matters.
        </p>

        <form
          role="search"
          onSubmit={submit}
          className="mt-5 sm:mt-7 flex items-center w-full max-w-[680px] h-[52px] sm:h-[60px] bg-white rounded-full pl-4 sm:pl-6 pr-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.45)]"
        >
          <Search size={20} className="text-rc-navy/70 shrink-0" />
          <input
            type="search"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Experiences, destinations, activities..."
            aria-label="Search experiences, destinations, activities"
            className="flex-1 min-w-0 bg-transparent px-3 text-[15px] sm:text-base text-rc-navy placeholder:text-rc-navy/45 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="submit" className="shrink-0 h-10 sm:h-12 px-5 sm:px-8 rounded-full bg-rc-brand text-rc-navy text-[15px] sm:text-base font-bold hover:bg-rc-brand-dark transition">
            Search
          </button>
        </form>

        <ul className="mt-5 sm:mt-7 flex items-center gap-4 sm:gap-0">
          {FEATURES.map((f, i) => (
            <li key={f.line1} className={`flex items-center gap-2.5 sm:gap-3 ${i > 0 ? 'sm:pl-8 sm:ml-8 sm:border-l sm:border-white/35' : ''}`}>
              <f.icon size={30} strokeWidth={1.7} className="text-rc-brand shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-[12px] sm:text-[15px] leading-tight text-white/95">
                {f.line1}<br />{f.line2}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Slide controls */}
      {SLIDES.length > 1 && (
        <div className="absolute right-5 sm:right-10 lg:right-11 bottom-6 sm:bottom-10 flex items-center gap-5 sm:gap-8">
          <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                onClick={() => go(i)}
                className="grid place-items-center h-6"
              >
                <span className={`block h-[5px] rounded-full transition-all ${i === index ? 'w-8 bg-rc-brand' : 'w-6 bg-white/70 hover:bg-white'}`} />
              </button>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="grid place-items-center w-14 h-14 rounded-full border-2 border-white/90 text-white hover:bg-white hover:text-rc-navy transition">
              <ChevronLeft size={24} />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="grid place-items-center w-14 h-14 rounded-full border-2 border-white/90 text-white hover:bg-white hover:text-rc-navy transition">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
