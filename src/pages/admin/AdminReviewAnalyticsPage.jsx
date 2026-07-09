import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Star, MessageSquare, TrendingUp, Award, Loader2, GitCompareArrows, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DatePicker from '../../components/common/DatePicker.jsx';

const DATE_OPTIONS = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'month', label: 'This month' },
  { value: '3months', label: 'Last 3 months' },
  { value: '6months', label: 'Last 6 months' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

const EMPTY_FILTERS = { categoryId: '', audienceId: '', experienceId: '', dateRange: '', from: '', to: '' };

// This entire page sits behind the admin-authenticated route group
// (ProtectedRoute + /admin JWT check on every backend call) — no route here
// is reachable without a valid admin session.
export default function AdminReviewAnalyticsPage() {
  const [options, setOptions] = useState({ categories: [], audiences: [], experiences: [] });
  const [compareMode, setCompareMode] = useState(false);
  const [filtersA, setFiltersA] = useState(EMPTY_FILTERS);
  const [filtersB, setFiltersB] = useState(EMPTY_FILTERS);

  useEffect(() => {
    api.get('/admin/experience-reviews/filter-options')
      .then((res) => setOptions(res.data?.data || {}))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin/reviews" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand mb-2">
            <ArrowLeft size={14} /> Back to Review Management
          </Link>
          <h1 className="text-2xl font-display font-bold mb-1">Review &amp; Rating Analytics</h1>
          <p className="text-ink-muted text-sm">Stats across every experience review — filter, or compare two segments side by side.</p>
        </div>
        <button
          type="button"
          onClick={() => setCompareMode((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            compareMode ? 'bg-brand text-ink' : 'bg-ink text-white hover:bg-ink/90'
          }`}
        >
          <GitCompareArrows size={16} /> {compareMode ? 'Exit compare' : 'Compare'}
        </button>
      </div>

      {compareMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <AnalyticsPanel title="Segment A" filters={filtersA} setFilters={setFiltersA} options={options} />
          <AnalyticsPanel title="Segment B" filters={filtersB} setFilters={setFiltersB} options={options} />
        </div>
      ) : (
        <AnalyticsPanel filters={filtersA} setFilters={setFiltersA} options={options} />
      )}
    </div>
  );
}

function AnalyticsPanel({ title, filters, setFilters, options }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/experience-reviews/analytics', { params });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => setFilters((p) => ({ ...p, [key]: value }));
  const reset = () => setFilters(EMPTY_FILTERS);
  const hasFilters = Object.values(filters).some(Boolean);
  const dist = data?.distribution || {};
  const maxDist = Math.max(1, ...Object.values(dist));

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      {title && <h2 className="font-display font-bold text-lg mb-3">{title}</h2>}

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <select value={filters.categoryId} onChange={(e) => update('categoryId', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none">
          <option value="">All categories</option>
          {(options.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.audienceId} onChange={(e) => update('audienceId', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none">
          <option value="">Who is this for — all</option>
          {(options.audiences || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filters.experienceId} onChange={(e) => update('experienceId', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none col-span-2">
          <option value="">All activities</option>
          {(options.experiences || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filters.dateRange} onChange={(e) => update('dateRange', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-brand outline-none col-span-2">
          {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {filters.dateRange === 'custom' && (
          <>
            <DatePicker value={filters.from} onChange={(iso) => update('from', iso)} placeholder="From" compact size="sm" ariaLabel="From" />
            <DatePicker value={filters.to} min={filters.from || undefined} onChange={(iso) => update('to', iso)} placeholder="To" compact size="sm" ariaLabel="To" />
          </>
        )}
      </div>
      {hasFilters && (
        <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-brand mb-4">
          <RotateCcw size={12} /> Clear filters
        </button>
      )}

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="animate-spin inline-block text-brand" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard icon={MessageSquare} label="Total reviews" value={data?.totalReviews ?? 0} accent="bg-blue-50 text-blue-600" />
            <StatCard icon={Star} label="Average rating" value={(data?.averageRating ?? 0).toFixed(2)} accent="bg-amber-50 text-amber-600" />
            <StatCard icon={TrendingUp} label="Total ratings" value={data?.totalRatings ?? 0} accent="bg-emerald-50 text-emerald-600" />
            <StatCard icon={Award} label="Most-reviewed" value={data?.topExperience?.name || '—'} sub={data?.topExperience ? `${data.topExperience.reviewCount} reviews` : ''} accent="bg-rose-50 text-rose-600" small />
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-muted mb-2">Rating distribution</div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-ink-muted font-semibold">{n}★</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-alt overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${((dist[n] || 0) / maxDist) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-ink-muted">{dist[n] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent, small }) {
  return (
    <div className="bg-surface-alt/50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-ink-muted uppercase tracking-wide">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${accent}`}><Icon size={14} /></div>
      </div>
      <div className={`font-bold text-ink truncate ${small ? 'text-sm' : 'text-xl'}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}
