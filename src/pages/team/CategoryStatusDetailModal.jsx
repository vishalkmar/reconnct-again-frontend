import { useEffect, useState } from 'react';
import {
  Loader2, X, CircleAlert, CheckCircle2, Clock, MapPin, Lightbulb,
} from 'lucide-react';
import api from '../../services/api';

const PHASE_PILL = {
  cops_review: 'bg-blue-100 text-blue-700',
  changes: 'bg-rose-100 text-rose-600',
  qcops: 'bg-violet-100 text-violet-700',
  live: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-200 text-rose-700',
  delisted: 'bg-slate-200 text-slate-600',
};

/*
  Shared full-pipeline detail for one experience — the review trail (Center Ops
  section objections + the whole conversation), the QCOPS on-site report, and
  the outcome. Used by both the Experience Status and Delisted modules.
*/
export default function CategoryStatusDetailModal({ id, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/team/category/status/${id}`)
      .then(({ data: d }) => setData(d?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  const e = data?.experience;
  const sec = data?.sections;
  const thread = data?.thread || {};
  const qc = data?.qc || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(ev) => ev.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg truncate pr-2">{e?.name || 'Experience'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt text-ink-muted"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
        ) : !e ? (
          <div className="p-12 text-center text-ink-muted">Could not load this experience.</div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Phase header */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${PHASE_PILL[e.phaseKey] || 'bg-slate-100'}`}>{e.phaseLabel}</span>
              {e.round > 0 && <span className="text-xs text-ink-muted">Round {e.round}</span>}
              <span className="text-xs text-ink-muted">· {e.provider} ({e.providerKind})</span>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <Step icon={CheckCircle2} tone="ok" title="Submitted for review"
                body={e.submittedByBd ? `Submitted by ${e.submittedByBd} (BD) on the provider's behalf.` : 'Submitted by the provider.'} />

              {/* Center Ops section review */}
              <Step icon={sec.objection > 0 ? CircleAlert : CheckCircle2} tone={sec.objection > 0 ? 'bad' : 'ok'}
                title="Center Ops content review"
                body={sec.total > 0 ? `${sec.approved} approved · ${sec.objection} objected · ${sec.pending} pending` : 'No section decisions recorded.'}>
                {!!e.suggestion && (
                  <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                    <Lightbulb size={14} className="mt-0.5 shrink-0" /><span><span className="font-semibold">Suggestion:</span> {e.suggestion}</span>
                  </div>
                )}
                {(sec.objections || []).map((o) => (
                  <div key={o.key} className="mt-2 border border-rose-100 rounded-lg overflow-hidden">
                    <div className="bg-rose-50 px-3 py-2">
                      <div className="text-xs font-bold text-rose-700">{o.label}</div>
                      <div className="text-sm text-rose-800 mt-0.5">{o.objection}</div>
                    </div>
                    {(thread[o.key] || []).length > 0 && (
                      <div className="px-3 py-2 space-y-2">
                        {(thread[o.key] || []).map((m, idx) => (
                          <div key={idx}>
                            <div className="text-[10px] font-bold text-ink">{m.by || m.role || (m.fromOwner ? 'Provider' : 'Center Ops')}</div>
                            <div className="text-xs text-ink-muted">{m.text || m.message || m.note || ''}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </Step>

              {/* QCOPS visit */}
              {(qc.qcops || qc.assignedBy || qc.feedback) && (
                <Step icon={qc.onsiteConfirmedAt ? MapPin : Clock} tone="qc" title="QCOPS on-site check"
                  body={[
                    qc.assignedBy ? `Assigned by ${qc.assignedBy}` : null,
                    qc.qcops ? `to ${qc.qcops}` : null,
                    qc.visitDate ? `· visit ${qc.visitDate}${qc.visitTime ? ` ${qc.visitTime}` : ''}` : null,
                    qc.onsiteConfirmedAt ? '· on-site confirmed' : null,
                  ].filter(Boolean).join(' ')}>
                  {!!qc.feedback && (
                    <div className="text-sm text-ink bg-surface-alt rounded-lg px-3 py-2 mt-2">
                      <span className="font-semibold">Report: </span>{qc.feedback}
                    </div>
                  )}
                  {!!qc.changeType && (
                    <div className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                      <span className="font-semibold">{String(qc.changeType).toUpperCase()} changes: </span>{qc.changeDetails || '—'}
                      {qc.deadline && <span className="block text-xs mt-0.5">Deadline: {qc.deadline}</span>}
                      {qc.decidedBy && <span className="block text-xs">Decided by {qc.decidedBy}</span>}
                    </div>
                  )}
                </Step>
              )}

              {/* Outcome */}
              {e.phaseKey === 'live' && <Step icon={CheckCircle2} tone="ok" title="Live on the platform" body="Passed every check — published and open for bookings. The provider is assigned a Key Account Manager." />}
              {e.phaseKey === 'rejected' && <Step icon={CircleAlert} tone="bad" title="Not approved" body={e.reviewNote || 'Rejected during review.'} />}
              {e.phaseKey === 'delisted' && <Step icon={CircleAlert} tone="bad" title="Delisted" body={e.reviewNote || 'Taken down from the platform.'} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ icon: Icon, tone, title, body, children }) {
  const c = tone === 'ok' ? 'text-emerald-600 bg-emerald-50' : tone === 'bad' ? 'text-rose-600 bg-rose-50' : tone === 'qc' ? 'text-violet-600 bg-violet-50' : 'text-ink-muted bg-surface-alt';
  return (
    <div className="flex gap-3">
      <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center shrink-0 ${c}`}><Icon size={16} /></span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-ink text-sm">{title}</div>
        {body && <div className="text-xs text-ink-muted mt-0.5">{body}</div>}
        {children}
      </div>
    </div>
  );
}
