import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Check, X, Pencil, Star, MapPin, IndianRupee, Truck,
  ShieldCheck, MessageSquareWarning, Send, CircleCheck, CircleAlert, Circle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

/* ────────────────────────────────────────────────────────────────────────
   Center Ops (COPS) section-by-section review.
   Renders the full experience the SAME way the view page does, but every
   section carries Approve / Objection / Edit controls. The bottom action bar
   gates Final Approve behind "every section approved".
   ──────────────────────────────────────────────────────────────────────── */

const ytId = (url) => {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
};
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const METHOD_LABEL = { per_person: 'Per person', per_day: 'Per day', days: 'Days (multi-day)', per_hours: 'Price by hours' };

function convenienceLabel(cf) {
  if (!cf || !cf.type) return null;
  if (cf.type === 'fixed' && Number(cf.value) > 0) return `₹${cf.value}`;
  if (cf.type === 'percentage' && Number(cf.value) > 0) return `${cf.value}%`;
  if (cf.type === 'free') return Number(cf.months) > 0 ? `Free for ${cf.months} month${cf.months > 1 ? 's' : ''}` : 'Free';
  return null;
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="font-semibold text-ink">{value}</div>
    </div>
  );
}

// ── Per-section content renderers (mirror ExperienceViewPage styling) ──
const RENDERERS = {
  basic: (e) => (
    <div className="space-y-3">
      <h3 className="text-xl font-display font-bold">{e.name}</h3>
      <div className="flex items-center gap-4 text-sm text-ink-muted">
        {(e.location || e.city) && (
          <span className="inline-flex items-center gap-1"><MapPin size={14} /> {[e.location, e.city].filter(Boolean).join(', ')}{e.nearbyLocation ? ` · near ${e.nearbyLocation}` : ''}</span>
        )}
        <span className="capitalize px-2 py-0.5 rounded-full bg-surface-alt">{e.mode}</span>
        {Number(e.rating) > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-500">
            <Star size={14} className="fill-amber-400 text-amber-400" /> <span className="text-ink font-semibold">{Number(e.rating).toFixed(1)}</span>
          </span>
        )}
      </div>
    </div>
  ),
  taxonomy: (e) => (
    <div className="flex flex-wrap gap-2">
      {(e.categoryItems || []).map((c) => <span key={`c${c.id}`} className="text-xs px-2.5 py-1 rounded-full bg-brand/10 text-brand">{c.name}</span>)}
      {(e.typeItems || []).map((t) => <span key={`t${t.id}`} className="text-xs px-2.5 py-1 rounded-full bg-surface-alt text-ink-muted">{t.name}</span>)}
      {(e.audienceItems || []).map((a) => <span key={`a${a.id}`} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-ink">{a.name}</span>)}
    </div>
  ),
  supplier: (e) => (
    <div className="flex items-center gap-4">
      {e.supplier?.image && <img src={fileUrl(e.supplier.image)} alt="" className="w-14 h-14 rounded-lg object-cover border" />}
      <div className="text-sm">
        <div className="font-semibold text-ink inline-flex items-center gap-2"><Truck size={15} className="text-brand" /> {e.supplier?.companyName}</div>
        {e.supplier?.supplierName && <div className="text-ink-muted">{e.supplier.supplierName}</div>}
        <div className="text-ink-muted flex flex-wrap gap-x-4">
          {e.supplier?.email && <span>{e.supplier.email}</span>}
          {e.supplier?.phone && <span>{e.supplier.phone}</span>}
        </div>
      </div>
    </div>
  ),
  about: (e) => <div className="rich-prose" dangerouslySetInnerHTML={{ __html: e.about || '' }} />,
  media: (e) => (
    <div className="space-y-4">
      {e.mainImage && <img src={fileUrl(e.mainImage)} alt="" className="w-full h-56 object-cover rounded-xl" />}
      {e.gallery?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {e.gallery.map((u, i) => <img key={i} src={fileUrl(u)} alt="" className="w-full aspect-[4/3] object-cover rounded-lg border" />)}
        </div>
      )}
      {e.videos?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {e.videos.map((v, i) => {
            const yid = ytId(v.url);
            return yid
              ? <iframe key={i} className="w-full aspect-video rounded-lg" src={`https://www.youtube.com/embed/${yid}`} title={`v${i}`} allowFullScreen />
              : <video key={i} src={fileUrl(v.url)} controls className="w-full aspect-video rounded-lg bg-black" />;
          })}
        </div>
      )}
    </div>
  ),
  pricing: (e) => {
    const p = e.pricing || {};
    const disc = e.discount && Number(e.discount.value) > 0
      ? (e.discount.type === 'fixed' ? `₹${e.discount.value}` : `${e.discount.value}%`) : null;
    const conv = convenienceLabel(e.convenienceFee);
    return (
      <div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Field label="Method" value={METHOD_LABEL[e.priceMethod] || e.priceMethod || '—'} />
          {e.priceMethod === 'days' && <Field label="Days" value={p.days || 1} />}
          <Field label="Adult" value={rupee(p.adultPrice)} />
          {Number(e.gstRate) > 0 && <Field label="GST" value={`${e.gstRate}%`} />}
          {disc && <Field label="Discount" value={disc} />}
          {conv && <Field label="Convenience fee" value={conv} />}
        </div>
        {p.childrenEnabled && p.childBands?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Children</div>
            <ul className="space-y-1 text-sm">
              {p.childBands.map((b, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-ink">{b.startAge}–{b.endAge} yrs</span>
                  <span className={b.charge ? 'font-semibold text-ink' : 'text-emerald-600 font-medium'}>{b.charge ? rupee(b.price) : 'Free'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
  duration: (e) => {
    const d = (e.pricing || {}).duration || {};
    return <div className="text-sm font-semibold text-ink">{d.hours || 0}h {d.minutes || 0}m</div>;
  },
  schedule: (e) => (
    <ul className="space-y-1.5 text-sm">
      {(e.schedule?.dates || []).map((d) => (
        <li key={d.date} className="flex flex-wrap gap-x-3">
          <span className="font-medium text-ink min-w-[120px]">{new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span className="text-ink-muted">{d.slots?.length ? d.slots.map((s) => `${s.start}–${s.end}`).join(', ') : 'No slots'}</span>
        </li>
      ))}
    </ul>
  ),
  inclusions: (e) => (
    <div className="space-y-4">
      {(e.inclusions || []).map((it, i) => (
        it.kind === 'title_image' ? (
          <div key={i} className="flex items-center gap-4">
            {it.image && <img src={fileUrl(it.image)} alt="" className="w-20 h-20 rounded-lg object-cover border" />}
            <div className="font-medium text-ink">{it.title}</div>
          </div>
        ) : <div key={i} className="rich-prose" dangerouslySetInnerHTML={{ __html: it.text || '' }} />
      ))}
    </div>
  ),
  facilities: (e) => (
    <div className="flex flex-wrap gap-2">
      {(e.facilities || []).map((f, i) => <span key={i} className="text-sm px-3 py-1 rounded-full bg-surface-alt text-ink">{typeof f === 'string' ? f : f.name}</span>)}
    </div>
  ),
  nearby: (e) => (
    <ul className="space-y-1 text-sm">
      {(e.nearbyPlaces || []).map((n, i) => {
        const dist = n.distance ?? n.distanceKm;
        const unit = n.unit || 'km';
        const unitLabel = unit === 'km' ? 'km' : unit === 'hr' ? 'hrs away' : 'min away';
        return (
          <li key={i} className="flex items-center gap-2">
            <MapPin size={14} className="text-ink-muted" /> {n.name}
            {dist !== '' && dist != null && <span className="text-ink-muted">· {dist} {unitLabel}</span>}
          </li>
        );
      })}
    </ul>
  ),
  faqs: (e) => (
    <div className="space-y-3">
      {(e.faqs || []).map((f, i) => (
        <div key={i}>
          <div className="font-medium text-ink">{f.question}</div>
          <div className="text-sm text-ink-muted whitespace-pre-line">{f.answer}</div>
        </div>
      ))}
    </div>
  ),
  policies: (e) => {
    const refundCancellation = e.refundCancellationPolicy || [e.refundPolicy, e.cancellationPolicy].filter(Boolean).join('<br/><br/>');
    const policies = [
      ['Terms & Conditions', e.termsConditions],
      ['Privacy Policy', e.privacyPolicy],
      ['Refund & Cancellation Policy', refundCancellation],
    ].filter(([, html]) => html);
    return (
      <div className="space-y-3">
        {policies.map(([label, html]) => (
          <details key={label} className="border border-gray-100 rounded-lg p-3">
            <summary className="cursor-pointer font-medium text-ink">{label}</summary>
            <div className="rich-prose mt-2" dangerouslySetInnerHTML={{ __html: html }} />
          </details>
        ))}
      </div>
    );
  },
};

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
  const [modal, setModal] = useState(null); // 'reject' | 'qcops' | 'followup'

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
      toast.success('Approved — now live');
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
      } else if (modal === 'qcops') {
        if (!text.trim()) { setBusy(false); return toast.error('Describe the problem'); }
        const res = await api.post(`/team/review-queue/${id}/send-qcops`, { note: text });
        toast.success(res.data?.message || 'Sent to QCOPS');
        setModal(null); setBusy(false); return; // stays in queue, just reassigned
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

      {/* QCOPS escalation context */}
      {review.qcopsTeamMemberId && review.qcopsNote && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 mb-5 flex items-start gap-3">
          <Send size={16} className="text-indigo-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="font-semibold text-indigo-800">Escalated to QCOPS for a quality check</div>
            <div className="text-indigo-700 mt-0.5">{review.qcopsNote}</div>
          </div>
        </div>
      )}

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
          <button onClick={() => setModal('qcops')} disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-50 disabled:opacity-60">
            <Send size={15} /> Send to QCOPS
          </button>
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
  qcops: { title: 'Send to QCOPS', placeholder: 'What is the problem? Why is this being escalated to QCOPS?', confirm: 'Send to QCOPS', color: 'bg-indigo-600 hover:bg-indigo-700', optional: false },
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
          {kind === 'qcops' && <p className="text-xs text-ink-muted mt-2">It will be auto-assigned to the least-busy QCOPS member (round-robin).</p>}
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
