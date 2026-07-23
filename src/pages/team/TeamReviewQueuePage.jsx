import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, ClipboardCheck, UserCog, Truck, Home, Building2, Send, ChevronRight,
  CircleCheck, CircleAlert, Circle, CalendarClock, ShieldCheck, Rocket, Ban, Search,
  Clock, Hourglass, XCircle, Globe, MessageSquareWarning, ThumbsUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { useReviewNotify } from '../../context/ReviewNotifyContext.jsx';

const SOURCE_STYLE = {
  staff: { icon: Truck, className: 'bg-amber-50 text-amber-700' },
  host: { icon: Home, className: 'bg-purple-50 text-purple-700' },
  supplier: { icon: Building2, className: 'bg-teal-50 text-teal-700' },
  admin: { icon: UserCog, className: 'bg-slate-100 text-slate-600' },
};
const TABS = [
  { key: 'level1', label: 'Level 1 · Content', icon: ClipboardCheck, tone: 'blue' },
  { key: 'level2', label: 'Level 2 · QC visit', icon: CalendarClock, tone: 'indigo' },
  { key: 'live_in_progress', label: 'Live in progress', icon: Rocket, tone: 'emerald' },
  { key: 'under_progress', label: 'Under Progress', icon: Hourglass, tone: 'amber' },
  { key: 'active', label: 'Active · Live', icon: Globe, tone: 'emerald' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, tone: 'rose' },
  { key: 'delisted', label: 'Delisted', icon: Ban, tone: 'slate' },
];
const TONE = {
  blue: 'bg-blue-50 text-blue-600', indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', slate: 'bg-slate-100 text-slate-500',
};
const QC_STATUS = {
  qc_assigned: 'Awaiting QCOPS visit', qc_acknowledged: 'QCOPS acknowledged', qc_onsite: 'QCOPS on-site now',
};

export default function TeamReviewQueuePage() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('level1');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null); // { kind:'send'|'delist'|'reject', item }
  const [busyId, setBusyId] = useState(null);
  const { onQueueChange } = useReviewNotify();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/team/review-queue/board');
      setItems(res.data?.data?.items || []);
      setCounts(res.data?.data?.counts || {});
    } catch {
      toast.error('Could not load the review queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onQueueChange(() => load()), [onQueueChange, load]);

  const act = async (id, fn) => {
    setBusyId(id);
    try { await fn(); setModal(null); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setBusyId(null); }
  };

  const sendQcops = (id, body) => act(id, async () => {
    const r = await api.post(`/team/review-queue/${id}/send-qcops`, body);
    toast.success(r.data?.message || 'Assigned to QCOPS');
  });
  const goLive = (id) => act(id, async () => { await api.post(`/team/qc/${id}/go-live`); toast.success('Now live on web & app 🎉'); });
  const directList = (id) => act(id, async () => { await api.post(`/team/review-queue/${id}/direct-list`); toast.success('Listed directly — now live 🎉'); });
  const upReject = (id, reason) => act(id, async () => { await api.post(`/team/qc/${id}/up-reject`, { reason }); toast.success('Rejected — submitter notified'); });
  const upAck = (id) => act(id, async () => { const r = await api.post(`/team/qc/${id}/up-ack`); toast.success(r.data?.message || 'Acknowledged'); });
  const delist = (id, reason) => act(id, async () => { await api.post(`/team/qc/${id}/delist`, { reason }); toast.success('Delisted from the platform'); });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.review?.copsTab === tab)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || (i.supplier?.companyName || '').toLowerCase().includes(q) || (i.location || '').toLowerCase().includes(q));
  }, [items, tab, query]);

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1">Review Queue</h1>
        <p className="text-sm text-ink-muted">Content review → QCOPS site check → go live. Every level of the onboarding flow.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`bg-white rounded-2xl shadow-soft p-3.5 flex items-center gap-2.5 text-left transition-all ${tab === t.key ? 'ring-2 ring-brand' : 'hover:shadow-lg hover:-translate-y-0.5'}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TONE[t.tone]}`}><t.icon size={17} /></div>
            <div className="min-w-0"><div className="text-xl font-display font-bold leading-none">{counts[t.key] || 0}</div><div className="text-[10px] text-ink-muted mt-0.5 truncate">{t.label}</div></div>
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, supplier, location…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center mb-4"><ClipboardCheck size={26} /></div>
          <h2 className="font-semibold text-lg">Nothing in {TABS.find((t) => t.key === tab)?.label}</h2>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Row key={item.id} item={item} tab={tab} busy={busyId === item.id}
              onSend={() => setModal({ kind: 'send', item })}
              onGoLive={() => goLive(item.id)}
              onDirectList={() => directList(item.id)}
              onDelist={() => setModal({ kind: 'delist', item })}
              onAck={() => upAck(item.id)}
              onReject={() => setModal({ kind: 'reject', item })} />
          ))}
        </div>
      )}

      {modal?.kind === 'send' && <SendQcopsModal name={modal.item.name} busy={busyId === modal.item.id} onSubmit={(b) => sendQcops(modal.item.id, b)} onClose={() => setModal(null)} />}
      {modal?.kind === 'delist' && <ReasonModal title="Delist from the platform" name={modal.item.name} confirm="Delist" color="bg-slate-700 hover:bg-slate-800" placeholder="Why is this being pulled off the platform?" busy={busyId === modal.item.id} onSubmit={(r) => delist(modal.item.id, r)} onClose={() => setModal(null)} />}
      {modal?.kind === 'reject' && <ReasonModal title="Reject experience" name={modal.item.name} confirm="Reject" color="bg-rose-600 hover:bg-rose-700" placeholder="Reason (leave blank to use the submitter's / QCOPS reason)" optional busy={busyId === modal.item.id} onSubmit={(r) => upReject(modal.item.id, r)} onClose={() => setModal(null)} />}
    </div>
  );
}

function Row({ item, tab, busy, onSend, onGoLive, onDirectList, onDelist, onReject, onAck }) {
  const src = SOURCE_STYLE[item.source?.kind] || SOURCE_STYLE.admin;
  const SrcIcon = src.icon;
  const s = item.review?.summary;
  const stage = item.review?.stage;
  const qc = item.qcReview || {};
  const canDirect = item.review?.canDirectList;
  const [showAck, setShowAck] = useState(false);
  // QCOPS has sent back their acknowledgement + schedule.
  const hasAck = tab === 'level2' && !!qc.acknowledgedAt && !!qc.visitDate;
  const isReviewTab = tab === 'level1' && ['submitted', 'in_review', 'resubmitted', 'follow_up'].includes(stage);
  // Backend flag: false while the item sits with the submitter (follow_up).
  const awaitingCops = item.review?.awaitingCops !== false;
  const isResubmitted = isReviewTab && stage === 'resubmitted' && awaitingCops;
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 hover:shadow-lg transition-shadow">
      <div className="flex flex-wrap items-center gap-4">
        {item.mainImage
          ? <img src={fileUrl(item.mainImage)} alt="" className="w-14 h-14 rounded-xl object-cover border shrink-0" />
          : <div className="w-14 h-14 rounded-xl bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><ClipboardCheck size={22} /></div>}
        <div className="min-w-0 flex-1">
          <Link to={`/team/experiences/${item.id}/view`} className="font-semibold text-ink truncate hover:text-brand block">{item.name}</Link>
          <div className="text-[11px] text-ink-muted truncate">{item.supplier?.companyName || '—'}{item.location ? ` · ${item.location}` : ''}</div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${src.className}`}><SrcIcon size={11} /> {item.source?.label}</span>
            {tab === 'level1' && stage === 'approved' && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"><ShieldCheck size={11} /> Content approved</span>}
            {isReviewTab && !awaitingCops && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"><MessageSquareWarning size={11} /> Follow-up sent · with submitter</span>}
            {isResubmitted && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"><Send size={11} /> Resolved · back for review{item.review?.round ? ` · round ${item.review.round}` : ''}</span>}
            {item.review?.supplierOnboarded && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700"><Building2 size={11} /> Known supplier{item.review?.fromSupplierPortal ? ' · portal' : ''}</span>}
            {tab === 'level1' && ['submitted', 'in_review', 'resubmitted', 'follow_up'].includes(stage) && s && s.total > 0 && (
              <span className="inline-flex items-center gap-2 text-[11px] text-ink-muted">
                <span className="inline-flex items-center gap-0.5 text-emerald-600"><CircleCheck size={12} /> {s.approved}</span>
                {s.objection > 0 && <span className="inline-flex items-center gap-0.5 text-rose-600"><CircleAlert size={12} /> {s.objection}</span>}
                {s.pending > 0 && <span className="inline-flex items-center gap-0.5 text-slate-400"><Circle size={10} /> {s.pending}</span>}
                <span className="text-slate-300">of {s.total}</span>
              </span>
            )}
            {tab === 'level2' && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700"><CalendarClock size={11} /> {QC_STATUS[stage] || 'QC visit'}{qc.visitDate ? ` · ${qc.visitDate}` : ''}</span>}
            {tab === 'live_in_progress' && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"><Rocket size={11} /> To be live within 24–48h</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {tab === 'level1' && stage === 'approved' && canDirect && (
            <button onClick={onDirectList} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"><Rocket size={15} /> List directly</button>
          )}
          {tab === 'level1' && stage === 'approved' && (
            <button onClick={onSend} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-50 disabled:opacity-60"><Send size={15} /> Send to QCOPS</button>
          )}
          {tab === 'live_in_progress' && (
            <button onClick={onGoLive} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">{busy ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />} Live it Now</button>
          )}
          {tab === 'active' && (
            <button onClick={onDelist} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"><Ban size={15} /> Delist</button>
          )}
          {hasAck && (
            <button onClick={() => setShowAck((v) => !v)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-50">
              <CalendarClock size={15} /> {showAck ? 'Hide' : 'View'} acknowledgement
            </button>
          )}
          {isReviewTab && !awaitingCops ? (
            // With the submitter (follow-up sent) — reviewing is impossible
            // until they resolve, so don't let the click reach a 400 toast.
            <span title="Waiting for the submitter to resolve the objections — you'll be notified when it comes back"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 text-slate-400 text-sm font-semibold cursor-not-allowed">
              <Clock size={15} /> With submitter
            </span>
          ) : (
            <Link to={isReviewTab ? `/team/review-queue/${item.id}` : `/team/experiences/${item.id}/view`}
              title={isResubmitted ? `Objections resolved — round ${item.review?.round || 1} is back with you for review` : undefined}
              className={`relative inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold hover:brightness-105 ${isResubmitted ? 'bg-emerald-600 text-white' : 'bg-brand text-ink'}`}>
              {isResubmitted && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />}
              {isReviewTab ? (isResubmitted ? 'Review again' : 'Review') : 'View'} <ChevronRight size={15} />
            </Link>
          )}
        </div>
      </div>

      {/* QCOPS acknowledgement + their chosen schedule (Level 2). */}
      {hasAck && showAck && (
        <div className="mt-3 bg-indigo-50 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-2 flex items-center gap-1.5">
            <CircleCheck size={14} /> QCOPS sent their acknowledgement
          </div>
          <p className="text-sm text-indigo-900 mb-3">The assigned QCOPS coordinated with the supplier and scheduled their on-site visit.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Visit date</div>
              <div className="text-sm font-semibold text-ink mt-0.5">{qc.visitDate || '—'}</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Time slot</div>
              <div className="text-sm font-semibold text-ink mt-0.5">{qc.visitTime || '—'}</div>
            </div>
          </div>
          {qc.ackNote && (
            <div className="mt-3 bg-white rounded-lg px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted mb-1">Note from QCOPS</div>
              <p className="text-sm text-ink whitespace-pre-line">{qc.ackNote}</p>
            </div>
          )}
          {qc.acknowledgedAt && <div className="text-[11px] text-indigo-600 mt-2">Acknowledged {new Date(qc.acknowledgedAt).toLocaleString()}</div>}
        </div>
      )}

      {/* Under Progress detail + decision */}
      {tab === 'under_progress' && (
        <div className="mt-3 bg-amber-50 rounded-xl p-3.5 text-sm">
          <div className="text-amber-900"><span className="font-semibold">QCOPS wants {qc.changeType || ''} changes:</span> {qc.changeDetails || qc.feedback?.changeDetails || '—'}</div>
          {qc.upState === 'pending_bd' && <div className="mt-2 text-[12px] text-amber-700 inline-flex items-center gap-1.5"><Clock size={13} /> Waiting for the submitter’s response…</div>}

          {/* Acknowledge the submitter's response so they know it landed.
              Separate from the decision below — this doesn't approve anything. */}
          {['bd_approved', 'bd_rejected'].includes(qc.upState) && (
            qc.copsAck ? (
              <div className="mt-2 text-[12px] text-emerald-700 inline-flex items-center gap-1.5">
                <CircleCheck size={13} /> You acknowledged this{qc.copsAck.at ? ` · ${new Date(qc.copsAck.at).toLocaleString()}` : ''}
              </div>
            ) : (
              <button onClick={onAck} disabled={busy}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60">
                <ThumbsUp size={13} /> Got it
              </button>
            )
          )}

          {qc.supplierAck && (
            <div className="mt-2 bg-white/70 rounded-lg px-3 py-2 text-[12px] text-emerald-800">
              <span className="font-semibold">Supplier acknowledged:</span> {qc.supplierAck.note}
            </div>
          )}
          {qc.upState === 'bd_rejected' && (
            <div className="mt-2">
              <div className="text-rose-800"><span className="font-semibold">Submitter wants to reject:</span> {qc.bdReason}</div>
              <button onClick={onReject} disabled={busy} className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60"><XCircle size={13} /> Confirm rejection</button>
            </div>
          )}
          {qc.upState === 'bd_approved' && (
            <div className="mt-2">
              <div className="text-emerald-800"><span className="font-semibold">Submitter accepted.</span> {qc.bdReason}{qc.bdDeadline ? ` · deadline ${qc.bdDeadline}` : ''}</div>
              <div className="flex gap-2 mt-2">
                <button onClick={onGoLive} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"><Rocket size={13} /> Live it Now</button>
                <button onClick={onReject} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 disabled:opacity-60"><XCircle size={13} /> Reject</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'rejected' && item.reviewNote && <div className="mt-3 bg-rose-50 rounded-xl p-3 text-sm text-rose-800"><span className="font-semibold">Reason:</span> {item.reviewNote}</div>}
      {tab === 'delisted' && (item.data?.delistReason || item.reviewNote) && <div className="mt-3 bg-slate-100 rounded-xl p-3 text-sm text-slate-700"><span className="font-semibold">Reason:</span> {item.data?.delistReason || item.reviewNote}</div>}
    </div>
  );
}

// Center Ops no longer picks the timing — it hands the check to QCOPS with a
// standard turnaround note, and QCOPS coordinates the visit time with the
// supplier directly (see the QCOPS "Send acknowledgement with schedule" step).
function SendQcopsModal({ name, busy, onSubmit, onClose }) {
  return (
    <Modal title="Send for on-site QCOPS check" name={name} onClose={onClose}>
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1">Turnaround time</div>
        <p className="text-sm text-indigo-900 leading-relaxed">
          Turnaround time for the Quality check is <strong>24 to 48 hrs</strong>. The assigned QCOPS will coordinate
          the visit timing directly with the supplier — the supplier's full details are sent to them automatically.
        </p>
      </div>
      <p className="text-xs text-ink-muted mt-3">Auto-assigned to the least-busy QCOPS (round-robin). They’ll send back their own schedule once they’ve coordinated with the supplier.</p>
      <Actions busy={busy} confirm="Send to QCOPS" color="bg-indigo-600 hover:bg-indigo-700" onClose={onClose} onSubmit={() => onSubmit({})} />
    </Modal>
  );
}

function ReasonModal({ title, name, confirm, color, placeholder, optional, busy, onSubmit, onClose }) {
  const [reason, setReason] = useState('');
  const submit = () => { if (!optional && !reason.trim()) return toast.error('A reason is required'); onSubmit(reason.trim()); };
  return (
    <Modal title={title} name={name} onClose={onClose}>
      <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand" />
      <Actions busy={busy} confirm={confirm} color={color} onClose={onClose} onSubmit={submit} />
    </Modal>
  );
}

function Modal({ title, name, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-display font-bold text-lg">{title}</h2>{name && <p className="text-xs text-ink-muted mt-0.5 truncate">{name}</p>}</div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
function Actions({ busy, confirm, color, onClose, onSubmit }) {
  return (
    <div className="flex justify-end gap-2 mt-5">
      <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
      <button onClick={onSubmit} disabled={busy} className={`px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 inline-flex items-center gap-2 ${color}`}>{busy && <Loader2 size={14} className="animate-spin" />} {confirm}</button>
    </div>
  );
}
