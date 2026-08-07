import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Calendar, Wallet, CheckCircle2, XCircle, TrendingUp, IndianRupee, Clock3, Sparkles,
  Truck, Users as UsersIcon, Layers, Boxes, Plus, LineChart, ShieldCheck, ArrowUpRight,
  ArrowDownRight, ChevronRight, AlertTriangle, Trophy, Star, MessageCircle, Undo2,
  CalendarClock, Activity, Loader2,
} from 'lucide-react';
import api from '../../services/api';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const compact = (n) => {
  n = Number(n || 0); const s = n < 0 ? '-' : ''; const a = Math.abs(n);
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)}k`;
  return `${s}₹${a}`;
};
const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dLabel = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${+d} ${M[+m - 1]}`; };
const STATUS_COLOR = { confirmed: '#3b82f6', completed: '#22c55e', pending: '#f59e0b', cancelled: '#ef4444', refunded: '#a855f7' };

export default function DashboardPage() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [support, setSupport] = useState(0);

  useEffect(() => {
    let alive = true;
    api.get('/admin/dashboard').then((r) => { if (alive) setD(r.data?.data || null); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    api.get('/support/admin/unread').then((r) => { const u = r.data?.data || r.data?.unread || {}; if (alive) setSupport((u.user || 0) + (u.supplier || 0)); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1">Dashboard</h1>
        <p className="text-ink-muted text-sm">Your daily command center — what’s happening, what needs attention, what to do next.</p>
      </div>

      {loading || !d ? (
        <div className="bg-white rounded-2xl shadow-soft p-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : (
        <div className="space-y-6">
          {/* Counts strip (clickable) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CountPill icon={Truck} label="Suppliers" value={d.totals.suppliers} to="/admin/suppliers" tint="text-blue-600 bg-blue-50" />
            <CountPill icon={UsersIcon} label="Customers" value={d.totals.users} to="/admin/users" tint="text-emerald-600 bg-emerald-50" />
            <CountPill icon={Boxes} label="Experiences" value={d.totals.experiences} sub={`${d.totals.activeExperiences} live`} to="/admin/experiences/listed" tint="text-violet-600 bg-violet-50" />
            <CountPill icon={Layers} label="Categories" value={d.totals.categories} to="/admin/experience-setup" tint="text-amber-600 bg-amber-50" />
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={IndianRupee} label="Revenue (this month)" value={compact(d.kpis.revenue.value)} delta={d.kpis.revenue.delta} />
            <Kpi icon={Calendar} label="Bookings" value={d.kpis.bookings.value} delta={d.kpis.bookings.delta} abs={d.kpis.bookings.abs} money={false} />
            <Kpi icon={CheckCircle2} label="Paid bookings" value={d.kpis.paid.value} delta={d.kpis.paid.delta} money={false} />
            <Kpi icon={XCircle} label="Cancellations" value={d.kpis.cancellations.value} delta={d.kpis.cancellations.delta} money={false} invert />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <QuickAction to="/admin/bookings" icon={Calendar} label="All Bookings" tint="bg-blue-50 text-blue-600" />
            <QuickAction to="/admin/transactions" icon={Wallet} label="Transactions" tint="bg-amber-50 text-amber-600" />
            <QuickAction to="/admin/experiences/new" icon={Plus} label="Add Experience" tint="bg-emerald-50 text-emerald-600" />
            <QuickAction to="/admin/suppliers" icon={Truck} label="Manage Suppliers" tint="bg-violet-50 text-violet-600" />
            <QuickAction to="/admin/revenue/analysis" icon={LineChart} label="Revenue Analysis" tint="bg-rose-50 text-rose-600" />
            <QuickAction to="/admin/b2b" icon={ShieldCheck} label="B2B Management" tint="bg-slate-100 text-slate-700" />
          </div>

          {/* Revenue snapshot (65) | Booking status (35) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel title="Revenue snapshot" icon={TrendingUp} className="lg:col-span-2" right={<Link to="/admin/revenue/analysis" className="text-sm font-semibold text-brand hover:underline">View details →</Link>}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Mini label="This month" value={compact(d.revenueSnapshot.thisMonth)} />
                <Mini label="Gross profit" value={compact(d.revenueSnapshot.grossProfit)} good />
                <Mini label="Avg booking" value={compact(d.revenueSnapshot.avgBooking)} />
                <Mini label="Refunds" value={compact(d.revenueSnapshot.refunds)} />
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={d.revenueSnapshot.series.map((x) => ({ ...x, label: dLabel(x.date) }))} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="dRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
                  <Tooltip formatter={(v) => inr(v)} labelFormatter={() => ''} />
                  <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="url(#dRev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="text-[11px] text-ink-muted text-center">Last 30 days</div>
            </Panel>

            <Panel title="Booking status" icon={Activity}>
              <StatusDonut status={d.bookingStatus} />
            </Panel>
          </div>

          {/* Recent bookings (65) | Pending actions (35) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel title="Recent bookings" icon={Calendar} className="lg:col-span-2" right={<Link to="/admin/bookings" className="text-sm font-semibold text-brand hover:underline">View all →</Link>}>
              {d.recentBookings.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-slate-50">
                  {d.recentBookings.map((b) => (
                    <li key={b.code} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-ink truncate">{b.name}</div>
                        <div className="text-xs text-ink-muted truncate"><span className="font-mono">{b.code}</span> · {b.guest} · {dLabel(b.date)} · {b.participants} pax</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-ink">{compact(b.amount)}</div>
                        <StatusBadge s={b.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Needs your attention" icon={AlertTriangle}>
              {d.pendingActions.length === 0 ? <p className="text-sm text-ink-muted py-6 text-center">All clear — nothing pending 🎉</p> : (
                <ul className="space-y-2">
                  {d.pendingActions.map((a) => (
                    <li key={a.key}>
                      <Link to={a.to} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                        <span className="text-sm text-ink">{a.label}</span>
                        <span className="inline-flex items-center gap-1"><span className="min-w-[24px] h-6 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">{a.count}</span><ChevronRight size={15} className="text-ink-muted" /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* Upcoming (50) | Today's ops (50) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Upcoming experiences" icon={CalendarClock}>
              {d.upcoming.length === 0 ? <Empty label="No upcoming dated bookings." /> : (
                <ul className="divide-y divide-slate-50">
                  {d.upcoming.map((u, i) => (
                    <li key={i} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-ink truncate">{u.name}</div>
                        <div className="text-xs text-ink-muted">{dLabel(u.date)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-ink">{u.booked}{u.capacity ? ` / ${u.capacity}` : ''}</div>
                        {u.fillPct != null && <div className={`text-[11px] font-semibold ${u.fillPct >= 100 ? 'text-rose-600' : u.fillPct >= 80 ? 'text-amber-600' : 'text-ink-muted'}`}>{u.fillPct >= 100 ? 'SOLD OUT' : `${u.fillPct}% full`}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Today’s operations" icon={Clock3}>
              <div className="grid grid-cols-2 gap-3">
                <Mini label="Experiences today" value={d.todayOps.experiencesToday} />
                <Mini label="Participants expected" value={d.todayOps.participantsToday} />
                <Mini label="Pending confirmations" value={d.todayOps.pendingConfirmations} bad={d.todayOps.pendingConfirmations > 0} />
                <Mini label="Pending payments" value={d.todayOps.pendingPayments} bad={d.todayOps.pendingPayments > 0} />
              </div>
              {d.capacity.items.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-ink-muted mb-2">Capacity watch</div>
                  {d.capacity.items.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1"><span className="text-ink truncate">{c.name} · {dLabel(c.date)}</span><span className={`font-semibold ${c.label === 'SOLD OUT' ? 'text-rose-600' : 'text-amber-600'}`}>{c.label}</span></div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Top (50) | Needs attention experiences (50) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Top performing experiences" icon={Trophy}>
              {d.topExperiences.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-slate-50">
                  {d.topExperiences.map((e, i) => (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <span className="w-5 text-center text-sm font-bold text-ink-muted">{i + 1}</span>
                      <div className="min-w-0 flex-1"><div className="text-sm font-medium text-ink truncate">{e.name}</div><div className="text-xs text-ink-muted">{e.bookings} bookings</div></div>
                      <span className="font-bold text-ink">{compact(e.revenue)}</span>
                      <Link to={`/admin/b2b/${e.id}`} className="text-ink-muted hover:text-brand"><ChevronRight size={16} /></Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Needs attention" icon={AlertTriangle}>
              {d.lowExperiences.length === 0 ? <p className="text-sm text-ink-muted py-6 text-center">Every live experience booked recently 👍</p> : (
                <ul className="divide-y divide-slate-50">
                  {d.lowExperiences.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1"><div className="text-sm font-medium text-ink truncate">{e.name}</div><div className="text-xs text-rose-600">{e.reason}</div></div>
                      <Link to={`/admin/b2b/${e.id}`} className="text-ink-muted hover:text-brand"><ChevronRight size={16} /></Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* Payments | Customers | Suppliers | Reviews */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Panel title="Payments" icon={Wallet}>
              <SmallKV k="Collected" v={compact(d.payments.collected)} good />
              <SmallKV k="Pending" v={compact(d.payments.pending)} />
              <SmallKV k="Refunded" v={compact(d.payments.refunded)} />
              <SmallKV k="Failed" v={d.payments.failed} bad={d.payments.failed > 0} />
              <Link to="/admin/transactions" className="text-xs font-semibold text-brand hover:underline mt-2 inline-block">View transactions →</Link>
            </Panel>
            <Panel title="Customers" icon={UsersIcon}>
              <SmallKV k="Total" v={d.customers.total} />
              <SmallKV k="New this month" v={d.customers.newThisMonth} good />
              <SmallKV k="Repeat" v={d.customers.repeat} />
              <SmallKV k="Repeat rate" v={`${d.customers.repeatRate}%`} />
              <Link to="/admin/users" className="text-xs font-semibold text-brand hover:underline mt-2 inline-block">View customers →</Link>
            </Panel>
            <Panel title="Suppliers" icon={Truck}>
              <SmallKV k="Active" v={d.supplierOverview.active} />
              <SmallKV k="Pending contracts" v={d.supplierOverview.pendingContracts} />
              <SmallKV k="Live exp. w/o supplier" v={d.supplierOverview.experiencesWithoutSupplier} bad={d.supplierOverview.experiencesWithoutSupplier > 0} />
              <Link to="/admin/suppliers" className="text-xs font-semibold text-brand hover:underline mt-2 inline-block">Manage suppliers →</Link>
            </Panel>
            <Panel title="Reviews" icon={Star}>
              <SmallKV k="Avg rating" v={`${d.reviews.avgRating} / 5`} good />
              <SmallKV k="Total" v={d.reviews.total} />
              <SmallKV k="New this month" v={d.reviews.newThisMonth} />
              <SmallKV k="Pending approval" v={d.reviews.pendingApproval} bad={d.reviews.pendingApproval > 0} />
              <Link to="/admin/reviews" className="text-xs font-semibold text-brand hover:underline mt-2 inline-block">Manage reviews →</Link>
            </Panel>
          </div>

          {/* Leakage | Support */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Revenue leakage" icon={Undo2}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-rose-600">{compact(d.abandoned.potentialRevenue)}</div>
                  <div className="text-sm text-ink-muted">{d.abandoned.count} abandoned bookings (30d)</div>
                </div>
                <Link to="/admin/revenue/analysis" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink/90">View analysis</Link>
              </div>
            </Panel>
            <Panel title="Support" icon={MessageCircle}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-ink">{support}</div>
                  <div className="text-sm text-ink-muted">unread messages</div>
                </div>
                <Link to="/admin/chat-support" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink/90">Open support</Link>
              </div>
            </Panel>
          </div>

          {/* Alerts */}
          {d.alerts.length > 0 && (
            <Panel title="Important alerts" icon={Sparkles}>
              <ul className="space-y-2">
                {d.alerts.map((a, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${a.severity === 'critical' ? 'bg-rose-100 text-rose-700' : a.severity === 'attention' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{a.severity}</span>
                    <span className="text-ink">{a.text}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

/* ── components ─────────────────────────────────────────────────────────── */
function CountPill({ icon: Icon, label, value, sub, to, tint }) {
  return (
    <Link to={to} className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3 hover:shadow-lg transition group">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tint} group-hover:scale-110 transition`}><Icon size={20} /></div>
      <div className="min-w-0">
        <div className="text-xs text-ink-muted">{label}</div>
        <div className="font-bold text-xl text-ink">{Number(value).toLocaleString('en-IN')}{sub && <span className="text-xs font-medium text-ink-muted ml-1">{sub}</span>}</div>
      </div>
      <ChevronRight size={16} className="text-ink-muted ml-auto opacity-0 group-hover:opacity-100 transition" />
    </Link>
  );
}
function Kpi({ icon: Icon, label, value, delta, abs, money = true, invert }) {
  const up = delta != null && delta >= 0;
  const good = invert ? !up : up;
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs text-ink-muted">{label}</div>
        <Icon size={16} className="text-brand" />
      </div>
      <div className="mt-1.5 text-2xl font-bold text-ink">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-[11px]">
        {delta != null && <span className={`inline-flex items-center gap-0.5 font-semibold ${good ? 'text-emerald-500' : 'text-rose-500'}`}>{up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta)}%</span>}
        {abs != null ? <span className="text-ink-muted">{abs >= 0 ? '+' : ''}{abs} this month</span> : <span className="text-ink-muted">vs last month</span>}
      </div>
    </div>
  );
}
function QuickAction({ to, icon: Icon, label, tint }) {
  return (
    <Link to={to} className="bg-white rounded-2xl shadow-soft p-4 flex flex-col items-center justify-center gap-2 text-center hover:shadow-lg transition group">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tint} group-hover:scale-110 transition`}><Icon size={20} /></div>
      <div className="text-xs font-semibold text-ink">{label}</div>
    </Link>
  );
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
function Mini({ label, value, good, bad }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="text-[11px] text-ink-muted">{label}</div>
      <div className={`text-lg font-bold ${good ? 'text-emerald-600' : bad ? 'text-rose-600' : 'text-ink'}`}>{value}</div>
    </div>
  );
}
function SmallKV({ k, v, good, bad }) {
  return <div className="flex items-center justify-between py-1 text-sm"><span className="text-ink-muted">{k}</span><span className={`font-semibold ${good ? 'text-emerald-600' : bad ? 'text-rose-600' : 'text-ink'}`}>{v}</span></div>;
}
function Empty({ label = 'Nothing yet.' }) { return <p className="text-sm text-ink-muted py-6 text-center">{label}</p>; }
function StatusBadge({ s }) {
  const map = { confirmed: 'bg-blue-50 text-blue-700', completed: 'bg-emerald-50 text-emerald-700', pending_payment: 'bg-amber-50 text-amber-700', cancelled: 'bg-rose-50 text-rose-700', refunded: 'bg-violet-50 text-violet-700' };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${map[s] || 'bg-slate-100 text-slate-600'}`}>{String(s).replace('_', ' ')}</span>;
}
function StatusDonut({ status }) {
  const data = [
    { name: 'Confirmed', key: 'confirmed', value: status.confirmed },
    { name: 'Completed', key: 'completed', value: status.completed },
    { name: 'Pending', key: 'pending', value: status.pending },
    { name: 'Cancelled', key: 'cancelled', value: status.cancelled },
    { name: 'Refunded', key: 'refunded', value: status.refunded },
  ].filter((x) => x.value > 0);
  const total = data.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <Empty label="No bookings yet." />;
  return (
    <div className="flex items-center gap-3">
      <ResponsiveContainer width={130} height={150}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2}>
            {data.map((x) => <Cell key={x.key} fill={STATUS_COLOR[x.key]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-1.5">
        {data.map((x) => (
          <li key={x.key} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[x.key] }} />
            <span className="flex-1 text-ink">{x.name}</span>
            <span className="font-semibold text-ink">{x.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
