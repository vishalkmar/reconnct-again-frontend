import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, RotateCcw, IndianRupee, TrendingUp, ArrowLeftRight, Users,
  Search, ChevronRight, Layers, CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function B2BManagementPage() {
  const [tab, setTab] = useState('live'); // 'live' | 'tally'
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1">B2B Management</h1>
        <p className="text-sm text-ink-muted">Every live experience — supplier, KAM, pricing, bookings & revenue — plus a global payment tally.</p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {[['live', 'Live Experiences'], ['tally', 'Payment Tally']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${tab === k ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'live' ? <LiveList /> : <PaymentTally />}
    </div>
  );
}

/* ── Live experiences list ─────────────────────────────────────────────── */
function LiveList() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/b2b/experiences');
        setItems(res.data?.data?.items || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load live experiences');
        setItems([]);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    if (!items) return [];
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) => `${r.name} ${r.city} ${r.supplier}`.toLowerCase().includes(s));
  }, [items, q]);

  if (!items) return <Center><Loader2 className="animate-spin text-brand" /></Center>;

  return (
    <>
      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input className="input pl-9" placeholder="Search name, city or supplier…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {rows.length === 0 ? (
        <Center><span className="text-ink-muted text-sm">No live experiences.</span></Center>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold">Experience</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Listed</th>
                  <th className="px-4 py-3 font-semibold text-right">Bookings</th>
                  <th className="px-4 py-3 font-semibold text-right">B2B</th>
                  <th className="px-4 py-3 font-semibold text-right">B2C</th>
                  <th className="px-4 py-3 font-semibold text-right">Difference</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <Link to={`/admin/b2b/${r.id}`} className="flex items-center gap-3 group">
                        <img src={r.image || '/placeholder.png'} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" onError={(e) => { e.target.style.visibility = 'hidden'; }} />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate group-hover:text-brand">{r.name}</div>
                          <div className="text-xs text-ink-muted truncate">{r.city || '—'}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{r.supplier}</td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmtDate(r.listedAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap"><span className="font-semibold text-ink">{r.paidBookings}</span><span className="text-ink-muted"> / {r.bookings}</span></td>
                    <td className="px-4 py-3 text-right font-medium text-ink whitespace-nowrap">{rupee(r.b2b)}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink whitespace-nowrap">{rupee(r.b2c)}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap"><Diff v={r.difference} /></td>
                    <td className="px-2 py-3 text-right"><Link to={`/admin/b2b/${r.id}`}><ChevronRight size={16} className="text-ink-muted" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Payment tally ─────────────────────────────────────────────────────── */
const EMPTY = { from: '', to: '', name: '', email: '', supplier: '' };
function PaymentTally() {
  const [f, setF] = useState(EMPTY);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('bookings'); // bookings | activity | date

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/admin/b2b/tally', { params });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load tally');
    } finally {
      setLoading(false);
    }
  }, [f]);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals || {};
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const dirty = Object.values(f).some(Boolean);

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-4 mb-5 flex flex-wrap items-end gap-3">
        <Field label="From"><input type="date" className="input" value={f.from} onChange={set('from')} /></Field>
        <Field label="To"><input type="date" className="input" value={f.to} onChange={set('to')} /></Field>
        <Field label="Guest name"><input className="input" placeholder="Name" value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input className="input" placeholder="Email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Supplier"><input className="input" placeholder="Supplier" value={f.supplier} onChange={set('supplier')} /></Field>
        {dirty && (
          <button onClick={() => setF(EMPTY)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-ink-muted hover:text-brand">
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>

      {/* Total cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <TotalCard icon={IndianRupee} label="B2B revenue" hint="Base (before go-live extras)" value={rupee(t.b2b)} />
        <TotalCard icon={TrendingUp} label="B2C revenue" hint="Final — what customers paid" value={rupee(t.b2c)} />
        <TotalCard icon={ArrowLeftRight} label="Difference in B2B & B2C" hint="B2C − B2B (margin from extras)" value={rupee(t.difference)} accent />
        <TotalCard icon={Users} label="Paid bookings" hint={`${t.bookings || 0} total`} value={t.paidBookings || 0} plain />
      </div>

      {/* View switch */}
      <div className="flex gap-1 mb-3">
        {[['bookings', 'Bookings', Layers], ['activity', 'By activity', Layers], ['date', 'By date', CalendarDays]].map(([k, label, Icon]) => (
          <button key={k} onClick={() => setView(k)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === k ? 'bg-ink text-white' : 'bg-white text-ink-muted hover:text-ink shadow-soft'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Center><Loader2 className="animate-spin text-brand" /></Center>
      ) : view === 'bookings' ? (
        <TallyBookings rows={data?.rows || []} />
      ) : view === 'activity' ? (
        <GroupTable rows={data?.byActivity || []} keyLabel="Activity" keyField="experience" />
      ) : (
        <GroupTable rows={data?.byDate || []} keyLabel="Date" keyField="date" isDate />
      )}
    </>
  );
}

function TallyBookings({ rows }) {
  if (rows.length === 0) return <Center><span className="text-ink-muted text-sm">No bookings for these filters.</span></Center>;
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-slate-100">
              <th className="px-4 py-3 font-semibold">Booking</th>
              <th className="px-4 py-3 font-semibold">Guest</th>
              <th className="px-4 py-3 font-semibold">Experience</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">B2B</th>
              <th className="px-4 py-3 font-semibold text-right">B2C</th>
              <th className="px-4 py-3 font-semibold text-right">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{r.code}</div>
                  <div className="text-xs text-ink-muted">{fmtDate(r.bookedAt)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-ink">{r.guest || '—'}</div>
                  <div className="text-xs text-ink-muted truncate max-w-[160px]">{r.email}</div>
                </td>
                <td className="px-4 py-3 text-ink-muted"><div className="truncate max-w-[180px]">{r.experience}</div><div className="text-xs">{r.supplier}</div></td>
                <td className="px-4 py-3"><StatusPill s={r.paymentStatus} /></td>
                <td className="px-4 py-3 text-right text-ink whitespace-nowrap">{rupee(r.b2b)}</td>
                <td className="px-4 py-3 text-right text-ink whitespace-nowrap">{rupee(r.b2c)}</td>
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap"><Diff v={r.difference} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupTable({ rows, keyLabel, keyField, isDate }) {
  if (rows.length === 0) return <Center><span className="text-ink-muted text-sm">Nothing to show.</span></Center>;
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-slate-100">
              <th className="px-4 py-3 font-semibold">{keyLabel}</th>
              <th className="px-4 py-3 font-semibold text-right">Bookings</th>
              <th className="px-4 py-3 font-semibold text-right">B2B</th>
              <th className="px-4 py-3 font-semibold text-right">B2C</th>
              <th className="px-4 py-3 font-semibold text-right">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium text-ink">{isDate ? fmtDate(r[keyField]) : r[keyField]}</td>
                <td className="px-4 py-3 text-right text-ink-muted">{r.bookings}</td>
                <td className="px-4 py-3 text-right text-ink whitespace-nowrap">{rupee(r.b2b)}</td>
                <td className="px-4 py-3 text-right text-ink whitespace-nowrap">{rupee(r.b2c)}</td>
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap"><Diff v={r.difference} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── shared bits ───────────────────────────────────────────────────────── */
function Field({ label, children }) {
  return <label className="text-xs"><span className="block text-ink-muted mb-1">{label}</span>{children}</label>;
}
function Center({ children }) {
  return <div className="bg-white rounded-2xl shadow-soft p-16 text-center flex items-center justify-center">{children}</div>;
}
function Diff({ v }) {
  const up = Number(v) >= 0;
  return <span className={up ? 'text-emerald-600' : 'text-rose-600'}>{up ? '+' : '−'}{rupee(Math.abs(v))}</span>;
}
function TotalCard({ icon: Icon, label, hint, value, accent, plain }) {
  return (
    <div className={`rounded-2xl shadow-soft p-5 ${accent ? 'bg-ink text-white' : 'bg-white'}`}>
      <div className="flex items-start justify-between">
        <div className={`text-sm ${accent ? 'text-white/70' : 'text-ink-muted'}`}>{label}</div>
        <Icon size={18} className={accent ? 'text-brand' : 'text-brand'} />
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent ? 'text-white' : 'text-ink'}`}>{plain ? value : value}</div>
      {hint && <div className={`text-[11px] mt-1 ${accent ? 'text-white/60' : 'text-ink-muted'}`}>{hint}</div>}
    </div>
  );
}
export function StatusPill({ s }) {
  const map = {
    paid: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-rose-50 text-rose-700',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
}
