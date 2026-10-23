import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, ArrowRight, ChevronLeft, ChevronRight, MapPin, Clock, Star, Send, Globe,
  Trophy, ShieldCheck, Tag, Headphones, Users, Leaf, Smile, Gem, Heart, Building2, Mountain, UtensilsCrossed,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { iconForCategory } from '../../../utils/categoryIcons';
import {
  categoriesOf, imageOf, expHref, formatMoney, strikePrice,
} from '../../../utils/format';
import { WishHeart } from '../cards/parts';

/*
  "Trending Experiences" (end of Home). Its own card look, distinct from the
  deal/partner rails above: a white-framed card whose photo dissolves into a
  cream panel through a soft wave, with faint gold line-art (dunes, arches,
  waves, peaks) in the panel corner.
  Ranking: most reviewed, then best rated (top 12).
  Chips are the design's fixed set; each maps to a rule on real data (see
  CHIPS). "Was" price / % OFF = the existing app rule (strikePrice).
*/
const has = (re, list) => list.some((s) => re.test((s || '').toLowerCase()));
const catNames = (e) => categoriesOf(e).map((c) => c.name);
// Categories + activity types — types carry words like Trekking / Camping / Rafting.
const tagNames = (e) => [...catNames(e), ...(e.types || []).map((t) => t.name), e.type && e.type.name];
const audSlugs = (e) => (e.audiences || []).map((a) => `${a.slug || ''} ${a.name || ''}`);
const METROS = /delhi|mumbai|bengal|bangalore|kolkata|chennai|hyderabad|pune|jaipur|ahmedabad|gurgaon|gurugram|noida|chandigarh|lucknow|goa|udaipur/;

const CHIPS = [
  { key: 'all', label: 'All', icon: Globe, test: () => true },
  // The live taxonomy has no 'Nature' category, so outdoor activity types and
  // Adventure & Exploration count too.
  { key: 'nature', label: 'Nature & Outdoors', icon: Leaf, test: (e) => has(/nature|outdoor|wildlife|eco|garden|water|beach|lake|river|trek|hik|camp|raft|safari|adventure|explor/, tagNames(e)) },
  // "Experiences": the crowd favourites — rated 4.5+.
  { key: 'experiences', label: 'Experiences', icon: Smile, test: (e) => Number(e.rating) >= 4.5 },
  // Open to everyone (no audience) or tagged for family / kids / parents.
  { key: 'family', label: 'Family Friendly', icon: Users, test: (e) => !(e.audiences || []).length || has(/family|kid|teen|child|parent|elder/, audSlugs(e)) },
  // Premium price band (same ₹5,000+ band as the experience filters).
  { key: 'luxury', label: 'Luxury', icon: Gem, test: (e) => Number(e.fromPrice) >= 5000 },
  { key: 'couples', label: 'Couples', icon: Heart, test: (e) => has(/partner|couple/, audSlugs(e)) },
  { key: 'city', label: 'City Escapes', icon: Building2, test: (e) => METROS.test((e.city || '').toLowerCase()) },
  { key: 'adventure', label: 'Adventure', icon: Mountain, test: (e) => has(/adventure|explor|sport|thrill|trek|raft|climb/, tagNames(e)) },
  { key: 'food', label: 'Food & Culture', icon: UtensilsCrossed, test: (e) => has(/food|culinar|cuisine|cook|culture|heritage/, tagNames(e)) },
];

const PILL_TINTS = [
  [/adventure|explor/, 'bg-[#FFC629] text-rc-navy'],
  [/wellness|heal/, 'bg-[#FBD3EA] text-[#6B1D47]'],
  [/spiritual|heritage|culture/, 'bg-[#FFF3DD] text-[#5B3A12]'],
  [/food/, 'bg-[#BFF0C9] text-[#14532D]'],
  [/sport|fun|water/, 'bg-[#DCEBFF] text-[#0B3B66]'],
  [/art|creativ/, 'bg-[#E4D7FF] text-[#3B1E7A]'],
  [/learn|growth/, 'bg-[#D9F2F2] text-[#134E4A]'],
  [/relationship|communit|group|corporate/, 'bg-[#FFE0CC] text-[#7A2E0B]'],
];
const pillTint = (name) => (PILL_TINTS.find(([re]) => re.test((name || '').toLowerCase())) || [null, 'bg-white/90 text-rc-navy'])[1];

const TRUST = [
  { icon: Trophy, title: 'Handpicked Experiences', sub: 'Curated by travel experts' },
  { icon: ShieldCheck, title: 'Trusted Partners', sub: 'Verified & reliable' },
  { icon: Tag, title: 'Best Prices', sub: 'Great deals, always' },
  { icon: Headphones, title: 'Dedicated Support', sub: 'We’re here for you' },
  { icon: Users, title: 'Memorable Journeys', sub: 'Experiences that stay with you' },
];

// Faint gold line-art for the panel corner — picked per card for variety.
function Motif({ variant }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 160 110" className="absolute right-0 bottom-0 w-44 h-32 text-[#EBCF96]/70 pointer-events-none" aria-hidden="true">
      {variant === 0 && (
        <g {...common}>
          <path d="M0 100 C 30 70, 60 70, 90 92 C 110 80, 135 74, 160 82" />
          <path d="M20 108 C 50 84, 80 86, 110 104" />
          <path d="M70 70 C 90 50, 120 48, 160 60" />
        </g>
      )}
      {variant === 1 && (
        <g {...common}>
          <path d="M96 110 V 56 C 96 34, 136 34, 136 56 V 110" />
          <path d="M104 110 V 60 C 104 44, 128 44, 128 60 V 110" />
          <path d="M116 30 V 18 M110 24 H 122" />
          <path d="M60 110 V 76 C 60 62, 84 62, 84 76 V 110" />
        </g>
      )}
      {variant === 2 && (
        <g {...common}>
          {[0, 12, 24, 36].map((o) => <path key={o} d={`M0 ${96 - o} C 40 ${76 - o}, 80 ${112 - o}, 160 ${80 - o}`} />)}
        </g>
      )}
      {variant === 3 && (
        <g {...common}>
          <path d="M30 110 L 78 50 L 102 78 L 122 56 L 160 104" />
          <path d="M66 66 L 78 74 L 88 64" />
          <circle cx="132" cy="30" r="10" />
        </g>
      )}
    </svg>
  );
}

function TrendCard({ item, index }) {
  const navigate = useNavigate();
  const cat = categoriesOf(item)[0];
  const CatIcon = cat ? iconForCategory(cat.name) : null;
  const price = Number(item.fromPrice) || 0;
  const was = strikePrice(price);
  const off = price && was > price ? Math.round(((was - price) / was) * 100) : 0;
  const href = expHref(item);

  return (
    <div
      onClick={() => navigate(href)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(href); }}
      role="link"
      tabIndex={0}
      aria-label={`${item.name}${price ? `, ${formatMoney(price, item.currency)}` : ''}`}
      className="group relative shrink-0 snap-start w-[264px] sm:w-[292px] lg:w-[304px] h-[452px] sm:h-[468px] rounded-[24px] overflow-hidden bg-[#FFF9EE] border-[3px] border-white shadow-[0_18px_38px_-22px_rgba(120,80,20,0.55)] hover:shadow-[0_26px_48px_-22px_rgba(120,80,20,0.65)] hover:-translate-y-1 transition duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-rc-brand/50"
    >
      {/* Photo — top ~64 %, dissolving into the cream panel */}
      <div className="absolute inset-x-0 top-0 h-[64%] overflow-hidden">
        <img src={imageOf(item)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.06] transition duration-700" />
        <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#FFF9EE]/70" />
      </div>
      {/* Soft wave edge between photo and panel */}
      <svg viewBox="0 0 300 60" preserveAspectRatio="none" className="absolute inset-x-0 top-[calc(64%-46px)] w-full h-[60px] text-[#FFF9EE]" aria-hidden="true">
        <path d="M0 34 C 60 10, 120 52, 190 30 C 240 14, 275 22, 300 30 L300 60 L0 60 Z" fill="currentColor" />
        <path d="M0 34 C 60 10, 120 52, 190 30 C 240 14, 275 22, 300 30" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
      </svg>

      {cat && (
        <span className={`absolute top-4 left-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-bold max-w-[72%] shadow-sm ${pillTint(cat.name)}`}>
          {CatIcon && <CatIcon size={15} className="shrink-0" />}<span className="truncate">{cat.name}</span>
        </span>
      )}
      <WishHeart item={item} size={38} className="absolute top-4 right-4" />

      {/* Panel */}
      <div className="absolute inset-x-0 bottom-0 h-[42%] px-5 pb-5 flex flex-col">
        <Motif variant={index % 4} />
        {off > 0 && (
          <span className="relative -mt-4 self-start inline-flex items-center h-7 px-3 rounded-full bg-[#FF2056] text-white text-xs font-extrabold tracking-wide shadow-[0_6px_14px_-6px_rgba(255,32,86,0.8)]">{off}% OFF</span>
        )}
        <h3 className="relative font-sans text-[17px] font-extrabold text-rc-navy leading-snug line-clamp-2 mt-2.5">{item.name}</h3>
        {!!item.city && <div className="relative flex items-center gap-1.5 text-[13px] text-rc-ink-muted mt-1"><MapPin size={14} />{item.city}</div>}
        <div className="relative flex items-center gap-5 text-[13px] text-rc-ink mt-2">
          {!!item.durationLabel && <span className="flex items-center gap-1.5"><Clock size={15} className="text-rc-ink-muted" />{item.durationLabel}</span>}
          <span className="flex items-center gap-1.5"><Star size={15} className="text-rc-brand" />{Number(item.rating || 0).toFixed(1)}{item.reviewsCount ? ` (${item.reviewsCount})` : ''}</span>
        </div>
        <div className="relative mt-auto pt-3 border-t border-[#EFE1C4] flex items-center justify-between gap-3">
          <div className="flex items-end gap-1.5 min-w-0 whitespace-nowrap">
            <span className="text-[22px] font-black text-rc-navy leading-none">{price ? formatMoney(price, item.currency) : 'Contact'}</span>
            {off > 0 && <span className="text-[13px] text-rc-ink-muted line-through">{formatMoney(was, item.currency)}</span>}
            {!!price && <span className="hidden sm:inline text-xs text-rc-ink-muted">/{item.priceUnit || 'person'}</span>}
          </div>
          <span className="grid place-items-center w-11 h-11 rounded-full shrink-0 bg-rc-brand text-rc-navy shadow-[0_8px_18px_-8px_rgba(255,185,0,0.9)] group-hover:translate-x-0.5 transition">
            <ArrowRight size={20} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TrendingShowcase({ items = [] }) {
  const reduce = useReducedMotion();
  const railRef = useRef(null);
  const [chip, setChip] = useState('all');
  const [edges, setEdges] = useState({ start: true, end: false });

  // Most reviewed, then best rated — the "what travellers are booking" proxy.
  const ranked = useMemo(() => [...items].sort((a, b) => (
    (b.reviewsCount || 0) - (a.reviewsCount || 0) || (b.rating || 0) - (a.rating || 0)
  )), [items]);

  const shown = useMemo(() => {
    const rule = CHIPS.find((c) => c.key === chip) || CHIPS[0];
    return ranked.filter(rule.test).slice(0, 12);
  }, [ranked, chip]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return undefined;
    el.scrollLeft = 0;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [shown.length, chip]);

  if (!ranked.length) return null;
  const scroll = (dir) => railRef.current?.scrollBy({ left: dir * Math.max(310, railRef.current.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' });

  return (
    <motion.section
      className="relative isolate mt-6 sm:mt-10 py-8 sm:py-12 overflow-hidden"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="trending-title"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#FFF9EF] via-[#FFFBF5] to-[#FFF4E3]" aria-hidden="true" />
      <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute inset-x-0 top-6 w-full h-64 -z-10 text-[#F6E3BC]/60" fill="none" aria-hidden="true">
        <path d="M0 120 C 360 40, 720 200, 1080 90 C 1260 40, 1380 70, 1440 60" stroke="currentColor" strokeWidth="2" />
        <path d="M0 200 C 400 120, 800 260, 1440 150" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 text-[11px] sm:text-xs font-bold tracking-[0.22em] uppercase text-rc-navy/85">
              <span className="h-[3px] w-6 rounded-full bg-rc-brand" /><Sparkles size={16} className="text-rc-brand fill-rc-brand" /> Handpicked for you
            </div>
            <h2 id="trending-title" className="font-display font-bold text-[30px] sm:text-[48px] leading-[1.05] mt-2.5 text-rc-navy">
              Trending <span className="text-rc-brand">Experiences</span>
            </h2>
            <p className="text-sm sm:text-lg text-rc-navy/80 mt-2.5">Explore what travellers are booking right now. Curated experiences, unforgettable memories.</p>
          </div>
          <div className="hidden lg:flex items-start gap-4 select-none pointer-events-none" aria-hidden="true">
            <div className="relative">
              <svg viewBox="0 0 120 60" className="absolute -left-32 -top-1 w-[110px] h-[56px] text-rc-brand" fill="none">
                <path d="M4 56 C 20 40, 34 30, 52 34 C 70 38, 66 16, 50 20 C 36 24, 50 46, 80 36 C 96 30, 104 20, 116 8" stroke="currentColor" strokeWidth="1.8" strokeDasharray="4 5" strokeLinecap="round" />
              </svg>
              <Send size={38} strokeWidth={1.8} className="absolute -left-10 -top-1 text-rc-brand fill-rc-brand/30 rotate-[8deg]" />
              <p className="font-script text-[44px] leading-[0.95] text-rc-navy -rotate-[8deg] whitespace-nowrap ml-4">Travel More<br /><span className="ml-6">Live Better</span></p>
              <svg viewBox="0 0 220 30" className="w-[200px] h-[22px] ml-14 -mt-1 text-rc-brand" fill="none">
                <path d="M4 26 C 70 12, 140 6, 216 4" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <Link to="/experiences" className="hidden sm:inline-flex shrink-0 mt-6 items-center gap-2 h-12 px-6 rounded-full bg-rc-brand text-rc-navy font-bold hover:bg-rc-brand-dark shadow-[0_10px_24px_-12px_rgba(255,185,0,0.9)] transition">
            See all <ArrowRight size={18} />
          </Link>
        </div>

        <div className="rc-rail gap-2.5 mt-6 -mx-4 px-4 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0 pb-1" role="tablist" aria-label="Filter trending experiences">
          {CHIPS.map((c) => (
            <Chip key={c.key} label={c.label} icon={c.icon} active={chip === c.key} onClick={() => setChip(c.key)} />
          ))}
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto mt-6 sm:mt-8">
        <div ref={railRef} className="rc-rail gap-4 sm:gap-5 px-4 sm:px-6 scroll-px-4 sm:scroll-px-6 py-3" aria-label="Trending experiences">
          {shown.map((it, i) => <TrendCard key={it.id} item={it} index={i} />)}
        </div>
        {!shown.length && (
          <div className="px-6 py-12 text-center text-rc-ink-muted">
            Nothing here yet — new {CHIPS.find((c) => c.key === chip)?.label.toLowerCase()} experiences are on the way.{' '}
            <button type="button" onClick={() => setChip('all')} className="font-bold text-rc-brand-text">Show all</button>
          </div>
        )}
        {!edges.start && (
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous trending experiences" className="hidden md:grid absolute -left-3 top-1/2 -translate-y-1/2 z-20 place-items-center w-14 h-14 rounded-full bg-white text-rc-navy shadow-card hover:scale-105 transition">
            <ChevronLeft size={24} />
          </button>
        )}
        {!edges.end && shown.length > 0 && (
          <button type="button" onClick={() => scroll(1)} aria-label="Next trending experiences" className="hidden md:grid absolute -right-3 top-1/2 -translate-y-1/2 z-20 place-items-center w-14 h-14 rounded-full bg-white text-rc-navy shadow-card hover:scale-105 transition">
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Trust bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-5 gap-x-4 bg-white/80 backdrop-blur rounded-[22px] border border-[#F3E6CC] shadow-[0_10px_30px_-20px_rgba(120,80,20,0.4)] px-5 sm:px-8 py-5">
          {TRUST.map((t, i) => (
            <li key={t.title} className={`flex items-center gap-3 ${i > 0 ? 'lg:border-l lg:border-[#EFDDB6] lg:pl-5' : ''} ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}>
              <t.icon size={28} strokeWidth={1.8} className="text-rc-brand shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-rc-navy leading-tight">{t.title}</span>
                <span className="block text-[12px] xl:text-[13px] text-rc-ink-muted leading-tight mt-0.5">{t.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sm:hidden text-center mt-5">
        <Link to="/experiences" className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-rc-brand text-rc-navy text-sm font-bold">See all <ArrowRight size={16} /></Link>
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
      className={`shrink-0 inline-flex items-center gap-2 h-11 sm:h-12 px-4 sm:px-5 rounded-full text-sm sm:text-[15px] font-semibold whitespace-nowrap transition ${
        active ? 'bg-rc-brand text-white shadow-[0_10px_22px_-12px_rgba(255,185,0,0.9)]' : 'bg-white text-rc-navy shadow-[0_4px_14px_-8px_rgba(16,24,40,0.25)] hover:bg-rc-brand-soft'
      }`}
    >
      {Icon && <Icon size={19} className={active ? 'text-white' : 'text-rc-navy/80'} />}
      {label}
    </button>
  );
}
