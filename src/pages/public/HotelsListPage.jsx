import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, LayoutGrid, List as ListIcon } from 'lucide-react';
import api from '../../services/api';
import { onlyStateLocations } from '../../utils/indianStates.js';
import HotelCard from '../../components/public/HotelCard.jsx';
import PriceTierFilter from '../../components/public/PriceTierFilter.jsx';
import StarRatingFilter from '../../components/public/StarRatingFilter.jsx';
import StarCategoryFilter from '../../components/public/StarCategoryFilter.jsx';

const SORTS = [
  { value: '', label: 'Recommended first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
];

const STAR_OPTIONS = [5, 4, 3, 2, 1];
const RATING_BUCKETS = [
  { value: '4.5', label: '4.5+ Excellent' },
  { value: '4', label: '4+ Very Good' },
  { value: '3.5', label: '3.5+ Good' },
  { value: '3', label: '3+ Average' },
];

export default function HotelsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [locations, setLocations] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [roomViews, setRoomViews] = useState([]);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 });

  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    facility: searchParams.get('facility') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    starRating: searchParams.get('starRating') || '', // comma-separated values
    minRating: searchParams.get('minRating') || '',
    sort: searchParams.get('sort') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState('list'); // list | grid

  // Load taxonomies once
  useEffect(() => {
    Promise.all([
      api.get('/locations').then((r) => setLocations(r.data?.data?.items || [])),
      api.get('/facilities').then((r) => setFacilities(r.data?.data?.items || [])),
      api.get('/room-views').then((r) => setRoomViews(r.data?.data?.items || [])),
    ]).catch(() => {});

    // Discover the live price range via a single lightweight aggregate
    // endpoint. Replaces two full-include `limit:1` probes that were taking
    // ~8 s combined.
    api.get('/hotels/price-stats')
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
      const res = await api.get('/hotels', { params: { ...queryString, limit: 12 } });
      setHotels(res.data?.data?.items || []);
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

  // Client-side safety net: the card's "From" price is the cheapest bookable
  // room. Never render a hotel whose price falls outside the selected range
  // (defends against any stale/cached response slipping a non-match through).
  const visibleHotels = useMemo(() => {
    const min = Number(filters.minPrice) || 0;
    const max = Number(filters.maxPrice) || 0;
    if (!min && !max) return hotels;
    return hotels.filter((h) => {
      const p = Number(h.priceFrom) || 0;
      if (p <= 0) return false;            // "On request" can't match a price tier
      if (min && p < min) return false;
      if (max && p > max) return false;
      return true;
    });
  }, [hotels, filters.minPrice, filters.maxPrice]);

  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  // Star rating supports multi-select via comma-separated value
  const toggleStar = (star) => {
    const current = filters.starRating ? filters.starRating.split(',') : [];
    const exists = current.includes(String(star));
    const next = exists ? current.filter((x) => x !== String(star)) : [...current, String(star)];
    update('starRating', next.join(','));
  };
  const isStarActive = (star) =>
    (filters.starRating || '').split(',').includes(String(star));

  const clearAll = () =>
    setFilters({
      location: '', facility: '',
      minPrice: '', maxPrice: '',
      starRating: '', minRating: '',
      sort: '', page: 1,
    });

  const hasFilters = ['location', 'facility', 'minPrice', 'maxPrice', 'starRating', 'minRating']
    .some((k) => filters[k]);

  const headerSubtitle = `${pagination.total || 0} properties found${
    filters.location ? ` in ${locations.find((l) => l.slug === filters.location)?.name || ''}` : ''
  }`;

  return (
    <>
      {/* Page header */}
      <div className="bg-gradient-to-br from-brand to-wellness text-white">
        <div className="container-app py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-display font-bold drop-shadow">
            Hotels
          </h1>
          <p className="mt-2 opacity-90">{headerSubtitle}</p>
        </div>
      </div>

      <div className="container-app py-8">
        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {filters.location && (
              <Chip
                label={`Location: ${locations.find((l) => l.slug === filters.location)?.name || filters.location}`}
                onClear={() => update('location', '')}
              />
            )}
            {filters.facility && (
              <Chip
                label={`Facility: ${facilities.find((f) => f.slug === filters.facility)?.name || filters.facility}`}
                onClear={() => update('facility', '')}
              />
            )}
            {filters.starRating && (
              <Chip label={`Stars: ${filters.starRating}`} onClear={() => update('starRating', '')} />
            )}
            {filters.minRating && (
              <Chip label={`${filters.minRating}+ rating`} onClear={() => update('minRating', '')} />
            )}
            {filters.minPrice && <Chip label={`Min ₹${Number(filters.minPrice).toLocaleString()}`} onClear={() => update('minPrice', '')} />}
            {filters.maxPrice && <Chip label={`Under ₹${Number(filters.maxPrice).toLocaleString()}`} onClear={() => update('maxPrice', '')} />}
            <button onClick={clearAll} className="text-sm text-brand font-semibold hover:underline ml-2">
              Clear all
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar — all filters always visible (MMT-style) */}
          <aside className={`lg:w-72 shrink-0 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="card p-5 sticky top-24">
              <h3 className="font-display font-semibold mb-4 flex items-center justify-between">
                <span>Filters</span>
                <button onClick={() => setFiltersOpen(false)} className="lg:hidden text-ink-muted">
                  <X size={18} />
                </button>
              </h3>

              {/* Price tier — first filter, dynamic from live catalogue */}
              <FilterBlock label="Price per night">
                <PriceTierFilter
                  priceMin={priceBounds.min}
                  priceMax={priceBounds.max}
                  value={filters.maxPrice}
                  onChange={(v) => update('maxPrice', v)}
                />
              </FilterBlock>

              <FilterBlock label="Star category">
                <StarCategoryFilter
                  value={filters.starRating}
                  onChange={(v) => update('starRating', v)}
                />
              </FilterBlock>

              <FilterBlock label="User rating">
                <StarRatingFilter
                  value={filters.minRating}
                  onChange={(v) => update('minRating', v)}
                />
              </FilterBlock>

              <FilterBlock label="State">
                <RadioList
                  options={onlyStateLocations(locations)}
                  value={filters.location}
                  onChange={(v) => update('location', v)}
                />
              </FilterBlock>

              <FilterBlock label="Facilities">
                <RadioList
                  options={facilities}
                  value={filters.facility}
                  onChange={(v) => update('facility', v)}
                />
              </FilterBlock>

              <FilterBlock label="Room views">
                <p className="text-[11px] text-ink-muted italic">
                  Room-view filter is applied at the hotel-detail level.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {roomViews.slice(0, 6).map((rv) => (
                    <span key={rv.id} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-ink-muted">
                      {rv.name}
                    </span>
                  ))}
                </div>
              </FilterBlock>
            </div>
          </aside>

          {/* Listing */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <button
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden btn-outline text-sm"
              >
                <Filter size={16} /> Filters
              </button>
              <div className="flex items-center gap-2 ml-auto">
                {/* Layout toggle */}
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
            ) : visibleHotels.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-ink-muted">No hotels match your filters yet.</p>
                {hasFilters && (
                  <button onClick={clearAll} className="btn-outline mt-4">Clear filters</button>
                )}
              </div>
            ) : view === 'grid' ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {visibleHotels.map((h) => <HotelCard key={h.id} hotel={h} variant="vertical" />)}
              </div>
            ) : (
              <div className="space-y-5">
                {visibleHotels.map((h) => <HotelCard key={h.id} hotel={h} />)}
              </div>
            )}

            {/* Pagination */}
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

// Always-visible filter block (no collapse) — per spec: "filters are not hidden in dropdowns"
function FilterBlock({ label, children }) {
  return (
    <div className="border-b last:border-b-0 py-3 first:pt-0">
      <h4 className="text-sm font-semibold text-ink mb-3">{label}</h4>
      {children}
    </div>
  );
}

function RadioList({ options, value, onChange, field = 'slug' }) {
  // Long lists get an inline "show more" toggle instead of a scrollbar so
  // the whole sidebar scrolls as one piece — matches MMT-style filters.
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
