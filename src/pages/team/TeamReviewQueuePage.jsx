import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, ClipboardCheck, Check, X, MessageSquareWarning, UserCog, Truck, Home, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

const SOURCE_STYLE = {
  staff: { icon: Truck, className: 'bg-amber-50 text-amber-700' },
  host: { icon: Home, className: 'bg-purple-50 text-purple-700' },
  supplier: { icon: Building2, className: 'bg-teal-50 text-teal-700' },
  admin: { icon: UserCog, className: 'bg-slate-100 text-slate-600' },
};

export default function TeamReviewQueuePage() {
  const [items, setItems] = useState([]);
  const [qcopsOptions, setQcopsOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteModal, setNoteModal] = useState(null); // { id, action: 'reject'|'request-changes' }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, qcopsRes] = await Promise.all([
        api.get('/team/review-queue'),
        api.get('/team/review-queue/qcops-options'),
      ]);
      setItems(listRes.data?.data?.items || []);
      setQcopsOptions(qcopsRes.data?.data?.items || []);
    } catch {
      toast.error('Could not load the review queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/team/review-queue/${id}/approve`);
      toast.success('Approved — now live');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const submitNote = async (note) => {
    if (!note.trim()) return toast.error('A note is required');
    const { id, action } = noteModal;
    setBusyId(id);
    try {
      await api.post(`/team/review-queue/${id}/${action}`, { note });
      toast.success(action === 'reject' ? 'Rejected' : 'Sent back for changes');
      setItems((prev) => prev.filter((i) => i.id !== id));
      setNoteModal(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const assignQcops = async (id, qcopsTeamMemberId) => {
    try {
      await api.post(`/team/review-queue/${id}/assign-qcops`, { qcopsTeamMemberId: qcopsTeamMemberId || null });
      toast.success(qcopsTeamMemberId ? 'Assigned to QCOPS' : 'Unassigned');
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qcopsTeamMemberId } : i)));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">Review Queue</h1>
        <p className="text-sm text-ink-muted">Experiences waiting for your review — from BD submissions and host listings.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center mb-4"><ClipboardCheck size={26} /></div>
          <h2 className="font-semibold text-lg">All caught up</h2>
          <p className="text-sm text-ink-muted mt-1">Nothing is waiting for review right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const src = SOURCE_STYLE[item.source?.kind] || SOURCE_STYLE.admin;
            const SrcIcon = src.icon;
            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-soft p-5 flex flex-wrap items-center gap-4">
                {item.mainImage ? (
                  <img src={fileUrl(item.mainImage)} alt="" className="w-14 h-14 rounded-xl object-cover border shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-surface-alt flex items-center justify-center text-ink-muted shrink-0"><ClipboardCheck size={22} /></div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink truncate">{item.name}</div>
                  <div className="text-[11px] text-ink-muted truncate">
                    {item.supplier?.companyName || '—'}{item.location ? ` · ${item.location}` : ''}
                  </div>
                  <span className={`inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${src.className}`}>
                    <SrcIcon size={11} /> {item.source?.label}
                  </span>
                </div>

                {qcopsOptions.length > 0 && (
                  <select
                    value={item.qcopsTeamMemberId || ''}
                    onChange={(e) => assignQcops(item.id, e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                  >
                    <option value="">Assign to QCOPS…</option>
                    {qcopsOptions.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                  </select>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => approve(item.id)} disabled={busyId === item.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60">
                    <Check size={15} /> Approve
                  </button>
                  <button onClick={() => setNoteModal({ id: item.id, action: 'request-changes' })} disabled={busyId === item.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 disabled:opacity-60">
                    <MessageSquareWarning size={15} /> Request changes
                  </button>
                  <button onClick={() => setNoteModal({ id: item.id, action: 'reject' })} disabled={busyId === item.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 disabled:opacity-60">
                    <X size={15} /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {noteModal && (
        <NoteModal
          title={noteModal.action === 'reject' ? 'Reject experience' : 'Request changes'}
          placeholder={noteModal.action === 'reject' ? 'Why is this being rejected?' : 'What needs to change before this can go live?'}
          confirmLabel={noteModal.action === 'reject' ? 'Reject' : 'Send back'}
          danger={noteModal.action === 'reject'}
          onSubmit={submitNote}
          onClose={() => setNoteModal(null)}
        />
      )}
    </div>
  );
}

function NoteModal({ title, placeholder, confirmLabel, danger, onSubmit, onClose }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => { setSaving(true); await onSubmit(note); setSaving(false); };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg">{title}</h2>
        </div>
        <div className="px-6 py-5">
          <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={placeholder}
            className="w-full min-h-[110px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none" />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt">Cancel</button>
          <button onClick={submit} disabled={saving}
            className={`px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 inline-flex items-center gap-2 ${danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
