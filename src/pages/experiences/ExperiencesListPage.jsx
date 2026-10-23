import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, X, SlidersHorizontal, MapPin, ChevronDown, Send,
  LayoutGrid, Mountain, Waves, Flower2, Landmark, UtensilsCrossed, Users, Gem,
} from 'lucide-react';
import { useGeo } from '../../context/GeoContext.jsx';
import publicApi from '../../services/publicApi';
import { useTaxonomy } from '../../hooks/usePublicApi';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import usePullToRefresh from '../../hooks/usePullToRefresh.jsx';
import {
  PRICE_BANDS, activeFilterCount, draftFromSearch, draftToParams, draftToSearch, idsOf,
} from '../../utils/expFilters';
import ExperienceTile from '../../components/landing/cards/ExperienceTile.jsx';
import FilterDrawer from '../../components/landing/FilterDrawer.jsx';
import { FeedError } from '../../components/landing/sections/FeedSections.jsx';

const PAGE = 20;
const SORTS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'rating', label: 'Top rated' },
  { key: 'nearest', label: 'Nearest' },
];

/*
  Quick chips. Each one resolves to a real server filter against the live
  taxonomy (matched by name, never a hard-coded id):
    cat   → categoryIds of every category whose name matches
    type  → typeIds of every activity type whose name matches (no category
            "Water Activities" exists, so water-based types stand in)
    aud   → audienceIds of the matching audience
    price → one of the fixed price bands (Luxury = ₹5,000+)
  A chip whose rule matches nothing in the taxonomy is hidden.
*/
const CHIPS = [
  { key: 'all', label: 'All', icon: LayoutGrid, iconClass: 'text-rc-navy' },
  { key: 'adventure', label: 'Adventure & Exploration', icon: Mountain, iconClass: 'text-rc-navy fill-rc-navy', kind: 'cat', re: /adventure|explor/ },
  { key: 'water', label: 'Water Activities', icon: Waves, iconClass: 'text-[#1E4FD8]', kind: 'type', re: /\b(water|swim|snorkel|scuba|diving|raft|kayak|surf|sail|cruise|houseboat|boat|canoe)/ },
  { key: 'wellness', label: 'Wellness & Healing', icon: Flower2, iconClass: 'text-[#7C3AED]', kind: 'cat', re: /wellness|heal/ },
  { key: 'culture', label: 'Culture & Heritage', icon: Landmark, iconClass: 'text-[#8A5A14]', kind: 'cat', re: /heritage|spiritual/ },
  { key: 'food', label: 'Food & Culture', icon: UtensilsCrossed, iconClass: 'text-rc-navy', kind: 'cat', re: /food/ },
  { key: 'family', label: 'Family Friendly', icon: Users, iconClass: 'text-rc-navy', kind: 'aud', re: /family/ },
  { key: 'luxury', label: 'Luxury', icon: Gem, iconClass: 'text-[#1E4FD8]', kind: 'price', band: 'premium' },
];

const EMPTY = { audienceIds: [], categoryIds: [], typeIds: [], priceBand: null };
const sameIds = (a, b) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
const sameDraft = (a, b) => sameIds(idsOf(a, 'audienceId'), b.audienceIds) && sameIds(idsOf(a, 'categoryId'), b.categoryIds)
  && sameIds(idsOf(a, 'typeId'), b.typeIds) && (a.priceBand || null) === b.priceBand;

/*
  /experiences — the app's Experiences tab. Every filter lives in the URL
  (?q=&audienceIds=&categoryIds=&typeIds=&price=&nearby=1&featured=1&city=&sort=)
  so chips, cards, footer links and shared URLs land on the exact same list.
*/
export default function ExperiencesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const taxonomy = useTaxonomy();
  const { coords, selectedCity } = useGeo();
  const [types, setTypes] = useState([]);

  const filters = useMemo(() => draftFromSearch(searchParams), [searchParams]);
  const nearby = searchParams.get('nearby') === '1';
  const featured = searchParams.get('featured') === '1';
  // ?city= (from /destinations) wins over the visitor's own city choice.
  const cityParam = searchParams.get('city') || '';
  const cityFilter = cityParam || selectedCity || '';
  const sort = searchParams.get('sort') || (nearby ? 'nearest' : 'recommended');
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [showFilter, setShowFilter] = useState(false);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [reloadKey, setReloadKey] = useState(0);
  const pullIndicator = usePullToRefresh(() => setReloadKey((k) => k + 1));

  // All activity types — the Water chip and the type filter labels need them.
  useEffect(() => {
    let alive = true;
    publicApi.types().then((d) => { if (alive) setTypes(d?.types || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const extra = (over = {}) => ({
    q: query.trim() || undefined,
    nearby: nearby ? 1 : undefined,
    featured: featured ? 1 : undefined,
    city: cityParam || undefined,
    sort: searchParams.get('sort') || undefined,
    ...over,
  });

  // Debounce the search box into the URL.
  useEffect(() => {
    const t = setTimeout(() => setSearchParams(draftToSearch(filters, extra()), { replace: true }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Fetch whenever the URL-driven filters change.
  const q = searchParams.get('q') || '';
  useEffect(() => {
    let alive = true;
    setItems(null);
    setError('');
    setShown(PAGE);
    const geo = coords ? { lat: coords.lat, lon: coords.lon } : {};
    const req = nearby && coords
      ? publicApi.nearbyExperiences(coords.lat, coords.lon, { radius: 50, limit: 100 }).then((d) => d?.experiences || [])
      : publicApi.listExperiences({
        ...draftToParams(filters), q: q || undefined, featured: featured ? 1 : undefined, city: cityFilter || undefined, ...geo,
      }).then((d) => d?.items || []);
    req.then((list) => { if (alive) setItems(list); })
      .catch((e) => { if (alive) setError(e?.response?.data?.message || e?.message || 'Could not load experiences'); });
    return () => { alive = false; };
  }, [filters, q, nearby, featured, cityFilter, coords?.lat, coords?.lon, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    const list = [...(items || [])];
    if (sort === 'price-asc') list.sort((a, b) => (a.fromPrice || Infinity) - (b.fromPrice || Infinity));
    if (sort === 'price-desc') list.sort((a, b) => (b.fromPrice || 0) - (a.fromPrice || 0));
    if (sort === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sort === 'nearest') list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return list;
  }, [items, sort]);

  // Resolve every chip to a concrete draft (or null when the taxonomy has no match).
  const chipDrafts = useMemo(() => {
    const pick = (list, re) => (list || []).filter((x) => re.test((x.name || '').toLowerCase())).map((x) => x.id);
    return CHIPS.map((c) => {
      if (c.key === 'all') return EMPTY;
      if (c.kind === 'price') return { ...EMPTY, priceBand: c.band };
      const ids = pick(c.kind === 'cat' ? taxonomy.categories : c.kind === 'type' ? types : taxonomy.audiences, c.re);
      if (!ids.length) return null;
      if (c.kind === 'cat') return { ...EMPTY, categoryIds: ids };
      if (c.kind === 'type') return { ...EMPTY, typeIds: ids };
      return { ...EMPTY, audienceIds: ids };
    });
  }, [taxonomy.categories, taxonomy.audiences, types]);
  const activeChip = CHIPS.findIndex((c, i) => chipDrafts[i] && sameDraft(filters, chipDrafts[i]));

  // Heading adapts to what is being browsed.
  const audIds = idsOf(filters, 'audienceId');
  const catIds = idsOf(filters, 'categoryId');
  const typeIds = idsOf(filters, 'typeId');
  const nameOf = (list, id) => (list || []).find((x) => x.id === id)?.name;
  let lead = 'Experiences';
  let accent = 'That Stay With You';
  if (nearby) accent = 'Near You';
  else if (featured) { lead = 'Featured'; accent = 'Experiences'; }
  else if (cityParam) accent = `in ${cityParam}`;
  const metaTitle = activeChip > 0 ? CHIPS[activeChip].label : `${lead} ${accent}`;
  useDocumentMeta({ title: `${metaTitle} · Reconnct`, description: 'Browse curated experiences on Reconnct — adventure, water, wellness, culture, food and more. Filter by who you are going with, category and budget.' });

  // Removable chips for anything a quick chip doesn't already describe.
  const chips = activeChip >= 0 ? [] : [
    ...audIds.map((id) => ({ key: `a${id}`, label: nameOf(taxonomy.audiences, id), drop: { ...filters, audienceIds: audIds.filter((x) => x !== id) } })),
    ...catIds.map((id) => ({ key: `c${id}`, label: nameOf(taxonomy.categories, id), drop: { ...filters, categoryIds: catIds.filter((x) => x !== id) } })),
    ...typeIds.map((id) => ({ key: `t${id}`, label: nameOf(types, id) || 'Activity type', drop: { ...filters, typeIds: typeIds.filter((x) => x !== id) } })),
    ...(filters.priceBand ? [{ key: 'p', label: PRICE_BANDS.find((b) => b.key === filters.priceBand)?.label, drop: { ...filters, priceBand: null } }] : []),
  ].filter((c) => c.label);

  const setDraft = (draft, over) => setSearchParams(draftToSearch(draft, extra(over)), { replace: true });
  const count = activeFilterCount(filters);
  const pickChip = (i) => setDraft(i === activeChip && i > 0 ? EMPTY : chipDrafts[i]);
  const clearAll = () => { setQuery(''); setSearchParams({}, { replace: true }); };

  return (
    <div className="relative isolate overflow-hidden bg-[#FBFAF8] min-h-[70vh]">
      {pullIndicator}
      {/* Warm backdrop with soft light rays, like the design */}
      <div className="absolute inset-x-0 top-0 h-[520px] -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFCF7] to-[#FBFAF8]" aria-hidden="true" />
      <div className="absolute -top-24 right-0 w-[60%] h-[480px] -z-10 opacity-60 bg-[conic-gradient(from_200deg_at_85%_0%,transparent_0deg,#FFE7B0_18deg,transparent_36deg,#FFF0CC_58deg,transparent_80deg)] blur-2xl" aria-hidden="true" />

      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-12 2xl:px-20 pt-6 sm:pt-9 pb-10">
        {/* Heading */}
        <div className="relative flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 text-[11px] sm:text-[13px] font-bold tracking-[0.24em] uppercase text-rc-navy/85">
              <LayoutGrid size={15} className="text-rc-brand fill-rc-brand" /> Curated for you
            </div>
            <h1 className="font-display font-bold text-[32px] sm:text-[44px] lg:text-[54px] leading-[1.05] mt-2.5 text-rc-navy">
              {lead} <span className="text-rc-brand">{accent}</span>
            </h1>
            <p className="text-[14px] sm:text-[17px] text-rc-navy/80 mt-2 sm:mt-3">
              Discover handpicked experiences from our trusted partners. Adventures, culture, wellness and more.
            </p>
            {nearby && !coords && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-[#B45309]"><MapPin size={14} />Turn on location to sort by real distance — showing everything for now.</p>
            )}
          </div>

          {/* Script note + paper plane (decorative, wide screens only) */}
          <div className="hidden min-[1600px]:block absolute right-[310px] -top-2 w-[320px] h-[170px] select-none pointer-events-none" aria-hidden="true">
            <svg viewBox="0 0 120 120" className="absolute -left-24 top-[70px] w-[110px] h-[110px] text-rc-brand" fill="none">
              <path d="M4 116 C 24 104, 40 90, 56 94 C 72 98, 70 78, 58 78 C 46 78, 52 98, 78 86 C 96 78, 104 50, 112 30" stroke="currentColor" strokeWidth="1.8" strokeDasharray="4 5" strokeLinecap="round" />
            </svg>
            <Send size={44} strokeWidth={1.6} className="absolute -left-4 top-6 text-rc-brand fill-rc-brand/40 rotate-[4deg]" />
            <div className="absolute left-[46px] top-4 -rotate-[10deg]">
              <p className="font-script text-[42px] leading-[0.95] text-rc-navy whitespace-nowrap">Explore</p>
              <p className="font-script text-[42px] leading-[0.95] text-rc-navy whitespace-nowrap ml-3">More Experiences</p>
              <svg viewBox="0 0 220 24" className="w-[220px] h-[18px] ml-4 -mt-0.5 text-rc-brand" fill="none">
                <path d="M4 22 C 70 10, 140 4, 216 2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          {/* Polaroids */}
          <div className="hidden xl:block shrink-0 relative w-[300px] h-[168px] -mt-3 select-none pointer-events-none" aria-hidden="true">
            <Polaroid src="/connect/friends.webp" className="left-2 top-5 -rotate-[8deg]" />
            <Polaroid src="/connect/yourself.webp" className="left-[124px] top-0 rotate-[7deg]" />
            <svg viewBox="0 0 40 40" className="absolute right-0 -top-1 w-9 h-9 text-rc-brand" fill="none">
              <path d="M8 4 L14 14 M22 2 L22 12 M30 8 L36 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Quick chips */}
        <div className="relative z-10 rc-rail gap-2 2xl:gap-3 mt-5 xl:mt-1 -mx-4 px-4 scroll-pl-4 sm:-mx-6 sm:px-6 sm:scroll-pl-6 lg:mx-0 lg:px-0 lg:scroll-pl-0 py-1.5" role="tablist" aria-label="Filter experiences">
          {CHIPS.map((c, i) => chipDrafts[i] && (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={activeChip === i}
              onClick={() => pickChip(i)}
              className={`shrink-0 inline-flex items-center gap-2 2xl:gap-2.5 h-11 2xl:h-[50px] px-4 2xl:px-6 rounded-full text-sm 2xl:text-[15px] font-semibold whitespace-nowrap transition ${
                activeChip === i
                  ? 'bg-rc-brand text-rc-navy shadow-[0_10px_22px_-12px_rgba(255,185,0,0.95)]'
                  : 'bg-white text-rc-navy shadow-[0_4px_16px_-8px_rgba(16,24,40,0.22)] hover:bg-rc-brand-soft'
              }`}
            >
              <c.icon size={20} strokeWidth={1.9} className={activeChip === i ? 'text-rc-navy' : c.iconClass} />
              {c.label}
            </button>
          ))}
        </div>

        {/* Search + filter + sort */}
        <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-3 sm:gap-5">
          <div className="flex-1 min-w-[240px] flex items-center bg-white rounded-full h-[52px] sm:h-14 pl-5 pr-1.5 shadow-[0_6px_22px_-12px_rgba(16,24,40,0.25)] border border-[#F1ECE3]">
            <Search size={19} className="text-rc-ink-muted shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search experiences, destinations, activities..."
              aria-label="Search experiences"
              className="flex-1 min-w-0 bg-transparent px-3 text-[15px] sm:text-base text-rc-navy placeholder:text-rc-ink-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="grid place-items-center w-8 h-8 rounded-full text-rc-ink-faint hover:bg-rc-bg"><X size={15} /></button>}
            <button type="button" onClick={() => setShowFilter(true)} className="inline-flex items-center gap-2 h-10 sm:h-11 px-4 sm:px-6 rounded-full bg-[#FFF1CC] text-[#9A6400] text-sm sm:text-[15px] font-bold hover:bg-[#FFE7A8] transition">
              <SlidersHorizontal size={17} />Filter{count > 0 && <span className="grid place-items-center min-w-[20px] h-5 px-1 rounded-full bg-rc-brand text-rc-navy text-[11px]">{count}</span>}
            </button>
          </div>
          <label className="flex items-center gap-3 sm:gap-5 text-[15px] text-rc-ink-muted">
            <span>Sort</span>
            <span className="relative">
              <select
                value={sort}
                onChange={(e) => setDraft(filters, { sort: e.target.value })}
                className="appearance-none h-[52px] sm:h-14 w-[200px] sm:w-[226px] rounded-full bg-white border border-[#F1ECE3] shadow-[0_6px_22px_-12px_rgba(16,24,40,0.25)] pl-6 pr-11 text-[15px] font-medium text-rc-navy focus:outline-none focus:ring-2 focus:ring-rc-brand/50 cursor-pointer"
              >
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-rc-navy pointer-events-none" />
            </span>
          </label>
        </div>

        {(chips.length > 0 || nearby || featured || cityParam) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {nearby && <Chip label="Near you" onRemove={() => setDraft(filters, { nearby: undefined, sort: undefined })} />}
            {featured && <Chip label="Featured" onRemove={() => setDraft(filters, { featured: undefined })} />}
            {cityParam && <Chip label={cityParam} onRemove={() => setDraft(filters, { city: undefined })} />}
            {chips.map((c) => <Chip key={c.key} label={c.label} onRemove={() => setDraft(c.drop)} />)}
            <button type="button" onClick={clearAll} className="text-sm font-bold text-rc-brand-text px-2">Clear all</button>
          </div>
        )}

        {/* Results */}
        <div className="mt-5 sm:mt-6">
          {error ? <FeedError message={error} onRetry={() => setReloadKey((k) => k + 1)} /> : items == null ? <TileSkeleton /> : (
            <>
              <p className="text-[15px] sm:text-base text-rc-navy/85 mb-3 sm:mb-4" aria-live="polite">
                {sorted.length} experience{sorted.length === 1 ? '' : 's'} found
                {!cityParam && !nearby && selectedCity ? <span className="text-rc-ink-muted"> in {selectedCity}</span> : null}
              </p>
              {sorted.length ? (
                <div className={GRID}>
                  {sorted.slice(0, shown).map((it) => <ExperienceTile key={it.id} item={it} />)}
                </div>
              ) : (
                <div className="py-14 text-center">
                  <p className="text-rc-navy font-bold text-lg">No experiences match yet</p>
                  <p className="text-rc-ink-muted mt-1">Try a different chip, search or filter{selectedCity && !cityParam ? ` — or switch city from ${selectedCity}` : ''}.</p>
                  <button type="button" onClick={clearAll} className="mt-4 h-11 px-6 rounded-full bg-rc-brand text-rc-navy font-bold">Show all experiences</button>
                </div>
              )}
              {sorted.length > shown && (
                <div className="text-center mt-9">
                  <button type="button" onClick={() => setShown((n) => n + PAGE)} className="h-12 px-8 rounded-full bg-white border-2 border-rc-brand text-rc-navy font-extrabold hover:bg-rc-brand transition">
                    Load more ({sorted.length - shown} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <FilterDrawer open={showFilter} taxonomy={taxonomy} initial={filters} onClose={() => setShowFilter(false)} onApply={(d) => { setDraft(d); setShowFilter(false); }} />
    </div>
  );
}

const GRID = 'grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5';

function TileSkeleton() {
  return (
    <div className={GRID} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="rc-skeleton rounded-[20px] h-[372px]" />)}
    </div>
  );
}

function Polaroid({ src, className = '' }) {
  return (
    <div className={`absolute bg-white p-2 pb-6 rounded-sm shadow-[0_12px_28px_-12px_rgba(16,24,40,0.45)] ${className}`}>
      <img src={src} alt="" className="w-[112px] h-[128px] object-cover" />
    </div>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 h-8 pl-3 pr-1 rounded-full bg-rc-brand-soft text-rc-brand-text text-sm font-semibold">
      {label}
      <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="grid place-items-center w-6 h-6 rounded-full hover:bg-white/60"><X size={13} /></button>
    </span>
  );
}
