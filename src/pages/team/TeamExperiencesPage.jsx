import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Loader2, Sparkles, Clock, MessageSquareWarning, Send, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { useTeamAuth } from '../../context/TeamAuthContext.jsx';

const STATUS_STYLE = {
  draft: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-blue-50 text-blue-700',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
};
const STATUS_LABEL = { pending_review: 'Pending Review' };

export default function TeamExperiencesPage() {
  const { member } = useTeamAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
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

  const resubmit = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/experiences/${id}/resubmit`);
      toast.success('Resubmitted for review');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = items.filter((e) => e.status === 'pending_review').length;
  const needsChangesCount = items.filter((e) => e.status === 'draft' && e.reviewNote).length;

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
          {needsChangesCount} experience{needsChangesCount > 1 ? 's need' : ' needs'} changes before it can go live — see below.
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
              const needsChanges = e.status === 'draft' && e.reviewNote;
              return (
                <li key={e.id} className="px-4 sm:px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {e.mainImage ? (
                      <img src={fileUrl(e.mainImage)} alt="" className="w-11 h-11 rounded-lg object-cover border shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><Sparkles size={18} /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink truncate">{e.name}</div>
                      <div className="text-[11px] text-ink-muted truncate">
                        {e.supplier?.companyName || '—'}{e.location ? ` · ${e.location}` : ''}
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${STATUS_STYLE[e.status] || 'bg-slate-100'}`}>
                      {needsChanges ? 'Changes requested' : (STATUS_LABEL[e.status] || e.status)}
                    </span>
                  </div>

                  {needsChanges && (
                    <div className="mt-3 ml-14 bg-rose-50 rounded-xl p-3.5">
                      <p className="text-sm text-rose-800">{e.reviewNote}</p>
                      <div className="flex gap-2 mt-2.5">
                        <Link to={`${e.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100">
                          <Pencil size={13} /> Edit
                        </Link>
                        <button onClick={() => resubmit(e.id)} disabled={busyId === e.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60">
                          <Send size={13} /> Resubmit for review
                        </button>
                      </div>
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
