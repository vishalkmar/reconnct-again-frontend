import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  IndianRupee, TrendingUp, Users, Percent, Loader2, ArrowUpRight, ArrowDownRight, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Distinct, high-contrast palette. Index 0 = hottest-selling activity.
const PALETTE = [
  '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#14b8a6', '#8b5cf6', '#eab308', '#10b981', '#0ea5e9', '#d946ef', '#f43f5e',
  '#65a30d', '#0891b2', '#7c3aed', '#ca8a04', '#059669', '#2563eb', '#db2777', '#dc2626',
];
const OTHER_COLOR = '#cbd5e1';
const MAX_BARS = 20; // top-N activities get their own stack segment; rest = "Others"

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatBucket = (bucket, interval) => {
  if (interval === 'month') { const [y, m] = bucket.split('-'); return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`; }
  const [y, m, d] = bucket.split('-'); return `${d} ${MONTHS[Number(m) - 1]}'${y.slice(2)}`;
};

// Build {start,end,interval} for each filter mode.
const computeRange = (mode, { year, month, start, end }) => {
  const now = new Date();
  const back = (months) => ({ start: iso(new Date(new Date().setMonth(now.getMonth() - months))), end: iso(now) });
  switch (mode) {
    case 'last3': return { ...back(3), interval: 'week' };
    case 'last6': return { ...back(6), interval: 'week' };
    case 'last12': return { ...back(12), interval: 'month' };
    case 'thisMonth': return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now), interval: 'week' };
    case 'year': return { start: `${year}-01-01`, end: `${year}-12-31`, interval: 'month' };
    case 'month': {
      const last = new Date(year, month, 0).getDate();
      return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(last)}`, interval: 'week' };
    }
    case 'custom': return { start, end, interval: undefined };
    default: return { ...back(3), interval: 'week' };
  }
};

export default function RevenuePage() {
  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const [mode, setMode] = useState('last3');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [custom, setCustom] = useState({ start: iso(new Date(new Date().setMonth(now.getMonth() - 3))), end: iso(now) });
  const [city, setCity] = useState('');
  const [activityKey, setActivityKey] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = computeRange(mode, { year, month, start: custom.start, end: custom.end });
      const params = { start: r.start, end: r.end };
      if (r.interval) params.interval = r.interval;
      if (city) params.city = city;
      if (activityKey) params.activityKey = activityKey;
      const res = await api.get('/admin/analytics/revenue', { params });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [mode, year, month, custom.start, custom.end, city, activityKey]);

  useEffect(() => { load(); }, [load]);

  // key → name / colour maps (colour by hot-selling rank).
  const { keyName, keyColor, barKeys } = useMemo(() => {
    const kn = {}; const kc = {};
    (data?.activities || []).forEach((a) => { kn[a.key] = a.name; });
    const ranked = data?.ranked || [];
    ranked.forEach((a, i) => { kn[a.key] = a.name; kc[a.key] = PALETTE[i % PALETTE.length]; });
    const top = ranked.slice(0, MAX_BARS).map((a) => a.key);
    return { keyName: kn, keyColor: kc, barKeys: top };
  }, [data]);

  const interval = data?.range?.interval || 'week';

  // Shape series for recharts: one numeric field per top activity + "others".
  const revData = useMemo(() => {
    if (!data) return [];
    const topSet = new Set(barKeys);
    return data.series.map((s) => {
      const row = { label: formatBucket(s.bucket, interval), total: s.total, _items: s.items.map((it) => ({ ...it, name: keyName[it.key] || it.key })) };
      let others = 0;
      s.items.forEach((it) => { if (topSet.has(it.key)) row[it.key] = it.revenue; else others += it.revenue; });
      if (others > 0) row.__others = others;
      return row;
    });
  }, [data, barKeys, keyName, interval]);

  const abData = useMemo(() => {
    if (!data) return [];
    const topSet = new Set(barKeys);
    return data.abandoned.map((s) => {
      const row = { label: formatBucket(s.bucket, interval), total: s.total, _items: s.items.map((it) => ({ ...it, name: keyName[it.key] || it.key })) };
      let others = 0;
      s.items.forEach((it) => { if (topSet.has(it.key)) row[it.key] = it.count; else others += it.count; });
      if (others > 0) row.__others = others;
      return row;
    });
  }, [data, barKeys, keyName, interval]);

  const sm = data?.summary || {};

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1">Revenue management</h1>
        <p className="text-sm text-ink-muted">Which experiences earn, when, and where — with abandoned-booking insight.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-4 mb-5 flex flex-wrap items-end gap-3">
        <Field label="Period">
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="last3">Last 3 months</option>
            <option value="last6">Last 6 months</option>
            <option value="last12">Last 1 year</option>
            <option value="thisMonth">This month</option>
            <option value="year">Specific year</option>
            <option value="month">Specific month</option>
            <option value="custom">Custom range</option>
          </select>
        </Field>

        {(mode === 'year' || mode === 'month') && (
          <Field label="Year">
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        )}
        {mode === 'month' && (
          <Field label="Month">
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Field>
        )}
        {mode === 'custom' && (
          <>
            <Field label="From"><input type="date" className="input" value={custom.start} onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))} /></Field>
            <Field label="To"><input type="date" className="input" value={custom.end} onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))} /></Field>
          </>
        )}

        <Field label="City">
          <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {(data?.cities || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Activity">
          <select className="input min-w-[200px]" value={activityKey} onChange={(e) => setActivityKey(e.target.value)}>
            <option value="">All activities</option>
            {(data?.activities || []).map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
          </select>
        </Field>

        {(city || activityKey || mode !== 'last3') && (
          <button onClick={() => { setMode('last3'); setCity(''); setActivityKey(''); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-ink-muted hover:text-brand">
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={IndianRupee} label="Total Revenue" value={rupee(sm.totalRevenue)} sub={`Avg ${rupee(sm.avgPerBooking)} / booking`} delta={sm.delta?.totalRevenue} prev={sm.prev?.totalRevenue} />
        <SummaryCard icon={TrendingUp} label="Avg Revenue / Booking" value={rupee(sm.avgPerBooking)} sub={`${sm.bookingCount || 0} bookings`} delta={sm.delta?.avgPerBooking} prev={sm.prev?.avgPerBooking} />
        <SummaryCard icon={Percent} label="Gross Margin (ex-tax)" value={rupee(sm.grossMargin)} delta={sm.delta?.grossMargin} prev={sm.prev?.grossMargin} />
        <SummaryCard icon={Users} label="Avg Participants / Booking" value={(sm.avgParticipants || 0).toFixed(2)} delta={sm.delta?.avgParticipants} prev={sm.prev?.avgParticipants} money={false} />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : (
        <>
          {/* Revenue chart */}
          <ChartCard title={`Total revenue${data ? ` — ${rupee(sm.totalRevenue)}` : ''}`} subtitle={`Aggregated by ${interval}`}>
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={revData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip content={<RevenueTooltip keyColor={keyColor} interval={interval} />} />
                {barKeys.map((k) => <Bar key={k} dataKey={k} stackId="rev" fill={keyColor[k]} />)}
                <Bar dataKey="__others" stackId="rev" fill={OTHER_COLOR} />
                <Line type="monotone" dataKey="total" stroke="#1f2937" strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Abandoned chart */}
          <ChartCard title="Tried booking but didn't complete payment" subtitle="Count per period (abandoned / unpaid)">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={abData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<AbandonedTooltip keyColor={keyColor} interval={interval} />} />
                {barKeys.map((k) => <Bar key={k} dataKey={k} stackId="ab" fill={keyColor[k]} />)}
                <Bar dataKey="__others" stackId="ab" fill={OTHER_COLOR} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top performers table */}
          {data?.ranked?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-soft p-5 mt-5">
              <h2 className="font-semibold text-lg mb-3">Top performers</h2>
              <ul className="divide-y divide-slate-100">
                {data.ranked.map((a, i) => (
                  <li key={a.key} className="flex items-center gap-3 py-2.5">
                    <span className="w-6 text-center text-sm font-bold text-ink-muted">{i + 1}</span>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: keyColor[a.key] || OTHER_COLOR }} />
                    <span className="flex-1 text-sm font-medium text-ink truncate">{a.name}</span>
                    <span className="text-sm font-bold text-ink">{rupee(a.revenue)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="text-xs">
      <span className="block text-ink-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, delta, prev, money = true }) {
  const up = delta != null && delta >= 0;
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <div className="flex items-start justify-between">
        <div className="text-sm text-ink-muted">{label}</div>
        <Icon size={18} className="text-brand" />
      </div>
      <div className="mt-2 text-2xl font-bold text-ink">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta != null && (
          <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(delta)}%
          </span>
        )}
        {prev != null && <span className="text-ink-muted">prev {money ? rupee(prev) : Number(prev).toFixed(2)}</span>}
      </div>
      {sub && <div className="text-[11px] text-ink-muted mt-1">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 mt-5">
      <div className="mb-3">
        <h2 className="font-semibold text-lg">{title}</h2>
        {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function RevenueTooltip({ active, payload, keyColor, interval }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-card border border-gray-100 p-3 max-h-80 overflow-y-auto w-72">
      <div className="font-bold text-ink text-sm">{d.label}</div>
      <div className="text-xs text-ink-muted mb-2">Total revenue: {rupee(d.total)}</div>
      <ul className="space-y-1">
        {(d._items || []).map((it) => (
          <li key={it.key} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: keyColor[it.key] || '#cbd5e1' }} />
            <span className="flex-1 truncate" style={{ color: keyColor[it.key] || '#475569' }}>{it.name}</span>
            <span className="font-semibold text-ink">{rupee(it.revenue)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AbandonedTooltip({ active, payload, keyColor }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-card border border-gray-100 p-3 max-h-80 overflow-y-auto w-72">
      <div className="font-bold text-ink text-sm">{d.label}</div>
      <div className="text-xs text-ink-muted mb-2">Abandoned: {d.total}</div>
      <ul className="space-y-1">
        {(d._items || []).map((it) => (
          <li key={it.key} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: keyColor[it.key] || '#cbd5e1' }} />
            <span className="flex-1 truncate">{it.name}</span>
            <span className="font-semibold text-ink">{it.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
