import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Section, SectionHead, Rail } from '../Rail.jsx';
import FramedDealCard from '../cards/FramedDealCard.jsx';
import CleanDealCard from '../cards/CleanDealCard.jsx';
import OverlayDealCard from '../cards/OverlayDealCard.jsx';
import TrendingNearbyCard from '../cards/TrendingNearbyCard.jsx';
import { optimizeImg } from '../../../utils/format';

/*
  Every "Last Minute Deals" rail, the partner band and Trending Nearby — the
  lower half of the app's Home screen, in its exact order and slices.
*/

// One rail of a single card kind (framed / clean / overlay).
export function DealRail({ title, data, kind = 'framed', gap = 12, cardW, cardImageH, cardH }) {
  if (!data?.length) return null;
  return (
    <Section>
      <SectionHead icon={Sparkles} title={title} seeAllTo="/experiences" />
      <Rail gap={gap} ariaLabel={title}>
        {data.map((it, i) => {
          const key = `${kind}-${it.id || i}`;
          if (kind === 'clean') return <CleanDealCard key={key} item={it} width={cardW || 170} />;
          if (kind === 'overlay') return <OverlayDealCard key={key} item={it} width={cardW} height={cardH} />;
          return <FramedDealCard key={key} item={it} width={cardW || 170} imageH={cardImageH || 162} />;
        })}
      </Rail>
    </Section>
  );
}

/*
  "Last Minute Deals 2" — centre-focus carousel: the middle card sits forward
  at full size, neighbours scale to 0.84, dim to 0.5 and tuck in behind it.
  Starts on the 2nd card so a card peeks on both sides (app behaviour).
*/
const FOCUS_W = 195;
const FOCUS_H = 274;
const FOCUS_GAP = 16;
const FOCUS_SNAP = FOCUS_W + FOCUS_GAP;

export function FocusDealSection({ data }) {
  const ref = useRef(null);
  const [scrollX, setScrollX] = useState(0);
  const [side, setSide] = useState(16);
  const initialIdx = data.length > 1 ? 1 : 0;

  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setSide(Math.max(16, (el.clientWidth - FOCUS_W) / 2));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Jump to the 2nd card once the side padding is known.
  useEffect(() => {
    const el = ref.current;
    if (el) { el.scrollLeft = initialIdx * FOCUS_SNAP; setScrollX(el.scrollLeft); }
  }, [side, initialIdx]);

  if (!data?.length) return null;
  const active = Math.round(scrollX / FOCUS_SNAP);
  const go = (dir) => ref.current?.scrollBy({ left: dir * FOCUS_SNAP, behavior: 'smooth' });

  return (
    <Section>
      <SectionHead icon={Sparkles} title="Last Minute Deals 2" seeAllTo="/experiences">
        <span className="hidden md:flex gap-1.5">
          <button type="button" aria-label="Previous deal" onClick={() => go(-1)} className="grid place-items-center w-8 h-8 rounded-full bg-white shadow-soft hover:bg-rc-brand-soft"><ChevronLeft size={16} /></button>
          <button type="button" aria-label="Next deal" onClick={() => go(1)} className="grid place-items-center w-8 h-8 rounded-full bg-white shadow-soft hover:bg-rc-brand-soft"><ChevronRight size={16} /></button>
        </span>
      </SectionHead>
      <div
        ref={ref}
        onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}
        className="flex overflow-x-auto snap-x snap-mandatory rc-no-scrollbar py-3"
        style={{ paddingLeft: side, paddingRight: side, scrollPaddingLeft: side }}
        aria-label="Last minute deals"
      >
        {data.map((it, index) => {
          // Distance of this card from the centre, in "cards" (clamped to 1).
          const d = Math.min(1, Math.abs(scrollX - index * FOCUS_SNAP) / FOCUS_SNAP);
          const dir = index * FOCUS_SNAP < scrollX ? 1 : -1;
          const scale = 1 - 0.16 * d;
          const opacity = 1 - 0.5 * d;
          const translateX = dir * 34 * d;
          const isActive = index === active;
          return (
            <div
              key={`focus-${it.id || index}`}
              className="snap-start shrink-0 transition-[filter] duration-200"
              style={{
                width: FOCUS_W,
                marginRight: index === data.length - 1 ? 0 : FOCUS_GAP,
                transform: `translateX(${translateX}px) scale(${scale})`,
                opacity,
                zIndex: isActive ? 30 : 10,
                position: 'relative',
                filter: isActive ? 'drop-shadow(0 10px 16px rgba(11,16,32,0.28))' : 'none',
              }}
            >
              <FramedDealCard item={it} width={FOCUS_W} imageH={166} height={FOCUS_H} />
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/*
  "Connect With Your Partner" — full-width lavender → blue → navy band with a
  serif heading, two tilted polaroids and a rail of framed cards (180 / 160).
*/
export function PartnerDealSection({ data }) {
  if (!data?.length) return null;
  return (
    <section className="rc-partner-grad mt-10 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between px-4 sm:px-6 mb-4 sm:mb-6">
          <h2 className="font-display text-[23px] sm:text-4xl font-bold text-rc-navy leading-[1.2]">
            Connect With Your<br />Partner
          </h2>
          <div className="flex items-center mt-0.5" aria-hidden="true">
            <img src={optimizeImg('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=80')} alt="" className="w-[61px] h-[70px] sm:w-24 sm:h-28 object-cover rounded border-2 border-white bg-[#D9D9D9] shadow-soft -rotate-[8deg]" />
            <img src={optimizeImg('https://images.unsplash.com/photo-1503104834685-7205e8607eb9?w=300&q=80')} alt="" className="w-[61px] h-[70px] sm:w-24 sm:h-28 object-cover rounded border-2 border-white bg-[#D9D9D9] shadow-soft rotate-[7deg] -ml-[18px]" />
          </div>
        </div>
        <Rail gap={10} ariaLabel="Connect with your partner">
          {data.map((it, i) => <FramedDealCard key={`partner-${it.id || i}`} item={it} width={180} imageH={160} />)}
        </Rail>
      </div>
    </section>
  );
}

/* "Trending Nearby" — groups of three stacked rows per white card, at the very end. */
export function TrendingNearbySection({ data }) {
  if (!data?.length) return null;
  const groups = [];
  for (let i = 0; i < data.length; i += 3) groups.push(data.slice(i, i + 3));
  return (
    <Section className="!mt-6">
      <Rail gap={14} ariaLabel="Trending nearby">
        {groups.map((g, i) => <TrendingNearbyCard key={`trend-${i}`} group={g} count={data.length} />)}
      </Rail>
    </Section>
  );
}
