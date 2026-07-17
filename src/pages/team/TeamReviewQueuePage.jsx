import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, ClipboardCheck, UserCog, Truck, Home, Building2, Send, ChevronRight,
  CircleCheck, CircleAlert, Circle,
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

export default function TeamReviewQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qcopsModal, setQcopsModal] = useState(null); // { id, name }
  const [busyId, setBusyId] = useState(null);
  const { onQueueChange } = useReviewNotify();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/team/review-queue');
      setItems(res.data?.data?.items || []);
    } catch {
      toast.error('Could not load the review queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Real-time: refresh when a new/resubmitted item lands (or QCOPS assigned).
  useEffect(() => onQueueChange(() => load()), [onQueueChange, load]);

  const sendQcops = async (note) => {
    if (!note.trim()) return toast.error('Describe the problem');
    const { id } = qcopsModal;
    setBusyId(id);
    try {
      const res = await api.post(`/team/review-queue/${id}/send-qcops`, { note });
      toast.success(res.data?.message || 'Sent to QCOPS');
      setQcopsModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const followups = items.filter((i) => i.review?.lane === 'followup');
  const fresh = items.filter((i) => i.review?.lane !== 'followup');

  const renderRow = (item) => {
    const src = SOURCE_STYLE[item.source?.kind] || SOURCE_STYLE.admin;
    const SrcIcon = src.icon;
    const s = item.review?.summary;
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
            {item.qcopsTeamMemberId && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                <Send size={10} /> With QCOPS
              </span>
            )}
            {s && s.total > 0 && (
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
          <button onClick={() => setQcopsModal({ id: item.id, name: item.name })} disabled={busyId === item.id}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-50 disabled:opacity-60">
            <Send size={15} /> Send to QCOPS
          </button>
          <Link to={`/team/review-queue/${item.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-105">
            Review <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">Review Queue</h1>
        <p className="text-sm text-ink-muted">Open an entry to review it section by section — approve each, or raise an objection.</p>
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
          {followups.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-2">
                Follow-up <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{followups.length}</span>
              </h2>
              <div className="space-y-3">{followups.map(renderRow)}</div>
            </div>
          )}
          {fresh.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2 flex items-center gap-2">
                New submissions <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{fresh.length}</span>
              </h2>
              <div className="space-y-3">{fresh.map(renderRow)}</div>
            </div>
          )}
        </div>
      )}

      {qcopsModal && (
        <QcopsModal name={qcopsModal.name} busy={busyId === qcopsModal.id} onSubmit={sendQcops} onClose={() => setQcopsModal(null)} />
      )}
    </div>
  );
}

function QcopsModal({ name, busy, onSubmit, onClose }) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg">Send to QCOPS</h2>
          <p className="text-xs text-ink-muted mt-0.5 truncate">{name}</p>
        </div>
        <div className="px-6 py-5">
          <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={4}
            placeholder="What is the problem? Why is this being escalated to QCOPS?"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
          <p className="text-xs text-ink-muted mt-2">It will be auto-assigned to the least-busy QCOPS member (round-robin).</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
          <button onClick={() => onSubmit(note)} disabled={busy}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />} Send to QCOPS
          </button>
        </div>
      </div>
    </div>
  );
}
