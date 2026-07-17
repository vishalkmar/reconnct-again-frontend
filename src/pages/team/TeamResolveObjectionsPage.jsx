import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, CircleAlert, Lightbulb, Pencil, Send, GitCompareArrows, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { RENDERERS, applyBefore } from '../../components/team/sectionRenderers.jsx';
import ObjectionThread from '../../components/team/ObjectionThread.jsx';

/* Submitter's "resolve objections" workspace. For each objected section it
   shows the objection, a before/after diff, an edit shortcut, and a REQUIRED
   resolution note. "Review again" is blocked until every objection has both a
   note (and ideally an actual change — flagged if not). */

export default function TeamResolveObjectionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [showBefore, setShowBefore] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/experiences/${id}`);
      setExp(res.data?.data?.item || null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  if (!exp) return <div className="p-16 text-center text-ink-muted">Experience not found.</div>;

  const objections = exp.review?.summary?.objections || [];
  const suggestion = exp.review?.suggestion;
  const thread = exp.review?.thread || {};

  if (objections.length === 0) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => navigate('/team/experiences')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-5"><ArrowLeft size={16} /> Back</button>
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center mb-4"><CheckCircle2 size={26} /></div>
          <h2 className="font-semibold text-lg">No open objections</h2>
          <p className="text-sm text-ink-muted mt-1">There’s nothing to resolve on this experience right now.</p>
        </div>
      </div>
    );
  }

  const allNotesFilled = objections.every((o) => (notes[o.key] || '').trim());
  const unchanged = objections.filter((o) => !o.changed);

  const reviewAgain = async () => {
    if (!allNotesFilled) return toast.error('Add a resolution note for every objection');
    setBusy(true);
    try {
      const resolutions = {};
      objections.forEach((o) => { resolutions[o.key] = notes[o.key].trim(); });
      await api.post(`/experiences/${id}/resubmit`, { resolutions });
      toast.success('Sent back to Center Ops for review');
      navigate('/team/experiences');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl pb-24">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <button onClick={() => navigate('/team/experiences')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand"><ArrowLeft size={16} /> Back</button>
        <Link to={`/team/experiences/${id}/edit`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-105">
          <Pencil size={15} /> Open the form to edit
        </Link>
      </div>

      <h1 className="text-2xl font-display font-bold mb-1">Resolve objections</h1>
      <p className="text-sm text-ink-muted mb-4">{exp.name} · {objections.length} objection{objections.length > 1 ? 's' : ''} to address before you can send it back.</p>

      {suggestion && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-3 mb-4">
          <Lightbulb size={16} className="mt-0.5 shrink-0" />
          <span><span className="font-semibold">Center Ops suggestion:</span> {suggestion}</span>
        </div>
      )}

      <div className="space-y-4">
        {objections.map((o) => {
          const Render = RENDERERS[o.key];
          const before = o.before ? applyBefore(exp, o.before) : null;
          return (
            <div key={o.key} className="bg-white rounded-2xl shadow-soft border-l-4 border-rose-400">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-semibold text-lg">{o.label}</h2>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${o.changed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  <GitCompareArrows size={12} /> {o.changed ? 'Changed' : 'Not changed yet'}
                </span>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="bg-rose-50 rounded-xl px-4 py-3 text-sm text-rose-800">
                  <CircleAlert size={14} className="inline mr-1 -mt-0.5" /><span className="font-semibold">Objection:</span> {o.objection}
                </div>

                {/* Past back-and-forth on this section */}
                {(thread[o.key] || []).length > 1 && (
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-2">Conversation so far</div>
                    <ObjectionThread thread={thread[o.key]} />
                  </div>
                )}

                {/* Current (after) */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 mb-1.5">Now</div>
                  {Render ? Render(exp) : <span className="text-sm text-ink-muted">—</span>}
                </div>

                {/* Before (diff) */}
                {before && Render && (
                  <div>
                    <button onClick={() => setShowBefore((s) => ({ ...s, [o.key]: !s[o.key] }))}
                      className="text-xs font-semibold text-ink-muted hover:text-brand inline-flex items-center gap-1">
                      <GitCompareArrows size={13} /> {showBefore[o.key] ? 'Hide' : 'Show'} what it was before
                    </button>
                    {showBefore[o.key] && (
                      <div className="mt-2 opacity-70 border border-dashed border-slate-200 rounded-xl p-3">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Before</div>
                        {Render(before)}
                      </div>
                    )}
                  </div>
                )}

                {/* Resolution note */}
                <div>
                  <label className="text-xs font-semibold text-ink uppercase tracking-wide">How did you fix it? <span className="text-rose-500">*</span></label>
                  <textarea value={notes[o.key] || ''} onChange={(e) => setNotes((n) => ({ ...n, [o.key]: e.target.value }))} rows={2}
                    className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                    placeholder="e.g. Replaced the cover photo and added 4 more gallery images." />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {unchanged.length > 0 && (
        <div className="mt-4 text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-3">
          {unchanged.length} section{unchanged.length > 1 ? 's haven’t' : ' hasn’t'} actually changed yet — open the form and edit before sending back, or Center Ops will see it’s unchanged.
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 backdrop-blur border-t border-slate-200 px-4 sm:px-8 py-3 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <span className="text-sm text-ink-muted">{Object.values(notes).filter((v) => (v || '').trim()).length}/{objections.length} notes added</span>
          <button onClick={reviewAgain} disabled={busy || !allNotesFilled} title={allNotesFilled ? '' : 'Add a note for every objection'}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Review again
          </button>
        </div>
      </div>
    </div>
  );
}
