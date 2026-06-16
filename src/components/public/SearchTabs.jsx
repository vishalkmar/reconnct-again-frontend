import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Calendar, Search, X, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import DatePicker from '../common/DatePicker.jsx';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear + i);

/**
 * Search bar shown directly below the home-page hero. Two top-level tabs:
 *   - Location  — dropdown populated from the admin Locations module
 *   - Date      — toggle between specific start/end range or month/year
 *
 * Selections are written to URL query params:
 *   ?location=<slug>&dateMode=range&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *   ?location=<slug>&dateMode=month&year=YYYY&month=1..12
 *
 * HomePage reads these params to decide whether to show search results
 * (Hotels / Packages / Events tabs) or the default Featured Retreats view.
 */
export default function SearchTabs() {
  const [params, setParams] = useSearchParams();
  const [locations, setLocations] = useState([]);
  const [activeTab, setActiveTab] = useState(null); // 'location' | 'date' | null
  const rootRef = useRef(null);

  // Local form state, hydrated from URL params on mount
  const [locationSlug, setLocationSlug] = useState(params.get('location') || '');
  const [dateMode, setDateMode] = useState(params.get('dateMode') || 'range');
  const [startDate, setStartDate] = useState(params.get('startDate') || '');
  const [endDate, setEndDate] = useState(params.get('endDate') || '');
  const [year, setYear] = useState(params.get('year') || String(currentYear));
  const [month, setMonth] = useState(params.get('month') || '');

  // Fetch active locations
  useEffect(() => {
    api.get('/locations')
      .then((r) => setLocations(r.data.data.items || []))
      .catch(() => {});
  }, []);

  // Close active tab on outside click
  useEffect(() => {
    if (!activeTab) return undefined;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setActiveTab(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [activeTab]);

  const selectedLocation = locations.find((l) => l.slug === locationSlug);

  const dateSummary = () => {
    if (dateMode === 'range') {
      if (startDate && endDate) return `${formatShort(startDate)} → ${formatShort(endDate)}`;
      if (startDate) return `From ${formatShort(startDate)}`;
      return null;
    }
    if (year && month) return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
    if (year) return year;
    return null;
  };

  const apply = () => {
    const next = new URLSearchParams(params);
    if (locationSlug) next.set('location', locationSlug); else next.delete('location');
    next.set('dateMode', dateMode);
    if (dateMode === 'range') {
      if (startDate) next.set('startDate', startDate); else next.delete('startDate');
      if (endDate) next.set('endDate', endDate); else next.delete('endDate');
      next.delete('year'); next.delete('month');
    } else {
      if (year) next.set('year', year); else next.delete('year');
      if (month) next.set('month', month); else next.delete('month');
      next.delete('startDate'); next.delete('endDate');
    }
    setParams(next);
    setActiveTab(null);
  };

  const reset = () => {
    setLocationSlug(''); setDateMode('range');
    setStartDate(''); setEndDate('');
    setYear(String(currentYear)); setMonth('');
    const next = new URLSearchParams(params);
    ['location', 'dateMode', 'startDate', 'endDate', 'year', 'month'].forEach((k) => next.delete(k));
    setParams(next);
  };

  const hasAnyFilter = locationSlug || startDate || endDate || month;

  return (
    <section className="relative z-20 max-w-5xl mx-auto -mt-12 sm:-mt-16 px-4">
      <div
        ref={rootRef}
        className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-visible"
      >
        {/* Tabs */}
        <div className="grid grid-cols-2">
          <TabButton
            icon={MapPin}
            label="Location"
            value={selectedLocation?.name || 'Where to?'}
            active={activeTab === 'location'}
            onClick={() => setActiveTab(activeTab === 'location' ? null : 'location')}
          />
          <TabButton
            icon={Calendar}
            label="Date"
            value={dateSummary() || 'When?'}
            active={activeTab === 'date'}
            onClick={() => setActiveTab(activeTab === 'date' ? null : 'date')}
            borderLeft
          />
        </div>

        {/* Expanded content */}
        {activeTab === 'location' && (
          <div className="border-t px-5 py-4">
            {locations.length === 0 ? (
              <p className="text-sm text-ink-muted">No locations configured yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                {locations.map((l) => {
                  const active = locationSlug === l.slug;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { setLocationSlug(l.slug); setActiveTab('date'); }}
                      className={`text-left rounded-xl border px-3 py-2.5 hover:border-brand transition ${
                        active ? 'border-brand bg-brand/5' : 'border-slate-200'
                      }`}
                    >
                      <div className="text-sm font-medium leading-tight">{l.name}</div>
                      {l.country && <div className="text-[11px] text-ink-muted">{l.country}</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'date' && (
          <div className="border-t px-5 py-4">
            <div className="inline-flex bg-surface-alt rounded-lg p-1 text-sm mb-4">
              <button
                type="button"
                onClick={() => setDateMode('range')}
                className={`px-3 py-1.5 rounded-md ${
                  dateMode === 'range' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
                }`}
              >
                Specific dates
              </button>
              <button
                type="button"
                onClick={() => setDateMode('month')}
                className={`px-3 py-1.5 rounded-md ${
                  dateMode === 'month' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted hover:text-ink'
                }`}
              >
                Month / year
              </button>
            </div>

            {dateMode === 'range' ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">From</label>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Check-in / from"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">To</label>
                  <DatePicker
                    value={endDate}
                    min={startDate || undefined}
                    onChange={setEndDate}
                    placeholder="Check-out / to"
                  />
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Month</label>
                  <select
                    className="input"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    <option value="">Any month</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Year</label>
                  <select
                    className="input"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t bg-surface-alt/30 rounded-b-2xl">
          {hasAnyFilter ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
            >
              <X size={14} /> Reset
            </button>
          ) : <span className="text-xs text-ink-muted">Pick a location and a date to find your stay.</span>}
          <button
            type="button"
            onClick={apply}
            className="btn-primary"
          >
            <Search size={16} /> Search
          </button>
        </div>
      </div>
    </section>
  );
}

function TabButton({ icon: Icon, label, value, active, onClick, borderLeft }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-surface-alt/50 ${
        active ? 'bg-surface-alt/60' : ''
      } ${borderLeft ? 'border-l border-slate-200' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
          <Icon size={18} />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted font-semibold">{label}</div>
          <div className={`text-sm font-medium ${value === 'Where to?' || value === 'When?' ? 'text-ink-muted' : 'text-ink'}`}>
            {value}
          </div>
        </div>
      </div>
      <ChevronDown size={16} className={`text-ink-muted transition-transform ${active ? 'rotate-180' : ''}`} />
    </button>
  );
}

function formatShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
