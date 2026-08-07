import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Loader2, RotateCcw, IndianRupee, TrendingUp, ArrowLeftRight, Users,
  Search, ChevronRight, ChevronLeft, Layers, CalendarDays, X, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

/* Pagination — every B2B table caps at 80 rows per page. */
export const PAGE_SIZE = 80;
export function usePaged(rows, size = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  useEffect(() => { if (page > pages) setPage(1); }, [pages, page]);
  const slice = useMemo(() => rows.slice((page - 1) * size, page * size), [rows, page, size]);
  return { page, setPage, pages, total, slice };
}
export function Pager({ page, pages, total, setPage, size = PAGE_SIZE }) {
  if (total <= size) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  const btn = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50';
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
      <span className="text-ink-muted">{from}–{to} of {total}</span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className={btn}><ChevronLeft size={14} /> Prev</button>
        <span className="text-ink-muted">Page {page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)} className={btn}>Next <ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

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
  const navigate = useNavigate();
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
  const paged = usePaged(rows);

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
                {paged.slice.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/admin/b2b/${r.id}`)} className="hover:bg-slate-50/70 transition cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 group">
                        <img src={r.image || '/placeholder.png'} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" onError={(e) => { e.target.style.visibility = 'hidden'; }} />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate group-hover:text-brand">{r.name}</div>
                          <div className="text-xs text-ink-muted truncate">{r.city || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{r.supplier}</td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmtDate(r.listedAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap"><span className="font-semibold text-ink">{r.paidBookings}</span><span className="text-ink-muted"> / {r.bookings}</span></td>
                    <td className="px-4 py-3 text-right font-medium text-ink whitespace-nowrap">{rupee(r.b2b)}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink whitespace-nowrap">{rupee(r.b2c)}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap"><Diff v={r.difference} /></td>
                    <td className="px-2 py-3 text-right"><ChevronRight size={16} className="text-ink-muted" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager {...paged} />
        </div>
      )}
    </>
  );
}

/* ── Payment tally ─────────────────────────────────────────────────────── */
const EMPTY = { from: '', to: '', name: '', email: '', supplier: '' };
const METRICS = {
  b2b: { label: 'B2B revenue', color: '#3b82f6', money: true },
  b2c: { label: 'B2C revenue', color: '#22c55e', money: true },
  difference: { label: 'Difference in B2B & B2C', color: '#a855f7', money: true },
  bookings: { label: 'Paid bookings', color: '#f59e0b', money: false },
};

function PaymentTally() {
  const [f, setF] = useState(EMPTY);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('bookings'); // bookings | activity | date
  const [metric, setMetric] = useState(null); // which card graph is open
  const [voucher, setVoucher] = useState(null); // booking row shown as a voucher

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

  // Graph series — paid bookings rolled up by date, ascending.
  const graphData = useMemo(() => {
    const by = data?.byDate || [];
    return [...by]
      .filter((r) => r.date)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((r) => ({ label: fmtDate(r.date), value: r[metric] || 0 }));
  }, [data, metric]);

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

      {/* Total cards — click to chart the metric over time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <TotalCard mkey="b2b" active={metric === 'b2b'} onClick={setMetric} icon={IndianRupee} label="B2B revenue" hint="Base (before go-live extras)" value={rupee(t.b2b)} />
        <TotalCard mkey="b2c" active={metric === 'b2c'} onClick={setMetric} icon={TrendingUp} label="B2C revenue" hint="Final — what customers paid" value={rupee(t.b2c)} />
        <TotalCard mkey="difference" active={metric === 'difference'} onClick={setMetric} icon={ArrowLeftRight} label="Difference in B2B & B2C" hint="B2C − B2B (margin from extras)" value={rupee(t.difference)} accent />
        <TotalCard mkey="bookings" active={metric === 'bookings'} onClick={setMetric} icon={Users} label="Paid bookings" hint={`${t.bookings || 0} total`} value={t.paidBookings || 0} />
      </div>

      {/* Metric line graph (paid only) */}
      {metric && (
        <div className="bg-white rounded-2xl shadow-soft p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-lg" style={{ color: METRICS[metric].color }}>{METRICS[metric].label}</h2>
              <p className="text-xs text-ink-muted">Paid bookings, by date</p>
            </div>
            <button onClick={() => setMetric(null)} className="text-sm text-ink-muted hover:text-brand">Close ✕</button>
          </div>
          {graphData.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-muted">No paid bookings in range.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={graphData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (METRICS[metric].money && v >= 1000 ? `${v / 1000}k` : v)} allowDecimals={!METRICS[metric].money ? false : true} />
                <Tooltip formatter={(v) => (METRICS[metric].money ? rupee(v) : v)} labelStyle={{ fontWeight: 700 }} />
                <Line type="monotone" dataKey="value" name={METRICS[metric].label} stroke={METRICS[metric].color} strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

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
        <TallyBookings rows={data?.rows || []} onOpen={setVoucher} />
      ) : view === 'activity' ? (
        <GroupTable rows={data?.byActivity || []} keyLabel="Activity" keyField="experience" />
      ) : (
        <GroupTable rows={data?.byDate || []} keyLabel="Date" keyField="date" isDate />
      )}

      {voucher && <VoucherModal row={voucher} onClose={() => setVoucher(null)} />}
    </>
  );
}

function TallyBookings({ rows, onOpen }) {
  const paged = usePaged(rows);
  if (rows.length === 0) return <Center><span className="text-ink-muted text-sm">No paid bookings for these filters.</span></Center>;
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
            {paged.slice.map((r) => (
              <tr key={r.id} onClick={() => onOpen(r)} className="hover:bg-slate-50/70 cursor-pointer">
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
      <Pager {...paged} />
    </div>
  );
}

function GroupTable({ rows, keyLabel, keyField, isDate }) {
  const paged = usePaged(rows);
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
            {paged.slice.map((r, i) => (
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
      <Pager {...paged} />
    </div>
  );
}

/* ── Payment voucher (contract-style) ──────────────────────────────────── */
function VoucherModal({ row, onClose }) {
  const paid = row.paymentStatus === 'paid';
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      {/* Print rules: on print, show only the voucher document. */}
      <style>{`@media print { body * { visibility: hidden !important; } #b2b-voucher, #b2b-voucher * { visibility: visible !important; } #b2b-voucher { position: absolute; inset: 0; margin: 0; box-shadow: none; border-radius: 0; } .no-print { display: none !important; } }`}</style>
      <div className="my-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Action bar (not printed) */}
        <div className="no-print flex items-center justify-end gap-2 mb-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink/90"><Printer size={15} /> Print / Save PDF</button>
          <button onClick={onClose} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-ink text-sm font-semibold shadow-soft"><X size={15} /> Close</button>
        </div>

        <div id="b2b-voucher" className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
          {/* Letterhead */}
          <div className="flex items-start justify-between gap-4 px-7 py-5 bg-ink text-white">
            <div>
              <div className="font-display text-2xl font-bold tracking-tight">reconn<span className="text-brand">ct</span></div>
              <div className="text-xs text-white/60 mt-0.5">B2B Payment Voucher</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-white/60">Voucher No.</div>
              <div className="font-mono font-bold">{row.code}</div>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${paid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{paid ? 'PAID' : (row.paymentStatus || 'pending').toUpperCase()}</span>
            </div>
          </div>

          {/* Parties / booking meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 px-7 py-6">
            <VField label="Experience" value={row.experience} />
            <VField label="Supplier" value={row.supplier} />
            <VField label="Guest" value={row.guest} />
            <VField label="Contact" value={[row.email, row.phone].filter(Boolean).join(' · ')} />
            <VField label="Guests" value={row.guestCount} />
            <VField label="Experience date" value={fmtDate(row.date)} />
            <VField label="Booked on" value={fmtDateTime(row.bookedAt)} />
            <VField label="Paid on" value={row.paidAt ? fmtDateTime(row.paidAt) : '—'} />
          </div>

          {/* Pricing table — B2B (received) vs B2C (paid at live) */}
          <div className="px-7 pb-2">
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2.5 font-semibold">Particulars</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">B2B price (supplier rate)</div>
                    <div className="text-xs text-ink-muted">Base received, before go-live extras</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink whitespace-nowrap">{rupee(row.b2b)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">B2C price (paid at live)</div>
                    <div className="text-xs text-ink-muted">Final amount the customer paid</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink whitespace-nowrap">{rupee(row.b2c)}</td>
                </tr>
                <tr className="bg-ink/[0.03]">
                  <td className="px-4 py-3 font-bold text-ink">Difference in B2B &amp; B2C</td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap"><Diff v={row.difference} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-7 py-5 text-[11px] text-ink-muted leading-relaxed">
            This voucher is a system-generated summary of the B2B/B2C settlement for the above booking. “B2B price” is the rate received from the supplier before go-live extras; “B2C price” is the final amount paid by the customer at the live listing. Difference = B2C − B2B.
          </div>
        </div>
      </div>
    </div>
  );
}
function VField({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="text-sm font-medium text-ink break-words">{value || '—'}</div>
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
function TotalCard({ mkey, onClick, active, icon: Icon, label, hint, value, accent }) {
  return (
    <button type="button" onClick={() => onClick(active ? null : mkey)}
      className={`text-left rounded-2xl shadow-soft p-5 transition ring-2 ${active ? 'ring-brand' : 'ring-transparent hover:ring-slate-200'} ${accent ? 'bg-ink text-white' : 'bg-white'}`}>
      <div className="flex items-start justify-between">
        <div className={`text-sm ${accent ? 'text-white/70' : 'text-ink-muted'}`}>{label}</div>
        <Icon size={18} className="text-brand" />
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent ? 'text-white' : 'text-ink'}`}>{value}</div>
      {hint && <div className={`text-[11px] mt-1 ${accent ? 'text-white/60' : 'text-ink-muted'}`}>{hint}</div>}
      <div className={`text-[10px] mt-2 font-semibold ${accent ? 'text-brand' : 'text-brand'}`}>{active ? 'Hide graph' : 'View graph →'}</div>
    </button>
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
