import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, MapPin, CalendarClock, ClipboardCheck, CheckCircle2, Navigation, Star,
  ClipboardList, Clock, ChevronRight, ThumbsUp, XCircle, Globe, Hourglass,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { useReviewNotify } from '../../context/ReviewNotifyContext.jsx';

const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString();

function StatTile({ icon: Icon, label, value, tone }) {
  const tones = { slate: 'bg-slate-50 text-slate-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', emerald: 'bg-emerald-50 text-emerald-600', indigo: 'bg-indigo-50 text-indigo-600' };
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone] || tones.slate}`}><Icon size={20} /></div>
      <div className="min-w-0"><div className="text-2xl font-display font-bold leading-none">{value}</div><div className="text-[11px] text-ink-muted mt-1 truncate">{label}</div></div>
    </div>
  );
}

export default function TeamQcVisitsPage() {
  const { items: notifs } = useReviewNotify();
  const [items, setItems] = useState([]);
  const [fields, setFields] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [feedbackFor, setFeedbackFor] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/team/qc/mine');
      setItems(res.data?.data?.items || []);
      setFields(res.data?.data?.fields || []);
      setStats(res.data?.data?.stats || null);
    } catch {
      toast.error('Could not load your visits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (notifs.length) load(); }, [notifs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id, action) => {
    setBusyId(id);
    try {
      await api.post(`/team/qc/${id}/${action}`);
      toast.success(action === 'ack' ? 'Marked as received' : 'On-site confirmed — Center Ops notified');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setBusyId(null); }
  };

  const submitFeedback = async (id, feedback) => {
    setBusyId(id);
    try {
      await api.post(`/team/qc/${id}/feedback`, { feedback });
      toast.success('Feedback submitted to Center Ops');
      setFeedbackFor(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setBusyId(null); }
  };

  const active = items.filter((i) => ['qc_assigned', 'qc_acknowledged', 'qc_onsite'].includes(i.reviewStage));
  const awaiting = items.filter((i) => i.reviewStage === 'qc_feedback');
  const approved = items.filter((i) => i.reviewStage === 'published');
  const rejected = items.filter((i) => i.reviewStage === 'qc_rejected');

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold mb-1">My QC Visits</h1>
        <p className="text-sm text-ink-muted">Every on-site quality check assigned to you — active, approved and rejected. Click any to see full details.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatTile icon={ClipboardList} label="Total assigned" value={stats.assigned} tone="blue" />
          <StatTile icon={Clock} label="Pending visit" value={stats.pending} tone="amber" />
          <StatTile icon={Hourglass} label="Awaiting decision" value={stats.awaitingDecision} tone="indigo" />
          <StatTile icon={CheckCircle2} label="Approved" value={stats.approved} tone="emerald" />
          <StatTile icon={Globe} label="Live" value={stats.live} tone="emerald" />
          <StatTile icon={XCircle} label="Rejected" value={stats.rejected} tone="rose" />
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center mb-4"><ClipboardCheck size={26} /></div>
          <h2 className="font-semibold text-lg">No visits assigned</h2>
          <p className="text-sm text-ink-muted mt-1">You’ll be notified when Center Ops assigns you a site check.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Group title="Active visits" color="text-indigo-600" list={active}
            render={(item) => <ActiveCard item={item} busyId={busyId} onAct={act} onFeedback={setFeedbackFor} />} />
          <Group title="Awaiting Center Ops decision" color="text-amber-600" list={awaiting}
            render={(item) => <OutcomeCard item={item} tone="amber" label="Feedback submitted — awaiting decision" />} />
          <Group title="Approved & live" color="text-emerald-600" list={approved}
            render={(item) => <OutcomeCard item={item} tone="emerald" label="Approved — live on web & app" />} />
          <Group title="Rejected" color="text-rose-600" list={rejected}
            render={(item) => <OutcomeCard item={item} tone="rose" label="Rejected by Center Ops" reason={item.reviewNote || item.qcReview?.decisionReason} />} />
        </div>
      )}

      {feedbackFor && (
        <FeedbackFormModal item={feedbackFor} fields={fields} busy={busyId === feedbackFor.id}
          onSubmit={(fb) => submitFeedback(feedbackFor.id, fb)} onClose={() => setFeedbackFor(null)} />
      )}
    </div>
  );
}

const Group = ({ title, color, list, render }) => list.length > 0 && (
  <div>
    <h2 className={`text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-2 ${color}`}>
      {title} <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{list.length}</span>
    </h2>
    <div className="space-y-3">{list.map((item) => <div key={item.id}>{render(item)}</div>)}</div>
  </div>
);

function CardHead({ item }) {
  return (
    <div className="flex items-start gap-4">
      {item.mainImage
        ? <img src={fileUrl(item.mainImage)} alt="" className="w-16 h-16 rounded-xl object-cover border shrink-0" />
        : <div className="w-16 h-16 rounded-xl bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><ClipboardCheck size={22} /></div>}
      <div className="min-w-0 flex-1">
        <Link to={`/team/experiences/${item.id}/view`} className="font-semibold text-ink hover:text-brand">{item.name}</Link>
        <div className="text-xs text-ink-muted mt-0.5 flex items-center gap-3 flex-wrap">
          {(item.location || item.city) && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {[item.location, item.city].filter(Boolean).join(', ')}</span>}
          {item.supplier?.companyName && <span>{item.supplier.companyName}</span>}
        </div>
      </div>
      <Link to={`/team/experiences/${item.id}/view`} className="text-xs font-semibold text-brand-dark inline-flex items-center gap-1 shrink-0">Details <ChevronRight size={13} /></Link>
    </div>
  );
}

function ActiveCard({ item, busyId, onAct, onFeedback }) {
  const qc = item.qcReview || {};
  const stage = item.reviewStage;
  const today = isToday(qc.visitDate);
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <div className="p-5">
        <CardHead item={item} />
        <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${today ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'}`}>
          <CalendarClock size={13} /> Visit: {qc.visitDate} at {qc.visitTime} {today && '· TODAY'}
        </div>
        {qc.instructions && <div className="mt-2 text-sm bg-surface-alt rounded-lg px-3 py-2 text-ink"><span className="font-semibold">Instructions:</span> {qc.instructions}</div>}
      </div>
      <div className="px-5 py-3 border-t border-slate-100 bg-surface-alt/40 flex items-center gap-2 flex-wrap">
        <StageTracker stage={stage} />
        <div className="ml-auto flex items-center gap-2">
          {stage === 'qc_assigned' && (
            <button onClick={() => onAct(item.id, 'ack')} disabled={busyId === item.id}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-105 disabled:opacity-60"><ThumbsUp size={15} /> Got it</button>
          )}
          {stage === 'qc_acknowledged' && (
            <button onClick={() => onAct(item.id, 'onsite')} disabled={busyId === item.id}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"><Navigation size={15} /> I’m at the location</button>
          )}
          {stage === 'qc_onsite' && (
            <button onClick={() => onFeedback(item)} disabled={busyId === item.id}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"><ClipboardList size={15} /> Give Feedback</button>
          )}
        </div>
      </div>
    </div>
  );
}

function OutcomeCard({ item, tone, label, reason }) {
  const tones = { amber: 'text-amber-700', emerald: 'text-emerald-700', rose: 'text-rose-700' };
  const rating = item.qcReview?.feedback?.overallRating;
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <CardHead item={item} />
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <span className={`text-sm font-semibold ${tones[tone]}`}>{label}</span>
        {rating && <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs"><Star size={13} className="fill-amber-400 text-amber-400" /> {rating}/5 given</span>}
      </div>
      {reason && <div className="mt-2 text-sm bg-rose-50 rounded-lg px-3 py-2 text-rose-800"><span className="font-semibold">Reason:</span> {reason}</div>}
    </div>
  );
}

const STEPS = [
  { key: 'qc_assigned', label: 'Assigned' },
  { key: 'qc_acknowledged', label: 'Received' },
  { key: 'qc_onsite', label: 'On-site' },
  { key: 'qc_feedback', label: 'Feedback' },
];
function StageTracker({ stage }) {
  const idx = STEPS.findIndex((s) => s.key === stage);
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {STEPS.map((s, i) => (
        <span key={s.key} className={`inline-flex items-center gap-1 ${i <= idx ? 'text-brand-dark font-semibold' : 'text-slate-400'}`}>
          {i <= idx ? <CheckCircle2 size={13} /> : <Clock size={13} />} {s.label}
          {i < STEPS.length - 1 && <span className="text-slate-300 mx-0.5">›</span>}
        </span>
      ))}
    </div>
  );
}

function FeedbackFormModal({ item, fields, busy, onSubmit, onClose }) {
  const [values, setValues] = useState({});
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  const submit = () => {
    for (const f of fields) {
      if (f.required && (values[f.key] === undefined || values[f.key] === '' || values[f.key] === null)) {
        return toast.error(`“${f.label}” is required`);
      }
    }
    onSubmit(values);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg">On-site feedback</h2>
          <p className="text-xs text-ink-muted mt-0.5 truncate">{item.name}</p>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-medium text-ink block mb-1.5">{f.label} {f.required && <span className="text-rose-500">*</span>}</label>
              {f.type === 'rating' && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => set(f.key, n)}>
                      <Star size={24} className={n <= (values[f.key] || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300'} />
                    </button>
                  ))}
                </div>
              )}
              {f.type === 'boolean' && (
                <div className="flex gap-2">
                  {[['Yes', true], ['No', false]].map(([lbl, val]) => (
                    <button key={lbl} type="button" onClick={() => set(f.key, val)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold border ${values[f.key] === val ? (val ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-rose-500 text-white border-rose-500') : 'border-gray-200 text-ink-muted hover:bg-surface-alt'}`}>{lbl}</button>
                  ))}
                </div>
              )}
              {f.type === 'select' && (
                <div className="flex flex-wrap gap-2">
                  {f.options.map((opt) => (
                    <button key={opt} type="button" onClick={() => set(f.key, opt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border capitalize ${values[f.key] === opt ? 'bg-brand text-ink border-brand' : 'border-gray-200 text-ink-muted hover:bg-surface-alt'}`}>{opt.replace('_', ' ')}</button>
                  ))}
                </div>
              )}
              {f.type === 'text' && (
                <textarea value={values[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
              )}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />} Submit feedback
          </button>
        </div>
      </div>
    </div>
  );
}
