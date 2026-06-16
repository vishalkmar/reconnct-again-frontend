import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, LayoutGrid, List as ListIcon } from 'lucide-react';
import api from '../../services/api';
import EventCard from '../../components/public/EventCard.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import PriceTierFilter from '../../components/public/PriceTierFilter.jsx';

const SORTS = [
  { value: '', label: 'Recommended first' },
  { value: 'date_asc', label: 'Date: soonest first' },
  { value: 'date_desc', label: 'Date: latest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export default function EventsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [locations, setLocations] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 });

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    location: searchParams.get('location') || '',
    eventType: searchParams.get('eventType') || '',
    fromDate: searchParams.get('fromDate') || searchParams.get('startDate') || '',
    toDate: searchParams.get('toDate') || searchParams.get('endDate') || '',
    fromTime: searchParams.get('fromTime') || '',
    toTime: searchParams.get('toTime') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState('list');

  useEffect(() => {
    Promise.all([
      api.get('/locations').then((r) => setLocations(r.data?.data?.items || [])),
      api.get('/event-types').then((r) => setEventTypes(r.data?.data?.items || [])),
    ]).catch(() => {});

    api.get('/events/price-stats')
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
      const res = await api.get('/events', { params: { ...queryString, limit: 12 } });
      setEvents(res.data?.data?.items || []);
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

  const clearAll = () => setFilters({
    search: '', location: '', eventType: '',
    fromDate: '', toDate: '', fromTime: '', toTime: '',
    maxPrice: '',
    sort: '', page: 1,
  });

  const hasFilters = ['search', 'location', 'eventType', 'fromDate', 'toDate', 'fromTime', 'toTime', 'maxPrice']
    .some((k) => filters[k]);

  const headerSubtitle = `${pagination.total || 0} events found${
    filters.location ? ` in ${locations.find((l) => l.slug === filters.location)?.name || ''}` : ''
  }`;

  return (
    <>
      <div className="bg-gradient-to-br from-brand to-wellness text-white">
        <div className="container-app py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-display font-bold drop-shadow">Events</h1>
          <p className="mt-2 opacity-90">{headerSubtitle}</p>
        </div>
      </div>

      <div className="container-app py-8">
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {filters.search && <Chip label={`"${filters.search}"`} onClear={() => update('search', '')} />}
            {filters.location && (
              <Chip label={`Location: ${locations.find((l) => l.slug === filters.location)?.name || filters.location}`} onClear={() => update('location', '')} />
            )}
            {filters.eventType && (
              <Chip label={`Type: ${eventTypes.find((t) => t.slug === filters.eventType)?.name || filters.eventType}`} onClear={() => update('eventType', '')} />
            )}
            {(filters.fromDate || filters.toDate) && (
              <Chip
                label={`${filters.fromDate || 'Any'} → ${filters.toDate || 'Any'}`}
                onClear={() => { update('fromDate', ''); update('toDate', ''); }}
              />
            )}
            {(filters.fromTime || filters.toTime) && (
              <Chip
                label={`${filters.fromTime || 'Any'} – ${filters.toTime || 'Any'}`}
                onClear={() => { update('fromTime', ''); update('toTime', ''); }}
              />
            )}
            {filters.maxPrice && (
              <Chip label={`Under ₹${Number(filters.maxPrice).toLocaleString()}`} onClear={() => update('maxPrice', '')} />
            )}
            <button onClick={clearAll} className="text-sm text-brand font-semibold hover:underline ml-2">
              Clear all
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Always-visible filters */}
          <aside className={`lg:w-72 shrink-0 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="card p-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
              <h3 className="font-display font-semibold mb-4 flex items-center justify-between">
                <span>Filters</span>
                <button onClick={() => setFiltersOpen(false)} className="lg:hidden text-ink-muted">
                  <X size={18} />
                </button>
              </h3>

              <FilterBlock label="Search by name">
                <input
                  className="input"
                  placeholder="Cricket Box…"
                  value={filters.search}
                  onChange={(e) => update('search', e.target.value)}
                />
              </FilterBlock>

              {/* Price tier — pinned at top, dynamic from live catalogue */}
              <FilterBlock label="Price">
                <PriceTierFilter
                  priceMin={priceBounds.min}
                  priceMax={priceBounds.max}
                  value={filters.maxPrice}
                  onChange={(v) => update('maxPrice', v)}
                />
              </FilterBlock>

              <FilterBlock label="Date range">
                <div className="space-y-2">
                  <DatePicker
                    value={filters.fromDate}
                    onChange={(v) => update('fromDate', v)}
                    placeholder="From"
                  />
                  <DatePicker
                    value={filters.toDate}
                    min={filters.fromDate || undefined}
                    onChange={(v) => update('toDate', v)}
                    placeholder="To"
                  />
                </div>
              </FilterBlock>

              <FilterBlock label="Time">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time" className="input"
                    value={filters.fromTime}
                    onChange={(e) => update('fromTime', e.target.value)}
                  />
                  <input
                    type="time" className="input"
                    value={filters.toTime}
                    onChange={(e) => update('toTime', e.target.value)}
                  />
                </div>
              </FilterBlock>

              <FilterBlock label="Locations">
                <RadioList options={locations} value={filters.location} onChange={(v) => update('location', v)} />
              </FilterBlock>

              <FilterBlock label="Event type">
                <RadioList options={eventTypes} value={filters.eventType} onChange={(v) => update('eventType', v)} />
              </FilterBlock>
            </div>
          </aside>

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
                  >
                    <ListIcon size={14} /> List
                  </button>
                  <button
                    onClick={() => setView('grid')}
                    className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${
                      view === 'grid' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
                    }`}
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
            ) : events.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-ink-muted">No events match your filters yet.</p>
                {hasFilters && (
                  <button onClick={clearAll} className="btn-outline mt-4">Clear filters</button>
                )}
              </div>
            ) : view === 'grid' ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {events.map((e) => <EventCard key={e.id} event={e} variant="vertical" />)}
              </div>
            ) : (
              <div className="space-y-5">
                {events.map((e) => <EventCard key={e.id} event={e} />)}
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
