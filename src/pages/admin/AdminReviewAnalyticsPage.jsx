import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  ArrowLeft, Star, MessageSquare, Award, Loader2, GitCompareArrows, RotateCcw, BarChart3, TrendingUp,
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
const BRAND = '#E0A92E';
const RANK_PALETTE = ['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatBucket = (bucket) => {
  if (/^\d{4}-\d{2}$/.test(bucket)) { const [y, m] = bucket.split('-'); return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`; }
  const [y, m, d] = bucket.split('-');
  return `${d} ${MONTHS[Number(m) - 1]}`;
};

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
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin/reviews" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand mb-1">
            <ArrowLeft size={14} /> Back to Review Management
          </Link>
          <h1 className="text-2xl font-display font-bold">Review &amp; Rating Analytics</h1>
          <p className="text-ink-muted text-sm">Ratings across every experience — filter, or compare two segments side by side.</p>
        </div>
        <button type="button" onClick={() => setCompareMode((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${compareMode ? 'bg-brand text-ink' : 'bg-ink text-white hover:bg-ink/90'}`}>
          <GitCompareArrows size={16} /> {compareMode ? 'Exit compare' : 'Compare'}
        </button>
      </div>

      {compareMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-soft p-5"><AnalyticsPanel title="Segment A" filters={filtersA} setFilters={setFiltersA} options={options} compact /></div>
          <div className="bg-white rounded-2xl shadow-soft p-5"><AnalyticsPanel title="Segment B" filters={filtersB} setFilters={setFiltersB} options={options} compact /></div>
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

  const total = data?.totalReviews ?? 0;
  const avg = data?.averageRating ?? 0;
  const trendData = (data?.trend || []).map((t) => ({ ...t, label: formatBucket(t.bucket) }));
  const topExperiences = data?.topExperiences || [];
  const fiveStarPct = total ? Math.round(((data.distribution?.[5] || 0) / total) * 100) : 0;

  const Filters = (
    <div className={compact ? 'grid grid-cols-2 gap-2' : 'bg-white rounded-2xl shadow-soft p-4 flex flex-wrap items-end gap-3'}>
      <Sel wide={compact} label={compact ? null : 'Category'} value={filters.categoryId} onChange={(v) => update('categoryId', v)} all="All categories" opts={options.categories} />
      <Sel wide={compact} label={compact ? null : 'Audience'} value={filters.audienceId} onChange={(v) => update('audienceId', v)} all="All audiences" opts={options.audiences} />
      <Sel span2={compact} label={compact ? null : 'Activity'} value={filters.experienceId} onChange={(v) => update('experienceId', v)} all="All activities" opts={options.experiences} />
      <label className="text-xs">{!compact && <span className="block text-ink-muted mb-1">Period</span>}
        <select value={filters.dateRange} onChange={(e) => update('dateRange', e.target.value)} className={`input ${compact ? 'col-span-2 w-full' : ''}`}>
          {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      {filters.dateRange === 'custom' && (
        <>
          <DatePicker value={filters.from} onChange={(iso) => update('from', iso)} placeholder="From" compact size="sm" ariaLabel="From" />
          <DatePicker value={filters.to} min={filters.from || undefined} onChange={(iso) => update('to', iso)} placeholder="To" compact size="sm" ariaLabel="To" />
        </>
      )}
      {hasFilters && (
        <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-brand self-center">
          <RotateCcw size={12} /> Clear
        </button>
      )}
    </div>
  );

  // ── Compare mode: compact stacked layout inside its card ─────────────────
  if (compact) {
    return (
      <>
        {title && <h2 className="font-display font-bold text-lg mb-3">{title}</h2>}
        <div className="mb-4">{Filters}</div>
        {loading ? <div className="py-16 text-center"><Loader2 className="animate-spin inline-block text-brand" /></div> : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Kpi icon={MessageSquare} label="Total reviews" value={total} tint="bg-blue-50 text-blue-600" />
              <Kpi icon={Star} label="Avg rating" value={avg.toFixed(2)} tint="bg-amber-50 text-amber-600" />
            </div>
            <Block title="Rating distribution"><StarBars distribution={data?.distribution} total={total} /></Block>
            <Block title="Reviews over time"><Trend data={trendData} height={150} /></Block>
            <Block title="Top-reviewed experiences" last><TopChart data={topExperiences} height={Math.max(120, topExperiences.length * 30)} compact /></Block>
          </>
        )}
      </>
    );
  }

  // ── Standalone: spacious dashboard ───────────────────────────────────────
  return (
    <div className="space-y-6">
      {Filters}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={MessageSquare} label="Total reviews" value={total} tint="bg-blue-50 text-blue-600" big />
            <RatingKpi avg={avg} />
            <Kpi icon={BarChart3} label="5-star reviews" value={data?.distribution?.[5] ?? 0} sub={total ? `${fiveStarPct}% of total` : ''} tint="bg-emerald-50 text-emerald-600" big />
            <Kpi icon={Award} label="Most-reviewed" value={data?.topExperience?.name || '—'} sub={data?.topExperience ? `${data.topExperience.reviewCount} reviews · ${data.topExperience.averageRating}★` : ''} tint="bg-rose-50 text-rose-600" small />
          </div>

          {/* Distribution + Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Rating distribution" icon={Star}>
              {total ? <StarBars distribution={data.distribution} total={total} /> : <EmptyChart />}
            </Panel>
            <Panel title="Reviews over time" icon={TrendingUp}>
              {trendData.length ? <Trend data={trendData} height={240} /> : <EmptyChart />}
            </Panel>
          </div>

          {/* Top experiences */}
          <Panel title="Top-reviewed experiences" icon={Award}>
            {topExperiences.length ? <TopChart data={topExperiences} height={Math.max(160, topExperiences.length * 40)} /> : <EmptyChart />}
          </Panel>
        </>
      )}
    </div>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */
function Sel({ label, value, onChange, all, opts = [], wide, span2 }) {
  return (
    <label className={`text-xs ${span2 ? 'col-span-2' : ''} ${wide ? 'w-full' : ''}`}>
      {label && <span className="block text-ink-muted mb-1">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input min-w-[150px]">
        <option value="">{all}</option>
        {(opts || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}
function Panel({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <h2 className="flex items-center gap-2 font-semibold text-ink mb-4">{Icon && <Icon size={17} className="text-brand" />} {title}</h2>
      {children}
    </div>
  );
}
function Block({ title, children, last }) {
  return (
    <div className={last ? '' : 'mb-5'}>
      <div className="text-xs font-semibold text-ink-muted mb-2 uppercase tracking-wide">{title}</div>
      {children}
    </div>
  );
}
function Kpi({ icon: Icon, label, value, sub, tint, big, small }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs text-ink-muted">{label}</div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tint}`}><Icon size={16} /></div>
      </div>
      <div className={`mt-1.5 font-bold text-ink truncate ${small ? 'text-base' : big ? 'text-2xl' : 'text-xl'}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
function RatingKpi({ avg }) {
  const full = Math.round(avg);
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs text-ink-muted">Average rating</div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-600"><Star size={16} /></div>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1"><span className="text-2xl font-bold text-ink">{avg.toFixed(2)}</span><span className="text-xs text-ink-muted">/ 5</span></div>
      <div className="flex gap-0.5 mt-1">
        {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} className={n <= full ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />)}
      </div>
    </div>
  );
}
function StarBars({ distribution, total }) {
  return (
    <div className="space-y-2.5">
      {[5, 4, 3, 2, 1].map((n) => {
        const count = distribution?.[n] || 0;
        const pctv = total ? (count / total) * 100 : 0;
        return (
          <div key={n} className="flex items-center gap-3">
            <div className="w-9 text-sm font-semibold text-ink flex items-center gap-0.5">{n}<Star size={12} className="text-amber-400 fill-amber-400" /></div>
            <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${pctv}%` }} /></div>
            <div className="w-20 text-right text-sm text-ink-muted whitespace-nowrap">{count} · {Math.round(pctv)}%</div>
          </div>
        );
      })}
    </div>
  );
}
function Trend({ data, height }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs><linearGradient id="rev-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={BRAND} stopOpacity={0.35} /><stop offset="100%" stopColor={BRAND} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip content={<TrendTooltip />} />
        <Area type="monotone" dataKey="count" stroke={BRAND} strokeWidth={2} fill="url(#rev-g)" dot={{ r: 2.5, fill: BRAND }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
function TopChart({ data, height, compact }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={compact ? 90 : 150} tickFormatter={(v) => (v.length > (compact ? 14 : 20) ? `${v.slice(0, compact ? 13 : 19)}…` : v)} />
        <Tooltip content={<TopExpTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="reviewCount" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((_, i) => <Cell key={i} fill={RANK_PALETTE[i % RANK_PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
function EmptyChart() {
  return <div className="h-28 flex items-center justify-center text-sm text-ink-muted">No reviews match these filters yet.</div>;
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
    <div className="bg-white rounded-lg shadow-card border border-gray-100 px-3 py-2 text-xs max-w-[220px]">
      <div className="font-bold text-ink mb-0.5 truncate">{d.name}</div>
      <div>{d.reviewCount} review{d.reviewCount === 1 ? '' : 's'} · {d.averageRating}★ avg</div>
    </div>
  );
}
