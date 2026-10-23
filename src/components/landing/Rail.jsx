import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

/*
  Section heading — icon + title on the left, "See all ›" on the right
  (the app's SectionTitle + sectionHead row).
*/
export function SectionTitle({ icon: Icon = Sparkles, title, seeAllTo, children, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={17} className="text-rc-brand shrink-0" />
        <h2 className="font-sans text-base sm:text-lg font-black text-[#242235] truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {seeAllTo && (
          <Link to={seeAllTo} className="text-xs sm:text-sm font-extrabold text-rc-brand-text hover:text-rc-navy">See all ›</Link>
        )}
      </div>
    </div>
  );
}

/*
  Horizontal card rail: CSS scroll-snap + touch swipe everywhere, arrow
  buttons on hover-capable screens. `gap` in px. Children are the cards.
*/
export function Rail({ children, gap = 12, className = '', ariaLabel }) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return undefined;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [update, children]);

  const scrollBy = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <div className={`relative group/rail ${className}`}>
      <div ref={ref} className="rc-rail px-4 sm:px-6 pb-2 pt-1 scroll-px-4 sm:scroll-px-6" style={{ gap }} aria-label={ariaLabel} role={ariaLabel ? 'region' : undefined}>
        {children}
      </div>
      {!edges.start && (
        <button type="button" aria-label="Scroll left" onClick={() => scrollBy(-1)} className="hidden md:grid absolute left-2 top-1/2 -translate-y-1/2 place-items-center w-10 h-10 rounded-full bg-white shadow-card text-rc-ink opacity-0 group-hover/rail:opacity-100 focus:opacity-100 transition">
          <ChevronLeft size={20} />
        </button>
      )}
      {!edges.end && (
        <button type="button" aria-label="Scroll right" onClick={() => scrollBy(1)} className="hidden md:grid absolute right-2 top-1/2 -translate-y-1/2 place-items-center w-10 h-10 rounded-full bg-white shadow-card text-rc-ink opacity-0 group-hover/rail:opacity-100 focus:opacity-100 transition">
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}

// A section block with the standard top spacing and the page's max width.
// Fades up once as it scrolls into view (skipped for reduced-motion users).
export function Section({ children, className = '', id }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      className={`max-w-7xl mx-auto mt-8 sm:mt-10 ${className}`}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}

// Padded heading wrapper so titles line up with the rail's inner padding.
export function SectionHead(props) {
  return <div className="px-4 sm:px-6"><SectionTitle {...props} /></div>;
}

export function RailSkeleton({ count = 5, width = 170, height = 250 }) {
  return (
    <div className="rc-rail px-4 sm:px-6 gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rc-skeleton rounded-2xl" style={{ width, height }} />
      ))}
    </div>
  );
}
