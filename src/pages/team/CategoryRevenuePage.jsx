import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, ArrowLeft, TrendingUp, TrendingDown, IndianRupee, Ticket,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import api from '../../services/api';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const PERIODS = [['week', 'This week'], ['month', 'This month'], ['year', 'This year'], ['all', 'All time']];
const DAYFILTERS = [['all', 'All days'], ['weekend', 'Weekends'], ['weekday', 'Weekdays'], ['6', 'Saturdays'], ['0', 'Sundays']];

const startOf = (period, ref = new Date()) => {
  const d = new Date(ref); d.setHours(0, 0, 0, 0);
  if (period === 'week') { d.setDate(d.getDate() - d.getDay()); return d; }
  if (period === 'month') { d.setDate(1); return d; }
  if (period === 'year') { d.setMonth(0, 1); return d; }
  return new Date(0);
};
// The previous comparable window (last week / last month / last year).
const prevRange = (period, ref = new Date()) => {
  if (period === 'all') return null;
  const curStart = startOf(period, ref);
  const prevRef = new Date(curStart); prevRef.setDate(prevRef.getDate() - 1);
  return { from: startOf(period, prevRef), to: curStart };
};

const passesDay = (dow, f) => {
  if (f === 'all') return true;
  if (f === 'weekend') return dow === 0 || dow === 6;
  if (f === 'weekday') return dow >= 1 && dow <= 5;
  return dow === Number(f);
};

/*
  Revenue for the CM's categories — the same shape as the admin revenue board,
  scoped. One fetch returns the whole daily history; the period (week/month/
  year), the weekend/weekday/Sat/Sun filter and the "vs previous period"
  comparison are all computed here so switching views is instant.
*/
export default function CategoryRevenuePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [dayFilter, setDayFilter] = useState('all');
  const [compare, setCompare] = useState(false);

  useEffect(() => {
    api.get('/team/category/revenue')
      .then(({ data: d }) => setData(d?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const daily = data?.daily || [];

  const inRange = (rows, from, to) => rows.filter((r) => {
    const t = new Date(`${r.date}T00:00:00`).getTime();
    return t >= from.getTime() && (!to || t < to.getTime()) && passesDay(r.dow, dayFilter);
  });

  const cur = useMemo(() => inRange(daily, startOf(period), null), [daily, period, dayFilter]);
  const prev = useMemo(() => {
    const pr = prevRange(period);
    return pr ? inRange(daily, pr.from, pr.to) : [];
  }, [daily, period, dayFilter]);

  const sum = (rows, key) => rows.reduce((n, r) => n + (r[key] || 0), 0);
  const curRev = sum(cur, 'revenue'); const curBk = sum(cur, 'bookings');
  const prevRev = sum(prev, 'revenue'); const prevBk = sum(prev, 'bookings');
  const delta = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : (a > 0 ? 100 : 0));

  // Weekend vs weekday split (within the current period, ignoring the day filter).
  const periodAll = useMemo(() => {
    const s = startOf(period);
    return daily.filter((r) => new Date(`${r.date}T00:00:00`).getTime() >= s.getTime());
  }, [daily, period]);
  const weekendRev = periodAll.filter((r) => r.dow === 0 || r.dow === 6).reduce((n, r) => n + r.revenue, 0);
  const weekdayRev = periodAll.filter((r) => r.dow >= 1 && r.dow <= 5).reduce((n, r) => n + r.revenue, 0);
  const splitData = [{ name: 'Weekend', value: weekendRev }, { name: 'Weekday', value: weekdayRev }];

  // Chart series: revenue by day for the current period.
  const chartData = cur.map((r) => ({ date: r.date.slice(5), revenue: r.revenue }));

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  const topExp = data?.byExperience || [];

  return (
    <div className="max-w-5xl">
      <Link to="/team/category" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-3"><ArrowLeft size={16} /> Category Overview</Link>
      <h1 className="text-2xl font-display font-bold mb-1">Revenue</h1>
      <p className="text-sm text-ink-muted mb-4">Earnings and bookings across your categories — all-time {money(data?.totals?.revenue)} from {data?.totals?.bookings || 0} bookings.</p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 bg-white rounded-lg shadow-soft p-1">
          {PERIODS.map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${period === k ? 'bg-brand text-ink' : 'text-ink-muted hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-brand">
          {DAYFILTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {period !== 'all' && (
          <label className="inline-flex items-center gap-2 text-sm text-ink-muted cursor-pointer bg-white rounded-lg shadow-soft px-3 py-2">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="accent-[rgb(var(--brand))]" />
            Compare to previous
          </label>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard icon={IndianRupee} label="Revenue" value={money(curRev)}
          delta={compare && period !== 'all' ? delta(curRev, prevRev) : null} prevText={compare ? `prev ${money(prevRev)}` : null} />
        <StatCard icon={Ticket} label="Bookings" value={curBk}
          delta={compare && period !== 'all' ? delta(curBk, prevBk) : null} prevText={compare ? `prev ${prevBk}` : null} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-2xl shadow-soft p-4 lg:col-span-2">
          <div className="text-sm font-semibold text-ink mb-3">Revenue in this period {dayFilter !== 'all' ? `· ${DAYFILTERS.find((d) => d[0] === dayFilter)[1]}` : ''}</div>
          {chartData.length === 0 ? <div className="text-sm text-ink-muted py-16 text-center">No bookings in this window.</div> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ left: -8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="revenue" fill="#F9B402" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-soft p-4">
          <div className="text-sm font-semibold text-ink mb-1">Weekend vs weekday</div>
          <div className="text-[11px] text-ink-muted mb-2">Revenue this period</div>
          {(weekendRev + weekdayRev) === 0 ? <div className="text-sm text-ink-muted py-14 text-center">No data.</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={splitData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  <Cell fill="#7C3AED" /><Cell fill="#93C5FD" />
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> Weekend {money(weekendRev)}</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-300" /> Weekday {money(weekdayRev)}</span>
          </div>
        </div>
      </div>

      {/* Top experiences */}
      {topExp.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft p-4">
          <div className="text-sm font-semibold text-ink mb-3">Top earning listings (all time)</div>
          <ul className="divide-y divide-slate-100">
            {topExp.slice(0, 10).map((x) => (
              <li key={x.experienceId} className="flex items-center gap-2 py-2">
                <span className="flex-1 min-w-0 truncate text-sm text-ink">{x.name}</span>
                <span className="text-[11px] text-ink-muted">{x.bookings} bk</span>
                <span className="text-sm font-bold text-price">{money(x.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, delta, prevText }) {
  const up = delta != null && delta >= 0;
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex w-9 h-9 rounded-xl bg-brand/10 text-brand-dark items-center justify-center"><Icon size={18} /></span>
        {delta != null && (
          <span className={`text-xs font-semibold inline-flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-display font-bold text-ink mt-2">{value}</div>
      <div className="text-[11px] text-ink-muted">{label}{prevText ? ` · ${prevText}` : ''}</div>
    </div>
  );
}
