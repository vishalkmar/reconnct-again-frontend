import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useReviewNotify, NOTIF_ICON } from '../../context/ReviewNotifyContext.jsx';
import { useTeamAuth } from '../../context/TeamAuthContext.jsx';

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function ReviewBell() {
  const { items, unread, markAllRead, markRead } = useReviewNotify();
  const { member } = useTeamAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const targetFor = (n) => {
    if (member?.roleType === 'qcops') return '/team/qc-visits';
    if (member?.roleType === 'cops') {
      if (['qc_ack', 'qc_onsite', 'qc_feedback'].includes(n.kind)) return '/team/review-queue';
      if (['submitted', 'resubmitted'].includes(n.kind)) return n.experienceId ? `/team/review-queue/${n.experienceId}` : '/team/review-queue';
    }
    return '/team/experiences';
  };

  const openNotif = (n) => {
    if (!n.readAt) markRead(n.id);
    setOpen(false);
    navigate(targetFor(n));
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-ink-muted hover:text-brand">
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-brand inline-flex items-center gap-1 hover:underline">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-ink-muted">No notifications yet.</div>
            ) : (
              items.map((n) => (
                <button key={n.id} onClick={() => openNotif(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-surface-alt flex gap-3 ${n.readAt ? '' : 'bg-brand/5'}`}>
                  <span className="text-lg leading-none mt-0.5">{NOTIF_ICON[n.kind] || '🔔'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink truncate">{n.title}</span>
                    {n.message && <span className="block text-xs text-ink-muted line-clamp-2">{n.message}</span>}
                    <span className="block text-[10px] text-ink-muted mt-0.5">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.readAt && <span className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
