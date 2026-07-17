import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Loader2, Sparkles, Clock, MessageSquareWarning, Send, Pencil, CircleAlert, Lightbulb, CircleCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { useTeamAuth } from '../../context/TeamAuthContext.jsx';
import { useReviewNotify } from '../../context/ReviewNotifyContext.jsx';

const STATUS_STYLE = {
  draft: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-blue-50 text-blue-700',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
};
const STATUS_LABEL = { pending_review: 'Pending Review', archived: 'Rejected', published: 'Live' };

export default function TeamExperiencesPage() {
  const { member } = useTeamAuth();
  const { items: notifs } = useReviewNotify();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/experiences');
      const mine = (res.data?.data?.items || []).filter((e) => e.createdByTeamMemberId === member.id);
      setItems(mine);
    } catch {
      toast.error('Could not load experiences');
    } finally {
      setLoading(false);
    }
  }, [member.id]);

  useEffect(() => { load(); }, [load]);
  // Real-time: reload when a review notification arrives.
  useEffect(() => { if (notifs.length) load(); }, [notifs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = items.filter((e) => e.status === 'pending_review').length;
  // "Needs changes" now = a follow-up came back (draft with objections or a legacy note).
  const needsChanges = (e) => e.status === 'draft' && (e.review?.summary?.objection > 0 || e.reviewNote);
  const needsChangesCount = items.filter(needsChanges).length;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">My Experiences</h1>
          <p className="text-sm text-ink-muted">Listings you&apos;ve added — new ones go to Center Ops for review before going live.</p>
        </div>
        <Link to="new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105">
          <Plus size={18} /> New experience
        </Link>
      </div>

      {needsChangesCount > 0 && (
        <div className="flex items-center gap-2.5 bg-rose-50 text-rose-700 rounded-xl px-4 py-3 mb-3 text-sm font-medium">
          <MessageSquareWarning size={16} />
          {needsChangesCount} experience{needsChangesCount > 1 ? 's need' : ' needs'} changes before going live — see the objections below.
        </div>
      )}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2.5 bg-blue-50 text-blue-700 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
          <Clock size={16} />
          {pendingCount} experience{pendingCount > 1 ? 's are' : ' is'} awaiting Center Ops review.
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4"><Sparkles size={26} /></div>
          <h2 className="font-semibold text-lg">No experiences yet</h2>
          <p className="text-sm text-ink-muted mt-1">Add your first listing for a supplier.</p>
          <Link to="new" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-ink font-semibold">New experience</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {items.map((e) => {
              const flagged = needsChanges(e);
              const summary = e.review?.summary;
              const objections = summary?.objections || [];
              const suggestion = e.review?.suggestion || e.reviewSuggestion;
              return (
                <li key={e.id} className="px-4 sm:px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {e.mainImage ? (
                      <img src={fileUrl(e.mainImage)} alt="" className="w-11 h-11 rounded-lg object-cover border shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><Sparkles size={18} /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link to={`${e.id}/view`} className="font-semibold text-ink truncate hover:text-brand block">{e.name}</Link>
                      <div className="text-[11px] text-ink-muted truncate">
                        {e.supplier?.companyName || '—'}{e.location ? ` · ${e.location}` : ''}
                        {e.review?.round > 0 && <span className="ml-1 text-amber-600">· follow-up round {e.review.round}</span>}
                      </div>
                    </div>
                    {flagged && summary?.approved > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                        <CircleCheck size={13} /> {summary.approved}/{summary.total} approved
                      </span>
                    )}
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${STATUS_STYLE[e.status] || 'bg-slate-100'}`}>
                      {flagged ? 'Objections' : (STATUS_LABEL[e.status] || e.status)}
                    </span>
                  </div>

                  {flagged && (
                    <div className="mt-3 sm:ml-14 bg-rose-50 rounded-xl p-3.5">
                      {objections.length > 0 ? (
                        <>
                          <div className="text-xs font-bold uppercase tracking-wide text-rose-600 mb-2 flex items-center gap-1.5">
                            <CircleAlert size={14} /> {objections.length} objection{objections.length > 1 ? 's' : ''} to fix
                          </div>
                          <ul className="space-y-2">
                            {objections.map((o) => (
                              <li key={o.key} className="text-sm">
                                <span className="font-semibold text-rose-800">{o.label}:</span>{' '}
                                <span className="text-rose-700">{o.objection}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-rose-800">{e.reviewNote}</p>
                      )}

                      {suggestion && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                          <Lightbulb size={15} className="mt-0.5 shrink-0" />
                          <span><span className="font-semibold">Suggestion:</span> {suggestion}</span>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <Link to={`${e.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100">
                          <Pencil size={13} /> Edit in form
                        </Link>
                        <Link to={`${e.id}/resolve`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700">
                          <Send size={13} /> Resolve &amp; review again
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Final rejection (after Center Ops / QCOPS) — reason + details */}
                  {!flagged && e.status === 'archived' && (
                    <div className="mt-3 sm:ml-14 bg-rose-50 rounded-xl p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wide text-rose-600 mb-1.5 flex items-center gap-1.5">
                        <CircleAlert size={14} /> Rejected
                      </div>
                      {e.reviewNote && <p className="text-sm text-rose-800">{e.reviewNote}</p>}
                      <Link to={`${e.id}/view`}
                        className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100">
                        View full details
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
