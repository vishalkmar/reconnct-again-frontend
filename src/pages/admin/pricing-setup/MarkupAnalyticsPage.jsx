import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  ArrowLeft, Loader2, IndianRupee, TrendingUp, Users, Percent, ArrowUpRight, ArrowDownRight,
  Download, AlertTriangle, CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import PricingSetupShell from './PricingSetupShell.jsx';

/*
  Markup analysis — how much margin the Markup Management rules actually earned,
  over a date range, sliced by activity / category / audience / city / supplier.

  Every number here comes from PAID bookings only (confirmed + completed) and is
  bucketed by the date the money landed (paidAt, falling back to createdAt).

  Charting notes: markup is a MAGNITUDE measure, so every chart is single-hue —
  darker = bigger. No chart mixes two scales on two axes; the breakdowns are one
  measure each, with the rest of the row's numbers in the tooltip.
*/

// Single sequential hue (magnitude). Index 0 = biggest.
const HUE = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];
const shadeFor = (i, n) => HUE[Math.min(HUE.length - 1, Math.floor((i / Math.max(1, n)) * HUE.length))];
const TREND = '#0d9488';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const compact = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}k`;
  return `₹${v.toFixed(0)}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatBucket = (bucket, interval) => {
  if (interval === 'month') { const [y, m] = bucket.split('-'); return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`; }
  const [y, m, d] = bucket.split('-');
  return interval === 'day' ? `${d} ${MONTHS[Number(m) - 1]}` : `${d} ${MONTHS[Number(m) - 1]}'${y.slice(2)}`;
};

const RANGES = [
  { key: 'last30', label: 'Last 30 days' },
  { key: 'last3', label: 'Last 3 months' },
  { key: 'last6', label: 'Last 6 months' },
  { key: 'last12', label: 'Last 12 months' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

const computeRange = (mode, custom) => {
  const now = new Date();
  const back = (days) => ({ start: iso(new Date(new Date().setDate(now.getDate() - days))), end: iso(now) });
  const backM = (months) => ({ start: iso(new Date(new Date().setMonth(now.getMonth() - months))), end: iso(now) });
  switch (mode) {
    case 'last30': return back(30);
    case 'last6': return backM(6);
    case 'last12': return backM(12);
    case 'thisMonth': return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now) };
    case 'custom': return { start: custom.start, end: custom.end };
    default: return backM(3);
  }
};

export default function MarkupAnalyticsPage() {
  const now = new Date();
  const [mode, setMode] = useState('last3');
  const [custom, setCustom] = useState({
    start: iso(new Date(new Date().setMonth(now.getMonth() - 3))),
    end: iso(now),
  });
  // Named `grouping` rather than `interval` so the setter can't shadow window.setInterval.
  const [grouping, setGrouping] = useState('');
  const [f, setF] = useState({ categoryId: '', audienceId: '', experienceId: '', city: '', supplierId: '', markupType: '' });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = computeRange(mode, custom);
      const params = { start: r.start, end: r.end };
      if (grouping) params.interval = grouping;
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/pricing-setup/markup/analytics', { params });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.status === 404
        ? 'Markup analytics isn’t live on this server yet — deploy the backend carrying Markup Management.'
        : (err.response?.data?.message || 'Could not load markup analytics'));
    } finally { setLoading(false); }
  }, [mode, custom, grouping, f]);

  useEffect(() => { load(); }, [load]);

  const iv = data?.range?.interval || 'week';
  const trend = useMemo(() => (data?.series || []).map((s) => ({
    ...s, label: formatBucket(s.bucket, iv),
  })), [data, iv]);

  const setFilter = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const clearFilters = () => setF({ categoryId: '', audienceId: '', experienceId: '', city: '', supplierId: '', markupType: '' });
  const anyFilter = Object.values(f).some(Boolean);

  const exportCsv = () => {
    const rows = data?.bookings || [];
    if (!rows.length) return toast.error('Nothing to export');
    const head = ['Booking', 'Guest', 'Experience', 'City', 'Paid on', 'Guests', 'Markup/unit', 'Markup type', 'Markup earned', 'Supplier base', 'Customer paid'];
    const body = rows.map((b) => [
      b.code, b.guest, b.experience, b.city || '', new Date(b.date).toLocaleDateString('en-IN'),
      b.guests, b.markupPerUnit, b.markupType || '', b.markup, b.base, b.revenue,
    ]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `markup-${data.range.start}_${data.range.end}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PricingSetupShell
      title="Markup Analysis"
      subtitle="What the markup rules actually earned — paid bookings only, counted on the day the money landed."
    >
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Link to="/admin/pricing-setup/markup"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-ink-muted hover:text-brand">
          <ArrowLeft size={15} /> Back to rules
        </Link>
        <button onClick={exportCsv}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-ink-muted hover:text-brand">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-soft p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-1">Period</span>
            <div className="flex flex-wrap gap-1.5">
              {RANGES.map((r) => (
                <button key={r.key} onClick={() => setMode(r.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    mode === r.key ? 'bg-brand text-ink border-brand' : 'bg-white border-gray-200 text-ink-muted hover:text-brand'
                  }`}>{r.label}</button>
              ))}
            </div>
          </div>
          {mode === 'custom' && (
            <div className="flex items-end gap-2">
              <div>
                <span className="block text-[11px] text-ink-muted mb-1">From</span>
                <input type="date" className="input py-1.5 text-sm" value={custom.start} onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))} />
              </div>
              <div>
                <span className="block text-[11px] text-ink-muted mb-1">To</span>
                <input type="date" className="input py-1.5 text-sm" value={custom.end} onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))} />
              </div>
            </div>
          )}
          <div>
            <span className="block text-[11px] text-ink-muted mb-1">Group by</span>
            <select className="input py-1.5 text-sm w-32" value={grouping} onChange={(e) => setGrouping(e.target.value)}>
              <option value="">Auto</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t border-gray-100">
          <Select label="Broad category" value={f.categoryId} onChange={(v) => setFilter('categoryId', v)}
            options={(data?.filters?.categories || []).map((c) => ({ value: c.id, label: c.name }))} />
          <Select label="Who is this for" value={f.audienceId} onChange={(v) => setFilter('audienceId', v)}
            options={(data?.filters?.audiences || []).map((c) => ({ value: c.id, label: c.name }))} />
          <Select label="Activity" value={f.experienceId} onChange={(v) => setFilter('experienceId', v)}
            options={(data?.filters?.experiences || []).map((c) => ({ value: c.id, label: c.name }))} wide />
          <Select label="City" value={f.city} onChange={(v) => setFilter('city', v)}
            options={(data?.filters?.cities || []).map((c) => ({ value: c, label: c }))} />
          <Select label="Supplier" value={f.supplierId} onChange={(v) => setFilter('supplierId', v)}
            options={(data?.filters?.suppliers || []).map((c) => ({ value: c.id, label: c.name }))} />
          <Select label="Markup type" value={f.markupType} onChange={(v) => setFilter('markupType', v)}
            options={[{ value: 'percentage', label: 'Percentage %' }, { value: 'fixed', label: 'Flat ₹' }]} />
          {anyFilter && (
            <button onClick={clearFilters} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : !data ? (
        <div className="py-20 text-center text-sm text-ink-muted">No data.</div>
      ) : (
        <div className="space-y-5">
          {/* ── KPIs ───────────────────────────────────────────────────── */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Total markup earned" value={rupee(data.totals.markup)} icon={IndianRupee} delta={data.delta}
              sub={`vs ${rupee(data.previous.markup)} in the previous period`} hero />
            <Kpi label="Paid bookings" value={data.totals.bookings} icon={CalendarDays}
              sub={`${data.totals.guests} guests`} />
            <Kpi label="Avg markup / booking" value={rupee(data.totals.avgMarkupPerBooking)} icon={TrendingUp}
              sub={`${rupee(data.totals.avgMarkupPerGuest)} per guest`} />
            <Kpi label="Margin on supplier base" value={`${data.totals.marginOnBase}%`} icon={Percent}
              sub={`${data.totals.shareOfRevenue}% of what customers paid`} />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <MiniStat label="Supplier base (B2B)" value={rupee(data.totals.supplierBase)} />
            <MiniStat label="Customers paid (total)" value={rupee(data.totals.revenue)} />
            <MiniStat label="Markup rules in play" value={`${data.byType.filter((t) => t.key !== 'none').length} type(s)`} />
          </div>

          {data.totals.estimatedBookings > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                {data.totals.estimatedBookings} booking(s) predate per-booking markup snapshots, so their markup is
                estimated from the experience's current rule. Everything booked from now on is recorded exactly.
              </span>
            </div>
          )}

          {/* ── Trend ──────────────────────────────────────────────────── */}
          <Card title="Markup earned over time" note={`Grouped by ${iv}. Paid bookings only.`}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={62} />
                <Tooltip cursor={{ fill: '#0d948814' }} content={<TrendTip />} />
                <Bar dataKey="markup" fill={TREND} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* ── Breakdowns ─────────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-5">
            <RankCard title="Markup by activity" rows={data.byActivity} empty="No paid bookings in this period." />
            <RankCard title="Markup by broad category" rows={data.byCategory} empty="No categorised bookings yet." />
            <RankCard title="Markup by “Who is this for”" rows={data.byAudience} empty="No audience data yet." />
            <RankCard title="Markup by city" rows={data.byCity} empty="No city data yet." />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <RankCard title="Markup by supplier" rows={data.bySupplier} empty="No supplier-owned bookings yet." />
            <Card title="Markup by rule type" note="How the earnings split between percentage and flat markups.">
              <div className="divide-y divide-slate-100">
                {data.byType.map((t) => (
                  <div key={t.key} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-ink">{t.name}</span>
                    <span className="text-right">
                      <span className="font-bold text-ink">{rupee(t.markup)}</span>
                      <span className="block text-[11px] text-ink-muted">{t.bookings} booking(s)</span>
                    </span>
                  </div>
                ))}
                {data.byType.length === 0 && <p className="py-8 text-center text-sm text-ink-muted">Nothing yet.</p>}
              </div>
            </Card>
          </div>

          {/* ── Booking-level detail ───────────────────────────────────── */}
          <Card title="Booking-level markup" note={`${data.bookings.length} most recent paid booking(s) in this period.`}>
            <div className="overflow-x-auto max-h-[30rem]">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt/60 text-[11px] uppercase tracking-wide text-ink-muted sticky top-0">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2.5">Booking</th>
                    <th className="text-left font-semibold px-3 py-2.5">Experience</th>
                    <th className="text-left font-semibold px-3 py-2.5">Paid on</th>
                    <th className="text-right font-semibold px-3 py-2.5">Guests</th>
                    <th className="text-right font-semibold px-3 py-2.5">Markup/unit</th>
                    <th className="text-right font-semibold px-3 py-2.5">Markup earned</th>
                    <th className="text-right font-semibold px-3 py-2.5">Customer paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-ink">{b.code}</div>
                        <div className="text-[11px] text-ink-muted truncate max-w-[9rem]">{b.guest}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-ink truncate max-w-[14rem]">{b.experience}</div>
                        <div className="text-[11px] text-ink-muted">{b.city || '—'}</div>
                      </td>
                      <td className="px-3 py-2.5 text-ink-muted text-xs whitespace-nowrap">
                        {new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-muted">{b.guests}</td>
                      <td className="px-3 py-2.5 text-right text-ink-muted whitespace-nowrap">
                        {rupee(b.markupPerUnit)}
                        {b.estimated && <span className="ml-1 text-[10px] text-amber-600 font-semibold">est.</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-ink whitespace-nowrap">{rupee(b.markup)}</td>
                      <td className="px-3 py-2.5 text-right text-ink-muted whitespace-nowrap">{rupee(b.revenue)}</td>
                    </tr>
                  ))}
                  {data.bookings.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-ink-muted">No paid bookings in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </PricingSetupShell>
  );
}

// ─── Small pieces ───────────────────────────────────────────────────────────
function Select({ label, value, onChange, options, wide }) {
  return (
    <div>
      <span className="block text-[11px] text-ink-muted mb-1">{label}</span>
      <select className={`input py-1.5 text-sm ${wide ? 'w-56' : 'w-40'}`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, sub, delta, hero }) {
  const up = delta != null && delta >= 0;
  return (
    <div className={`bg-white rounded-2xl shadow-soft p-4 ${hero ? 'ring-1 ring-teal-500/20' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
        <Icon size={15} className="text-ink-muted" />
      </div>
      <div className={`font-bold text-ink ${hero ? 'text-3xl' : 'text-2xl'}`}>{value}</div>
      <div className="flex items-center gap-1.5 mt-1">
        {delta != null && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta)}%
          </span>
        )}
        {sub && <span className="text-[11px] text-ink-muted truncate">{sub}</span>}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft px-4 py-3">
      <div className="text-[11px] text-ink-muted">{label}</div>
      <div className="text-lg font-bold text-ink">{value}</div>
    </div>
  );
}

function Card({ title, note, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <div className="mb-3">
        <h3 className="font-semibold text-ink">{title}</h3>
        {note && <p className="text-xs text-ink-muted">{note}</p>}
      </div>
      {children}
    </div>
  );
}

// Horizontal ranking — one measure (markup), darkest = biggest.
function RankCard({ title, rows, empty }) {
  const top = (rows || []).slice(0, 10);
  const n = top.length;
  return (
    <Card title={title} note={rows?.length > 10 ? `Top 10 of ${rows.length}.` : undefined}>
      {n === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">{empty}</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, n * 34)}>
          <BarChart data={top} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
            <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#334155' }} tickLine={false} axisLine={false}
              tickFormatter={(v) => (String(v).length > 20 ? `${String(v).slice(0, 19)}…` : v)} />
            <Tooltip cursor={{ fill: '#0d948814' }} content={<RankTip />} />
            <Bar dataKey="markup" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {top.map((r, i) => <Cell key={r.key} fill={shadeFor(i, n)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function TrendTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-xs">
      <div className="font-bold text-ink mb-1">{label}</div>
      <Line k="Markup earned" v={rupee(d.markup)} strong />
      <Line k="Supplier base" v={rupee(d.base)} />
      <Line k="Customers paid" v={rupee(d.revenue)} />
      <Line k="Bookings" v={d.bookings} />
    </div>
  );
}

function RankTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-xs max-w-xs">
      <div className="font-bold text-ink mb-1 truncate">{d.name}</div>
      <Line k="Markup earned" v={rupee(d.markup)} strong />
      <Line k="Supplier base" v={rupee(d.base)} />
      <Line k="Customers paid" v={rupee(d.revenue)} />
      <Line k="Bookings" v={`${d.bookings} · ${d.guests} guests`} />
    </div>
  );
}

function Line({ k, v, strong }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-ink-muted">{k}</span>
      <span className={strong ? 'font-bold text-ink' : 'text-ink'}>{v}</span>
    </div>
  );
}
