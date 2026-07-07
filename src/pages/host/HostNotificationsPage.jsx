import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Ticket, Clock, Bell } from 'lucide-react';
import api from '../../services/api';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const ICON = { host_booking: Ticket, reminder: Clock };
const TINT = { host_booking: 'text-brand-dark bg-amber-100', reminder: 'text-blue-600 bg-blue-100' };

// Host-side slice of the shared /api/notifications feed — bookings on the
// host's own listings + same-day reminders. Real data only.
export default function HostNotificationsPage() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/notifications')
      .then(({ data }) => {
        if (!alive) return;
        const all = (data.data || data).notifications || [];
        setFeed(all.filter((n) => n.kind === 'host_booking' || n.kind === 'reminder'));
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <Bell className="text-brand" size={22} />
        <h1 className="text-2xl font-display font-bold">Notifications</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" size={22} /></div>
      ) : feed.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-ink-muted">No notifications yet — new bookings on your listings will show up here.</div>
      ) : (
        <div className="space-y-3">
          {feed.map((n) => {
            const Icon = ICON[n.kind] || Bell;
            const Row = (
              <div className="bg-white rounded-xl shadow-soft p-4 flex items-start gap-3 hover:shadow-md transition">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${TINT[n.kind] || TINT.host_booking}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink">{n.title}</div>
                  <div className="text-sm text-ink-muted truncate">{n.body}</div>
                  {n.at && <div className="text-xs text-slate-400 mt-1">{String(n.at).slice(0, 10)}</div>}
                </div>
                {n.amount != null && <div className="font-bold text-brand-dark shrink-0">{money(n.amount)}</div>}
              </div>
            );
            return n.bookingId ? (
              <Link key={n.id} to={`/host/bookings/${n.bookingId}`}>{Row}</Link>
            ) : (
              <div key={n.id}>{Row}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
