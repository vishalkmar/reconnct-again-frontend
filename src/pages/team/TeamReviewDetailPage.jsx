import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Check, X, Pencil,
  ShieldCheck, MessageSquareWarning, CircleCheck, CircleAlert, Circle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { RENDERERS } from '../../components/team/sectionRenderers.jsx';
import ObjectionThread from '../../components/team/ObjectionThread.jsx';

/* ────────────────────────────────────────────────────────────────────────
   Center Ops (COPS) section-by-section review.
   Renders the full experience the SAME way the view page does, but every
   section carries Approve / Objection / Edit controls. The bottom action bar
   gates Final Approve behind "every section approved".
   ──────────────────────────────────────────────────────────────────────── */

const DECISION_PILL = {
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700', Icon: CircleCheck },
  objection: { label: 'Objection', className: 'bg-rose-50 text-rose-700', Icon: CircleAlert },
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-500', Icon: Circle },
};

function SectionCard({ section, exp, busy, onDecide }) {
  const [objecting, setObjecting] = useState(false);
  const [reason, setReason] = useState(section.objection || '');
  const decided = section.decision === 'approved' || section.decision === 'objection';
  const pill = DECISION_PILL[section.decision] || DECISION_PILL.pending;
  const Render = RENDERERS[section.key];

  const startObjection = () => { setReason(section.objection || ''); setObjecting(true); };
  const saveObjection = () => {
    if (!reason.trim()) return toast.error('Add a reason for the objection');
    onDecide(section.key, 'objection', reason.trim());
    setObjecting(false);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-soft border-l-4 ${section.decision === 'approved' ? 'border-emerald-400' : section.decision === 'objection' ? 'border-rose-400' : 'border-transparent'}`}>
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-2.5">
          <h2 className="font-semibold text-lg">{section.label}</h2>
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${pill.className}`}>
            <pill.Icon size={12} /> {pill.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onDecide(section.key, 'approved')}
            disabled={busy || decided}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition
              ${section.decision === 'approved' ? 'bg-emerald-500 text-white' : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}
              ${busy || decided ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Check size={15} /> Approve
          </button>
          <button
            onClick={startObjection}
            disabled={busy || decided}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition
              ${section.decision === 'objection' ? 'bg-rose-500 text-white' : 'border border-rose-200 text-rose-600 hover:bg-rose-50'}
              ${busy || decided ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <X size={15} /> Objection
          </button>
          {decided && (
            <button
              onClick={() => { onDecide(section.key, 'clear'); setObjecting(false); }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-ink-muted text-sm font-semibold hover:bg-surface-alt disabled:opacity-60"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Full objection⇄resolution history for this section across rounds */}
      {section.thread && section.thread.length > 0 && (
        <div className="mx-5 sm:mx-6 mt-4 bg-slate-50 rounded-xl px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-2">Objection history</div>
          <ObjectionThread thread={section.thread} />
        </div>
      )}

      {section.decision === 'objection' && !objecting && (
        <div className="mx-5 sm:mx-6 mt-4 bg-rose-50 rounded-xl px-4 py-3 text-sm text-rose-800">
          <span className="font-semibold">Objection:</span> {section.objection}
        </div>
      )}

      {objecting && (
        <div className="mx-5 sm:mx-6 mt-4 bg-rose-50/60 rounded-xl p-4">
          <label className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Why is there an objection on this section?</label>
          <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            className="mt-2 w-full px-3 py-2 rounded-lg border border-rose-200 text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none"
            placeholder="Describe what needs to change in this section…" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setObjecting(false)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-ink-muted hover:bg-white">Cancel</button>
            <button onClick={saveObjection} disabled={busy} className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60">Save objection</button>
          </div>
        </div>
      )}

      <div className="px-5 sm:px-6 py-5">
        {Render ? Render(exp) : <div className="text-sm text-ink-muted">No preview available.</div>}
      </div>
    </div>
  );
}

export default function TeamReviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exp, setExp] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [modal, setModal] = useState(null); // 'reject' | 'followup'

  const load = useCallback(async () => {
    try {
      const [expRes, revRes] = await Promise.all([
        api.get(`/experiences/${id}`),
        api.get(`/team/review-queue/${id}`),
      ]);
      setExp(expRes.data?.data?.item || null);
      const r = revRes.data?.data?.review;
      setReview(r || null);
      setSuggestion(r?.suggestion || '');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load this review');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const decide = async (key, decision, objection) => {
    setBusy(true);
    try {
      const res = await api.post(`/team/review-queue/${id}/section`, { key, decision, objection });
      setReview(res.data?.data?.review || review);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const saveSuggestion = async () => {
    if ((review?.suggestion || '') === suggestion) return;
    try {
      const res = await api.put(`/team/review-queue/${id}/suggestion`, { suggestion });
      setReview(res.data?.data?.review || review);
    } catch { /* non-blocking */ }
  };

  const finalApprove = async () => {
    setBusy(true);
    try {
      await api.post(`/team/review-queue/${id}/final-approve`);
      toast.success('Content approved — now schedule the QCOPS visit from the queue');
      navigate('/team/review-queue');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
      setBusy(false);
    }
  };

  const runModalAction = async (text) => {
    setBusy(true);
    try {
      if (modal === 'followup') {
        await api.post(`/team/review-queue/${id}/follow-up`, { suggestion: text });
        toast.success('Sent back to the submitter');
      } else if (modal === 'reject') {
        if (!text.trim()) { setBusy(false); return toast.error('A reason is required'); }
        await api.post(`/team/review-queue/${id}/reject`, { note: text });
        toast.success('Rejected');
      }
      setModal(null);
      navigate('/team/review-queue');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
      setBusy(false);
    }
  };

  const summary = review?.summary;
  const canFinal = !!summary?.allApproved;
  const canFollowUp = !!summary?.hasObjection;

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  if (!exp || !review) return <div className="p-16 text-center text-ink-muted">This experience is not awaiting review.</div>;

  const src = review.source;

  return (
    <div className="max-w-4xl pb-28">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <button onClick={() => navigate('/team/review-queue')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand">
          <ArrowLeft size={16} /> Back to queue
        </button>
        <div className="flex items-center gap-2 text-sm">
          {review.round > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold text-xs">Follow-up · round {review.round}</span>}
          {src?.label && <span className="text-ink-muted">Submitted by <span className="font-semibold text-ink">{src.label}</span></span>}
        </div>
      </div>

      {/* Progress rollup */}
      {summary && (
        <div className="bg-white rounded-2xl shadow-soft px-5 py-4 mb-5 flex items-center gap-5 flex-wrap text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold"><ShieldCheck size={16} className="text-brand" /> {summary.approved}/{summary.total} sections approved</span>
          {summary.objection > 0 && <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold"><CircleAlert size={15} /> {summary.objection} objection{summary.objection > 1 ? 's' : ''}</span>}
          {summary.pending > 0 && <span className="inline-flex items-center gap-1.5 text-slate-500"><Circle size={13} /> {summary.pending} pending</span>}
        </div>
      )}

      <div className="space-y-4">
        {review.sections.map((s) => (
          <SectionCard key={s.key} section={s} exp={exp} busy={busy} onDecide={decide} />
        ))}
      </div>

      {/* Suggestion */}
      <div className="bg-white rounded-2xl shadow-soft p-5 sm:p-6 mt-4">
        <label className="font-semibold">Suggestion <span className="text-ink-muted font-normal text-sm">(optional)</span></label>
        <textarea value={suggestion} onChange={(e) => setSuggestion(e.target.value)} onBlur={saveSuggestion} rows={3}
          className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
          placeholder="Anything you'd like to suggest to the submitter…" />
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 backdrop-blur border-t border-slate-200 px-4 sm:px-8 py-3 z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => setModal('reject')} disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 disabled:opacity-60">
            <X size={15} /> Reject
          </button>
          <button onClick={() => setModal('followup')} disabled={busy || !canFollowUp} title={canFollowUp ? '' : 'Add an objection to a section first'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed">
            <MessageSquareWarning size={15} /> Follow-up
          </button>
          <button onClick={finalApprove} disabled={busy || !canFinal} title={canFinal ? '' : 'Approve every section first'}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
            <ShieldCheck size={16} /> Final Approve
          </button>
        </div>
      </div>

      {modal && (
        <ActionModal
          kind={modal}
          defaultText={modal === 'followup' ? suggestion : ''}
          onSubmit={runModalAction}
          onClose={() => setModal(null)}
          busy={busy}
        />
      )}
    </div>
  );
}

const MODAL_META = {
  followup: { title: 'Start a follow-up', placeholder: 'Optional note / suggestion for the submitter…', confirm: 'Send follow-up', color: 'bg-amber-500 hover:bg-amber-600', optional: true },
  reject: { title: 'Reject experience', placeholder: 'Why is this being rejected?', confirm: 'Reject', color: 'bg-rose-600 hover:bg-rose-700', optional: false },
};

function ActionModal({ kind, defaultText, onSubmit, onClose, busy }) {
  const m = MODAL_META[kind];
  const [text, setText] = useState(defaultText || '');
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-display font-bold text-lg">{m.title}</h2></div>
        <div className="px-6 py-5">
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={m.placeholder} rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
          <button onClick={() => onSubmit(text)} disabled={busy}
            className={`px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 inline-flex items-center gap-2 ${m.color}`}>
            {busy && <Loader2 size={14} className="animate-spin" />} {m.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
