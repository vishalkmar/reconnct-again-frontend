import { useCallback, useEffect, useState } from 'react';
import { Loader2, Trash2, ShieldAlert, Check, X, Smartphone, Globe, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { fmtDateTime } from '../user/bookingFormatters.js';

/*
  Admin queue for "delete my account" requests.

  Travellers can ask from the mobile app, the member portal, or the public
  /delete-account page (the URL Google Play requires). Nothing is deleted by the
  ask itself — approving here is the only thing that wipes data, and it cannot
  be undone.
*/

const SOURCE = {
  app: { label: 'Mobile app', Icon: Smartphone },
  web: { label: 'Member portal', Icon: Monitor },
  public: { label: 'Public page', Icon: Globe },
};

const STATUS_PILL = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-slate-200 text-slate-600',
  rejected: 'bg-slate-100 text-slate-500',
};

function Row({ r, busyId, onDelete, onReject }) {
  const src = SOURCE[r.source] || SOURCE.public;
  return (
    <tr className="hover:bg-surface-alt/40">
      <td className="px-4 py-3">
        <div className="font-semibold text-ink">{r.name || '—'}</div>
        <div className="text-xs text-ink-muted">{r.email}</div>
        {r.phone && <div className="text-xs text-ink-muted">{r.phone}</div>}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <src.Icon size={13} /> {src.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-ink-muted max-w-[260px]">
        {r.reason ? <span className="line-clamp-2">{r.reason}</span> : <span className="opacity-50">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">{fmtDateTime(r.requestedAt)}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-[11px] font-bold capitalize ${STATUS_PILL[r.status]}`}>
          {r.status}
        </span>
        {r.handledAt && <div className="text-[11px] text-ink-muted mt-1">{fmtDateTime(r.handledAt)}</div>}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {r.status === 'pending' ? (
          <div className="inline-flex gap-2">
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => onDelete(r)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-40"
            >
              <Trash2 size={13} /> Delete account
            </button>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => onReject(r)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-ink-muted hover:bg-surface-alt disabled:opacity-40"
            >
              <X size={13} /> Reject
            </button>
          </div>
        ) : (
          <span className="text-xs text-ink-muted inline-flex items-center gap-1">
            <Check size={13} /> Handled
          </span>
        )}
      </td>
    </tr>
  );
}

function Table({ title, list, empty, busyId, onDelete, onReject }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-ink">
        {title} <span className="text-ink-muted font-semibold">({list.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="bg-surface-alt/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Asked from</th>
              <th className="text-left px-4 py-3">Reason</th>
              <th className="text-left px-4 py-3">Requested</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0
              ? <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-muted text-sm">{empty}</td></tr>
              : list.map((r) => <Row key={r.id} r={r} busyId={busyId} onDelete={onDelete} onReject={onReject} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DeletionRequestsPanel({ onPendingCount }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirming, setConfirming] = useState(null); // the request awaiting a final yes

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users/deletion-requests');
      const data = res.data?.data || {};
      setRows(data.requests || []);
      if (onPendingCount) onPendingCount(data.pendingCount || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load deletion requests');
    } finally {
      setLoading(false);
    }
  }, [onPendingCount]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    setBusyId(id);
    try {
      const res = await api.post(`/admin/users/deletion-requests/${id}/${action}`);
      toast.success(res.data?.message || 'Done');
      setConfirming(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the request');
    } finally {
      setBusyId(null);
    }
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const handled = rows.filter((r) => r.status !== 'pending');

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-12 text-center text-ink-muted">
        <Loader2 size={20} className="animate-spin inline mr-2" /> Loading requests…
      </div>
    );
  }

  return (
    <>
      <Table title="Pending" list={pending} empty="No pending deletion requests."
        busyId={busyId} onDelete={setConfirming} onReject={(r) => act(r.id, 'reject')} />
      {handled.length > 0 && <Table title="Handled" list={handled} empty="" busyId={busyId} />}

      {/* Final confirmation — deleting is irreversible, so it never happens on
          a single click from the table. */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="font-display font-bold text-ink">Delete this account?</h3>
                <p className="text-xs text-ink-muted">{confirming.email}</p>
              </div>
            </div>
            <p className="text-sm text-ink-muted">
              This permanently removes the profile, wishlist and support messages, and strips the
              name and contact details from past bookings. Booking and review records stay, shown
              as “Deleted user”. <strong className="text-ink">This cannot be undone.</strong>
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="flex-1 h-11 rounded-xl border border-gray-200 font-semibold text-ink-muted hover:bg-surface-alt"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirming.id}
                onClick={() => act(confirming.id, 'approve')}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-40"
              >
                {busyId === confirming.id ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
