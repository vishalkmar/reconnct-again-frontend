import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, ShieldCheck, ArrowLeft, ClipboardList, CheckCircle2, XCircle, Clock,
  Globe, Star, ChevronRight, UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

const STAGE_LABEL = {
  qc_assigned: 'Assigned', qc_acknowledged: 'Received', qc_onsite: 'On-site',
  qc_feedback: 'Feedback given', published: 'Approved · live', qc_rejected: 'Rejected',
};

function StatTile({ icon: Icon, label, value, tone }) {
  const tones = { slate: 'bg-slate-50 text-slate-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', emerald: 'bg-emerald-50 text-emerald-600', indigo: 'bg-indigo-50 text-indigo-600' };
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone] || tones.slate}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <div className="text-2xl font-display font-bold leading-none">{value}</div>
        <div className="text-[11px] text-ink-muted mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}

export default function TeamQcManagementPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // qcopsId
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/team/qc/management');
      setList(res.data?.data?.items || []);
    } catch {
      toast.error('Could not load QCOPS management');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    setSelected(id); setDetailLoading(true); setDetail(null);
    try {
      const res = await api.get(`/team/qc/management/${id}`);
      setDetail(res.data?.data || null);
    } catch {
      toast.error('Could not load this QCOPS');
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  // Detail view
  if (selected) {
    const s = detail?.stats;
    return (
      <div className="max-w-4xl">
        <button onClick={() => { setSelected(null); setDetail(null); }} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand mb-5"><ArrowLeft size={16} /> All QCOPS</button>
        {detailLoading || !detail ? (
          <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><ShieldCheck size={24} /></div>
              <div>
                <h1 className="text-2xl font-display font-bold">{detail.qcops.name}</h1>
                <p className="text-sm text-ink-muted font-mono">{detail.qcops.employeeCode} · {detail.qcops.email}{!detail.qcops.isActive && ' · inactive'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <StatTile icon={ClipboardList} label="Total assigned" value={s.assigned} tone="blue" />
              <StatTile icon={Clock} label="Pending visit" value={s.pending} tone="amber" />
              <StatTile icon={UserCheck} label="Feedback given" value={s.feedbackGiven} tone="indigo" />
              <StatTile icon={CheckCircle2} label="Approved" value={s.approved} tone="emerald" />
              <StatTile icon={XCircle} label="Rejected" value={s.rejected} tone="rose" />
              <StatTile icon={Globe} label="Live on web/app" value={s.live} tone="emerald" />
            </div>

            <h2 className="font-display font-bold text-lg mb-3">Listings handled</h2>
            {detail.listings.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-soft p-8 text-center text-ink-muted">Nothing assigned yet.</div>
            ) : (
              <div className="bg-white rounded-2xl shadow-soft overflow-hidden divide-y divide-slate-100">
                {detail.listings.map((l) => (
                  <Link key={l.id} to={`/team/experiences/${l.id}/view`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt">
                    {l.mainImage ? <img src={fileUrl(l.mainImage)} alt="" className="w-11 h-11 rounded-lg object-cover border shrink-0" />
                      : <div className="w-11 h-11 rounded-lg bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><ClipboardList size={16} /></div>}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-ink truncate">{l.name}</div>
                      <div className="text-[11px] text-ink-muted truncate">
                        {l.supplier || '—'}{l.visitDate ? ` · visit ${l.visitDate}` : ''}
                      </div>
                    </div>
                    {l.overallRating && (
                      <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs shrink-0"><Star size={12} className="fill-amber-400 text-amber-400" /> {l.overallRating}</span>
                    )}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${l.isLive ? 'bg-emerald-50 text-emerald-700' : l.reviewStage === 'qc_rejected' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                      {STAGE_LABEL[l.reviewStage] || l.reviewStage}
                    </span>
                    <ChevronRight size={15} className="text-ink-muted shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">QCOPS Management</h1>
        <p className="text-sm text-ink-muted">Every Quality-Check Ops member and their on-site verification performance. Click one for full analytics.</p>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 items-center justify-center mb-4"><ShieldCheck size={26} /></div>
          <h2 className="font-semibold text-lg">No QCOPS accounts yet</h2>
          <p className="text-sm text-ink-muted mt-1">Ask an admin to create Quality-Check Ops team members.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((q) => (
            <button key={q.id} onClick={() => openDetail(q.id)}
              className="text-left bg-white rounded-2xl shadow-soft p-5 hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><ShieldCheck size={22} /></div>
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{q.name}{!q.isActive && <span className="text-[11px] text-ink-muted"> · inactive</span>}</div>
                  <div className="text-[11px] font-mono text-ink-muted truncate">{q.employeeCode}</div>
                </div>
                <ChevronRight size={18} className="text-ink-muted ml-auto" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['Assigned', q.stats.assigned, 'text-ink'], ['Pending', q.stats.pending, 'text-amber-600'], ['Live', q.stats.live, 'text-emerald-600']].map(([lbl, val, cls]) => (
                  <div key={lbl} className="bg-surface-alt rounded-lg py-2">
                    <div className={`text-lg font-display font-bold ${cls}`}>{val}</div>
                    <div className="text-[10px] text-ink-muted">{lbl}</div>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
