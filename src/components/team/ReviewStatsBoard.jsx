import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, Clock, MessageSquareWarning, CheckCircle2, XCircle, ClipboardList,
  CircleAlert, ChevronRight, Inbox, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { useReviewNotify } from '../../context/ReviewNotifyContext.jsx';

function StatTile({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <div className="text-2xl font-display font-bold leading-none">{value}</div>
        <div className="text-[11px] text-ink-muted mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}

function ExpRow({ item, to, right }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt transition rounded-xl">
      {item.mainImage
        ? <img src={fileUrl(item.mainImage)} alt="" className="w-10 h-10 rounded-lg object-cover border shrink-0" />
        : <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><ClipboardList size={16} /></div>}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-ink truncate">{item.name}</div>
        {item.objectionCount > 0
          ? <div className="text-[11px] text-rose-600 truncate"><CircleAlert size={11} className="inline -mt-0.5" /> {item.objectionCount} objection{item.objectionCount > 1 ? 's' : ''}{item.round > 0 ? ` · round ${item.round}` : ''}</div>
          : <div className="text-[11px] text-ink-muted truncate">{item.location || '—'}</div>}
      </div>
      {right}
      <ChevronRight size={16} className="text-ink-muted shrink-0" />
    </Link>
  );
}

function Panel({ title, count, tone, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="font-semibold text-sm">{title}</span>
        {count != null && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tone}`}>{count}</span>}
      </div>
      <div className="p-1.5">{children}</div>
    </div>
  );
}

const EmptyRow = ({ label }) => <div className="px-4 py-6 text-center text-sm text-ink-muted">{label}</div>;

// The submitter's board — how my experiences are doing in review.
function MineBoard() {
  const { items: notifs } = useReviewNotify();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/team/review-stats/mine');
      setData(res.data?.data || null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load your review stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (notifs.length) load(); }, [notifs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="bg-white rounded-2xl shadow-soft p-10 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  if (!data) return null;
  const { totals, objections, lists } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg">My experiences in review</h2>
        <button onClick={load} className="text-xs text-ink-muted hover:text-brand inline-flex items-center gap-1"><RefreshCw size={13} /> Refresh</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile icon={Clock} label="Pending review" value={totals.pendingReview} tone="blue" />
        <StatTile icon={MessageSquareWarning} label="Follow-up to fix" value={totals.followUp} tone="rose" />
        <StatTile icon={CircleAlert} label="Open objections" value={objections.total} tone="amber" />
        <StatTile icon={CheckCircle2} label="Approved & live" value={totals.approved} tone="emerald" />
        <StatTile icon={XCircle} label="Rejected" value={totals.rejected} tone="slate" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Needs your action — objections to fix" count={lists.followUp.length} tone="bg-rose-100 text-rose-700">
          {lists.followUp.length === 0 ? <EmptyRow label="Nothing to fix right now 🎉" />
            : lists.followUp.map((it) => (
              <ExpRow key={it.id} item={it} to={`/team/experiences/${it.id}/resolve`}
                right={<span className="text-[11px] font-semibold text-rose-600 shrink-0">Resolve</span>} />
            ))}
        </Panel>
        <div className="space-y-4">
          <Panel title="Awaiting review" count={lists.pendingReview.length} tone="bg-blue-100 text-blue-700">
            {lists.pendingReview.length === 0 ? <EmptyRow label="None pending." />
              : lists.pendingReview.slice(0, 4).map((it) => <ExpRow key={it.id} item={it} to="/team/experiences" />)}
          </Panel>
          {lists.rejected.length > 0 && (
            <Panel title="Rejected" count={lists.rejected.length} tone="bg-slate-200 text-slate-600">
              {lists.rejected.slice(0, 3).map((it) => <ExpRow key={it.id} item={it} to="/team/experiences" />)}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

// The Center Ops / QCOPS board — the queue at a glance.
function QueueBoard() {
  const { onQueueChange } = useReviewNotify();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/team/review-stats/queue');
      setData(res.data?.data || null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not load queue stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onQueueChange(() => load()), [onQueueChange, load]);

  if (loading) return <div className="bg-white rounded-2xl shadow-soft p-10 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  if (!data) return null;
  const { totals, objectionsRaised, lists } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg">Review queue overview</h2>
        <Link to="/team/review-queue" className="text-xs font-semibold text-brand-dark inline-flex items-center gap-1">Open queue <ChevronRight size={14} /></Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile icon={Inbox} label="In queue" value={totals.inQueue} tone="blue" />
        <StatTile icon={ClipboardList} label="New" value={totals.new} tone="slate" />
        <StatTile icon={MessageSquareWarning} label="Follow-up" value={totals.followUp} tone="amber" />
        <StatTile icon={CircleAlert} label="Objections raised" value={objectionsRaised} tone="rose" />
        <StatTile icon={CheckCircle2} label="Approved" value={totals.approved} tone="emerald" />
        <StatTile icon={XCircle} label="Rejected" value={totals.rejected} tone="slate" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Follow-ups — back for another look" count={lists.followUp.length} tone="bg-amber-100 text-amber-700">
          {lists.followUp.length === 0 ? <EmptyRow label="No follow-ups." />
            : lists.followUp.map((it) => (
              <ExpRow key={it.id} item={it} to={`/team/review-queue/${it.id}`}
                right={<span className="text-[11px] font-semibold text-amber-600 shrink-0">Review</span>} />
            ))}
        </Panel>
        <Panel title="New submissions" count={lists.new.length} tone="bg-blue-100 text-blue-700">
          {lists.new.length === 0 ? <EmptyRow label="Nothing new." />
            : lists.new.map((it) => (
              <ExpRow key={it.id} item={it} to={`/team/review-queue/${it.id}`}
                right={<span className="text-[11px] font-semibold text-brand-dark shrink-0">Review</span>} />
            ))}
        </Panel>
      </div>
    </div>
  );
}

export { MineBoard, QueueBoard };
