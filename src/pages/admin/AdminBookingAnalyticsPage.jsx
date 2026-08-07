import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Loader2, ArrowLeft, RotateCcw, Calendar, CheckCircle2, XCircle, TrendingDown, Users,
  Trophy, Layers, MapPin, Activity, CalendarClock, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { PERIOD_OPTIONS, rangeForPeriod } from '../../utils/datePresets.js';

const PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];
const STATUS_COLOR = { confirmed: '#3b82f6', completed: '#22c55e', pending: '#f59e0b', cancelled: '#ef4444', refunded: '#a855f7' };
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtB = (b) => { const p = b.split('-'); if (p.length === 2) return `${M[+p[1] - 1]} '${p[0].slice(2)}`; return `${+p[2]} ${M[+p[1] - 1]}`; };

export default function AdminBookingAnalyticsPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('3m');
  const [custom, setCustom] = useState({ start: '', end: '' });
  const [flt, setFlt] = useState({ city: '', category: '', experienceId: '', supplierId: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = mode === 'custom'
        ? { from: custom.start, to: custom.end }
        : rangeForPeriod(mode === '' ? 'last1y' : mode);
      const params = { start: r.from, end: r.to };
      Object.entries(flt).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/analytics/revenue-analysis', { params });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load analytics');
    } finally { setLoading(false); }
  }, [mode, custom.start, custom.end, flt]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setFlt((s) => ({ ...s, [k]: e.target.value }));
  const uni = data?.filters || {};
  const k = data?.kpis || {};
  const sc = data?.statusCounts || {};
  const confirmed = (sc.confirmed || 0) + (sc.completed || 0);
  const dirty = Object.values(flt).some(Boolean) || mode !== '3m';

  const statusData = useMemo(() => ([
    { name: 'Confirmed', key: 'confirmed', value: sc.confirmed || 0 },
    { name: 'Completed', key: 'completed', value: sc.completed || 0 },
    { name: 'Pending', key: 'pending', value: sc.pending || 0 },
    { name: 'Cancelled', key: 'cancelled', value: sc.cancelled || 0 },
    { name: 'Refunded', key: 'refunded', value: sc.refunded || 0 },
  ].filter((x) => x.value > 0)), [sc]);
  const statusTotal = statusData.reduce((s, x) => s + x.value, 0);
  const topByBookings = [...(data?.topExperiences || [])].sort((a, b) => b.bookings - a.bookings).slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-5">
        <Link to="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand mb-1"><ArrowLeft size={15} /> Bookings</Link>
        <h1 className="text-2xl font-display font-bold">Booking Analytics</h1>
        <p className="text-sm text-ink-muted">How bookings flow — volume over time, status mix, top activities, participants & funnel.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-4 mb-5 flex flex-wrap items-end gap-3">
        <Fld label="Period">
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            {PERIOD_OPTIONS.filter((o) => o.value !== '').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
        <Fld label="Activity"><Sel value={flt.experienceId} onChange={set('experienceId')} opts={(uni.experiences || []).map((e) => ({ v: e.id, l: e.name }))} all="All activities" obj /></Fld>
        <Fld label="Supplier"><Sel value={flt.supplierId} onChange={set('supplierId')} opts={(uni.suppliers || []).map((e) => ({ v: e.id, l: e.name }))} all="All suppliers" obj /></Fld>
        {dirty && <button onClick={() => { setMode('3m'); setFlt({ city: '', category: '', experienceId: '', supplierId: '' }); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-ink-muted hover:text-brand"><RotateCcw size={14} /> Reset</button>}
      </div>

      {loading || !data ? (
        <div className="bg-white rounded-2xl shadow-soft p-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Kpi icon={Calendar} label="Total bookings" value={num(k.totalBookings)} tint="bg-blue-50 text-blue-600" />
            <Kpi icon={CheckCircle2} label="Confirmed" value={num(confirmed)} tint="bg-emerald-50 text-emerald-600" />
            <Kpi icon={XCircle} label="Cancelled" value={num(sc.cancelled || 0)} tint="bg-rose-50 text-rose-600" />
            <Kpi icon={TrendingDown} label="Conversion" value={`${data.funnel.conversionPct}%`} tint="bg-amber-50 text-amber-600" />
            <Kpi icon={Users} label="Participants" value={num(data.participants.total)} tint="bg-violet-50 text-violet-600" />
            <Kpi icon={Users} label="Avg / booking" value={data.participants.avg} tint="bg-slate-100 text-slate-700" />
          </div>

          {/* Bookings over time + status donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel title="Bookings over time" icon={Activity} className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.trend.map((t) => ({ ...t, label: fmtB(t.bucket) }))} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="bk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip formatter={(v) => [`${v} bookings`, '']} labelStyle={{ fontWeight: 700 }} />
                  <Area type="monotone" dataKey="bookings" stroke="#3b82f6" fill="url(#bk)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Booking status" icon={Activity}>
              {statusTotal === 0 ? <Empty /> : (
                <div className="flex items-center gap-3">
                  <ResponsiveContainer width={130} height={160}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2}>
                        {statusData.map((x) => <Cell key={x.key} fill={STATUS_COLOR[x.key]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex-1 space-y-1.5">
                    {statusData.map((x) => (
                      <li key={x.key} className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[x.key] }} /><span className="flex-1 text-ink">{x.name}</span><span className="font-semibold text-ink">{x.value}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          </div>

          {/* Top activities + category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Most-booked activities" icon={Trophy}>
              {topByBookings.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-slate-50">
                  {topByBookings.map((e, i) => (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <span className="w-5 text-center text-sm font-bold text-ink-muted">{i + 1}</span>
                      <span className="flex-1 truncate text-sm font-medium text-ink">{e.name}</span>
                      <span className="text-sm font-bold text-ink">{e.bookings} bookings</span>
                      <button onClick={() => navigate(`/admin/b2b/${e.id}`)} className="text-ink-muted hover:text-brand"><ChevronRight size={16} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Bookings by category" icon={Layers}>
              {(data.categories || []).length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={Math.min(320, 40 + data.categories.length * 38)}>
                  <BarChart layout="vertical" data={data.categories.slice(0, 8)} margin={{ left: 10, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={(v) => [`${v} bookings`, '']} />
                    <Bar dataKey="bookings" radius={[0, 4, 4, 0]}>
                      {data.categories.slice(0, 8).map((c, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          {/* City + participants */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Bookings by city" icon={MapPin}>
              {(data.cities || []).length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={Math.min(320, 40 + data.cities.length * 38)}>
                  <BarChart layout="vertical" data={data.cities.slice(0, 8)} margin={{ left: 10, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v) => [`${v} bookings`, '']} />
                    <Bar dataKey="bookings" radius={[0, 4, 4, 0]}>
                      {data.cities.slice(0, 8).map((c, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
            <Panel title="Party size" icon={Users}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Mini label="Solo" value={`${data.participants.soloPct}%`} sub={`${data.participants.solo} bookings`} />
                <Mini label="Couple" value={`${data.participants.couplePct}%`} sub={`${data.participants.couple} bookings`} />
                <Mini label="Group" value={`${data.participants.groupPct}%`} sub={`${data.participants.group} bookings`} />
              </div>
              <div className="h-4 rounded-full overflow-hidden flex">
                <div style={{ width: `${data.participants.soloPct}%`, background: '#3b82f6' }} />
                <div style={{ width: `${data.participants.couplePct}%`, background: '#22c55e' }} />
                <div style={{ width: `${data.participants.groupPct}%`, background: '#f59e0b' }} />
              </div>
            </Panel>
          </div>

          {/* Funnel + peak */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Booking funnel" icon={TrendingDown}>
              {[['Bookings started', data.funnel.started], ['Payment attempted', data.funnel.paymentAttempted], ['Confirmed', data.funnel.confirmed]].map(([label, v], i) => {
                const maxv = Math.max(1, data.funnel.started);
                return (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs mb-1"><span className="text-ink font-medium">{label}</span><span className="text-ink-muted">{v}</span></div>
                    <div className="h-6 rounded-lg bg-slate-100 overflow-hidden"><div className="h-full rounded-lg bg-brand flex items-center justify-end pr-2 text-[11px] font-bold text-ink" style={{ width: `${Math.max(6, (v / maxv) * 100)}%` }}>{Math.round((v / maxv) * 100)}%</div></div>
                  </div>
                );
              })}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Mini label="Conversion" value={`${data.funnel.conversionPct}%`} />
                <Mini label="Abandoned" value={data.funnel.lostBookings} sub={`potential ${num(data.funnel.lostRevenue)}`} />
              </div>
            </Panel>
            <Panel title="Peak performance" icon={CalendarClock}>
              {data.peak.bestDay ? (
                <div className="grid grid-cols-1 gap-3">
                  <Mini label="Best weekday" value={data.peak.bestDay.label} sub={`₹${num(data.peak.bestDay.revenue)} revenue`} />
                  {data.peak.bestDate && <Mini label="Top single day" value={data.peak.bestDate.date} sub={`₹${num(data.peak.bestDate.revenue)} revenue`} />}
                </div>
              ) : <Empty label="No paid bookings in range." />}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Fld({ label, children }) { return <label className="text-xs"><span className="block text-ink-muted mb-1">{label}</span>{children}</label>; }
function Sel({ value, onChange, opts = [], all, obj }) {
  return (
    <select className="input min-w-[140px]" value={value} onChange={onChange}>
      <option value="">{all}</option>
      {(opts || []).map((o) => (obj ? <option key={o.v} value={o.v}>{o.l}</option> : <option key={o} value={o}>{o}</option>))}
    </select>
  );
}
function Kpi({ icon: Icon, label, value, tint }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs text-ink-muted">{label}</div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tint}`}><Icon size={16} /></div>
      </div>
      <div className="mt-1.5 text-2xl font-bold text-ink truncate">{value}</div>
    </div>
  );
}
function Panel({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-soft p-5 ${className}`}>
      <h2 className="flex items-center gap-2 font-semibold text-ink mb-4">{Icon && <Icon size={17} className="text-brand" />} {title}</h2>
      {children}
    </div>
  );
}
function Mini({ label, value, sub }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="text-[11px] text-ink-muted">{label}</div>
      <div className="text-lg font-bold text-ink">{value}</div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}
function Empty({ label = 'No data for the selected filters.' }) { return <p className="text-sm text-ink-muted py-6 text-center">{label}</p>; }
