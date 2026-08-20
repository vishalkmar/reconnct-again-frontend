import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShieldAlert, Loader2, Search, RefreshCw, X, AlertTriangle, Snowflake, Unlock,
  IndianRupee, Ban, CheckCircle2, MapPin, Smartphone, Wifi, Globe, CreditCard, Calendar, User as UserIcon,
  FlaskConical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { connectSecurity, disconnectSecurity } from '../../services/securitySocket.js';

/*
  Admin → Security → Payment Fraud Detection.

  Lists every payment-fraud event (a booking confirmed for LESS than it should
  cost — a tampered gateway amount), with full evidence on click. Real-time: a
  new fraud raised anywhere pops a toast + prepends to the list over the
  /security socket. Completely self-contained — reads only the fraud API.
*/

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'dismissed', label: 'Dismissed' },
];

export default function SecurityFraudPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ open: 0, total: 0, frozenAccounts: 0, shortfallShown: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [apiMissing, setApiMissing] = useState(false);
  const [testEnabled, setTestEnabled] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const seen = useRef(new Set());

  // Is the (env-gated) test simulation available on this server?
  useEffect(() => {
    api.get('/admin/security/config').then((r) => setTestEnabled(!!r.data?.data?.testEnabled)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (q.trim()) params.q = q.trim();
      const { data } = await api.get('/admin/security/fraud', { params });
      setItems(data?.data?.items || []);
      setSummary(data?.data?.summary || { open: 0, total: 0, frozenAccounts: 0, shortfallShown: 0 });
      setApiMissing(false);
    } catch (err) {
      if (err.response?.status === 404) setApiMissing(true);
      else toast.error(err.response?.data?.message || 'Could not load fraud events');
    } finally { setLoading(false); }
  }, [status, q]);

  useEffect(() => { load(); }, [load]);

  // Real-time — a fraud raised anywhere lands here instantly.
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return undefined;
    const socket = connectSecurity(token);
    if (!socket) return undefined;
    const onFraud = (ev) => {
      if (ev?.id && seen.current.has(ev.id)) return;
      if (ev?.id) seen.current.add(ev.id);
      toast.error(`⚠️ Payment fraud: ${ev.bookingCode} — short ${rupee(ev.shortfall)}`, { duration: 8000 });
      load();
    };
    socket.on('fraud:new', onFraud);
    return () => { socket.off('fraud:new', onFraud); disconnectSecurity(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1 inline-flex items-center gap-2">
          <ShieldAlert className="text-rose-600" size={24} /> Payment Fraud Detection
        </h1>
        <p className="text-sm text-ink-muted">
          Bookings that were confirmed for <strong>less</strong> than they should cost — a tampered gateway amount.
          The account is frozen automatically and an alert is emailed.
        </p>
      </div>

      {apiMissing && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 mb-5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>The security API isn’t live on this server yet (<code>/api/admin/security/*</code> 404). Deploy the backend carrying this feature.</span>
        </div>
      )}

      <div className="grid sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Open cases" value={summary.open} icon={Ban} tint="text-rose-600 bg-rose-50" />
        <Stat label="Total cases" value={summary.total} icon={ShieldAlert} tint="text-ink bg-slate-100" />
        <Stat label="Frozen accounts" value={summary.frozenAccounts} icon={Snowflake} tint="text-sky-600 bg-sky-50" />
        <Stat label="Shortfall (shown)" value={rupee(summary.shortfallShown)} icon={IndianRupee} tint="text-amber-600 bg-amber-50" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1.5">
          {STATUS_TABS.map((t) => (
            <button key={t.key} onClick={() => setStatus(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${status === t.key ? 'bg-brand text-ink border-brand' : 'bg-white border-gray-200 text-ink-muted hover:text-brand'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9 py-1.5 text-sm w-64" placeholder="Search code / email / name…"
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-gray-200 bg-white text-ink-muted hover:text-brand" title="Refresh">
          <RefreshCw size={15} />
        </button>
        {testEnabled && (
          <button onClick={() => setTestOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-300 bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100" title="Run a safe end-to-end test">
            <FlaskConical size={14} /> Run a test
          </button>
        )}
      </div>

      {testOpen && <SimulateModal onClose={() => setTestOpen(false)} onDone={load} />}

      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/60 text-[11px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="text-left font-semibold px-5 py-2.5">Booking / customer</th>
                <th className="text-right font-semibold px-3 py-2.5">Expected</th>
                <th className="text-right font-semibold px-3 py-2.5">Paid</th>
                <th className="text-right font-semibold px-3 py-2.5">Shortfall</th>
                <th className="text-left font-semibold px-3 py-2.5">Detected</th>
                <th className="text-left font-semibold px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-ink-muted">
                  <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={28} /> No payment fraud detected. All clear.
                </td></tr>
              ) : items.map((r) => (
                <tr key={r.id} className="hover:bg-surface-alt/40 cursor-pointer" onClick={() => setDetailId(r.id)}>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-ink">{r.bookingCode}</div>
                    <div className="text-[11px] text-ink-muted truncate max-w-[16rem]">{r.userName || '—'} · {r.userEmail || '—'}</div>
                    {r.item && <div className="text-[11px] text-ink-muted truncate max-w-[16rem]">{r.item}</div>}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-muted whitespace-nowrap">{rupee(r.expected)}</td>
                  <td className="px-3 py-3 text-right text-rose-600 font-semibold whitespace-nowrap">{rupee(r.paid)}</td>
                  <td className="px-3 py-3 text-right font-bold text-rose-600 whitespace-nowrap">− {rupee(r.shortfall)}</td>
                  <td className="px-3 py-3 text-ink-muted text-xs whitespace-nowrap">{when(r.detectedAt)}</td>
                  <td className="px-3 py-3"><StatusChip status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detailId && <FraudDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={load} />}
    </div>
  );
}

/*
  Safe end-to-end test — fires the REAL pipeline (event → freeze → admin+user
  email → real-time toast) against a TEST email you control, so nothing touches
  a real customer. Only shown when FRAUD_TEST_ENABLED=true on the server.
*/
function SimulateModal({ onClose, onDone }) {
  const [email, setEmail] = useState('');
  const [expected, setExpected] = useState(2500);
  const [paid, setPaid] = useState(1000);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!email.trim()) return toast.error('Enter a test email you can check');
    if (Number(paid) >= Number(expected)) return toast.error('Paid must be LESS than expected');
    setBusy(true);
    try {
      const { data } = await api.post('/admin/security/simulate', {
        email: email.trim(), expected: Number(expected), paid: Number(paid),
      });
      toast.success(data.message || 'Simulated');
      onDone && onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Simulation failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg inline-flex items-center gap-2 mb-1">
          <FlaskConical className="text-violet-600" size={20} /> Run a fraud test
        </h3>
        <p className="text-xs text-ink-muted mb-4">
          Fires the whole pipeline on a <strong>test email you control</strong> — you’ll see the real-time alert here,
          an email in the admin inbox, and a “fraud” email in the test inbox; the test account gets frozen (unfreeze it
          from the case afterwards). No real customer is touched.
        </p>
        <div className="space-y-3">
          <div>
            <label className="label">Test email</label>
            <input className="input" type="email" placeholder="you+test@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Expected (₹)</label>
              <input className="input" type="number" min={1} value={expected} onChange={(e) => setExpected(e.target.value)} />
            </div>
            <div>
              <label className="label">Paid (₹) — lower</label>
              <input className="input" type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
          <button onClick={run} disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-60">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />} Simulate fraud
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tint }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}><Icon size={18} /></span>
      <div>
        <div className="text-xl font-bold text-ink leading-tight">{value}</div>
        <div className="text-[11px] text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    open: 'bg-rose-100 text-rose-700',
    reviewed: 'bg-amber-100 text-amber-700',
    dismissed: 'bg-slate-100 text-slate-500',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${map[status] || map.open}`}>{status}</span>;
}

// ─── Full evidence modal ─────────────────────────────────────────────────────
function FraudDetailModal({ id, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/security/fraud/${id}`);
      setData(res.data?.data || null);
    } catch (err) { toast.error(err.response?.data?.message || 'Could not load'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await api.patch(`/admin/security/fraud/${id}/status`, { status });
      toast.success(`Marked ${status}`);
      await load(); onChanged && onChanged();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const unfreeze = async () => {
    if (!data?.event?.userEmail) return;
    if (!window.confirm(`Unfreeze ${data.event.userEmail}? They will be able to sign in again.`)) return;
    setBusy(true);
    try {
      await api.post('/admin/security/unfreeze-email', { email: data.event.userEmail });
      toast.success('Account unfrozen');
      await load(); onChanged && onChanged();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const e = data?.event;
  const c = e?.clientContext || {};
  const p = e?.paymentDetails || {};
  const it = e?.itemDetails || {};
  const loc = c.location && typeof c.location === 'object' ? JSON.stringify(c.location) : (c.location || '—');

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-bold text-lg inline-flex items-center gap-2">
            <ShieldAlert className="text-rose-600" size={20} /> Fraud case {e?.bookingCode ? `· ${e.bookingCode}` : ''}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt text-ink-muted"><X size={18} /></button>
        </div>

        {loading || !e ? (
          <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Money */}
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wide text-rose-700">Shortfall</div>
              <div className="text-3xl font-extrabold text-rose-600">− {rupee(e.shortfall)}</div>
              <div className="text-xs text-rose-700/80 mt-1">{rupee(e.paid)} paid vs {rupee(e.expected)} expected{e.couponCode ? ` · coupon ${e.couponCode} (−${rupee(e.couponDiscount)}) accounted` : ''}</div>
            </div>

            <Section icon={UserIcon} title="Customer">
              <KV k="Name" v={e.userName} />
              <KV k="Email" v={e.userEmail} />
              <KV k="Phone" v={e.userPhone} />
              <KV k="Account" v={data.frozen ? 'Frozen ❄️' : 'Active'} accent={data.frozen ? 'text-sky-600' : 'text-emerald-600'} />
            </Section>

            <Section icon={Calendar} title="Booking">
              <KV k="Item" v={it.name} />
              <KV k="For date" v={it.scheduledFor} />
              <KV k="Booked at" v={it.bookedAt ? when(it.bookedAt) : '—'} />
              <KV k="Guests" v={it.guestCount} />
            </Section>

            <Section icon={CreditCard} title="Payment">
              <KV k="Payment ID" v={p.paymentId} />
              <KV k="Method" v={p.method} />
              <KV k="Bank / instrument" v={p.bank || p.instrumentHint} />
              <KV k="Gateway order" v={p.cfOrderId} />
              <KV k="Order amount" v={p.orderAmount != null ? rupee(p.orderAmount) : '—'} />
            </Section>

            <Section icon={Smartphone} title="Device & network">
              <KV k="IP address" v={c.ip} icon={Globe} />
              <KV k="Device ID" v={c.deviceId} icon={Smartphone} />
              <KV k="System" v={c.systemInfo} />
              <KV k="Location" v={loc} icon={MapPin} />
              <KV k="Network" v={c.network} icon={Wifi} />
              <KV k="User agent" v={c.userAgent} small />
              <KV k="Captured at" v={c.capturedAt ? when(c.capturedAt) : '—'} />
            </Section>
          </div>
        )}

        {!loading && e && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
            {data.frozen && (
              <button onClick={unfreeze} disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-sky-300 text-sky-700 text-sm font-semibold hover:bg-sky-50 disabled:opacity-60">
                <Unlock size={15} /> Unfreeze account
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setStatus('dismissed')} disabled={busy}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt disabled:opacity-60">Dismiss</button>
              <button onClick={() => setStatus('reviewed')} disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-bold disabled:opacity-60">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Mark reviewed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2 inline-flex items-center gap-1.5">
        <Icon size={13} /> {title}
      </div>
      <div className="rounded-xl border border-gray-200 divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function KV({ k, v, accent, icon: Icon, small }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3.5 py-2">
      <span className="text-xs text-ink-muted inline-flex items-center gap-1.5 shrink-0">{Icon && <Icon size={12} />}{k}</span>
      <span className={`text-sm font-medium text-right break-all ${accent || 'text-ink'} ${small ? 'text-[11px] font-normal' : ''}`}>{(v ?? '') === '' ? '—' : v}</span>
    </div>
  );
}
