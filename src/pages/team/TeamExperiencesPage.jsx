import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus, Loader2, Sparkles, Clock, Globe, XCircle, Ban, RefreshCw, Search,
  MessageSquareWarning, Send, CircleAlert, Lightbulb, MapPin, CheckCircle2, Hourglass,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { useReviewNotify } from '../../context/ReviewNotifyContext.jsx';

const TABS = [
  { key: 'in_queue', label: 'In Queue', icon: Clock, tone: 'blue' },
  { key: 'under_progress', label: 'Under Progress', icon: RefreshCw, tone: 'amber' },
  { key: 'live', label: 'Live', icon: Globe, tone: 'emerald' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, tone: 'rose' },
  { key: 'delisted', label: 'Delisted', icon: Ban, tone: 'slate' },
];
const TONE = {
  blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600', slate: 'bg-slate-100 text-slate-500',
};
const TIME_FILTERS = [
  ['all', 'All time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['this_week', 'This week'],
  ['this_month', 'This month'], ['3_months', 'Last 3 months'], ['6_months', 'Last 6 months'],
  ['this_year', 'This year'], ['last_year', 'Last year'], ['specific', 'On a specific date'],
];

const inRange = (dateStr, filter, specificDate) => {
  if (filter === 'all') return true;
  const d = new Date(dateStr); const now = new Date();
  switch (filter) {
    case 'today': return d.toDateString() === now.toDateString();
    case 'yesterday': { const y = new Date(now); y.setDate(now.getDate() - 1); return d.toDateString() === y.toDateString(); }
    case 'this_week': { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0); return d >= s; }
    case 'this_month': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    case '3_months': { const s = new Date(now); s.setMonth(now.getMonth() - 3); return d >= s; }
    case '6_months': { const s = new Date(now); s.setMonth(now.getMonth() - 6); return d >= s; }
    case 'this_year': return d.getFullYear() === now.getFullYear();
    case 'last_year': return d.getFullYear() === now.getFullYear() - 1;
    case 'specific': return specificDate && d.toDateString() === new Date(specificDate).toDateString();
    default: return true;
  }
};

export default function TeamExperiencesPage() {
  const { items: notifs } = useReviewNotify();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'in_queue');
  const [query, setQuery] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [time, setTime] = useState('all');
  const [specificDate, setSpecificDate] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/team/review-stats/my-experiences');
      setItems(res.data?.data?.items || []);
      setCounts(res.data?.data?.counts || {});
    } catch {
      toast.error('Could not load experiences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (notifs.length) load(); }, [notifs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const suppliers = useMemo(() => {
    const map = new Map();
    items.forEach((i) => { if (i.supplier) map.set(i.supplier.id, i.supplier.name); });
    return [...map.entries()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.tab === tab)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || (i.supplier?.name || '').toLowerCase().includes(q) || (i.location || '').toLowerCase().includes(q))
      .filter((i) => !supplierId || String(i.supplier?.id) === supplierId)
      .filter((i) => inRange(i.createdAt, time, specificDate));
  }, [items, tab, query, supplierId, time, specificDate]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">My Experiences</h1>
          <p className="text-sm text-ink-muted">Everything you&apos;ve added, by stage. New ones go to Center Ops for review before going live.</p>
        </div>
        <Link to="new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
          <Plus size={18} /> New experience
        </Link>
      </div>

      {/* Clickable stat cards → tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3 text-left transition-all ${tab === t.key ? 'ring-2 ring-brand' : 'hover:shadow-lg hover:-translate-y-0.5'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TONE[t.tone]}`}><t.icon size={20} /></div>
            <div><div className="text-2xl font-display font-bold leading-none">{counts[t.key] || 0}</div><div className="text-[11px] text-ink-muted mt-1">{t.label}</div></div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, supplier, location…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
        </div>
        {suppliers.length > 0 && (
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none">
            <option value="">All suppliers</option>
            {suppliers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        <select value={time} onChange={(e) => setTime(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none">
          {TIME_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {time === 'specific' && (
          <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand outline-none" />
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><Sparkles size={26} /></div>
          <h2 className="font-semibold text-lg">Nothing here</h2>
          <p className="text-sm text-ink-muted mt-1">No experiences in <span className="font-semibold">{TABS.find((t) => t.key === tab)?.label}</span> match your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {filtered.map((e) => <Row key={e.id} e={e} tab={tab} onChanged={load} />)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ e, tab, onChanged }) {
  const hasObjections = tab === 'in_queue' && e.objectionCount > 0;
  return (
    <li className="px-4 sm:px-5 py-3.5">
      <div className="flex items-center gap-3">
        {e.mainImage
          ? <img src={fileUrl(e.mainImage)} alt="" className="w-11 h-11 rounded-lg object-cover border shrink-0" />
          : <div className="w-11 h-11 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><Sparkles size={18} /></div>}
        <div className="min-w-0 flex-1">
          <Link to={`${e.id}/view`} className="font-semibold text-ink truncate hover:text-brand block">{e.name}</Link>
          <div className="text-[11px] text-ink-muted truncate flex items-center gap-2">
            {e.supplier?.name && <span>{e.supplier.name}</span>}
            {e.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {e.location}</span>}
            {e.round > 0 && <span className="text-amber-600">· round {e.round}</span>}
          </div>
        </div>
        <StageChip e={e} tab={tab} hasObjections={hasObjections} />
      </div>

      {hasObjections && (
        <div className="mt-3 sm:ml-14 bg-rose-50 rounded-xl p-3.5">
          <div className="text-xs font-bold uppercase tracking-wide text-rose-600 mb-2 flex items-center gap-1.5">
            <CircleAlert size={14} /> {e.objectionCount} objection{e.objectionCount > 1 ? 's' : ''} to fix
          </div>
          <ul className="space-y-2">
            {e.objections.map((o) => (
              <li key={o.key} className="text-sm"><span className="font-semibold text-rose-800">{o.label}:</span> <span className="text-rose-700">{o.objection}</span></li>
            ))}
          </ul>
          {e.suggestion && (
            <div className="mt-3 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              <Lightbulb size={15} className="mt-0.5 shrink-0" /><span><span className="font-semibold">Suggestion:</span> {e.suggestion}</span>
            </div>
          )}
          {/* Resolve page is the only entry point — it edits the objected
              fields inline, so a separate full-form edit is redundant here. */}
          <div className="flex gap-2 mt-3">
            <Link to={`${e.id}/resolve`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"><Send size={13} /> Resolve &amp; review again</Link>
          </div>
        </div>
      )}

      {tab === 'rejected' && e.reviewNote && (
        <ReasonBlock icon={XCircle} tone="rose" title="Rejected" text={e.reviewNote} viewId={e.id} />
      )}
      {tab === 'delisted' && (
        <ReasonBlock icon={Ban} tone="slate" title="Delisted from the platform" text={e.delistReason || e.reviewNote} viewId={e.id} />
      )}
      {tab === 'under_progress' && <UnderProgressBlock e={e} onChanged={onChanged} />}
    </li>
  );
}

function UnderProgressBlock({ e, onChanged }) {
  const [modal, setModal] = useState(null); // 'reject' | 'approve'
  const [reason, setReason] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = e.qc || {};

  const submit = async (decision) => {
    if (!reason.trim()) return toast.error('A reason is required');
    if (decision === 'approve' && !deadline) return toast.error('Set a completion deadline (date & time)');
    setBusy(true);
    try {
      await api.post(`/experiences/${e.id}/up-respond`, { decision, reason: reason.trim(), deadline });
      toast.success(decision === 'reject' ? 'Sent to Center Ops' : 'Accepted — sent to Center Ops');
      setModal(null); onChanged && onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-3 sm:ml-14 bg-amber-50 rounded-xl p-3.5">
      <div className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1.5 flex items-center gap-1.5">
        <MessageSquareWarning size={14} /> QCOPS suggested {qc.changeType || ''} changes
      </div>
      <p className="text-sm text-amber-900">{qc.changeDetails || e.reviewNote}</p>

      {qc.upState === 'pending_bd' && (
        <>
          {!modal ? (
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setReason(''); setModal('reject'); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100"><XCircle size={13} /> Reject with reason</button>
              <button onClick={() => { setReason(''); setDeadline(''); setModal('approve'); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"><CheckCircle2 size={13} /> Approve with reason</button>
            </div>
          ) : (
            <div className="mt-3 bg-white rounded-lg p-3 border border-amber-200">
              <label className="text-[11px] font-semibold text-ink uppercase tracking-wide">{modal === 'reject' ? 'Why are you rejecting?' : 'Your note'}</label>
              <textarea autoFocus value={reason} onChange={(ev) => setReason(ev.target.value)} rows={2} className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand" />
              {modal === 'approve' && (
                <div className="mt-2">
                  <label className="text-[11px] font-semibold text-ink uppercase tracking-wide">Completion deadline <span className="text-rose-500">*</span></label>
                  <input type="datetime-local" value={deadline} onChange={(ev) => setDeadline(ev.target.value)} className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand" />
                </div>
              )}
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setModal(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
                <button onClick={() => submit(modal)} disabled={busy} className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 inline-flex items-center gap-1.5 ${modal === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{busy && <Loader2 size={12} className="animate-spin" />} Submit</button>
              </div>
            </div>
          )}
        </>
      )}
      {qc.upState === 'bd_rejected' && <div className="mt-2 text-[12px] text-rose-700 inline-flex items-center gap-1.5"><XCircle size={13} /> You rejected — awaiting Center Ops confirmation.</div>}
      {qc.upState === 'bd_approved' && <div className="mt-2 text-[12px] text-emerald-700 inline-flex items-center gap-1.5"><Hourglass size={13} /> Accepted{qc.bdDeadline ? ` · deadline ${qc.bdDeadline}` : ''} — awaiting Center Ops to make it live.</div>}
      <Link to={`${e.id}/view`} className="inline-block mt-2.5 text-xs font-semibold text-amber-800 underline">View full details</Link>
    </div>
  );
}

function ReasonBlock({ icon: Icon, tone, title, text, viewId }) {
  const cls = { rose: 'bg-rose-50 text-rose-800', slate: 'bg-slate-100 text-slate-700', amber: 'bg-amber-50 text-amber-800' }[tone];
  return (
    <div className={`mt-3 sm:ml-14 rounded-xl p-3.5 ${cls}`}>
      <div className="text-xs font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Icon size={14} /> {title}</div>
      {text && <p className="text-sm">{text}</p>}
      <Link to={`${viewId}/view`} className="inline-block mt-2.5 text-xs font-semibold underline">View full details</Link>
    </div>
  );
}

function StageChip({ e, tab, hasObjections }) {
  const map = {
    in_queue: hasObjections ? ['Objections', 'bg-rose-50 text-rose-700'] : ['In review', 'bg-blue-50 text-blue-700'],
    under_progress: ['Under progress', 'bg-amber-50 text-amber-700'],
    live: ['Live', 'bg-emerald-50 text-emerald-700'],
    rejected: ['Rejected', 'bg-rose-50 text-rose-700'],
    delisted: ['Delisted', 'bg-slate-100 text-slate-500'],
  };
  const [label, cls] = map[tab] || ['—', 'bg-slate-100'];
  return <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${cls}`}>{label}</span>;
}
