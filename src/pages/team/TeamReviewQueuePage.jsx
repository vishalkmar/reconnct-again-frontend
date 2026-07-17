import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, ClipboardCheck, UserCog, Truck, Home, Building2, Send, ChevronRight,
  CircleCheck, CircleAlert, Circle, CalendarClock, ShieldCheck, Star, Check, X, Clipboard,
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

const QC_STATUS = {
  qc_assigned: { label: 'Awaiting QCOPS visit', cls: 'bg-indigo-50 text-indigo-700' },
  qc_acknowledged: { label: 'QCOPS acknowledged', cls: 'bg-indigo-50 text-indigo-700' },
  qc_onsite: { label: 'QCOPS on-site now', cls: 'bg-blue-50 text-blue-700' },
  qc_feedback: { label: 'Feedback ready', cls: 'bg-emerald-50 text-emerald-700' },
};

export default function TeamReviewQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState([]);
  const [sendModal, setSendModal] = useState(null); // { id, name }
  const [fbModal, setFbModal] = useState(null); // item
  const [busyId, setBusyId] = useState(null);
  const { onQueueChange } = useReviewNotify();

  const load = useCallback(async () => {
    try {
      const [q, s] = await Promise.all([
        api.get('/team/review-queue'),
        api.get('/team/qc/feedback-schema').catch(() => ({ data: { data: { fields: [] } } })),
      ]);
      setItems(q.data?.data?.items || []);
      setSchema(s.data?.data?.fields || []);
    } catch {
      toast.error('Could not load the review queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onQueueChange(() => load()), [onQueueChange, load]);

  const sendQcops = async ({ visitDate, visitTime, instructions }) => {
    const { id } = sendModal;
    setBusyId(id);
    try {
      const res = await api.post(`/team/review-queue/${id}/send-qcops`, { visitDate, visitTime, instructions });
      toast.success(res.data?.message || 'Assigned to QCOPS');
      setSendModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const decideQc = async (id, action, reason) => {
    setBusyId(id);
    try {
      await api.post(`/team/qc/${id}/${action}`, action === 'reject' ? { reason } : {});
      toast.success(action === 'approve' ? 'Approved — now live on web & app' : 'Rejected — submitter notified');
      setFbModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const followups = items.filter((i) => i.review?.lane === 'followup');
  const qc = items.filter((i) => i.review?.lane === 'qc');
  const fresh = items.filter((i) => i.review?.lane === 'new');

  const renderRow = (item) => {
    const src = SOURCE_STYLE[item.source?.kind] || SOURCE_STYLE.admin;
    const SrcIcon = src.icon;
    const s = item.review?.summary;
    const stage = item.review?.stage;
    const qcStatus = QC_STATUS[stage];
    return (
      <div key={item.id} className="bg-white rounded-2xl shadow-soft p-5 flex flex-wrap items-center gap-4">
        {item.mainImage ? (
          <img src={fileUrl(item.mainImage)} alt="" className="w-14 h-14 rounded-xl object-cover border shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><ClipboardCheck size={22} /></div>
        )}

        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink truncate">{item.name}</div>
          <div className="text-[11px] text-ink-muted truncate">
            {item.supplier?.companyName || '—'}{item.location ? ` · ${item.location}` : ''}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${src.className}`}>
              <SrcIcon size={11} /> {item.source?.label}
            </span>
            {qcStatus && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${qcStatus.cls}`}>
                <CalendarClock size={11} /> {qcStatus.label}
              </span>
            )}
            {item.review?.qc?.visitDate && stage !== 'qc_feedback' && (
              <span className="text-[11px] text-ink-muted">Visit: {item.review.qc.visitDate} {item.review.qc.visitTime}</span>
            )}
            {stage === 'approved' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"><ShieldCheck size={11} /> Content approved</span>
            )}
            {(!stage || ['submitted', 'in_review', 'resubmitted'].includes(stage)) && s && s.total > 0 && (
              <span className="inline-flex items-center gap-2 text-[11px] text-ink-muted">
                <span className="inline-flex items-center gap-0.5 text-emerald-600"><CircleCheck size={12} /> {s.approved}</span>
                {s.objection > 0 && <span className="inline-flex items-center gap-0.5 text-rose-600"><CircleAlert size={12} /> {s.objection}</span>}
                {s.pending > 0 && <span className="inline-flex items-center gap-0.5 text-slate-400"><Circle size={10} /> {s.pending}</span>}
                <span className="text-slate-300">of {s.total}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {stage === 'approved' && (
            <button onClick={() => setSendModal({ id: item.id, name: item.name })} disabled={busyId === item.id}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-50 disabled:opacity-60">
              <Send size={15} /> Send to QCOPS
            </button>
          )}
          {stage === 'qc_feedback' && (
            <button onClick={() => setFbModal(item)} disabled={busyId === item.id}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
              <Clipboard size={15} /> Review QC feedback
            </button>
          )}
          <Link to={`/team/review-queue/${item.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-105">
            {stage === 'approved' || stage?.startsWith('qc_') ? 'View' : 'Review'} <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    );
  };

  const Lane = ({ title, color, list }) => list.length > 0 && (
    <div>
      <h2 className={`text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-2 ${color}`}>
        {title} <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{list.length}</span>
      </h2>
      <div className="space-y-3">{list.map(renderRow)}</div>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">Review Queue</h1>
        <p className="text-sm text-ink-muted">Review content section by section, then schedule an on-site QCOPS check before it goes live.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center mb-4"><ClipboardCheck size={26} /></div>
          <h2 className="font-semibold text-lg">All caught up</h2>
          <p className="text-sm text-ink-muted mt-1">Nothing is waiting for review right now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Lane title="On-site quality check" color="text-indigo-600" list={qc} />
          <Lane title="Follow-up" color="text-amber-600" list={followups} />
          <Lane title="New submissions" color="text-ink-muted" list={fresh} />
        </div>
      )}

      {sendModal && (
        <SendQcopsModal name={sendModal.name} busy={busyId === sendModal.id} onSubmit={sendQcops} onClose={() => setSendModal(null)} />
      )}
      {fbModal && (
        <QcFeedbackModal item={fbModal} schema={schema} busy={busyId === fbModal.id}
          onApprove={() => decideQc(fbModal.id, 'approve')}
          onReject={(reason) => decideQc(fbModal.id, 'reject', reason)}
          onClose={() => setFbModal(null)} />
      )}
    </div>
  );
}

function SendQcopsModal({ name, busy, onSubmit, onClose }) {
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const submit = () => {
    if (!visitDate || !visitTime) return toast.error('Choose a date and time');
    if (!instructions.trim()) return toast.error('Add instructions');
    onSubmit({ visitDate, visitTime, instructions: instructions.trim() });
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg">Schedule the QCOPS visit</h2>
          <p className="text-xs text-ink-muted mt-0.5 truncate">{name}</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wide">Visit date</label>
              <input type="date" min={today} value={visitDate} onChange={(e) => setVisitDate(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink uppercase tracking-wide">Time slot</label>
              <input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink uppercase tracking-wide">Instructions — what to take care of on-site</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3}
              placeholder="e.g. Verify the pool and parking match the photos; check fire-safety signage."
              className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
          </div>
          <p className="text-xs text-ink-muted">Auto-assigned to the least-busy QCOPS member (round-robin).</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />} <Send size={14} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldValue({ field, value }) {
  if (value == null || value === '') return <span className="text-ink-muted italic">—</span>;
  if (field.type === 'rating') {
    return (
      <span className="inline-flex items-center gap-0.5 text-amber-500">
        {Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />)}
      </span>
    );
  }
  if (field.type === 'boolean') return <span className={value ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>{value ? 'Yes' : 'No'}</span>;
  if (field.type === 'select') return <span className="font-semibold capitalize">{String(value).replace('_', ' ')}</span>;
  return <span className="text-ink">{value}</span>;
}

function QcFeedbackModal({ item, schema, busy, onApprove, onReject, onClose }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const fb = item.qcReview?.feedback || {};
  const rec = fb.recommendation;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg">QCOPS on-site feedback</h2>
          <p className="text-xs text-ink-muted mt-0.5 truncate">{item.name}</p>
        </div>
        <div className="px-6 py-4 overflow-y-auto">
          {rec && (
            <div className={`rounded-xl px-4 py-2.5 mb-3 text-sm font-semibold ${rec === 'approve' ? 'bg-emerald-50 text-emerald-700' : rec === 'reject' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
              QCOPS recommends: {String(rec).replace('_', ' ')}
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {schema.map((f) => (
              <div key={f.key} className="py-2.5 flex items-start justify-between gap-4">
                <span className="text-sm text-ink-muted flex-1">{f.label}</span>
                <span className="text-sm text-right"><FieldValue field={f} value={fb[f.key]} /></span>
              </div>
            ))}
          </div>
          {rejecting && (
            <div className="mt-3">
              <label className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Rejection reason (emailed to the submitter)</label>
              <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                className="mt-1.5 w-full px-3 py-2 rounded-lg border border-rose-200 text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none" />
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
          {!rejecting ? (
            <>
              <button onClick={() => setRejecting(true)} disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 disabled:opacity-60"><X size={15} /> Reject</button>
              <button onClick={onApprove} disabled={busy}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />} Approve & go live</button>
            </>
          ) : (
            <button onClick={() => (reason.trim() ? onReject(reason.trim()) : toast.error('Add a reason'))} disabled={busy}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />} Confirm reject</button>
          )}
        </div>
      </div>
    </div>
  );
}
