import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, LayoutGrid, List as ListIcon } from 'lucide-react';
import api from '../../services/api';
import { onlyStateLocations } from '../../utils/indianStates.js';
import PackageCard from '../../components/public/PackageCard.jsx';
import PriceTierFilter from '../../components/public/PriceTierFilter.jsx';
import StarRatingFilter from '../../components/public/StarRatingFilter.jsx';

const SORTS = [
  { value: '', label: 'Recommended first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
];

const RATING_BUCKETS = [
  { value: '4.5', label: '4.5+ Excellent' },
  { value: '4', label: '4+ Very Good' },
  { value: '3.5', label: '3.5+ Good' },
  { value: '3', label: '3+ Average' },
];

export default function RetreatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [locations, setLocations] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [problems, setProblems] = useState([]);
  const [activities, setActivities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [cultures, setCultures] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [facilitiesList, setFacilitiesList] = useState([]);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 });

  const [filters, setFilters] = useState({
    // Location & taxonomies
    location: searchParams.get('location') || '',
    city: searchParams.get('city') || '',
    category: searchParams.get('category') || '',
    problem: searchParams.get('problem') || '',
    activity: searchParams.get('activity') || '',
    area: searchParams.get('area') || '',
    culture: searchParams.get('culture') || '',
    nearby: searchParams.get('nearby') || '',
    // Numeric
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minDuration: searchParams.get('minDuration') || '',
    maxDuration: searchParams.get('maxDuration') || '',
    minNights: searchParams.get('minNights') || '',
    maxNights: searchParams.get('maxNights') || '',
    minRating: searchParams.get('minRating') || '',
    // Date (consumed from SearchTabs on home)
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    month: searchParams.get('month') || '',
    year: searchParams.get('year') || '',
    // Flags
    featured: searchParams.get('featured') || '',
    popular: searchParams.get('popular') || '',
    sort: searchParams.get('sort') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState('list');

  // Load taxonomies once
  useEffect(() => {
    Promise.all([
      api.get('/locations').then((r) => setLocations(r.data?.data?.items || [])),
      api.get('/cities').then((r) => setCities(r.data?.data?.items || [])),
      api.get('/categories').then((r) => setCategories(r.data?.data?.items || [])),
      api.get('/problems').then((r) => setProblems(r.data?.data?.items || [])),
      api.get('/activities').then((r) => setActivities(r.data?.data?.items || [])),
      api.get('/areas').then((r) => setAreas(r.data?.data?.items || [])),
      api.get('/cultures').then((r) => setCultures(r.data?.data?.items || [])),
      api.get('/nearby-places').then((r) => setNearbyPlaces(r.data?.data?.items || [])),
      api.get('/facilities').then((r) => setFacilitiesList(r.data?.data?.items || [])),
    ]).catch(() => {});

    api.get('/packages/price-stats')
      .then((res) => {
        const d = res.data?.data || {};
        setPriceBounds({ min: Number(d.min) || 0, max: Number(d.max) || 0 });
      })
      .catch(() => {});
  }, []);

  const queryString = useMemo(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) params[k] = v;
    });
    return params;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/packages', { params: { ...queryString, limit: 12 } });
      setPackages(res.data?.data?.items || []);
      setPagination(res.data?.data?.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
    const sp = new URLSearchParams();
    Object.entries(queryString).forEach(([k, v]) => sp.set(k, v));
    setSearchParams(sp, { replace: true });
  }, [load, queryString, setSearchParams]);

  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));
  const toggleBool = (k) => setFilters((f) => ({ ...f, [k]: f[k] === 'true' ? '' : 'true', page: 1 }));

  const clearAll = () =>
    setFilters({
      location: '', city: '', category: '', problem: '', activity: '',
      area: '', culture: '', nearby: '',
      minPrice: '', maxPrice: '', minDuration: '', maxDuration: '',
      minNights: '', maxNights: '', minRating: '',
      startDate: '', endDate: '', month: '', year: '',
      featured: '', popular: '',
      sort: '', page: 1,
    });

  const hasFilters = ['location', 'city', 'category', 'problem', 'activity',
    'area', 'culture', 'nearby',
    'minPrice', 'maxPrice', 'minDuration', 'maxDuration',
    'minNights', 'maxNights', 'minRating',
    'startDate', 'endDate', 'month', 'year',
    'featured', 'popular',
  ].some((k) => filters[k]);

  const headerSubtitle = `${pagination.total || 0} retreats found${
    filters.location
      ? ` in ${locations.find((l) => l.slug === filters.location)?.name || ''}`
      : (filters.city ? ` in ${cities.find((c) => c.slug === filters.city)?.name || ''}` : '')
  }`;

  return (
    <>
      {/* Page header */}
      <div className="bg-gradient-to-br from-brand to-wellness text-white">
        <div className="container-app py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-display font-bold drop-shadow">
            Wellness &amp; Yoga Retreats
          </h1>
          <p className="mt-2 opacity-90">{headerSubtitle}</p>
        </div>
      </div>

      <div className="container-app py-8">
        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {filters.location && (
              <Chip label={`Location: ${locations.find((l) => l.slug === filters.location)?.name || filters.location}`} onClear={() => update('location', '')} />
            )}
            {filters.city && (
              <Chip label={`City: ${cities.find((c) => c.slug === filters.city)?.name || filters.city}`} onClear={() => update('city', '')} />
            )}
            {filters.category && (
              <Chip label={`Category: ${categories.find((c) => c.slug === filters.category)?.name || filters.category}`} onClear={() => update('category', '')} />
            )}
            {filters.problem && (
              <Chip label={`Problem: ${problems.find((c) => c.slug === filters.problem)?.name || filters.problem}`} onClear={() => update('problem', '')} />
            )}
            {filters.activity && (
              <Chip label={`Activity: ${activities.find((c) => c.slug === filters.activity)?.name || filters.activity}`} onClear={() => update('activity', '')} />
            )}
            {filters.area && (
              <Chip label={`Area: ${areas.find((c) => c.slug === filters.area)?.name || filters.area}`} onClear={() => update('area', '')} />
            )}
            {filters.culture && (
              <Chip label={`Culture: ${cultures.find((c) => c.slug === filters.culture)?.name || filters.culture}`} onClear={() => update('culture', '')} />
            )}
            {filters.nearby && (
              <Chip label={`Near: ${nearbyPlaces.find((c) => c.slug === filters.nearby)?.name || filters.nearby}`} onClear={() => update('nearby', '')} />
            )}
            {filters.minPrice && <Chip label={`Min ₹${Number(filters.minPrice).toLocaleString()}`} onClear={() => update('minPrice', '')} />}
            {filters.maxPrice && <Chip label={`Under ₹${Number(filters.maxPrice).toLocaleString()}`} onClear={() => update('maxPrice', '')} />}
            {filters.minRating && <Chip label={`${filters.minRating}+ rating`} onClear={() => update('minRating', '')} />}
            {filters.popular === 'true' && <Chip label="Popular" onClear={() => update('popular', '')} />}
            {filters.featured === 'true' && <Chip label="Featured" onClear={() => update('featured', '')} />}
            {(filters.startDate || filters.endDate) && (
              <Chip
                label={`${filters.startDate || 'Any'} → ${filters.endDate || 'Any'}`}
                onClear={() => { update('startDate', ''); update('endDate', ''); }}
              />
            )}
            {filters.month && (
              <Chip
                label={`Month: ${filters.month}/${filters.year || ''}`}
                onClear={() => { update('month', ''); update('year', ''); }}
              />
            )}
            <button onClick={clearAll} className="text-sm text-brand font-semibold hover:underline ml-2">
              Clear all
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar — always-visible (MMT-style, no collapsible groups) */}
          <aside className={`lg:w-72 shrink-0 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="card p-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
              <h3 className="font-display font-semibold mb-4 flex items-center justify-between">
                <span>Filters</span>
                <button onClick={() => setFiltersOpen(false)} className="lg:hidden text-ink-muted">
                  <X size={18} />
                </button>
              </h3>

              {/* Price tier — pinned at top, dynamic from live catalogue */}
              <FilterBlock label="Price">
                <PriceTierFilter
                  priceMin={priceBounds.min}
                  priceMax={priceBounds.max}
                  value={filters.maxPrice}
                  onChange={(v) => update('maxPrice', v)}
                />
              </FilterBlock>

              <FilterBlock label="User rating">
                <StarRatingFilter
                  value={filters.minRating}
                  onChange={(v) => update('minRating', v)}
                />
              </FilterBlock>

              <FilterBlock label="State">
                <RadioList options={onlyStateLocations(locations)} value={filters.location} onChange={(v) => update('location', v)} />
              </FilterBlock>

              <FilterBlock label="Activities">
                <RadioList options={activities} value={filters.activity} onChange={(v) => update('activity', v)} />
              </FilterBlock>

              <FilterBlock label="Problems / Conditions">
                <RadioList options={problems} value={filters.problem} onChange={(v) => update('problem', v)} />
              </FilterBlock>

              <FilterBlock label="Duration (days)">
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Min" className="input"
                    value={filters.minDuration}
                    onChange={(e) => update('minDuration', e.target.value)}
                  />
                  <input type="number" placeholder="Max" className="input"
                    value={filters.maxDuration}
                    onChange={(e) => update('maxDuration', e.target.value)}
                  />
                </div>
              </FilterBlock>

              <FilterBlock label="Nights">
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Min" className="input"
                    value={filters.minNights}
                    onChange={(e) => update('minNights', e.target.value)}
                  />
                  <input type="number" placeholder="Max" className="input"
                    value={filters.maxNights}
                    onChange={(e) => update('maxNights', e.target.value)}
                  />
                </div>
              </FilterBlock>

              <FilterBlock label="Nearest places">
                <RadioList options={nearbyPlaces} value={filters.nearby} onChange={(v) => update('nearby', v)} />
              </FilterBlock>

              <FilterBlock label="Areas">
                <RadioList options={areas} value={filters.area} onChange={(v) => update('area', v)} />
              </FilterBlock>

              <FilterBlock label="Cultures">
                <RadioList options={cultures} value={filters.culture} onChange={(v) => update('culture', v)} />
              </FilterBlock>

              <FilterBlock label="Popular filters">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-brand">
                    <input
                      type="checkbox"
                      checked={filters.popular === 'true'}
                      onChange={() => toggleBool('popular')}
                    />
                    <span>Popular packages</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-brand">
                    <input
                      type="checkbox"
                      checked={filters.featured === 'true'}
                      onChange={() => toggleBool('featured')}
                    />
                    <span>Featured packages</span>
                  </label>
                </div>
              </FilterBlock>

              <FilterBlock label="Categories">
                <RadioList options={categories} value={filters.category} onChange={(v) => update('category', v)} />
              </FilterBlock>
            </div>
          </aside>

          {/* Listing */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <button onClick={() => setFiltersOpen(true)} className="lg:hidden btn-outline text-sm">
                <Filter size={16} /> Filters
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <div className="inline-flex bg-surface-alt rounded-lg p-1 text-sm">
                  <button
                    onClick={() => setView('list')}
                    className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${
                      view === 'list' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
                    }`}
                    title="List view"
                  >
                    <ListIcon size={14} /> List
                  </button>
                  <button
                    onClick={() => setView('grid')}
                    className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${
                      view === 'grid' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid size={14} /> Grid
                  </button>
                </div>
                <span className="text-sm text-ink-muted hidden sm:inline">Sort:</span>
                <select
                  className="input max-w-[220px]"
                  value={filters.sort}
                  onChange={(e) => update('sort', e.target.value)}
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : packages.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-ink-muted">No retreats match your filters yet.</p>
                {hasFilters && (
                  <button onClick={clearAll} className="btn-outline mt-4">Clear filters</button>
                )}
              </div>
            ) : view === 'grid' ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {packages.map((p) => <PackageCard key={p.id} pkg={p} />)}
              </div>
            ) : (
              <div className="space-y-5">
                {packages.map((p) => <PackageCard key={p.id} pkg={p} />)}
              </div>
            )}

            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                  className="btn-outline text-sm disabled:opacity-50"
                >Previous</button>
                <span className="text-sm">
                  Page <strong>{pagination.page}</strong> / {pagination.pages}
                </span>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  className="btn-outline text-sm disabled:opacity-50"
                >Next</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Chip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-white border rounded-full">
      {label}
      <button onClick={onClear} className="text-ink-muted hover:text-red-600">
        <X size={14} />
      </button>
    </span>
  );
}

function FilterBlock({ label, children }) {
  return (
    <div className="border-b last:border-b-0 py-3 first:pt-0">
      <h4 className="text-sm font-semibold text-ink mb-3">{label}</h4>
      {children}
    </div>
  );
}

function RadioList({ options, value, onChange, field = 'slug' }) {
  const [expanded, setExpanded] = useState(false);
  const collapseAfter = 8;
  if (!options?.length) {
    return <p className="text-xs text-ink-muted italic">None yet</p>;
  }
  const visible = expanded ? options : options.slice(0, collapseAfter);
  return (
    <div className="space-y-1.5">
      {visible.map((o) => (
        <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-brand">
          <input
            type="radio"
            checked={value === o[field]}
            onChange={() => onChange(value === o[field] ? '' : o[field])}
          />
          <span className="flex-1 truncate">{o.name}</span>
        </label>
      ))}
      {options.length > collapseAfter && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-semibold text-brand hover:underline"
        >
          {expanded ? 'Show less' : `Show all ${options.length}`}
        </button>
      )}
    </div>
  );
}
