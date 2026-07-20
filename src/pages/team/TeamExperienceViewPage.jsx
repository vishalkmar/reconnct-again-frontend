import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, XCircle, CheckCircle2, Clock, ShieldCheck, CalendarClock, Pencil, ClipboardList, Star,
  MessagesSquare, ChevronDown, ChevronRight, Lightbulb,
} from 'lucide-react';
import api from '../../services/api';
import { RENDERERS } from '../../components/team/sectionRenderers.jsx';
import ObjectionThread from '../../components/team/ObjectionThread.jsx';

// Ordered sections + a presence check, mirroring the backend registry.
const SECTIONS = [
  { key: 'basic', label: 'Basic details', has: () => true },
  { key: 'taxonomy', label: 'Category & audience', has: (e) => (e.categoryItems?.length || e.typeItems?.length || e.audienceItems?.length) },
  { key: 'supplier', label: 'Supplier', has: (e) => e.supplier },
  { key: 'about', label: 'About', has: (e) => e.about },
  { key: 'media', label: 'Photos & videos', has: (e) => e.mainImage || e.gallery?.length || e.videos?.length },
  { key: 'pricing', label: 'Pricing', has: (e) => e.priceMethod || (e.pricing && Object.keys(e.pricing).length) },
  { key: 'duration', label: 'Duration', has: (e) => e.pricing?.duration && (e.pricing.duration.hours || e.pricing.duration.minutes) },
  { key: 'schedule', label: 'Availability & slots', has: (e) => e.schedule?.dates?.length },
  { key: 'inclusions', label: 'Inclusions', has: (e) => e.inclusions?.length },
  { key: 'facilities', label: 'Facilities', has: (e) => e.facilities?.length },
  { key: 'nearby', label: 'Nearby places', has: (e) => e.nearbyPlaces?.length },
  { key: 'faqs', label: 'FAQs', has: (e) => e.faqs?.length },
  { key: 'policies', label: 'Policies & terms', has: (e) => e.termsConditions || e.privacyPolicy || e.refundCancellationPolicy || e.refundPolicy || e.cancellationPolicy },
];

function StatusBanner({ e }) {
  const stage = e.reviewStage;
  const isRejected = e.status === 'archived' || stage === 'qc_rejected';
  const reason = e.reviewNote || e.qcReview?.decisionReason;
  if (isRejected) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 mb-5 flex items-start gap-3">
        <XCircle size={20} className="text-rose-600 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold text-rose-800">Rejected</div>
          {reason && <div className="text-sm text-rose-700 mt-0.5">{reason}</div>}
        </div>
      </div>
    );
  }
  if (e.status === 'published') {
    return <Banner tone="emerald" Icon={CheckCircle2} title="Live on website & app" />;
  }
  if (stage === 'approved') return <Banner tone="amber" Icon={ShieldCheck} title="Content approved — awaiting on-site QCOPS visit" />;
  if (stage && stage.startsWith('qc_')) return <Banner tone="indigo" Icon={CalendarClock} title="In on-site quality check" />;
  if (e.status === 'pending_review') return <Banner tone="blue" Icon={Clock} title="Awaiting Center Ops review" />;
  return null;
}

function Banner({ tone, Icon, title }) {
  const cls = { emerald: 'bg-emerald-50 border-emerald-100 text-emerald-800', amber: 'bg-amber-50 border-amber-100 text-amber-800', indigo: 'bg-indigo-50 border-indigo-100 text-indigo-800', blue: 'bg-blue-50 border-blue-100 text-blue-800' }[tone];
  return (
    <div className={`border rounded-2xl px-5 py-4 mb-5 flex items-center gap-3 ${cls}`}>
      <Icon size={20} className="shrink-0" /> <div className="font-semibold">{title}</div>
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

const REC = {
  approved: ['Approved', 'bg-emerald-50 text-emerald-700'],
  approved_minor: ['Approved · minor changes', 'bg-amber-50 text-amber-700'],
  approved_major: ['Approved · major changes', 'bg-rose-50 text-rose-700'],
};
function QcFeedbackCard({ qcReview, fields }) {
  const fb = qcReview?.feedback;
  if (!fb) return null;
  const [recLabel, recCls] = REC[fb.recommendation] || [fb.recommendation, 'bg-slate-50 text-slate-700'];
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 sm:p-6">
      <h2 className="font-semibold text-lg mb-3 inline-flex items-center gap-2"><ClipboardList size={18} className="text-indigo-600" /> QCOPS on-site feedback</h2>
      {qcReview.visitDate && <div className="text-xs text-ink-muted mb-3">Visited on {qcReview.visitDate}{qcReview.visitTime ? ` at ${qcReview.visitTime}` : ''}</div>}
      {fb.recommendation && (
        <div className={`rounded-xl px-4 py-2.5 mb-3 text-sm font-semibold ${recCls}`}>QCOPS recommended: {recLabel}</div>
      )}
      <div className="divide-y divide-slate-100">
        {fields.map((f) => (
          <div key={f.key} className="py-2.5 flex items-start justify-between gap-4">
            <span className="text-sm text-ink-muted flex-1">{f.label}</span>
            <span className="text-sm text-right"><FieldValue field={f} value={fb[f.key]} /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

const LABEL_BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.key, s.label]));

/* The full Center Ops ⇄ submitter objection history, kept visible for the
   whole life of the listing. Once everything is approved the sections render
   only their FINAL content, so without this the reviewer at Level 2 (and
   after) has no record of what was objected to and how it got resolved. */
function ReviewHistoryCard({ review }) {
  const thread = review?.thread || {};
  const keys = Object.keys(thread).filter((k) => (thread[k] || []).length > 0);
  const [open, setOpen] = useState(true);
  if (keys.length === 0) return null;
  const rounds = Math.max(...keys.map((k) => Math.max(...thread[k].map((m) => (m.round || 0) + 1))));
  const messages = keys.reduce((n, k) => n + thread[k].length, 0);
  return (
    <div className="bg-white rounded-2xl shadow-soft mb-4 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full px-5 sm:px-6 py-4 flex items-center gap-2.5 text-left hover:bg-surface-alt/50">
        <MessagesSquare size={18} className="text-rose-600 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-lg">Review history</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {messages} message{messages > 1 ? 's' : ''} across {keys.length} section{keys.length > 1 ? 's' : ''} · {rounds} round{rounds > 1 ? 's' : ''} of objections
          </p>
        </div>
        {open ? <ChevronDown size={18} className="text-ink-muted shrink-0" /> : <ChevronRight size={18} className="text-ink-muted shrink-0" />}
      </button>
      {open && (
        <div className="px-5 sm:px-6 pb-5 space-y-4">
          {review?.suggestion && (
            <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              <Lightbulb size={15} className="mt-0.5 shrink-0" /><span><span className="font-semibold">Center Ops suggestion:</span> {review.suggestion}</span>
            </div>
          )}
          {keys.map((k) => (
            <div key={k}>
              <div className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">{LABEL_BY_KEY[k] || k}</div>
              <ObjectionThread thread={thread[k]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamExperienceViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [e, setE] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    Promise.all([
      api.get(`/experiences/${id}`),
      api.get('/team/qc/feedback-schema').catch(() => ({ data: { data: { fields: [] } } })),
    ])
      .then(([expRes, schemaRes]) => {
        if (off) return;
        setE(expRes.data?.data?.item || null);
        setFields(schemaRes.data?.data?.fields || []);
      })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [id]);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  if (!e) return <div className="p-16 text-center text-ink-muted">Experience not found.</div>;

  const canEdit = e.status === 'draft'; // only editable while sent back / a draft

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <button onClick={() => navigate('/team/experiences')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand"><ArrowLeft size={16} /> Back</button>
        {canEdit && (
          <Link to={`/team/experiences/${id}/edit`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-semibold hover:brightness-105"><Pencil size={15} /> Edit</Link>
        )}
      </div>

      <StatusBanner e={e} />
      <ReviewHistoryCard review={e.review} />

      <div className="space-y-4">
        {SECTIONS.filter((s) => s.has(e)).map((s) => {
          const Render = RENDERERS[s.key];
          return (
            <div key={s.key} className="bg-white rounded-2xl shadow-soft p-5 sm:p-6">
              <h2 className="font-semibold text-lg mb-3">{s.label}</h2>
              {Render ? Render(e) : null}
            </div>
          );
        })}
        <QcFeedbackCard qcReview={e.qcReview} fields={fields} />
      </div>
    </div>
  );
}
