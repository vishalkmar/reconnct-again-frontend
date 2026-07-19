import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, MapPin, ClipboardCheck, CheckCircle2, XCircle, Globe, Star, ChevronRight, BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { useReviewNotify } from '../../context/ReviewNotifyContext.jsx';

/* QCOPS "Listing Management" — the final outcomes of every listing they
   checked: approved (live) and rejected (with reason). Nothing disappears; each
   opens the full details page (with the feedback they submitted). */
function StatTile({ icon: Icon, label, value, tone }) {
  const tones = { emerald: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600', blue: 'bg-blue-50 text-blue-600' };
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon size={20} /></div>
      <div><div className="text-2xl font-display font-bold leading-none">{value}</div><div className="text-[11px] text-ink-muted mt-1">{label}</div></div>
    </div>
  );
}

function OutcomeCard({ item, kind }) {
  const rating = item.qcReview?.feedback?.overallRating;
  const reason = item.reviewNote || item.qcReview?.decisionReason;
  return (
    <Link to={`/team/experiences/${item.id}/view`} className="block bg-white rounded-2xl shadow-soft p-5 border border-transparent hover:border-brand/15 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className="flex items-start gap-4">
        {item.mainImage
          ? <img src={fileUrl(item.mainImage)} alt="" className="w-14 h-14 rounded-xl object-cover border shrink-0" />
          : <div className="w-14 h-14 rounded-xl bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><ClipboardCheck size={20} /></div>}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink truncate">{item.name}</div>
          <div className="text-xs text-ink-muted mt-0.5 flex items-center gap-3 flex-wrap">
            {(item.location || item.city) && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {[item.location, item.city].filter(Boolean).join(', ')}</span>}
            {item.supplier?.companyName && <span>{item.supplier.companyName}</span>}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {kind === 'approved'
              ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"><Globe size={11} /> Approved · live</span>
              : <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700"><XCircle size={11} /> Rejected</span>}
            {rating && <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs"><Star size={12} className="fill-amber-400 text-amber-400" /> {rating}/5 given</span>}
          </div>
        </div>
        <ChevronRight size={16} className="text-ink-muted shrink-0" />
      </div>
      {kind === 'rejected' && reason && (
        <div className="mt-3 text-sm bg-rose-50 rounded-lg px-3 py-2 text-rose-800"><span className="font-semibold">Reason:</span> {reason}</div>
      )}
    </Link>
  );
}

export default function TeamQcListingsPage() {
  const { items: notifs } = useReviewNotify();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/team/qc/mine');
      setItems(res.data?.data?.items || []);
    } catch {
      toast.error('Could not load your listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (notifs.length) load(); }, [notifs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const approved = items.filter((i) => i.reviewStage === 'published');
  const rejected = items.filter((i) => ['qc_rejected', 'rejected'].includes(i.reviewStage));
  const live = approved.filter((i) => i.status === 'published' && i.isActive).length;

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1">Listing Management</h1>
        <p className="text-sm text-ink-muted">The final outcome of every listing you checked — approved and rejected. Click any for full details and your feedback.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile icon={CheckCircle2} label="Approved" value={approved.length} tone="emerald" />
        <StatTile icon={Globe} label="Live on web/app" value={live} tone="blue" />
        <StatTile icon={XCircle} label="Rejected" value={rejected.length} tone="rose" />
      </div>

      {approved.length === 0 && rejected.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 items-center justify-center mb-4"><BadgeCheck size={26} /></div>
          <h2 className="font-semibold text-lg">No decided listings yet</h2>
          <p className="text-sm text-ink-muted mt-1">Once Center Ops acts on your feedback, approved & rejected listings show here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {approved.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-2 flex items-center gap-2">Approved <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{approved.length}</span></h2>
              <div className="space-y-3">{approved.map((i) => <OutcomeCard key={i.id} item={i} kind="approved" />)}</div>
            </div>
          )}
          {rejected.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-rose-600 mb-2 flex items-center gap-2">Rejected <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{rejected.length}</span></h2>
              <div className="space-y-3">{rejected.map((i) => <OutcomeCard key={i.id} item={i} kind="rejected" />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
