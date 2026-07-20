import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, MessageSquareWarning, XCircle, CheckCircle2, Hourglass, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/*
  The Under Progress response — QCOPS passed the visit but asked for minor or
  major changes, and someone has to answer: reject with a reason, or accept
  with a completion deadline.

  Who that "someone" is depends on who submitted the listing: the BD for their
  own submissions, or the supplier's Key Account Manager when the supplier
  added it themselves. Both see this exact block, so the responsibility moves
  without the workflow changing.

  `item` needs { id, qc, reviewNote }. `inset` matches the BD board's avatar
  indent; the AM's table rows sit flush.
*/
export default function UnderProgressBlock({ item, onChanged, inset = false }) {
  const [modal, setModal] = useState(null); // 'reject' | 'approve'
  const [reason, setReason] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = item.qc || {};

  const submit = async (decision) => {
    if (!reason.trim()) return toast.error('A reason is required');
    if (decision === 'approve' && !deadline) return toast.error('Set a completion deadline (date & time)');
    setBusy(true);
    try {
      await api.post(`/experiences/${item.id}/up-respond`, { decision, reason: reason.trim(), deadline });
      toast.success(decision === 'reject' ? 'Sent to Center Ops' : 'Accepted — sent to Center Ops');
      setModal(null);
      onChanged && onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <div className={`mt-3 bg-amber-50 rounded-xl p-3.5 ${inset ? 'sm:ml-14' : ''}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1.5 flex items-center gap-1.5">
        <MessageSquareWarning size={14} /> QCOPS suggested {qc.changeType || ''} changes
      </div>
      <p className="text-sm text-amber-900">{qc.changeDetails || item.reviewNote}</p>

      {qc.upState === 'pending_bd' && (
        !modal ? (
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
        )
      )}

      {qc.upState === 'bd_rejected' && <div className="mt-2 text-[12px] text-rose-700 inline-flex items-center gap-1.5"><XCircle size={13} /> You rejected — awaiting Center Ops confirmation.</div>}
      {qc.upState === 'bd_approved' && <div className="mt-2 text-[12px] text-emerald-700 inline-flex items-center gap-1.5"><Hourglass size={13} /> Accepted{qc.bdDeadline ? ` · deadline ${qc.bdDeadline}` : ''} — awaiting Center Ops to make it live.</div>}

      {/* Two-way handshake on your response — who has picked it up so far. */}
      {['bd_approved', 'bd_rejected'].includes(qc.upState) && (
        <AckRow qc={qc} showSupplier={qc.upState === 'bd_approved'} />
      )}

      <Link to={`/team/experiences/${item.id}/view`} className="inline-block mt-2.5 text-xs font-semibold text-amber-800 underline">View full details</Link>
    </div>
  );
}

/* Who has acknowledged the response. Center Ops just taps "Got it"; the
   supplier has to write what they'll do, so theirs opens to reveal that note. */
function AckRow({ qc, showSupplier }) {
  const [open, setOpen] = useState(false);
  const sup = qc.supplierAck;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      {qc.copsAck ? (
        <span title={qc.copsAck.at ? new Date(qc.copsAck.at).toLocaleString() : ''}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
          <CheckCircle2 size={12} /> Ack from Center Ops{qc.copsAck.byName ? ` · ${qc.copsAck.byName}` : ''}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-white text-amber-700 border border-amber-200">
          <Hourglass size={12} /> Awaiting Center Ops ack
        </span>
      )}

      {showSupplier && (sup ? (
        <button onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
          <CheckCircle2 size={12} /> Received from supplier {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-white text-amber-700 border border-amber-200">
          <Hourglass size={12} /> Awaiting supplier ack
        </span>
      ))}

      {open && sup && (
        <div className="w-full mt-1 bg-white rounded-lg border border-emerald-200 px-3 py-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
            Supplier’s confirmation{sup.at ? ` · ${new Date(sup.at).toLocaleString()}` : ''}
          </div>
          <p className="text-sm text-ink whitespace-pre-line">{sup.note}</p>
        </div>
      )}
    </div>
  );
}
