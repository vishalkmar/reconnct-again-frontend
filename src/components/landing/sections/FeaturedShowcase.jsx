import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, ArrowRight, ArrowLeft, Globe, MapPin, Star, Clock, Users, Heart, Layers, Info, Send,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { iconForCategory } from '../../../utils/categoryIcons';
import {
  categoriesOf, imageOf, expHref, formatMoney,
} from '../../../utils/format';
import { WishHeart } from '../cards/parts';

/*
  "Explore, Experience, Enjoy" — featured experiences with category chips
  and flip cards: the front is the photo card (category, title, city, rating,
  duration, price); hovering (desktop) or tapping the ⓘ (touch) turns the card
  over to a cream panel with highlights and Book Now. Highlights come only
  from real listing data (category, duration, group size, audiences, city).
*/
function highlightsOf(e) {
  const out = [];
  const cat = categoriesOf(e)[0];
  if (cat) out.push({ icon: iconForCategory(cat.name), text: cat.name });
  if (e.durationLabel) out.push({ icon: Clock, text: `${e.durationLabel} experience` });
  if (e.capacity) out.push({ icon: Users, text: `Groups of up to ${e.capacity}` });
  const auds = (e.audiences || []).map((a) => a.name).filter(Boolean);
  out.push({ icon: Heart, text: auds.length ? `Great for ${auds.slice(0, 2).join(' & ')}` : 'Great for everyone' });
  if (e.city && out.length < 4) out.push({ icon: MapPin, text: `In ${e.city}` });
  return out.slice(0, 4);
}

function FlipCard({ item }) {
  const navigate = useNavigate();
  const [flipped, setFlipped] = useState(false);
  const cat = categoriesOf(item)[0];
  const CatIcon = cat ? iconForCategory(cat.name) : Layers;
  const href = expHref(item);
  const price = Number(item.fromPrice) || 0;

  return (
    <div className={`rc-flip shrink-0 snap-start w-[262px] sm:w-[300px] lg:w-[312px] h-[340px] sm:h-[352px] ${flipped ? 'is-flipped' : ''}`}>
      <div className="rc-flip-inner">
        {/* Front — photo card */}
        <div
          className="rc-flip-face rounded-[22px] overflow-hidden bg-rc-navy shadow-[0_18px_36px_-18px_rgba(16,24,40,0.55)] cursor-pointer"
          onClick={() => navigate(href)}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate(href); }}
          aria-label={item.name}
        >
          <img src={imageOf(item)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-[#141425] via-[#141425]/45 to-transparent" />
          <WishHeart item={item} size={40} className="absolute top-3.5 right-3.5 z-10" />
          <button
            type="button"
            aria-label="Show highlights"
            onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
            className="rc-flip-touch absolute top-3.5 left-3.5 z-10 grid place-items-center w-10 h-10 rounded-full bg-white/90 text-rc-navy"
          >
            <Info size={18} />
          </button>
          <div className="absolute left-5 right-5 bottom-5 text-white">
            <CatIcon size={22} className="text-rc-brand" />
            <h3 className="font-sans text-lg sm:text-xl font-extrabold leading-tight mt-2 line-clamp-2">{item.name}</h3>
            {!!item.city && <div className="flex items-center gap-1.5 text-sm text-white/85 mt-1.5"><MapPin size={14} />{item.city}</div>}
            <div className="flex items-center justify-between gap-2 mt-3">
              <div className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex items-center gap-1"><Star size={15} className="fill-rc-brand text-rc-brand" />{Number(item.rating || 0).toFixed(1)}{item.reviewsCount ? <span className="text-white/70"> ({item.reviewsCount})</span> : null}</span>
                {!!item.durationLabel && <span className="flex items-center gap-1"><Clock size={14} />{item.durationLabel}</span>}
              </div>
              <span className="text-xl sm:text-[22px] font-black text-rc-brand whitespace-nowrap">{price ? formatMoney(price, item.currency) : 'Contact'}</span>
            </div>
          </div>
        </div>

        {/* Back — highlights + book */}
        <div className="rc-flip-face rc-flip-back rounded-[22px] overflow-hidden bg-[#FFFBF2] border border-[#F4E6C8] shadow-[0_18px_36px_-18px_rgba(16,24,40,0.35)] p-6 flex flex-col">
          <svg viewBox="0 0 120 120" className="absolute -right-6 -top-6 w-36 h-36 text-[#F2DFB5]" fill="none" aria-hidden="true">
            {[20, 34, 48, 62].map((r) => <circle key={r} cx="120" cy="0" r={r} stroke="currentColor" strokeWidth="1.2" />)}
          </svg>
          <button type="button" aria-label="Back to photo" onClick={() => setFlipped(false)} className="rc-flip-touch absolute top-3.5 right-3.5 z-10 grid place-items-center w-9 h-9 rounded-full bg-white text-rc-navy shadow-soft">
            <ArrowLeft size={16} />
          </button>
          <h3 className="relative font-sans text-[22px] font-black text-rc-navy leading-tight line-clamp-3 pr-8">{item.name}</h3>
          <ul className="relative mt-5 space-y-3.5 flex-1">
            {highlightsOf(item).map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-[15px] text-rc-ink">
                <h.icon size={20} className="text-rc-brand shrink-0" /><span className="line-clamp-1">{h.text}</span>
              </li>
            ))}
          </ul>
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-rc-ink-muted">from</div>
              <div className="text-xl font-black text-rc-navy">{price ? formatMoney(price, item.currency) : 'Contact'}</div>
            </div>
            <Link to={href} className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 h-11 sm:h-12 px-4 sm:px-6 rounded-full bg-rc-brand text-rc-navy text-sm sm:text-base font-bold hover:bg-rc-brand-dark shadow-[0_10px_24px_-10px_rgba(255,185,0,0.8)] transition">
              Book Now <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeaturedShowcase({ featured = [], categories = [], loading = false }) {
  const reduce = useReducedMotion();
  const railRef = useRef(null);
  const [activeCat, setActiveCat] = useState(null);
  const shown = useMemo(
    () => (activeCat ? featured.filter((e) => categoriesOf(e).some((c) => c.id === activeCat)) : featured),
    [featured, activeCat],
  );
  const scroll = (dir) => {
    const el = railRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(300, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <motion.section
      className="relative isolate mt-6 sm:mt-10 py-8 sm:py-12 overflow-hidden"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="featured-title"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#FFF7EA] via-[#FFFBF4] to-[#FFF4E2]" aria-hidden="true" />
      <div className="absolute -left-24 top-24 w-80 h-80 rounded-full bg-[#FFE3B0]/50 blur-3xl -z-10" aria-hidden="true" />
      <div className="absolute right-0 bottom-0 w-[28rem] h-60 rounded-full bg-[#FFE9C9]/60 blur-3xl -z-10" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-rc-navy/80">
              <span className="h-1 w-7 rounded-full bg-rc-brand" /><Sparkles size={15} className="text-rc-brand" /> Featured experiences
            </div>
            <h2 id="featured-title" className="font-sans font-black text-[28px] sm:text-[44px] leading-[1.08] mt-2.5 text-rc-navy">
              Explore, <span className="text-rc-brand">Experience,</span> Enjoy
            </h2>
            <p className="text-sm sm:text-lg text-rc-ink-muted mt-2">Curated experiences for every mood, interest and travel style.</p>
          </div>
          <div className="hidden lg:flex items-center gap-1 text-[#E3B65C] select-none pointer-events-none" aria-hidden="true">
            <span className="font-script text-[42px] leading-[0.95] -rotate-[8deg]">Moments<br /><span className="ml-10">that Matter</span></span>
            <svg viewBox="0 0 200 60" className="w-[170px] h-[52px] -ml-3" fill="none">
              <path d="M2 40 C 40 60, 70 10, 110 30 C 140 46, 168 40, 196 14" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 5" strokeLinecap="round" />
            </svg>
            <Send size={32} strokeWidth={1.6} className="text-rc-brand -ml-4 -mt-6" />
          </div>
          <Link to="/experiences?featured=1" className="hidden sm:inline-flex shrink-0 mt-2 items-center gap-2 h-12 px-6 rounded-full bg-rc-brand text-rc-navy font-bold hover:bg-rc-brand-dark shadow-[0_10px_24px_-12px_rgba(255,185,0,0.8)] transition">
            See all <ArrowRight size={18} />
          </Link>
        </div>

        {/* Category chips */}
        <div className="rc-rail gap-2.5 mt-6 -mx-4 px-4 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0 pb-1" role="tablist" aria-label="Filter featured by category">
          <Chip label="All" icon={Globe} active={!activeCat} onClick={() => setActiveCat(null)} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} icon={iconForCategory(c.name)} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} />
          ))}
        </div>
      </div>

      {/* Card rail */}
      <div className="relative max-w-7xl mx-auto mt-6 sm:mt-8 group/rail">
        <div ref={railRef} className="rc-rail gap-5 px-4 sm:px-6 scroll-px-4 sm:scroll-px-6 py-3" aria-label="Featured experiences">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="rc-skeleton shrink-0 rounded-[22px] w-[262px] sm:w-[300px] lg:w-[312px] h-[340px] sm:h-[352px]" />)
            : shown.map((it) => <FlipCard key={it.id} item={it} />)}
        </div>
        {!loading && !shown.length && (
          <div className="px-4 sm:px-6 py-10 text-center text-rc-ink-muted">
            No featured experiences here yet. <Link to="/experiences" className="font-bold text-rc-brand-text">Browse all experiences</Link>
          </div>
        )}
        {shown.length > 1 && (
          <>
            <button type="button" onClick={() => scroll(-1)} aria-label="Previous experiences" className="hidden md:grid absolute -left-3 top-1/2 -translate-y-1/2 z-20 place-items-center w-14 h-14 rounded-full bg-white text-rc-navy shadow-card hover:scale-105 transition">
              <ArrowLeft size={22} />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="Next experiences" className="hidden md:grid absolute -right-3 top-1/2 -translate-y-1/2 z-20 place-items-center w-14 h-14 rounded-full bg-white text-rc-navy shadow-card hover:scale-105 transition">
              <ArrowRight size={22} />
            </button>
          </>
        )}
      </div>

      <div className="sm:hidden text-center mt-4">
        <Link to="/experiences?featured=1" className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-rc-brand text-rc-navy text-sm font-bold">
          See all featured <ArrowRight size={16} />
        </Link>
      </div>
    </motion.section>
  );
}

function Chip({ label, icon: Icon, active, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-2 h-11 sm:h-12 px-4 sm:px-5 rounded-full text-sm font-semibold whitespace-nowrap transition ${
        active ? 'bg-rc-brand text-white shadow-[0_10px_22px_-12px_rgba(255,185,0,0.9)]' : 'bg-white text-rc-navy shadow-[0_4px_14px_-8px_rgba(16,24,40,0.25)] hover:bg-rc-brand-soft'
      }`}
    >
      {Icon && <Icon size={18} className={active ? 'text-white' : 'text-rc-navy/80'} />}
      {label}
    </button>
  );
}
