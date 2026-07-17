import {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { connectReview, disconnectReview } from '../services/reviewSocket';
import { useTeamAuth } from './TeamAuthContext.jsx';

const ReviewNotifyContext = createContext();

/*
  Team-portal real-time review layer. Once a team member is logged in it:
    - loads their review notifications (bell),
    - opens the /review socket and listens for `review:notification`
      (prepend + toast + unread bump) and `review:queue` (queue changed),
    - exposes helpers + a tiny event subscription so pages (e.g. the Review
      Queue) can react to `review:queue` without each opening its own socket.
*/
export const ReviewNotifyProvider = ({ children }) => {
  const { member } = useTeamAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const queueHandlers = useRef(new Set());

  const refresh = useCallback(async () => {
    if (!member) return;
    try {
      const res = await api.get('/team/review-notifications');
      setItems(res.data?.data?.items || []);
      setUnread(res.data?.data?.unread || 0);
    } catch { /* non-blocking */ }
  }, [member]);

  useEffect(() => {
    if (!member) { setItems([]); setUnread(0); return undefined; }
    refresh();
    const token = localStorage.getItem('team_token');
    const socket = connectReview(token);
    if (!socket) return undefined;

    const onNotification = (n) => {
      setItems((prev) => [n, ...prev].slice(0, 50));
      setUnread((u) => u + 1);
      toast(n.title, { icon: NOTIF_ICON[n.kind] || '🔔', duration: 5000 });
    };
    const onQueue = (payload) => { queueHandlers.current.forEach((h) => h(payload)); };

    socket.on('review:notification', onNotification);
    socket.on('review:queue', onQueue);
    return () => {
      socket.off('review:notification', onNotification);
      socket.off('review:queue', onQueue);
    };
  }, [member, refresh]);

  // Disconnect the socket entirely when the provider unmounts / member leaves.
  useEffect(() => () => { if (!member) disconnectReview(); }, [member]);

  const markAllRead = useCallback(async () => {
    setUnread(0);
    setItems((prev) => prev.map((i) => (i.readAt ? i : { ...i, readAt: new Date().toISOString() })));
    try { await api.post('/team/review-notifications/read-all'); } catch { /* ignore */ }
  }, []);

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((i) => (i.id === id && !i.readAt ? { ...i, readAt: new Date().toISOString() } : i)));
    setUnread((u) => Math.max(0, u - 1));
    try { await api.post(`/team/review-notifications/${id}/read`); } catch { /* ignore */ }
  }, []);

  // Pages subscribe to queue-changed events; returns an unsubscribe fn.
  const onQueueChange = useCallback((handler) => {
    queueHandlers.current.add(handler);
    return () => queueHandlers.current.delete(handler);
  }, []);

  return (
    <ReviewNotifyContext.Provider value={{ items, unread, refresh, markAllRead, markRead, onQueueChange }}>
      {children}
    </ReviewNotifyContext.Provider>
  );
};

export const NOTIF_ICON = {
  objection: '⚠️', follow_up: '⚠️', approved: '✅', rejected: '⛔', qcops: '🔎', submitted: '📩', resubmitted: '🔁',
};

export const useReviewNotify = () => {
  const ctx = useContext(ReviewNotifyContext);
  if (!ctx) throw new Error('useReviewNotify must be used within ReviewNotifyProvider');
  return ctx;
};
