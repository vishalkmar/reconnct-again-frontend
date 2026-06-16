import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Hotel as HotelIcon, Package as PkgIcon, CalendarDays,
  Sparkles, ChevronRight, X, Filter, Search, Star,
  LayoutGrid, BedDouble, MountainSnow, PartyPopper,
} from 'lucide-react';
import api, { fileUrl } from '../../services/api';
import HotelCard from './HotelCard.jsx';
import PackageCard from './PackageCard.jsx';
import EventCard from './EventCard.jsx';
import PriceTierFilter from './PriceTierFilter.jsx';
import StarRatingFilter from './StarRatingFilter.jsx';
import StarCategoryFilter from './StarCategoryFilter.jsx';
import DatePicker from '../common/DatePicker.jsx';

// Default tab metadata. Admin-managed overrides (label, sublabel, image,
// headline) are merged in from `/featured-tabs` at runtime — see the useEffect
// below.
const TABS = [
  {
    key: 'all',
    label: 'All',
    sublabel: 'Everything',
    tooltip: 'All in one place: hotels, packages and events together.',
    icon: LayoutGrid,
    gradient: 'from-brand to-wellness',
  },
  {
    key: 'hotels',
    label: 'Hotels',
    sublabel: 'Stays',
    tooltip: 'Browse wellness hotels and retreat stays.',
    icon: BedDouble,
    gradient: 'from-sky-500 to-indigo-500',
  },
  {
    key: 'packages',
    label: 'Packages',
    sublabel: 'Retreats',
    tooltip: 'Browse curated wellness and healing packages.',
    icon: MountainSnow,
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    key: 'events',
    label: 'Events',
    sublabel: 'Experiences',
    tooltip: 'Browse wellness events and local experiences.',
    icon: PartyPopper,
    gradient: 'from-amber-500 to-orange-500',
  },
];

/**
 * Below-hero results section on the home page. Two modes:
 *
 *  1. Default — no location/date in URL: shows FEATURED items in each tab.
 *  2. Search  — when SearchTabs has set ?location=... (& optionally date params):
 *     shows filtered items in each tab. Date filter maps to:
 *       - Packages: startDate/endDate or month/year
 *       - Events:   fromDate/toDate
 *       - Hotels:   ignored (hotels are always-available; rooms gate the date)
 *
 * Each tab has its own compact sidebar filter for refinement, with the
 * heavy-duty filtering still available on the dedicated /hotels, /retreats
 * and /events pages.
 */
export default function HomeResultsTabs() {
  const [params, setParams] = useSearchParams();
  const location = params.get('location') || '';
  const startDate = params.get('startDate') || '';
  const endDate = params.get('endDate') || '';
  const month = params.get('month') || '';
  const year = params.get('year') || '';

  // Local sidebar-filter state — applies on top of URL params. Persisted across
  // tab switches so a user can refine and then jump between Hotels/Packages/Events.
  // Full set mirrors what the dedicated listing pages expose.
  const [localFilters, setLocalFilters] = useState({
    search: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    starRating: '',
    minDuration: '',
    maxDuration: '',
    minNights: '',
    maxNights: '',
    eventType: '',
    facility: '',
    activity: '',
    problem: '',
    category: '',
    area: '',
    culture: '',
    nearby: '',
    popular: '',
    featured: '',
    fromTime: '',
    toTime: '',
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Debounce name-search so we don't fire an API call on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(localFilters.search), 300);
    return () => clearTimeout(t);
  }, [localFilters.search]);

  // Taxonomies for sidebar pickers — full set so the sidebar can mirror the
  // dedicated /hotels, /retreats and /events pages.
  const [locationsList, setLocationsList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [facilitiesList, setFacilitiesList] = useState([]);
  const [activitiesList, setActivitiesList] = useState([]);
  const [problemsList, setProblemsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [areasList, setAreasList] = useState([]);
  const [culturesList, setCulturesList] = useState([]);
  const [nearbyPlacesList, setNearbyPlacesList] = useState([]);
  useEffect(() => {
    api.get('/locations').then((r) => setLocationsList(r.data?.data?.items || [])).catch(() => {});
    api.get('/event-types').then((r) => setEventTypesList(r.data?.data?.items || [])).catch(() => {});
    api.get('/facilities').then((r) => setFacilitiesList(r.data?.data?.items || [])).catch(() => {});
    api.get('/activities').then((r) => setActivitiesList(r.data?.data?.items || [])).catch(() => {});
    api.get('/problems').then((r) => setProblemsList(r.data?.data?.items || [])).catch(() => {});
    api.get('/categories').then((r) => setCategoriesList(r.data?.data?.items || [])).catch(() => {});
    api.get('/areas').then((r) => setAreasList(r.data?.data?.items || [])).catch(() => {});
    api.get('/cultures').then((r) => setCulturesList(r.data?.data?.items || [])).catch(() => {});
    api.get('/nearby-places').then((r) => setNearbyPlacesList(r.data?.data?.items || [])).catch(() => {});
  }, []);

  // hasSearch = ANY filter active. Task 2: a single filter (name OR location
  // OR date OR price OR rating, etc.) flips the heading from "Featured" to "Results".
  const hasSearch = !!(
    location || startDate || endDate || month ||
    debouncedSearch || localFilters.minPrice || localFilters.maxPrice ||
    localFilters.minRating || localFilters.starRating ||
    localFilters.minDuration || localFilters.maxDuration ||
    localFilters.minNights || localFilters.maxNights ||
    localFilters.eventType || localFilters.facility ||
    localFilters.activity || localFilters.problem ||
    localFilters.category || localFilters.area ||
    localFilters.culture || localFilters.nearby ||
    localFilters.popular || localFilters.featured ||
    localFilters.fromTime || localFilters.toTime
  );

  const updateLocal = (k, v) => setLocalFilters((f) => ({ ...f, [k]: v }));

  // Location goes through URL so SearchTabs above stays in sync
  const updateLocation = (slug) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('location', slug); else next.delete('location');
    setParams(next, { replace: true });
  };

  // Star rating supports multi-select via comma-separated value
  const toggleStar = (s) => {
    const current = localFilters.starRating ? localFilters.starRating.split(',') : [];
    const exists = current.includes(String(s));
    const nxt = exists ? current.filter((x) => x !== String(s)) : [...current, String(s)];
    updateLocal('starRating', nxt.join(','));
  };
  const isStarActive = (s) => (localFilters.starRating || '').split(',').includes(String(s));

  const clearAll = () => {
    setLocalFilters({
      search: '', minPrice: '', maxPrice: '', minRating: '',
      starRating: '', minDuration: '', maxDuration: '',
      minNights: '', maxNights: '', eventType: '',
      facility: '', activity: '', problem: '', category: '',
      area: '', culture: '', nearby: '',
      popular: '', featured: '',
      fromTime: '', toTime: '',
    });
    const next = new URLSearchParams(params);
    ['location', 'startDate', 'endDate', 'month', 'year'].forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  };

  // Map base search params to per-resource API params (memoised).
  // No "featured=true" gate — we always show every published item.
  // Featured ones float to the top via natural sort + sortOrder index.
  const hotelsParams = useMemo(() => {
    const p = { limit: 12 };
    if (location) p.location = location;
    if (debouncedSearch) p.search = debouncedSearch;
    if (localFilters.minPrice) p.minPrice = localFilters.minPrice;
    if (localFilters.maxPrice) p.maxPrice = localFilters.maxPrice;
    if (localFilters.minRating) p.minRating = localFilters.minRating;
    if (localFilters.starRating) p.starRating = localFilters.starRating;
    if (localFilters.facility) p.facility = localFilters.facility;
    return p;
  }, [location, debouncedSearch, localFilters]);

  const packagesParams = useMemo(() => {
    const p = { limit: 12 };
    if (location) p.location = location;
    if (startDate) p.startDate = startDate;
    if (endDate) p.endDate = endDate;
    if (month) p.month = month;
    if (year) p.year = year;
    if (debouncedSearch) p.search = debouncedSearch;
    if (localFilters.minPrice) p.minPrice = localFilters.minPrice;
    if (localFilters.maxPrice) p.maxPrice = localFilters.maxPrice;
    if (localFilters.minRating) p.minRating = localFilters.minRating;
    if (localFilters.minDuration) p.minDuration = localFilters.minDuration;
    if (localFilters.maxDuration) p.maxDuration = localFilters.maxDuration;
    if (localFilters.minNights) p.minNights = localFilters.minNights;
    if (localFilters.maxNights) p.maxNights = localFilters.maxNights;
    if (localFilters.activity) p.activity = localFilters.activity;
    if (localFilters.problem) p.problem = localFilters.problem;
    if (localFilters.category) p.category = localFilters.category;
    if (localFilters.area) p.area = localFilters.area;
    if (localFilters.culture) p.culture = localFilters.culture;
    if (localFilters.nearby) p.nearby = localFilters.nearby;
    if (localFilters.popular === 'true') p.popular = 'true';
    if (localFilters.featured === 'true') p.featured = 'true';
    return p;
  }, [location, startDate, endDate, month, year, debouncedSearch, localFilters]);

  const eventsParams = useMemo(() => {
    const p = { limit: 12 };
    if (location) p.location = location;
    if (startDate) p.fromDate = startDate;
    if (endDate) p.toDate = endDate;
    if (debouncedSearch) p.search = debouncedSearch;
    if (localFilters.eventType) p.eventType = localFilters.eventType;
    if (localFilters.fromTime) p.fromTime = localFilters.fromTime;
    if (localFilters.toTime) p.toTime = localFilters.toTime;
    return p;
  }, [location, startDate, endDate, debouncedSearch, localFilters]);

  const [activeTab, setActiveTab] = useState('all');
  const [hotels, setHotels] = useState([]);
  const [packages, setPackages] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState({ hotels: false, packages: false, events: false });

  // Client-side price safety net — the card "From" price must fall inside the
  // selected tier. Guards against any stale/cached response leaking a non-match.
  const priceGuard = (list, get) => {
    const min = Number(localFilters.minPrice) || 0;
    const max = Number(localFilters.maxPrice) || 0;
    if (!min && !max) return list;
    return (list || []).filter((x) => {
      const p = Number(get(x)) || 0;
      if (p <= 0) return false;
      if (min && p < min) return false;
      if (max && p > max) return false;
      return true;
    });
  };
  const visibleHotels = useMemo(() => priceGuard(hotels, (h) => h.priceFrom), [hotels, localFilters.minPrice, localFilters.maxPrice]); // eslint-disable-line react-hooks/exhaustive-deps
  const visiblePackages = useMemo(() => priceGuard(packages, (p) => p.priceFrom), [packages, localFilters.minPrice, localFilters.maxPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin-managed per-tab metadata: label, sublabel, headline, banner image.
  // Falls back to the static TABS defaults if the admin hasn't edited them.
  const [tabMeta, setTabMeta] = useState({});
  useEffect(() => {
    let cancelled = false;
    api.get('/featured-tabs')
      .then((res) => {
        if (cancelled) return;
        const byKey = {};
        (res.data?.data?.items || []).forEach((it) => { byKey[it.tabKey] = it; });
        setTabMeta(byKey);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Merge static defaults with admin overrides — empty string overrides fall back.
  const mergedTabs = TABS.map((t) => {
    const m = tabMeta[t.key] || {};
    return {
      ...t,
      label: m.label || t.label,
      sublabel: m.sublabel || t.sublabel,
      headline: m.headline || '',
      subheadline: m.subheadline || '',
      imageUrl: m.imageUrl || '',
    };
  });
  const activeMeta = mergedTabs.find((t) => t.key === activeTab) || mergedTabs[0];

  // Slider max — auto-expands to the highest price seen across hotels/packages/
  // events. Never shrinks (would jiggle when user filters), rounded up to the
  // nearest 5k for clean tick values.
  const [dataMaxPrice, setDataMaxPrice] = useState(5000);
  useEffect(() => {
    const prices = [
      ...hotels.map((x) => Number(x.priceFrom || x.priceOriginal) || 0),
      ...packages.map((x) => Number(x.priceFrom || x.priceOriginal) || 0),
      ...events.map((x) => Number(x.price || x.priceFrom || x.priceOriginal) || 0),
    ];
    if (!prices.length) return;
    const peak = Math.max(...prices);
    const rounded = Math.max(5000, Math.ceil(peak / 5000) * 5000);
    setDataMaxPrice((cur) => (rounded > cur ? rounded : cur));
  }, [hotels, packages, events]);

  useEffect(() => {
    let cancelled = false;
    // Three tiny aggregate queries instead of three full `limit:200` list
    // fetches with all joins (was ~25 s combined on a populated DB).
    Promise.allSettled([
      api.get('/hotels/price-stats'),
      api.get('/packages/price-stats'),
      api.get('/events/price-stats'),
    ]).then((results) => {
      if (cancelled) return;
      const peak = Math.max(
        0,
        ...results.map((r) =>
          r.status === 'fulfilled' ? Number(r.value?.data?.data?.max) || 0 : 0
        ),
      );
      const rounded = Math.max(5000, Math.ceil(peak / 5000) * 5000);
      setDataMaxPrice(rounded);
    });
    return () => { cancelled = true; };
  }, []);

  // Pre-fetch all three so the "All" tab + tab switching is instant.
  useEffect(() => {
    let cancelled = false;
    setLoading({ hotels: true, packages: true, events: true });

    api.get('/hotels', { params: hotelsParams })
      .then((r) => { if (!cancelled) setHotels(r.data?.data?.items || []); })
      .catch(() => { if (!cancelled) setHotels([]); })
      .finally(() => { if (!cancelled) setLoading((l) => ({ ...l, hotels: false })); });

    api.get('/packages', { params: packagesParams })
      .then((r) => { if (!cancelled) setPackages(r.data?.data?.items || []); })
      .catch(() => { if (!cancelled) setPackages([]); })
      .finally(() => { if (!cancelled) setLoading((l) => ({ ...l, packages: false })); });

    api.get('/events', { params: eventsParams })
      .then((r) => { if (!cancelled) setEvents(r.data?.data?.items || []); })
      .catch(() => { if (!cancelled) setEvents([]); })
      .finally(() => { if (!cancelled) setLoading((l) => ({ ...l, events: false })); });

    return () => { cancelled = true; };
  }, [hotelsParams, packagesParams, eventsParams]);

  // Resolve the human-readable location name for the heading.
  const locationName =
    hotels[0]?.location?.name ||
    packages[0]?.location?.name ||
    events[0]?.location?.name ||
    locationsList.find((l) => l.slug === location)?.name ||
    '';

  const counts = {
    all: hotels.length + packages.length + events.length,
    hotels: hotels.length,
    packages: packages.length,
    events: events.length,
  };

  const isLoading = loading.hotels || loading.packages || loading.events;

  return (
    <section className="py-12 md:py-16 bg-surface-alt">
      <div className="container-app">
        {/* Header — centered */}
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div>
            {hasSearch ? (
              <>
                <h2 className="heading">
                  Results{locationName && (
                    <> in <span className="heading-accent">{locationName}</span></>
                  )}
                </h2>
                <p className="text-ink-muted mt-2">
                  {counts.all} {counts.all === 1 ? 'match' : 'matches'} across hotels, packages and events.
                </p>
              </>
            ) : (
              <>
                <h2 className="heading">
                  Featured <span className="heading-accent">Retreats</span>
                </h2>
                <p className="text-ink-muted mt-2">Hand-picked stays, packages and events.</p>
              </>
            )}
          </div>

          {/* Active filter chips */}
          <ActiveFilters
            location={location}
            locationName={locationName}
            startDate={startDate}
            endDate={endDate}
            month={month}
            year={year}
          />
        </div>

        {/* Circular tabs — destination-style with thick double-border on the active one */}
        <div className="flex flex-wrap items-start justify-center gap-8 sm:gap-12 mb-10">
          {mergedTabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                title={t.tooltip}
                aria-label={t.tooltip}
                onClick={() => setActiveTab(t.key)}
                className="group flex flex-col items-center focus:outline-none"
              >
                {/* Active: thick brand ring → white gap → content circle (double-border effect)
                    Inactive: subtle slate ring that turns brand on hover */}
                <div
                  className={`rounded-full transition-all duration-300 ${
                    active
                      ? 'p-[5px] bg-brand shadow-lg shadow-brand/30'
                      : 'p-[3px] bg-slate-200 group-hover:bg-brand/40 group-hover:shadow-md'
                  }`}
                >
                  <div className={`rounded-full ${active ? 'p-1 bg-white' : 'p-0'}`}>
                    <div
                      className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gradient-to-br ${t.gradient} flex items-center justify-center transition-transform duration-300 ${
                        active ? 'scale-100' : 'group-hover:scale-[1.03]'
                      }`}
                    >
                      {t.imageUrl ? (
                        <>
                          <img
                            src={fileUrl(t.imageUrl)}
                            alt={t.label}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient} opacity-60 mix-blend-multiply`} />
                          <t.icon size={42} className="relative text-white drop-shadow-lg" strokeWidth={1.75} />
                        </>
                      ) : (
                        <t.icon size={48} className="text-white drop-shadow-lg" strokeWidth={1.75} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Label + count */}
                <div className="mt-3 text-center">
                  <div
                    className={`font-display font-bold text-lg transition-colors ${
                      active ? 'text-brand' : 'text-ink'
                    }`}
                  >
                    {t.label}
                  </div>
                  <div className={`text-xs ${active ? 'text-brand/70' : 'text-ink-muted'}`}>
                    {counts[t.key]} {counts[t.key] === 1 ? 'item' : 'items'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active tab banner — admin-managed image + headline. Hidden when no
            override is set so the section stays clean on a fresh install. */}
        {(activeMeta?.imageUrl || activeMeta?.headline) && (
          <div className="relative overflow-hidden rounded-2xl shadow-lg mb-8 group">
            {activeMeta.imageUrl && (
              <>
                <img
                  src={fileUrl(activeMeta.imageUrl)}
                  alt={activeMeta.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
              </>
            )}
            <div className={`relative ${activeMeta.imageUrl ? 'py-10 md:py-14' : 'py-7'} px-6 md:px-10 ${activeMeta.imageUrl ? 'text-white' : `bg-gradient-to-r ${activeMeta.gradient} text-white`}`}>
              {activeMeta.headline && (
                <h3 className="text-2xl md:text-4xl font-display font-black leading-tight max-w-3xl">
                  {activeMeta.headline}
                </h3>
              )}
              {activeMeta.subheadline && (
                <p className="mt-2 text-sm md:text-base text-white/90 max-w-2xl">
                  {activeMeta.subheadline}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Mobile filter toggle — desktop sidebar is always-visible */}
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="lg:hidden mb-4 inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium shadow-soft"
        >
          <Filter size={16} /> Show filters
        </button>

        {/* Sidebar + Results split */}
        <div className="flex flex-col lg:flex-row gap-6">
          <FilterSidebar
            activeTab={activeTab}
            filters={localFilters}
            onChange={setLocalFilters}
            // URL-bound state
            urlLocation={location}
            urlStartDate={startDate}
            urlEndDate={endDate}
            onLocationChange={updateLocation}
            onDateChange={(k, v) => {
              const next = new URLSearchParams(params);
              if (v) next.set(k, v); else next.delete(k);
              setParams(next, { replace: true });
            }}
            // Taxonomies
            locationsList={locationsList}
            eventTypesList={eventTypesList}
            facilitiesList={facilitiesList}
            activitiesList={activitiesList}
            problemsList={problemsList}
            categoriesList={categoriesList}
            areasList={areasList}
            culturesList={culturesList}
            nearbyPlacesList={nearbyPlacesList}
            // Dynamic price ceiling from loaded data
            priceMax={dataMaxPrice}
            // Reset
            onClearAll={clearAll}
            hasSearch={hasSearch}
            open={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
          />

          {/* Results — scrollable */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-soft border border-slate-100 max-h-[800px] overflow-y-auto">
            {activeTab === 'all' && (
              <AllTabContent
                hotels={visibleHotels} packages={visiblePackages} events={events}
                hasSearch={hasSearch} isLoading={isLoading}
                onTabSwitch={setActiveTab}
              />
            )}
            {activeTab === 'hotels' && (
              <ListPane
                loading={loading.hotels}
                items={visibleHotels}
                emptyLabel={hasSearch ? `No hotels for this search.` : `No hotels published yet.`}
                seeAllHref={`/hotels${buildQuery({ location })}`}
                renderItem={(h) => <HotelCard key={h.id} hotel={h} />}
              />
            )}
            {activeTab === 'packages' && (
              <ListPane
                loading={loading.packages}
                items={visiblePackages}
                emptyLabel={hasSearch ? `No packages for this search.` : `No packages published yet.`}
                seeAllHref={`/retreats${buildQuery({ location, startDate, endDate, month, year })}`}
                renderItem={(p) => <PackageCard key={p.id} pkg={p} />}
              />
            )}
            {activeTab === 'events' && (
              <ListPane
                loading={loading.events}
                items={events}
                emptyLabel={hasSearch ? `No events for this search.` : `No events published yet.`}
                seeAllHref={`/events${buildQuery({ location, fromDate: startDate, toDate: endDate })}`}
                renderItem={(e) => <EventCard key={e.id} event={e} />}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Helpers ───────────── */

function buildQuery(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== undefined && v !== null) sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function ActiveFilters({ location, locationName, startDate, endDate, month, year }) {
  const items = [];
  if (location) items.push(locationName || location);
  if (startDate || endDate) items.push(`${startDate || 'Any'} → ${endDate || 'Any'}`);
  if (month) items.push(`${month}/${year || ''}`);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((label, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-white border rounded-full">
          {label}
        </span>
      ))}
    </div>
  );
}

function ListPane({ loading, items, emptyLabel, seeAllHref, renderItem }) {
  return (
    <div className="p-5">
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-ink-muted">{emptyLabel}</div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map(renderItem)}
          </div>
          {seeAllHref && (
            <div className="flex justify-end mt-5">
              <Link to={seeAllHref} className="text-sm text-brand font-semibold hover:underline inline-flex items-center gap-1">
                See all <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AllTabContent({ hotels, packages, events, hasSearch, isLoading, onTabSwitch }) {
  if (isLoading) {
    return (
      <div className="p-5 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const totalCount = hotels.length + packages.length + events.length;
  if (totalCount === 0) {
    return (
      <div className="p-12 text-center text-ink-muted">
        {hasSearch ? 'No matches found. Try adjusting your search.' : 'Nothing published yet.'}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-8">
      {hotels.length > 0 && (
        <SubGroup
          title="Hotels"
          icon={HotelIcon}
          items={hotels.slice(0, 3)}
          renderItem={(h) => <HotelCard key={h.id} hotel={h} />}
          onSeeAll={() => onTabSwitch('hotels')}
        />
      )}
      {packages.length > 0 && (
        <SubGroup
          title="Packages"
          icon={PkgIcon}
          items={packages.slice(0, 3)}
          renderItem={(p) => <PackageCard key={p.id} pkg={p} />}
          onSeeAll={() => onTabSwitch('packages')}
        />
      )}
      {events.length > 0 && (
        <SubGroup
          title="Events"
          icon={CalendarDays}
          items={events.slice(0, 3)}
          renderItem={(e) => <EventCard key={e.id} event={e} />}
          onSeeAll={() => onTabSwitch('events')}
        />
      )}
    </div>
  );
}

/* ───────────── Filter Sidebar ───────────── */

const RATING_BUCKETS = [
  { value: '4.5', label: '4.5+ Excellent' },
  { value: '4', label: '4+ Very Good' },
  { value: '3.5', label: '3.5+ Good' },
  { value: '3', label: '3+ Average' },
];
const STAR_OPTIONS = [5, 4, 3, 2, 1];

function FilterSidebar({
  activeTab, filters, onChange,
  urlLocation = '', urlStartDate = '', urlEndDate = '',
  onLocationChange, onDateChange,
  locationsList = [], eventTypesList = [],
  facilitiesList = [], activitiesList = [], problemsList = [],
  categoriesList = [], areasList = [], culturesList = [],
  nearbyPlacesList = [],
  priceMax = 50000,
  onClearAll, hasSearch,
  open, onClose,
}) {
  const set = (k, v) => onChange({ ...filters, [k]: v });

  const toggleStar = (s) => {
    const current = filters.starRating ? filters.starRating.split(',') : [];
    const exists = current.includes(String(s));
    const next = exists ? current.filter((x) => x !== String(s)) : [...current, String(s)];
    set('starRating', next.join(','));
  };
  const isStarActive = (s) => (filters.starRating || '').split(',').includes(String(s));

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          lg:w-64 shrink-0
          ${open ? 'fixed inset-y-0 left-0 z-50 w-72 bg-white p-4 overflow-y-auto shadow-2xl' : 'hidden'}
          lg:!block lg:relative lg:inset-auto lg:!w-64 lg:!bg-transparent lg:!p-0 lg:!shadow-none lg:!overflow-visible
        `}
      >
        <div className="bg-white rounded-2xl shadow-soft border border-slate-100 lg:sticky lg:top-24 lg:max-h-[800px] flex flex-col overflow-hidden">
          {/* Fixed header — does not scroll */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
            <h3 className="font-display font-semibold inline-flex items-center gap-2">
              <Filter size={16} className="text-brand" /> Filters
            </h3>
            <div className="flex items-center gap-2">
              {hasSearch && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs text-brand font-semibold hover:underline"
                >
                  Clear
                </button>
              )}
              <button onClick={onClose} className="lg:hidden text-ink-muted">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable filter list — fills remaining height */}
          <div className="flex-1 overflow-y-auto px-5 py-2">

          {/* Search by name — applies to all tabs */}
          <FilterBlock label="Search by name">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                className="input pl-8 text-sm"
                placeholder="Veda, Cricket, …"
                value={filters.search}
                onChange={(e) => set('search', e.target.value)}
              />
            </div>
          </FilterBlock>

          {/* Price tier — pinned at top of the filter list. Dynamic tiers built
              from the live catalogue ceiling, with a safe fallback. */}
          <FilterBlock label="Price">
            <PriceTierFilter
              priceMin={0}
              priceMax={priceMax}
              value={filters.maxPrice}
              onChange={(v) => onChange({
                ...filters,
                minPrice: '',
                maxPrice: v,
              })}
            />
          </FilterBlock>

          {/* Location — applies to all */}
          <FilterBlock label="Location">
            {locationsList.length === 0 ? (
              <p className="text-xs text-ink-muted italic">No locations yet</p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {locationsList.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-brand">
                    <input
                      type="radio"
                      checked={urlLocation === l.slug}
                      onChange={() => onLocationChange?.(urlLocation === l.slug ? '' : l.slug)}
                    />
                    <span className="flex-1 truncate">{l.name}</span>
                  </label>
                ))}
              </div>
            )}
          </FilterBlock>

          {/* Date range — relevant for All, Packages, Events */}
          {(activeTab === 'all' || activeTab === 'packages' || activeTab === 'events') && (
            <FilterBlock label="Date">
              <div className="space-y-2">
                <DatePicker
                  value={urlStartDate}
                  onChange={(v) => onDateChange?.('startDate', v)}
                  placeholder="From"
                  size="sm"
                />
                <DatePicker
                  value={urlEndDate}
                  min={urlStartDate || undefined}
                  onChange={(v) => onDateChange?.('endDate', v)}
                  placeholder="To"
                  size="sm"
                />
              </div>
            </FilterBlock>
          )}

          {/* User rating — hotels & packages */}
          {(activeTab === 'all' || activeTab === 'hotels' || activeTab === 'packages') && (
            <FilterBlock label="User rating">
              <StarRatingFilter
                value={filters.minRating}
                onChange={(v) => set('minRating', v)}
              />
            </FilterBlock>
          )}

          {/* Star category — hotels only */}
          {(activeTab === 'all' || activeTab === 'hotels') && (
            <FilterBlock label="Star category">
              <StarCategoryFilter
                value={filters.starRating}
                onChange={(v) => set('starRating', v)}
              />
            </FilterBlock>
          )}

          {/* Duration — packages only */}
          {(activeTab === 'all' || activeTab === 'packages') && (
            <FilterBlock label="Duration (days)">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" placeholder="Min" className="input text-sm"
                  value={filters.minDuration}
                  onChange={(e) => set('minDuration', e.target.value)}
                />
                <input
                  type="number" placeholder="Max" className="input text-sm"
                  value={filters.maxDuration}
                  onChange={(e) => set('maxDuration', e.target.value)}
                />
              </div>
            </FilterBlock>
          )}

          {/* Event type — events only */}
          {(activeTab === 'all' || activeTab === 'events') && (
            <FilterBlock label="Event type">
              <RadioList
                options={eventTypesList}
                value={filters.eventType}
                onSelect={(slug) => set('eventType', filters.eventType === slug ? '' : slug)}
                emptyLabel="No event types yet"
              />
            </FilterBlock>
          )}

          {/* Time range — events only */}
          {(activeTab === 'all' || activeTab === 'events') && (
            <FilterBlock label="Time of day">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time" className="input text-sm"
                  value={filters.fromTime}
                  onChange={(e) => set('fromTime', e.target.value)}
                />
                <input
                  type="time" className="input text-sm"
                  value={filters.toTime}
                  onChange={(e) => set('toTime', e.target.value)}
                />
              </div>
            </FilterBlock>
          )}

          {/* Nights — packages only */}
          {(activeTab === 'all' || activeTab === 'packages') && (
            <FilterBlock label="Nights">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" placeholder="Min" className="input text-sm"
                  value={filters.minNights}
                  onChange={(e) => set('minNights', e.target.value)}
                />
                <input
                  type="number" placeholder="Max" className="input text-sm"
                  value={filters.maxNights}
                  onChange={(e) => set('maxNights', e.target.value)}
                />
              </div>
            </FilterBlock>
          )}

          {/* Facilities — hotels (also packages share facility list visually) */}
          {(activeTab === 'all' || activeTab === 'hotels') && (
            <FilterBlock label="Facilities">
              <RadioList
                options={facilitiesList}
                value={filters.facility}
                onSelect={(slug) => set('facility', filters.facility === slug ? '' : slug)}
                emptyLabel="No facilities yet"
              />
            </FilterBlock>
          )}

          {/* Activities — packages only */}
          {(activeTab === 'all' || activeTab === 'packages') && (
            <FilterBlock label="Activities">
              <RadioList
                options={activitiesList}
                value={filters.activity}
                onSelect={(slug) => set('activity', filters.activity === slug ? '' : slug)}
                emptyLabel="No activities yet"
              />
            </FilterBlock>
          )}

          {/* Problems / Conditions — packages only */}
          {(activeTab === 'all' || activeTab === 'packages') && (
            <FilterBlock label="Problems / Conditions">
              <RadioList
                options={problemsList}
                value={filters.problem}
                onSelect={(slug) => set('problem', filters.problem === slug ? '' : slug)}
                emptyLabel="No problems yet"
              />
            </FilterBlock>
          )}

          {/* Nearest places — packages only */}
          {(activeTab === 'all' || activeTab === 'packages') && (
            <FilterBlock label="Nearest places">
              <RadioList
                options={nearbyPlacesList}
                value={filters.nearby}
                onSelect={(slug) => set('nearby', filters.nearby === slug ? '' : slug)}
                emptyLabel="No places yet"
              />
            </FilterBlock>
          )}

          {/* Areas — packages only */}
          {(activeTab === 'all' || activeTab === 'packages') && (
            <FilterBlock label="Areas">
              <RadioList
                options={areasList}
                value={filters.area}
                onSelect={(slug) => set('area', filters.area === slug ? '' : slug)}
                emptyLabel="No areas yet"
              />
            </FilterBlock>
          )}

          {/* Cultures — packages only */}
          {(activeTab === 'all' || activeTab === 'packages') && (
            <FilterBlock label="Cultures">
              <RadioList
                options={culturesList}
                value={filters.culture}
                onSelect={(slug) => set('culture', filters.culture === slug ? '' : slug)}
                emptyLabel="No cultures yet"
              />
            </FilterBlock>
          )}

          {/* Categories — packages only */}
          {(activeTab === 'all' || activeTab === 'packages') && (
            <FilterBlock label="Categories">
              <RadioList
                options={categoriesList}
                value={filters.category}
                onSelect={(slug) => set('category', filters.category === slug ? '' : slug)}
                emptyLabel="No categories yet"
              />
            </FilterBlock>
          )}

          {/* Popular / Featured flags — applies to all */}
          <FilterBlock label="Popular filters">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-brand">
                <input
                  type="checkbox"
                  checked={filters.popular === 'true'}
                  onChange={() => set('popular', filters.popular === 'true' ? '' : 'true')}
                />
                <span>Popular</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-brand">
                <input
                  type="checkbox"
                  checked={filters.featured === 'true'}
                  onChange={() => set('featured', filters.featured === 'true' ? '' : 'true')}
                />
                <span>Featured</span>
              </label>
            </div>
          </FilterBlock>

          <p className="text-[11px] text-ink-muted italic my-4">
            All filters from the dedicated /hotels, /retreats and /events pages are mirrored here.
          </p>
          </div>{/* /scrollable filter list */}
        </div>
      </aside>
    </>
  );
}

/* Reusable radio-list block for taxonomy pickers in the sidebar. */
function RadioList({ options, value, onSelect, emptyLabel = 'None yet' }) {
  if (!options?.length) {
    return <p className="text-xs text-ink-muted italic">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
      {options.map((o) => (
        <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-brand">
          <input
            type="radio"
            checked={value === o.slug}
            onChange={() => onSelect?.(o.slug)}
          />
          <span className="flex-1 truncate">{o.name}</span>
        </label>
      ))}
    </div>
  );
}

function FilterBlock({ label, children }) {
  return (
    <div className="border-b last:border-b-0 py-3 first:pt-0">
      <h4 className="text-sm font-semibold text-ink mb-2.5">{label}</h4>
      {children}
    </div>
  );
}

function SubGroup({ title, icon: Icon, items, renderItem, onSeeAll }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-lg inline-flex items-center gap-2">
          <Icon size={18} className="text-brand" />
          {title}
        </h3>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-sm text-brand font-semibold hover:underline inline-flex items-center gap-1"
        >
          See all {title.toLowerCase()} <ChevronRight size={14} />
        </button>
      </div>
      <div className="space-y-3">
        {items.map(renderItem)}
      </div>
    </div>
  );
}
