import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

/*
  "Connect With" — tall photo cards, one per audience from the taxonomy, each
  with its own colour wash, the audience name and a short line; tapping opens
  that audience's experiences. Photos live in public/connect/ and are matched
  to the live audiences by name/slug (unknown audiences get a neutral card).
*/
const LOOKS = [
  { key: 'yourself', match: /your|self|solo/, tagline: 'Reconnect with yourself', color: '#6B3FA0', to: '#3E2069' },
  { key: 'partner', match: /partner|couple/, tagline: 'For the pillar of strength', color: '#E0457B', to: '#9E2453' },
  { key: 'kids', match: /kid|teen|child/, tagline: 'Little moments, big memories', color: '#2F9CA3', to: '#1D6870' },
  { key: 'parents', match: /parent|elder|senior/, tagline: 'Cherish time together', color: '#C9893A', to: '#8A5A1F' },
  { key: 'family', match: /family/, tagline: 'Create memories that last', color: '#3E9B5C', to: '#24653A' },
  { key: 'friends', match: /friend/, tagline: 'Stronger bonds, bigger adventures', color: '#8E4FC9', to: '#5C2D8F' },
  { key: 'community', match: /communit|connection/, tagline: 'Discover with like-minded people', color: '#2F6FD6', to: '#1C4596' },
  { key: 'team', match: /team|corporate|work/, tagline: 'Build, explore and grow together', color: '#E07B2A', to: '#A2501A' },
];
const NEUTRAL = { key: null, tagline: 'Curated experiences for you', color: '#7A4E00', to: '#4A3000' };

const lookFor = (aud) => {
  const k = `${aud.slug || ''} ${aud.name || ''}`.toLowerCase();
  return LOOKS.find((l) => l.match.test(k)) || NEUTRAL;
};

function AudiencePhotoCard({ aud }) {
  const look = lookFor(aud);
  return (
    <Link
      to={`/experiences?audienceIds=${aud.id}`}
      className="group relative block shrink-0 snap-start w-[168px] sm:w-[200px] lg:w-[214px] 2xl:w-full h-[260px] sm:h-[304px] lg:h-[324px] 2xl:h-auto 2xl:aspect-[214/324] rounded-[22px] overflow-hidden shadow-[0_14px_30px_-14px_rgba(16,24,40,0.45)] focus:outline-none focus-visible:ring-4 focus-visible:ring-rc-brand/50"
      style={{ background: `linear-gradient(180deg, ${look.color} 0%, ${look.to} 100%)` }}
    >
      {look.key ? (
        <img
          src={`/connect/${look.key}.webp`}
          alt=""
          loading="lazy"
          className="absolute inset-x-0 top-0 w-full h-[74%] object-cover object-top group-hover:scale-[1.06] transition duration-700"
        />
      ) : null}
      {/* colour wash rising from the bottom into the photo */}
      <span
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, rgba(0,0,0,0) 34%, ${look.color}cc 62%, ${look.color} 76%, ${look.to} 100%)` }}
      />
      <span className="absolute left-4 right-4 sm:left-5 sm:right-5 bottom-4 sm:bottom-5 text-white">
        <span className="block font-sans text-xl sm:text-[26px] font-extrabold leading-tight drop-shadow-sm">{aud.name}</span>
        <span className="block text-[13px] sm:text-[15px] leading-snug text-white/90 mt-1 line-clamp-2">{look.tagline}</span>
        <span className="block h-[2px] w-8 bg-white/70 rounded-full mt-3 group-hover:w-14 transition-all" />
      </span>
    </Link>
  );
}

export default function ConnectWithShowcase({ audiences = [], loaded = true }) {
  const railRef = useRef(null);
  const reduce = useReducedMotion();
  const scroll = (dir) => {
    const el = railRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.75), behavior: 'smooth' });
  };
  if (loaded && !audiences.length) return null;

  return (
    <motion.section
      className="relative isolate mt-8 sm:mt-12 py-8 sm:py-12 overflow-hidden"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      aria-labelledby="connect-with-title"
    >
      {/* warm backdrop with soft blobs */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#FFF8EE] via-[#FFFBF5] to-[#F6F3FF]" aria-hidden="true" />
      <div className="absolute -left-24 top-16 w-72 h-72 rounded-full bg-[#FFD9C7]/50 blur-3xl -z-10" aria-hidden="true" />
      <div className="absolute right-0 -top-10 w-80 h-80 rounded-full bg-[#FFE8B8]/50 blur-3xl -z-10" aria-hidden="true" />
      <div className="absolute left-1/3 bottom-0 w-[28rem] h-40 rounded-full bg-[#DCE7FF]/50 blur-3xl -z-10" aria-hidden="true" />

      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 2xl:px-10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-stretch gap-4 sm:gap-6">
            <Sparkles size={34} className="text-rc-brand shrink-0 mt-2 hidden sm:block" />
            <span className="hidden sm:block w-[2px] rounded-full bg-rc-brand/50" aria-hidden="true" />
            <div>
              <h2 id="connect-with-title" className="font-sans text-[30px] sm:text-5xl font-black text-rc-navy leading-none">
                Connect <span className="text-rc-brand">With</span>
              </h2>
              <p className="text-sm sm:text-lg text-rc-ink-muted mt-2 sm:mt-3">Find experiences that bring you closer to what matters.</p>
            </div>
          </div>

          {/* "Better Together" accent (wide screens) */}
          <div className="hidden lg:flex items-center gap-2 text-[#C9A27A] select-none pointer-events-none" aria-hidden="true">
            <span className="font-script text-[44px] leading-[0.95] -rotate-[8deg]">Better<br /><span className="ml-8">Together</span></span>
            <svg viewBox="0 0 170 70" className="w-[150px] h-[62px] -ml-2" fill="none">
              <path d="M4 62 C 50 70, 92 52, 110 34 C 120 24, 132 16, 150 10" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 5" strokeLinecap="round" />
            </svg>
            <Send size={30} strokeWidth={1.5} className="-ml-5 -mt-10 rotate-[8deg]" />
          </div>

          <Link to="/connect" className="shrink-0 self-center inline-flex items-center gap-1.5 text-sm sm:text-lg font-bold text-rc-brand-dark hover:text-rc-brand-text">
            See all <ArrowRight size={18} />
          </Link>
        </div>

        <div className="relative mt-6 sm:mt-9 group/rail">
          {/* Rail runs on to the screen's right edge (section clips it), so the
              cut-off card reads as "scroll for more" rather than a hard stop. */}
          <div
            ref={railRef}
            className="rc-rail 2xl:!grid 2xl:grid-flow-col 2xl:auto-cols-fr 2xl:!overflow-visible gap-3 sm:gap-[14px] -ml-4 pl-4 scroll-pl-4 sm:ml-0 sm:pl-0 sm:scroll-pl-0 pb-4 pr-4 2xl:pr-0 -mr-4 sm:-mr-6 2xl:mr-0"
            role="list"
            aria-label="Who do you want to reconnect with?"
          >
            {loaded
              ? audiences.map((a) => <div key={a.id} role="listitem"><AudiencePhotoCard aud={a} /></div>)
              : Array.from({ length: 6 }).map((_, i) => <div key={i} className="rc-skeleton shrink-0 w-[168px] sm:w-[200px] lg:w-[214px] h-[260px] sm:h-[304px] lg:h-[324px] rounded-[22px]" />)}
          </div>
          <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className="hidden md:grid 2xl:!hidden absolute -left-5 top-[42%] -translate-y-1/2 place-items-center w-11 h-11 rounded-full bg-white shadow-card text-rc-navy opacity-0 group-hover/rail:opacity-100 focus:opacity-100 transition">
            <ChevronLeft size={20} />
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className="hidden md:grid 2xl:!hidden absolute -right-5 top-[42%] -translate-y-1/2 place-items-center w-11 h-11 rounded-full bg-white shadow-card text-rc-navy opacity-0 group-hover/rail:opacity-100 focus:opacity-100 transition">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
