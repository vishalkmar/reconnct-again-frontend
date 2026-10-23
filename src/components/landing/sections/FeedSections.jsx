import { useState } from 'react';
import { Globe, Sparkles, RotateCcw } from 'lucide-react';
import { iconForCategory } from '../../../utils/categoryIcons';
import { categoriesOf } from '../../../utils/format';
import { Section, SectionHead, Rail, RailSkeleton } from '../Rail.jsx';
import CategoryTile from '../cards/CategoryTile.jsx';
import ExperienceCard from '../cards/ExperienceCard.jsx';

/* "Experiences for every moment" — one photo tile per category. */
export function MomentsSection({ categories, loaded = true }) {
  if (!loaded) {
    return (
      <Section>
        <SectionHead icon={Globe} title="Experiences for every moment" />
        <RailSkeleton count={4} width={120} height={156} />
      </Section>
    );
  }
  if (!categories?.length) return null;
  return (
    <Section>
      <SectionHead icon={Globe} title="Experiences for every moment" />
      <Rail gap={10} ariaLabel="Experiences for every moment">
        {categories.map((c) => <CategoryTile key={c.id} cat={c} />)}
      </Rail>
    </Section>
  );
}

/*
  Featured Experiences — category tabs ("All" + every category) over a rail of
  grid cards. A tab matches ANY category the listing carries (app rule).
*/
export function FeaturedSection({ featured, categories, loading }) {
  const [activeCat, setActiveCat] = useState(null);
  const shown = activeCat ? featured.filter((e) => categoriesOf(e).some((c) => c.id === activeCat)) : featured;

  return (
    <Section>
      <SectionHead icon={Sparkles} title="Featured Experiences" seeAllTo="/experiences" />
      <div className="rc-rail gap-2 px-4 sm:px-6 pb-3" role="tablist" aria-label="Filter featured by category">
        <CatTab label="All" icon={Globe} active={!activeCat} onClick={() => setActiveCat(null)} />
        {(categories || []).map((c) => (
          <CatTab key={c.id} label={c.name} icon={iconForCategory(c.name)} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} />
        ))}
      </div>
      {loading ? <RailSkeleton width={190} height={250} /> : shown.length ? (
        <Rail ariaLabel="Featured experiences">
          {shown.map((it) => <ExperienceCard key={`f${it.id}`} item={it} className="w-[180px] sm:w-[210px]" />)}
        </Rail>
      ) : (
        <p className="px-4 sm:px-6 py-5 text-rc-ink-muted">No featured experiences yet.</p>
      )}
    </Section>
  );
}

function CatTab({ label, icon: Icon, active, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-full border text-xs font-semibold whitespace-nowrap transition ${
        active ? 'bg-rc-brand border-rc-brand text-white' : 'bg-white border-rc-border text-rc-ink hover:border-rc-brand'
      }`}
    >
      {Icon && <Icon size={13} className={active ? 'text-white' : 'text-rc-ink-muted'} />}
      {label}
    </button>
  );
}

/* Shared error box with Retry for the main list (app errorBox). */
export function FeedError({ message, onRetry }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-center">
      <p className="text-rc-ink-muted">{message}</p>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 mt-2 text-sm font-bold text-rc-brand hover:text-rc-brand-dark">
        <RotateCcw size={14} /> Tap to retry
      </button>
    </div>
  );
}
