import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  ArrowLeft, Star, MessageSquare, Award, Loader2, GitCompareArrows, RotateCcw, BarChart3,
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

// Brand gold (single hue, magnitude encoding) + a fixed categorical order for
// "which experience" identity — same eight-hue set RevenuePage.jsx already
// uses, kept identical so the two admin analytics screens read as one system.
const BRAND = '#E0A92E';
const RANK_PALETTE = [
  '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatBucket = (bucket) => {
  if (/^\d{4}-\d{2}$/.test(bucket)) { const [y, m] = bucket.split('-'); return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`; }
  const [y, m, d] = bucket.split('-');
  return `${d} ${MONTHS[Number(m) - 1]}`;
};

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
          <AnalyticsPanel title="Segment A" filters={filtersA} setFilters={setFiltersA} options={options} compact />
          <AnalyticsPanel title="Segment B" filters={filtersB} setFilters={setFiltersB} options={options} compact />
        </div>
      ) : (
        <AnalyticsPanel filters={filtersA} setFilters={setFiltersA} options={options} />
      )}
    </div>
  );
}

function AnalyticsPanel({ title, filters, setFilters, options, compact = false }) {
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

  const distData = [5, 4, 3, 2, 1].map((n) => ({ star: `${n} ★`, count: data?.distribution?.[n] || 0 }));
  const trendData = (data?.trend || []).map((t) => ({ ...t, label: formatBucket(t.bucket) }));
  const topExperiences = data?.topExperiences || [];
  const chartH = compact ? 160 : 220;

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
          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard icon={MessageSquare} label="Total reviews" value={data?.totalReviews ?? 0} accent="bg-blue-50 text-blue-600" />
            <StatCard icon={Star} label="Average rating" value={(data?.averageRating ?? 0).toFixed(2)} accent="bg-amber-50 text-amber-600" />
            <StatCard icon={BarChart3} label="5-star reviews" value={data?.distribution?.[5] ?? 0} sub={data?.totalReviews ? `${Math.round(((data.distribution?.[5] || 0) / data.totalReviews) * 100)}% of total` : ''} accent="bg-emerald-50 text-emerald-600" />
            <StatCard icon={Award} label="Most-reviewed" value={data?.topExperience?.name || '—'} sub={data?.topExperience ? `${data.topExperience.reviewCount} reviews · ${data.topExperience.averageRating}★` : ''} accent="bg-rose-50 text-rose-600" small />
          </div>

          {/* Rating distribution — single-series magnitude, one hue */}
          <ChartBlock title="Rating distribution">
            {data?.totalReviews ? (
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={distData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="star" tick={{ fontSize: 12, fontWeight: 600 }} width={36} />
                  <Tooltip content={<SimpleTooltip suffix=" reviews" />} cursor={{ fill: 'rgba(224,169,46,0.08)' }} />
                  <Bar dataKey="count" fill={BRAND} radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartBlock>

          {/* Reviews over time — single-series trend */}
          <ChartBlock title="Reviews over time">
            {trendData.length ? (
              <ResponsiveContainer width="100%" height={chartH}>
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip content={<TrendTooltip />} />
                  <Line type="monotone" dataKey="count" stroke={BRAND} strokeWidth={2} dot={{ r: 3, fill: BRAND }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartBlock>

          {/* Top experiences — ranked, categorical identity by rank */}
          <ChartBlock title="Top-reviewed experiences" last>
            {topExperiences.length ? (
              <ResponsiveContainer width="100%" height={Math.max(120, topExperiences.length * (compact ? 30 : 34))}>
                <BarChart data={topExperiences} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={compact ? 90 : 130} tickFormatter={(v) => (v.length > (compact ? 14 : 18) ? `${v.slice(0, compact ? 13 : 17)}…` : v)} />
                  <Tooltip content={<TopExpTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="reviewCount" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {topExperiences.map((_, i) => <Cell key={i} fill={RANK_PALETTE[i % RANK_PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartBlock>
        </>
      )}
    </div>
  );
}

function ChartBlock({ title, children, last }) {
  return (
    <div className={last ? '' : 'mb-5'}>
      <div className="text-xs font-semibold text-ink-muted mb-2 uppercase tracking-wide">{title}</div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return <div className="h-24 flex items-center justify-center text-xs text-ink-muted">No reviews match these filters yet.</div>;
}

function SimpleTooltip({ active, payload, suffix = '' }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-card border border-gray-100 px-3 py-2 text-xs">
      <span className="font-bold text-ink">{d.star}</span> — {payload[0].value}{suffix}
    </div>
  );
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-card border border-gray-100 px-3 py-2 text-xs">
      <div className="font-bold text-ink mb-0.5">{d.label}</div>
      <div>{d.count} review{d.count === 1 ? '' : 's'}</div>
      {d.averageRating > 0 && <div className="text-ink-muted">Avg {d.averageRating}★</div>}
    </div>
  );
}

function TopExpTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-card border border-gray-100 px-3 py-2 text-xs max-w-[200px]">
      <div className="font-bold text-ink mb-0.5 truncate">{d.name}</div>
      <div>{d.reviewCount} review{d.reviewCount === 1 ? '' : 's'} · {d.averageRating}★ avg</div>
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
