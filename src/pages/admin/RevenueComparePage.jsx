import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Loader2, ArrowLeft, GitCompare, Download, ArrowUpRight, ArrowDownRight, Minus, Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const compact = (n) => {
  n = Number(n || 0); const s = n < 0 ? '-' : ''; const a = Math.abs(n);
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)}k`;
  return `${s}₹${a}`;
};
const pad = (n) => String(n).padStart(2, '0');
const isod = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const diffPct = (a, b) => { a = Number(a) || 0; b = Number(b) || 0; if (!a) return b ? 100 : 0; return Math.round(((b - a) / a) * 1000) / 10; };

const rangeOf = (mode, custom) => {
  const now = new Date(); const end = isod(now);
  const back = (d) => isod(new Date(new Date().setDate(now.getDate() - d)));
  switch (mode) {
    case 'today': return { start: end, end };
    case '7d': return { start: back(7), end };
    case '30d': return { start: back(30), end };
    case '3m': return { start: back(90), end };
    case '6m': return { start: back(180), end };
    case '1y': return { start: back(365), end };
    case 'custom': return { start: custom.start, end: custom.end };
    default: return { start: back(90), end };
  }
};

const BLANK = { mode: '3m', custom: { start: '', end: '' }, city: '', category: '', experienceId: '', supplierId: '', bookingStatus: '' };

// Static class strings per side (Tailwind JIT can't see interpolated names).
const TONE = {
  a: { text: 'text-blue-600', borderT: 'border-blue-200', borderL: 'border-blue-400', bg: 'bg-blue-50', ring: 'ring-2 ring-blue-300', bar: 'bg-blue-500', dot: 'bg-blue-500' },
  b: { text: 'text-emerald-600', borderT: 'border-emerald-200', borderL: 'border-emerald-400', bg: 'bg-emerald-50', ring: 'ring-2 ring-emerald-300', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
};

export default function RevenueComparePage() {
  const now = new Date();
  const [A, setA] = useState({ ...BLANK, mode: '3m' });
  const [B, setB] = useState({ ...BLANK, mode: '6m' });
  const [uni, setUni] = useState({ cities: [], categories: [], experiences: [], suppliers: [] });
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [metric, setMetric] = useState('revenue');

  // Populate filter dropdowns once (universe over the last year).
  useEffect(() => {
    (async () => {
      try {
        const r = rangeOf('1y', {});
        const res = await api.get('/admin/analytics/revenue-analysis', { params: { start: r.start, end: r.end } });
        setUni(res.data?.data?.filters || { cities: [], categories: [], experiences: [], suppliers: [] });
      } catch { /* dropdowns just stay empty */ }
    })();
  }, []);

  const fetchSide = async (side) => {
    const r = rangeOf(side.mode, side.custom);
    const params = { start: r.start, end: r.end };
    ['city', 'category', 'experienceId', 'supplierId', 'bookingStatus'].forEach((k) => { if (side[k]) params[k] = side[k]; });
    const res = await api.get('/admin/analytics/revenue-analysis', { params });
    return res.data?.data || null;
  };

  const compare = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([fetchSide(A), fetchSide(B)]);
      setDataA(a); setDataB(b); setRan(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Comparison failed');
    } finally { setLoading(false); }
  }, [A, B]);

  // Quick presets set B relative to A's period.
  const presetB = (kind) => {
    const ra = rangeOf(A.mode, A.custom);
    const s = new Date(`${ra.start}T00:00:00`); const e = new Date(`${ra.end}T00:00:00`);
    const len = e - s;
    let ns; let ne;
    if (kind === 'prevPeriod') { ne = new Date(s.getTime() - 86400000); ns = new Date(ne.getTime() - len); }
    else if (kind === 'prevMonth') { ns = new Date(s); ns.setMonth(ns.getMonth() - 1); ne = new Date(e); ne.setMonth(ne.getMonth() - 1); }
    else { ns = new Date(s); ns.setFullYear(ns.getFullYear() - 1); ne = new Date(e); ne.setFullYear(ne.getFullYear() - 1); }
    setB((x) => ({ ...x, mode: 'custom', custom: { start: isod(ns), end: isod(ne) } }));
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link to="/admin/revenue/analysis" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand mb-1"><ArrowLeft size={15} /> Revenue Analysis</Link>
          <h1 className="text-2xl font-display font-bold">Revenue Comparison</h1>
          <p className="text-sm text-ink-muted">Compare any two selections side by side — periods, cities, categories, experiences or suppliers.</p>
        </div>
      </div>

      {/* Filter columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <FilterCol title="Compare A" tone="a" side={A} setSide={setA} uni={uni} />
        <FilterCol title="Compare B" tone="b" side={B} setSide={setB} uni={uni}
          presets={(
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-xs text-ink-muted self-center">Quick set B =</span>
              {[['prevPeriod', 'Previous period'], ['prevMonth', 'Previous month'], ['prevYear', 'Previous year']].map(([k, l]) => (
                <button key={k} onClick={() => presetB(k)} className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-ink-muted hover:text-ink">{l}</button>
              ))}
            </div>
          )} />
      </div>

      <div className="flex justify-center mb-6">
        <button onClick={compare} disabled={loading} className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-ink text-white font-bold hover:bg-ink/90 disabled:opacity-50">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <GitCompare size={18} />} Compare
        </button>
      </div>

      {ran && dataA && dataB && <Report A={dataA} B={dataB} metric={metric} setMetric={setMetric} />}
    </div>
  );
}

/* ── Filter column ─────────────────────────────────────────────────────── */
function FilterCol({ title, tone, side, setSide, uni, presets }) {
  const set = (k) => (e) => setSide((s) => ({ ...s, [k]: e.target.value }));
  const setCustom = (k) => (e) => setSide((s) => ({ ...s, custom: { ...s.custom, [k]: e.target.value } }));
  const T = TONE[tone];
  return (
    <div className={`bg-white rounded-2xl shadow-soft p-4 border-t-4 ${T.borderT}`}>
      <div className="flex items-center gap-2 mb-3"><span className={`w-2.5 h-2.5 rounded-full ${T.dot}`} /><h3 className="font-semibold text-ink">{title}</h3></div>
      {presets}
      <div className="grid grid-cols-2 gap-3">
        <Fld label="Period">
          <select className="input" value={side.mode} onChange={set('mode')}>
            <option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option>
            <option value="3m">Last 3 months</option><option value="6m">Last 6 months</option><option value="1y">Last 1 year</option>
            <option value="custom">Custom</option>
          </select>
        </Fld>
        {side.mode === 'custom' ? (
          <div className="grid grid-cols-2 gap-2">
            <Fld label="From"><input type="date" className="input" value={side.custom.start} onChange={setCustom('start')} /></Fld>
            <Fld label="To"><input type="date" className="input" value={side.custom.end} onChange={setCustom('end')} /></Fld>
          </div>
        ) : <div />}
        <Fld label="City"><Sel value={side.city} onChange={set('city')} opts={uni.cities} all="All cities" /></Fld>
        <Fld label="Category"><Sel value={side.category} onChange={set('category')} opts={uni.categories} all="All categories" /></Fld>
        <Fld label="Experience"><Sel value={side.experienceId} onChange={set('experienceId')} opts={(uni.experiences || []).map((e) => ({ v: e.id, l: e.name }))} all="All" obj /></Fld>
        <Fld label="Supplier"><Sel value={side.supplierId} onChange={set('supplierId')} opts={(uni.suppliers || []).map((e) => ({ v: e.id, l: e.name }))} all="All" obj /></Fld>
        <Fld label="Booking status">
          <select className="input" value={side.bookingStatus} onChange={set('bookingStatus')}>
            <option value="">All</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option><option value="refunded">Refunded</option><option value="pending_payment">Pending</option>
          </select>
        </Fld>
      </div>
    </div>
  );
}

/* ── The full comparison report ────────────────────────────────────────── */
function Report({ A, B, metric, setMetric }) {
  const ka = A.kpis; const kb = B.kpis;
  const costA = ka.totalRevenue - ka.grossProfit;
  const costB = kb.totalRevenue - kb.grossProfit;

  // Rule-based overall score (relative head-to-head across 4 dimensions).
  const scoreOf = (mine, other) => {
    const dim = (a, b) => (Math.max(a, b) > 0 ? Math.round((a / Math.max(a, b)) * 100) : 0);
    const rev = dim(mine.kpis.totalRevenue, other.kpis.totalRevenue);
    const prof = dim(mine.kpis.grossMarginPct, other.kpis.grossMarginPct);
    const bk = dim(mine.kpis.totalBookings, other.kpis.totalBookings);
    const ret = dim(mine.customers.repeatPct, other.customers.repeatPct);
    return { rev, prof, bk, ret, overall: Math.round((rev + prof + bk + ret) / 4) };
  };
  const sa = scoreOf(A, B); const sb = scoreOf(B, A);

  const summary = [
    ['Total Revenue', ka.totalRevenue, kb.totalRevenue, 'money'],
    ['Net Revenue', ka.netRevenue, kb.netRevenue, 'money'],
    ['Total Bookings', ka.totalBookings, kb.totalBookings, 'num'],
    ['Avg Booking Value', ka.avgBookingValue, kb.avgBookingValue, 'money'],
    ['Gross Profit', ka.grossProfit, kb.grossProfit, 'money'],
    ['Gross Margin', ka.grossMarginPct, kb.grossMarginPct, 'pct'],
    ['Participants', A.participants.total, B.participants.total, 'num'],
    ['Refunded', ka.refundedAmount, kb.refundedAmount, 'money', true],
  ];

  const insights = useMemo(() => buildInsights(A, B), [A, B]);

  const exportCsv = () => {
    const csv = ['Metric,Compare A,Compare B,Difference %']
      .concat(summary.map(([l, a, b]) => `"${l}",${a},${b},${diffPct(a, b)}`)).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const el = document.createElement('a'); el.href = URL.createObjectURL(blob); el.download = 'revenue-comparison.csv'; el.click();
  };

  // Trend aligned by step index (ranges may differ in length/interval).
  const trend = useMemo(() => {
    const n = Math.max(A.trend.length, B.trend.length);
    return Array.from({ length: n }, (_, i) => ({ label: `P${i + 1}`, A: A.trend[i]?.[metric] || 0, B: B.trend[i]?.[metric] || 0 }));
  }, [A, B, metric]);

  return (
    <div className="space-y-6">
      {/* Ranges */}
      <div className="grid grid-cols-2 gap-4">
        <RangeCard tone="a" d={A} />
        <RangeCard tone="b" d={B} />
      </div>

      {/* Overall score */}
      <Panel title="Overall performance" icon={Trophy}>
        <div className="grid grid-cols-2 gap-4">
          <ScoreCard tone="a" s={sa} win={sa.overall >= sb.overall} />
          <ScoreCard tone="b" s={sb} win={sb.overall > sa.overall} />
        </div>
        <p className="text-center text-sm mt-3 font-semibold">Overall winner: <span className={sb.overall > sa.overall ? 'text-emerald-600' : 'text-blue-600'}>{sb.overall > sa.overall ? 'Compare B' : 'Compare A'}</span> <span className="text-ink-muted font-normal">(rule-based score)</span></p>
      </Panel>

      {/* Key insights */}
      {insights.length > 0 && (
        <Panel title="Key insights">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {insights.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-ink"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand shrink-0" /> {s}</li>)}
          </ul>
        </Panel>
      )}

      {/* Performance summary */}
      <Panel title="Performance summary" right={<button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white shadow-soft text-sm font-semibold hover:text-brand"><Download size={14} /> Export</button>}>
        <CmpTable rows={summary} />
      </Panel>

      {/* Trend */}
      <Panel title="Revenue trend comparison" right={(
        <div className="flex gap-1">
          {['revenue', 'profit'].map((m) => <button key={m} onClick={() => setMetric(m)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${metric === m ? 'bg-ink text-white' : 'bg-slate-100 text-ink-muted'}`}>{m}</button>)}
        </div>
      )}>
        <div className="flex flex-wrap gap-6 text-sm mb-2">
          <span className="text-blue-600 font-semibold">A — {compact(A.kpis.totalRevenue)}</span>
          <span className="text-emerald-600 font-semibold">B — {compact(B.kpis.totalRevenue)}</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
            <Tooltip formatter={(v) => inr(v)} />
            <Legend />
            <Line type="monotone" dataKey="A" name="Compare A" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="B" name="Compare B" stroke="#22c55e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* Bookings + Revenue/Cost/Profit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Booking comparison">
          <CmpTable rows={[
            ['Total (started)', A.funnel.started, B.funnel.started, 'num'],
            ['Confirmed', A.statusCounts.confirmed + A.statusCounts.completed, B.statusCounts.confirmed + B.statusCounts.completed, 'num'],
            ['Cancelled', A.statusCounts.cancelled, B.statusCounts.cancelled, 'num', true],
            ['Refunded', A.statusCounts.refunded, B.statusCounts.refunded, 'num', true],
            ['Pending', A.statusCounts.pending, B.statusCounts.pending, 'num', true],
          ]} />
        </Panel>
        <Panel title="Revenue · cost · profit">
          <CmpTable rows={[
            ['Revenue', ka.totalRevenue, kb.totalRevenue, 'money'],
            ['Supplier cost (B2B)', costA, costB, 'money', true],
            ['Gross profit', ka.grossProfit, kb.grossProfit, 'money'],
            ['Margin', ka.grossMarginPct, kb.grossMarginPct, 'pct'],
          ]} />
        </Panel>
      </div>

      {/* Participants + Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Participants">
          <CmpTable rows={[
            ['Total participants', A.participants.total, B.participants.total, 'num'],
            ['Avg / booking', A.participants.avg, B.participants.avg, 'num'],
            ['Solo', A.participants.soloPct, B.participants.soloPct, 'pct'],
            ['Couple', A.participants.couplePct, B.participants.couplePct, 'pct'],
            ['Group', A.participants.groupPct, B.participants.groupPct, 'pct'],
          ]} />
        </Panel>
        <Panel title="Customer behaviour">
          <CmpTable rows={[
            ['New customers', A.customers.newCustomers, B.customers.newCustomers, 'num'],
            ['Repeat customers', A.customers.repeatCustomers, B.customers.repeatCustomers, 'num'],
            ['Repeat rate', A.customers.repeatPct, B.customers.repeatPct, 'pct'],
            ['Revenue / customer', A.customers.revenuePerCustomer, B.customers.revenuePerCustomer, 'money'],
          ]} />
        </Panel>
      </div>

      {/* Top experiences with rank change */}
      <Panel title="Top experience comparison">
        <TopExpCompare A={A.topExperiences} B={B.topExperiences} />
      </Panel>

      {/* Category + City */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Category comparison"><MergeTable a={A.categories} b={B.categories} label="Category" /></Panel>
        <Panel title="City comparison"><MergeTable a={A.cities} b={B.cities} label="City" /></Panel>
      </div>

      {/* Supplier */}
      <Panel title="Supplier comparison">
        <MergeTable
          a={A.suppliers.map((s) => ({ label: s.name, revenue: s.revenue, marginPct: s.marginPct }))}
          b={B.suppliers.map((s) => ({ label: s.name, revenue: s.revenue, marginPct: s.marginPct }))}
          label="Supplier" extraKey="marginPct" extraLabel="Margin" extraFmt="pct" />
      </Panel>

      {/* Cancellation + Abandoned */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Cancellation & refund">
          <CmpTable rows={[
            ['Cancelled', A.cancellation.cancelledCount, B.cancellation.cancelledCount, 'num', true],
            ['Cancellation rate', A.cancellation.cancellationRatePct, B.cancellation.cancellationRatePct, 'pct', true],
            ['Revenue lost', A.cancellation.revenueLost, B.cancellation.revenueLost, 'money', true],
            ['Refunded', A.cancellation.refunded, B.cancellation.refunded, 'money', true],
          ]} />
        </Panel>
        <Panel title="Abandoned & leakage">
          <CmpTable rows={[
            ['Booking started', A.funnel.started, B.funnel.started, 'num'],
            ['Payment attempted', A.funnel.paymentAttempted, B.funnel.paymentAttempted, 'num'],
            ['Confirmed', A.funnel.confirmed, B.funnel.confirmed, 'num'],
            ['Conversion', A.funnel.conversionPct, B.funnel.conversionPct, 'pct'],
            ['Abandoned', A.abandoned.count, B.abandoned.count, 'num', true],
            ['Potential lost', A.abandoned.potentialRevenue, B.abandoned.potentialRevenue, 'money', true],
          ]} />
        </Panel>
      </div>

      {/* Payment + Peak */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Payment performance">
          <CmpTable rows={[
            ['Successful', A.payments.successful.count, B.payments.successful.count, 'num'],
            ['Failed', A.payments.failed.count, B.payments.failed.count, 'num', true],
            ['Failure rate', A.payments.failureRatePct, B.payments.failureRatePct, 'pct', true],
            ['Pending', A.payments.pending.count, B.payments.pending.count, 'num', true],
          ]} />
        </Panel>
        <Panel title="Peak performance">
          <div className="grid grid-cols-2 gap-4">
            <PeakCard tone="a" p={A.peak} />
            <PeakCard tone="b" p={B.peak} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ── comparison building blocks ────────────────────────────────────────── */
function buildInsights(A, B) {
  const out = [];
  const rev = diffPct(A.kpis.totalRevenue, B.kpis.totalRevenue);
  out.push(`Revenue ${rev >= 0 ? 'increased' : 'decreased'} ${Math.abs(rev)}% from A to B.`);
  if (A.kpis.grossMarginPct !== B.kpis.grossMarginPct) out.push(`Gross margin ${B.kpis.grossMarginPct >= A.kpis.grossMarginPct ? 'improved' : 'dropped'} from ${A.kpis.grossMarginPct}% to ${B.kpis.grossMarginPct}%.`);
  const cr = diffPct(A.cancellation.cancellationRatePct, B.cancellation.cancellationRatePct);
  if (cr !== 0) out.push(`Cancellation rate ${cr < 0 ? 'decreased' : 'increased'} by ${Math.abs(cr)}%.`);
  if (A.customers.repeatPct !== B.customers.repeatPct) out.push(`Repeat customer rate moved from ${A.customers.repeatPct}% to ${B.customers.repeatPct}%.`);
  const topCatB = B.categories[0]; if (topCatB) out.push(`In B, ${topCatB.label} led categories with ${compact(topCatB.revenue)}.`);
  const downCity = B.cities.find((c) => c.growthPct != null && c.growthPct < -10);
  if (downCity) out.push(`${downCity.label} revenue is down ${Math.abs(downCity.growthPct)}% — needs attention.`);
  return out.slice(0, 6);
}

function CmpTable({ rows }) {
  const fmt = (v, t) => (t === 'money' ? compact(v) : t === 'pct' ? `${v}%` : Number(v).toLocaleString('en-IN'));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-slate-100">
          <th className="px-3 py-2 font-semibold">Metric</th>
          <th className="px-3 py-2 font-semibold text-right text-blue-600">Compare A</th>
          <th className="px-3 py-2 font-semibold text-right text-emerald-600">Compare B</th>
          <th className="px-3 py-2 font-semibold text-right">Difference</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map(([label, a, b, t, lowerBetter], i) => {
            const d = diffPct(a, b);
            const better = lowerBetter ? b < a : b > a;
            const bWins = b !== a && better;
            const aWins = b !== a && !better;
            return (
              <tr key={i} className="hover:bg-slate-50/70">
                <td className="px-3 py-2.5 text-ink">{label}</td>
                <td className={`px-3 py-2.5 text-right font-semibold ${aWins ? 'text-ink' : 'text-ink-muted'}`}>{fmt(a, t)}{aWins && <Better />}</td>
                <td className={`px-3 py-2.5 text-right font-semibold ${bWins ? 'text-ink' : 'text-ink-muted'}`}>{fmt(b, t)}{bWins && <Better />}</td>
                <td className="px-3 py-2.5 text-right"><DiffBadge v={d} lowerBetter={lowerBetter} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MergeTable({ a, b, label, extraKey, extraLabel, extraFmt }) {
  const m = new Map();
  (a || []).forEach((x) => m.set(x.label, { label: x.label, a: x.revenue, b: 0, ax: x[extraKey], bx: null }));
  (b || []).forEach((x) => { const e = m.get(x.label) || { label: x.label, a: 0, b: 0, ax: null, bx: null }; e.b = x.revenue; e.bx = x[extraKey]; m.set(x.label, e); });
  const rows = [...m.values()].sort((x, y) => (y.a + y.b) - (x.a + x.b)).slice(0, 12);
  if (rows.length === 0) return <p className="text-sm text-ink-muted py-4 text-center">No data.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-slate-100">
          <th className="px-3 py-2 font-semibold">{label}</th>
          <th className="px-3 py-2 font-semibold text-right text-blue-600">A</th>
          <th className="px-3 py-2 font-semibold text-right text-emerald-600">B</th>
          <th className="px-3 py-2 font-semibold text-right">Change</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50/70">
              <td className="px-3 py-2.5 text-ink">{r.label}{extraKey && (r.ax != null || r.bx != null) && <span className="text-xs text-ink-muted ml-1">({extraLabel} {r.ax ?? '–'}%→{r.bx ?? '–'}%)</span>}</td>
              <td className="px-3 py-2.5 text-right text-ink">{compact(r.a)}</td>
              <td className="px-3 py-2.5 text-right text-ink">{compact(r.b)}</td>
              <td className="px-3 py-2.5 text-right"><DiffBadge v={diffPct(r.a, r.b)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopExpCompare({ A, B }) {
  const rankA = new Map(A.map((e, i) => [e.id, i + 1]));
  const rankB = new Map(B.map((e, i) => [e.id, i + 1]));
  const a5 = A.slice(0, 5); const b5 = B.slice(0, 5);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[['Compare A', a5, 'text-blue-600', rankB], ['Compare B', b5, 'text-emerald-600', rankA]].map(([title, list, toneCls, otherRank], idx) => (
        <div key={idx}>
          <div className={`text-sm font-semibold mb-2 ${toneCls}`}>{title}</div>
          <ul className="divide-y divide-slate-50">
            {list.length === 0 ? <li className="text-sm text-ink-muted py-3">No data.</li> : list.map((e, i) => {
              const other = otherRank.get(e.id);
              const change = other ? other - (i + 1) : null; // positive = climbed
              return (
                <li key={e.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="w-5 text-center text-xs font-bold text-ink-muted">{i + 1}</span>
                  <span className="flex-1 truncate text-ink">{e.name}</span>
                  {change != null && change !== 0 && (
                    <span className={`text-[11px] font-semibold ${change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{change > 0 ? `↑${change}` : `↓${Math.abs(change)}`}</span>
                  )}
                  <span className="font-semibold text-ink w-16 text-right">{compact(e.revenue)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DiffBadge({ v, lowerBetter }) {
  if (v === 0) return <span className="inline-flex items-center gap-0.5 text-ink-muted text-xs font-semibold"><Minus size={12} /> 0%</span>;
  const up = v > 0;
  const good = lowerBetter ? !up : up;
  return <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${good ? 'text-emerald-600' : 'text-rose-600'}`}>{up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(v)}%</span>;
}
function Better() { return <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-brand/20 text-[10px] font-bold text-brand-dark align-middle">BEST</span>; }
function Fld({ label, children }) { return <label className="text-xs"><span className="block text-ink-muted mb-1">{label}</span>{children}</label>; }
function Sel({ value, onChange, opts = [], all, obj }) {
  return (
    <select className="input" value={value} onChange={onChange}>
      <option value="">{all}</option>
      {(opts || []).map((o) => (obj ? <option key={o.v} value={o.v}>{o.l}</option> : <option key={o} value={o}>{o}</option>))}
    </select>
  );
}
function Panel({ title, icon: Icon, right, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 font-semibold text-ink">{Icon && <Icon size={17} className="text-brand" />} {title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}
function RangeCard({ tone, d }) {
  const T = TONE[tone];
  return (
    <div className={`bg-white rounded-2xl shadow-soft p-4 border-l-4 ${T.borderL}`}>
      <div className={`text-xs font-bold ${T.text} mb-1`}>{tone === 'a' ? 'COMPARE A' : 'COMPARE B'}</div>
      <div className="text-sm text-ink-muted">{d.range.start} → {d.range.end}</div>
      <div className="text-2xl font-bold text-ink mt-1">{compact(d.kpis.totalRevenue)}</div>
    </div>
  );
}
function ScoreCard({ tone, s, win }) {
  const T = TONE[tone];
  return (
    <div className={`rounded-2xl p-4 ${win ? `${T.bg} ${T.ring}` : 'bg-slate-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold ${T.text}`}>{tone === 'a' ? 'COMPARE A' : 'COMPARE B'}</span>
        {win && <span className="px-2 py-0.5 rounded-full bg-brand/20 text-[10px] font-bold text-brand-dark">BEST PERFORMANCE</span>}
      </div>
      <div className="text-3xl font-bold text-ink">{s.overall}<span className="text-base text-ink-muted">/100</span></div>
      <div className="mt-2 space-y-1 text-xs">
        {[['Revenue growth', s.rev], ['Profitability', s.prof], ['Bookings', s.bk], ['Retention', s.ret]].map(([l, v]) => (
          <div key={l} className="flex items-center gap-2"><span className="w-24 text-ink-muted">{l}</span><div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full ${T.bar}`} style={{ width: `${v}%` }} /></div><span className="w-8 text-right text-ink">{v}</span></div>
        ))}
      </div>
    </div>
  );
}
function PeakCard({ tone, p }) {
  const T = TONE[tone];
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className={`text-xs font-bold ${T.text} mb-1`}>{tone === 'a' ? 'COMPARE A' : 'COMPARE B'}</div>
      {p.bestDay ? (
        <>
          <div className="text-lg font-bold text-ink">{p.bestDay.label}</div>
          <div className="text-xs text-ink-muted">Best weekday · {compact(p.bestDay.revenue)}</div>
          {p.bestDate && <div className="text-xs text-ink-muted mt-1">Top day {p.bestDate.date} · {compact(p.bestDate.revenue)}</div>}
        </>
      ) : <div className="text-sm text-ink-muted">No paid bookings.</div>}
    </div>
  );
}
