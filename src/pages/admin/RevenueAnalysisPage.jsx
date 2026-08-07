import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Loader2, ArrowLeft, RotateCcw, Download, Printer, IndianRupee, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Wallet, Percent, Users, Receipt, Undo2, AlertTriangle,
  Trophy, Target, Sparkles, Building2, MapPin, Layers, ChevronRight, GitCompare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const PALETTE = ['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6', '#8b5cf6', '#eab308'];

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const compact = (n) => {
  n = Number(n || 0);
  const s = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)}k`;
  return `${s}₹${a}`;
};
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtBucket = (b) => {
  const p = b.split('-');
  if (p.length === 2) { const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return `${M[+p[1] - 1]} '${p[0].slice(2)}`; }
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${+p[2]} ${M[+p[1] - 1]}`;
};

const rangeOf = (mode, custom) => {
  const now = new Date(); const end = iso(now);
  const back = (d) => iso(new Date(new Date().setDate(now.getDate() - d)));
  switch (mode) {
    case 'today': return { start: end, end };
    case 'yesterday': { const y = iso(new Date(new Date().setDate(now.getDate() - 1))); return { start: y, end: y }; }
    case '7d': return { start: back(7), end };
    case '30d': return { start: back(30), end };
    case '3m': return { start: back(90), end };
    case '6m': return { start: back(180), end };
    case '1y': return { start: back(365), end };
    case 'custom': return { start: custom.start, end: custom.end };
    default: return { start: back(90), end };
  }
};

export default function RevenueAnalysisPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [mode, setMode] = useState('3m');
  const [custom, setCustom] = useState({ start: iso(new Date(new Date().setMonth(now.getMonth() - 3))), end: iso(now) });
  const [interval, setInterval] = useState('week');
  const [flt, setFlt] = useState({ city: '', category: '', experienceId: '', supplierId: '', bookingStatus: '', paymentStatus: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marginSort, setMarginSort] = useState('profit');
  const [goal, setGoal] = useState(() => Number(localStorage.getItem('revGoal') || 0));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = rangeOf(mode, custom);
      const params = { start: r.start, end: r.end, interval };
      Object.entries(flt).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/analytics/revenue-analysis', { params });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load analysis');
    } finally { setLoading(false); }
  }, [mode, custom.start, custom.end, interval, flt]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setFlt((s) => ({ ...s, [k]: e.target.value }));
  const dirty = Object.values(flt).some(Boolean) || mode !== '3m';
  const k = data?.kpis || {};
  const uni = data?.filters || {};

  const exportCsv = () => {
    const rows = data?.table || [];
    if (!rows.length) { toast.error('Nothing to export'); return; }
    const head = ['Booking', 'Date', 'Experience', 'Supplier', 'City', 'Category', 'Guest', 'Guests', 'Status', 'B2B', 'B2C', 'Profit'];
    const csv = [head.join(',')].concat(rows.map((r) => [r.code, r.date, r.experience, r.supplier, r.city, r.category, r.guest, r.guests, r.status, r.b2b, r.b2c, r.profit]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `revenue-analysis-${data.range.start}_${data.range.end}.csv`; a.click();
  };

  const saveGoal = () => {
    const v = Number(prompt('Set this period’s revenue target (₹):', goal || '')) || 0;
    setGoal(v); localStorage.setItem('revGoal', String(v));
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <style>{`@media print { .no-print { display:none !important; } aside, header { display:none !important; } }`}</style>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link to="/admin/revenue" className="no-print inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand mb-1"><ArrowLeft size={15} /> Revenue overview</Link>
          <h1 className="text-2xl font-display font-bold">Revenue Analysis</h1>
          <p className="text-sm text-ink-muted">Why the numbers moved — trends, margins, funnel leakage, suppliers, cities & customers.</p>
        </div>
        <div className="no-print flex items-center gap-2">
          <Link to="/admin/revenue/compare" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-105"><GitCompare size={15} /> Compare</Link>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white shadow-soft text-sm font-semibold hover:text-brand"><Download size={15} /> Export CSV</button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink/90"><Printer size={15} /> Print / PDF</button>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print bg-white rounded-2xl shadow-soft p-4 mb-5 flex flex-wrap items-end gap-3">
        <Fld label="Period">
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="1y">Last 1 year</option>
            <option value="custom">Custom</option>
          </select>
        </Fld>
        {mode === 'custom' && (
          <>
            <Fld label="From"><input type="date" className="input" value={custom.start} onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))} /></Fld>
            <Fld label="To"><input type="date" className="input" value={custom.end} onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))} /></Fld>
          </>
        )}
        <Fld label="City"><Sel value={flt.city} onChange={set('city')} opts={uni.cities} all="All cities" /></Fld>
        <Fld label="Category"><Sel value={flt.category} onChange={set('category')} opts={uni.categories} all="All categories" /></Fld>
        <Fld label="Experience"><Sel value={flt.experienceId} onChange={set('experienceId')} opts={(uni.experiences || []).map((e) => ({ v: e.id, l: e.name }))} all="All experiences" obj /></Fld>
        <Fld label="Supplier"><Sel value={flt.supplierId} onChange={set('supplierId')} opts={(uni.suppliers || []).map((e) => ({ v: e.id, l: e.name }))} all="All suppliers" obj /></Fld>
        <Fld label="Booking status">
          <select className="input" value={flt.bookingStatus} onChange={set('bookingStatus')}>
            <option value="">All</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option><option value="refunded">Refunded</option><option value="pending_payment">Pending</option>
          </select>
        </Fld>
        <Fld label="Payment status">
          <select className="input" value={flt.paymentStatus} onChange={set('paymentStatus')}>
            <option value="">All</option><option value="paid">Paid</option><option value="pending">Pending</option>
            <option value="failed">Failed</option><option value="refunded">Refunded</option>
          </select>
        </Fld>
        {dirty && <button onClick={() => { setMode('3m'); setFlt({ city: '', category: '', experienceId: '', supplierId: '', bookingStatus: '', paymentStatus: '' }); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-ink-muted hover:text-brand"><RotateCcw size={14} /> Reset</button>}
      </div>

      {loading || !data ? (
        <div className="bg-white rounded-2xl shadow-soft p-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Kpi icon={IndianRupee} label="Total Revenue" value={compact(k.totalRevenue)} delta={k.delta?.totalRevenue} />
            <Kpi icon={Wallet} label="Net Revenue" value={compact(k.netRevenue)} delta={k.delta?.netRevenue} sub="after refunds" />
            <Kpi icon={TrendingUp} label="Gross Profit" value={compact(k.grossProfit)} delta={k.delta?.grossProfit} sub="B2C − B2B" accent />
            <Kpi icon={Percent} label="Gross Margin" value={`${k.grossMarginPct || 0}%`} delta={k.delta?.grossMarginPct} money={false} />
            <Kpi icon={Receipt} label="Avg Booking Value" value={compact(k.avgBookingValue)} delta={k.delta?.avgBookingValue} />
            <Kpi icon={Users} label="Total Bookings" value={k.totalBookings || 0} delta={k.delta?.totalBookings} money={false} />
            <Kpi icon={Undo2} label="Refunded" value={compact(k.refundedAmount)} delta={k.delta?.refundedAmount} invert />
            <Kpi icon={AlertTriangle} label="Pending Revenue" value={compact(k.pendingRevenue)} sub="not yet paid" money={false} />
          </div>

          {/* Insights */}
          {data.insights?.length > 0 && (
            <Panel title="Revenue insights" icon={Sparkles} className="mb-6">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.insights.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand shrink-0" /> {s}</li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Trend */}
          <Panel title="Revenue trend" icon={TrendingUp} className="mb-6"
            right={(
              <div className="no-print flex gap-1">
                {['day', 'week', 'month'].map((iv) => (
                  <button key={iv} onClick={() => setInterval(iv)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${interval === iv ? 'bg-ink text-white' : 'bg-slate-100 text-ink-muted'}`}>{iv}</button>
                ))}
              </div>
            )}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={data.trend.map((t) => ({ ...t, label: fmtBucket(t.bucket) }))} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="100%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip formatter={(v, n) => [inr(v), n]} />
                <Legend />
                <Area type="monotone" dataKey="prevRevenue" name="Prev period" stroke="#cbd5e1" fill="none" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#gRev)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" fill="url(#gProf)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          {/* Top experiences | Category donut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Panel title="Top performing experiences" icon={Trophy}>
              {data.topExperiences.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-slate-50">
                  {data.topExperiences.map((e, i) => (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <span className="w-6 text-center text-sm font-bold text-ink-muted">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink truncate">{e.name}</div>
                        <div className="text-xs text-ink-muted">{e.bookings} bookings · avg {compact(e.avg)} · margin {e.marginPct}%</div>
                      </div>
                      {e.growthPct != null && <DeltaChip v={e.growthPct} small />}
                      <div className="text-sm font-bold text-ink w-20 text-right">{compact(e.revenue)}</div>
                      <button onClick={() => navigate(`/admin/b2b/${e.id}`)} className="no-print text-ink-muted hover:text-brand"><ChevronRight size={16} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Revenue by category" icon={Layers}>
              {data.categories.length === 0 ? <Empty /> : (
                <div className="flex items-center gap-4 flex-wrap">
                  <ResponsiveContainer width={180} height={200}>
                    <PieChart>
                      <Pie data={data.categories} dataKey="revenue" nameKey="label" innerRadius={45} outerRadius={80} paddingAngle={2}>
                        {data.categories.map((c, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => inr(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex-1 min-w-[180px] space-y-1.5">
                    {data.categories.slice(0, 8).map((c, i) => (
                      <li key={c.label} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span className="flex-1 truncate text-ink">{c.label}</span>
                        <span className="font-semibold text-ink">{compact(c.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          </div>

          {/* Funnel | Abandoned */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Panel title="Booking funnel & leakage" icon={TrendingDown}>
              <Funnel f={data.funnel} />
            </Panel>
            <Panel title="Abandoned revenue" icon={AlertTriangle}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Mini label="Potential revenue" value={compact(data.abandoned.potentialRevenue)} />
                <Mini label="Abandoned" value={data.abandoned.count} />
                <Mini label="Avg lost" value={compact(data.abandoned.avgLost)} />
              </div>
              {data.abandoned.reasons.length === 0 ? <p className="text-sm text-ink-muted">No abandoned bookings in range.</p> : (
                <div className="space-y-2">
                  {data.abandoned.reasons.map((r, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-ink">{r.label}</span><span className="text-ink-muted">{r.count} · {r.pct}%</span></div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: PALETTE[i % PALETTE.length] }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Needs attention */}
          {data.lowExperiences.length > 0 && (
            <Panel title="Needs attention" icon={AlertTriangle} className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-slate-100">
                    <th className="px-3 py-2 font-semibold">Experience</th><th className="px-3 py-2 font-semibold">Flags</th>
                    <th className="px-3 py-2 font-semibold text-right">Revenue</th><th className="px-3 py-2 font-semibold text-right">Margin</th><th className="px-2 py-2" />
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.lowExperiences.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 font-medium text-ink">{e.name}</td>
                        <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{e.flags.map((f, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold">{f}</span>)}</div></td>
                        <td className="px-3 py-2.5 text-right text-ink">{compact(e.revenue)}</td>
                        <td className="px-3 py-2.5 text-right text-ink">{e.marginPct}%</td>
                        <td className="px-2 py-2.5 text-right"><button onClick={() => navigate(`/admin/b2b/${e.id}`)} className="no-print text-ink-muted hover:text-brand"><ChevronRight size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {/* Margin analysis */}
          <Panel title="Revenue vs profit (margin analysis)" icon={Percent} className="mb-6"
            right={(
              <div className="no-print flex gap-1">
                {[['profit', 'Highest profit'], ['revenue', 'Highest revenue'], ['marginPct', 'Highest margin']].map(([v, l]) => (
                  <button key={v} onClick={() => setMarginSort(v)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${marginSort === v ? 'bg-ink text-white' : 'bg-slate-100 text-ink-muted'}`}>{l}</button>
                ))}
              </div>
            )}>
            {data.marginAnalysis.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={Math.min(420, 60 + [...data.marginAnalysis].length * 34)}>
                <BarChart layout="vertical" data={[...data.marginAnalysis].sort((a, b) => b[marginSort] - a[marginSort]).slice(0, 10).map((e) => ({ ...e, label: e.name.length > 22 ? `${e.name.slice(0, 22)}…` : e.name }))} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={150} />
                  <Tooltip formatter={(v, n) => [inr(v), n]} />
                  <Legend />
                  <Bar dataKey="cost" name="Cost (B2B)" stackId="a" fill="#cbd5e1" />
                  <Bar dataKey="profit" name="Profit" stackId="a" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          {/* Suppliers | Cities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Panel title="Supplier performance" icon={Building2}>
              {data.suppliers.length === 0 ? <Empty /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-slate-100">
                      <th className="px-3 py-2 font-semibold">Supplier</th><th className="px-3 py-2 font-semibold text-right">Bookings</th>
                      <th className="px-3 py-2 font-semibold text-right">Revenue</th><th className="px-3 py-2 font-semibold text-right">Margin</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.suppliers.slice(0, 10).map((s) => (
                        <tr key={s.id || s.name} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5"><div className="font-medium text-ink">{s.name}</div><div className="text-xs text-ink-muted">{s.experiences} exp · cancel {s.cancelRate}%</div></td>
                          <td className="px-3 py-2.5 text-right text-ink">{s.bookings}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-ink">{compact(s.revenue)}</td>
                          <td className="px-3 py-2.5 text-right"><span className="text-emerald-600 font-semibold">{compact(s.margin)}</span> <span className="text-xs text-ink-muted">{s.marginPct}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
            <Panel title="Revenue by city" icon={MapPin}>
              {data.cities.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={Math.min(360, 40 + data.cities.length * 40)}>
                  <BarChart layout="vertical" data={data.cities.slice(0, 8)} margin={{ left: 10, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v) => inr(v)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      {data.cities.slice(0, 8).map((c, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          {/* Customers | Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Panel title="Customer revenue" icon={Users}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Mini label={`New customers (${data.customers.newCustomers})`} value={compact(data.customers.newRevenue)} />
                <Mini label={`Repeat customers (${data.customers.repeatCustomers})`} value={compact(data.customers.repeatRevenue)} />
                <Mini label="Repeat rate" value={`${data.customers.repeatPct}%`} />
                <Mini label="Revenue / customer" value={compact(data.customers.revenuePerCustomer)} />
              </div>
              {data.customers.top.length > 0 && (
                <ul className="divide-y divide-slate-50">
                  {data.customers.top.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 py-2 text-sm">
                      <span className="w-5 text-center text-xs font-bold text-ink-muted">{i + 1}</span>
                      <div className="min-w-0 flex-1"><div className="font-medium text-ink truncate">{c.name || '—'}</div><div className="text-xs text-ink-muted truncate">{c.email} · {c.bookings} booking{c.bookings > 1 ? 's' : ''}</div></div>
                      <span className="font-semibold text-ink">{compact(c.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Payment analysis" icon={Receipt}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Mini label="Successful" value={`${data.payments.successful.count}`} sub={compact(data.payments.successful.amount)} good />
                <Mini label="Failed" value={`${data.payments.failed.count}`} sub={`${data.payments.failureRatePct}% fail rate`} bad />
                <Mini label="Pending" value={`${data.payments.pending.count}`} sub={compact(data.payments.pending.amount)} />
                <Mini label="Refunds" value={`${data.payments.refunds.count}`} sub={compact(data.payments.refunds.amount)} />
              </div>
              {data.payments.methods.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-ink-muted">By method</div>
                  {data.payments.methods.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-sm"><span className="text-ink">{m.method}</span><span className="font-semibold text-ink">{compact(m.amount)}</span></div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Cancellation | Forecast + Goal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Panel title="Cancellation & refund impact" icon={Undo2}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Mini label="Revenue lost" value={compact(data.cancellation.revenueLost)} bad />
                <Mini label="Cancelled" value={data.cancellation.cancelledCount} />
                <Mini label="Refunded" value={compact(data.cancellation.refunded)} />
                <Mini label="Cancel rate" value={`${data.cancellation.cancellationRatePct}%`} />
              </div>
              {data.cancellation.topExperiences.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-ink-muted mb-1">Most cancelled</div>
                  {data.cancellation.topExperiences.map((e, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5"><span className="text-ink truncate">{e.name}</span><span className="text-ink-muted">{e.count}</span></div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Forecast & goal" icon={Target}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Mini label="Projected next 30d" value={compact(data.forecast.next30)} sub={`~${compact(data.forecast.dailyRate)}/day`} />
                <Mini label="This period revenue" value={compact(k.totalRevenue)} />
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-ink">Revenue goal</span>
                  <button onClick={saveGoal} className="no-print text-xs font-semibold text-brand hover:underline">{goal ? 'Edit' : 'Set target'}</button>
                </div>
                {goal > 0 ? (
                  <>
                    <div className="h-3 rounded-full bg-slate-200 overflow-hidden mb-2">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (k.totalRevenue / goal) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-ink-muted">
                      <span>{inr(k.totalRevenue)} / {inr(goal)}</span>
                      <span>{pct(k.totalRevenue, goal)}% · {inr(Math.max(0, goal - k.totalRevenue))} to go</span>
                    </div>
                  </>
                ) : <p className="text-xs text-ink-muted">Set a target to track progress for this period.</p>}
              </div>
            </Panel>
          </div>

          {/* Detailed table */}
          <Panel title={`Detailed bookings (${data.table.length})`} icon={Receipt}>
            {data.table.length === 0 ? <Empty /> : (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white"><tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-slate-100">
                    <th className="px-3 py-2 font-semibold">Booking</th><th className="px-3 py-2 font-semibold">Experience</th>
                    <th className="px-3 py-2 font-semibold">City</th><th className="px-3 py-2 font-semibold text-right">B2B</th>
                    <th className="px-3 py-2 font-semibold text-right">B2C</th><th className="px-3 py-2 font-semibold text-right">Profit</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.table.slice(0, 300).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2"><div className="font-medium text-ink">{r.code}</div><div className="text-xs text-ink-muted">{r.date}</div></td>
                        <td className="px-3 py-2 text-ink-muted"><div className="truncate max-w-[200px]">{r.experience}</div><div className="text-xs">{r.supplier}</div></td>
                        <td className="px-3 py-2 text-ink-muted">{r.city}</td>
                        <td className="px-3 py-2 text-right text-ink">{compact(r.b2b)}</td>
                        <td className="px-3 py-2 text-right text-ink">{compact(r.b2c)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-600">{compact(r.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.table.length > 300 && <p className="text-xs text-ink-muted text-center py-2">Showing first 300 — export CSV for the full list.</p>}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

function Fld({ label, children }) { return <label className="text-xs"><span className="block text-ink-muted mb-1">{label}</span>{children}</label>; }
function Sel({ value, onChange, opts = [], all, obj }) {
  return (
    <select className="input min-w-[140px]" value={value} onChange={onChange}>
      <option value="">{all}</option>
      {(opts || []).map((o) => (obj ? <option key={o.v} value={o.v}>{o.l}</option> : <option key={o} value={o}>{o}</option>))}
    </select>
  );
}
function Kpi({ icon: Icon, label, value, delta, sub, accent, money = true, invert }) {
  const up = delta != null && delta >= 0;
  const good = invert ? !up : up;
  return (
    <div className={`rounded-2xl shadow-soft p-4 ${accent ? 'bg-ink text-white' : 'bg-white'}`}>
      <div className="flex items-start justify-between">
        <div className={`text-xs ${accent ? 'text-white/70' : 'text-ink-muted'}`}>{label}</div>
        <Icon size={16} className="text-brand" />
      </div>
      <div className={`mt-1.5 text-xl font-bold ${accent ? 'text-white' : 'text-ink'}`}>{value}</div>
      <div className="mt-1 flex items-center gap-2 text-[11px]">
        {delta != null && <span className={`inline-flex items-center gap-0.5 font-semibold ${good ? 'text-emerald-500' : 'text-rose-500'}`}>{up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta)}%</span>}
        {sub && <span className={accent ? 'text-white/60' : 'text-ink-muted'}>{sub}</span>}
      </div>
    </div>
  );
}
function DeltaChip({ v, small }) {
  const up = v >= 0;
  return <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'} ${small ? 'text-[11px]' : 'text-xs'}`}>{up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(v)}%</span>;
}
function Panel({ title, icon: Icon, right, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-soft p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 font-semibold text-ink">{Icon && <Icon size={17} className="text-brand" />} {title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}
function Mini({ label, value, sub, good, bad }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="text-[11px] text-ink-muted">{label}</div>
      <div className={`text-lg font-bold ${good ? 'text-emerald-600' : bad ? 'text-rose-600' : 'text-ink'}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}
function Empty() { return <p className="text-sm text-ink-muted py-6 text-center">No data for the selected filters.</p>; }
function Funnel({ f }) {
  const steps = [
    { label: 'Bookings started', value: f.started },
    { label: 'Payment attempted', value: f.paymentAttempted },
    { label: 'Confirmed', value: f.confirmed },
  ];
  const max = Math.max(1, f.started);
  return (
    <div>
      <div className="space-y-2 mb-4">
        {steps.map((s, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1"><span className="text-ink font-medium">{s.label}</span><span className="text-ink-muted">{s.value}</span></div>
            <div className="h-6 rounded-lg bg-slate-100 overflow-hidden"><div className="h-full rounded-lg bg-brand flex items-center justify-end pr-2 text-[11px] font-bold text-ink" style={{ width: `${Math.max(6, (s.value / max) * 100)}%` }}>{Math.round((s.value / max) * 100)}%</div></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Mini label="Booking conversion" value={`${f.conversionPct}%`} good />
        <Mini label="Potential revenue lost" value={compact(f.lostRevenue)} sub={`${f.lostBookings} abandoned`} bad />
      </div>
    </div>
  );
}
