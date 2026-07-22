import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Calendar, Users, MapPin, Loader2, ChevronRight, Hotel as HotelIcon,
  Sparkles, Bed, Trophy, FileText, Compass,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import BookingDetailsModal from '../../components/user/BookingDetailsModal.jsx';
import {
  TYPE_LABEL, STATUS_BADGE, fmtMoney, fmtDate, categorize,
} from '../../components/user/bookingFormatters.js';

const TYPE_ICON = {
  package: Sparkles,
  room: Bed,
  event: Trophy,
  addon: HotelIcon,
  experience: Compass,
  event_activity: Compass,
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'pending', label: 'Pending payment' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function UserBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState(null);
  const [tick, setTick] = useState(0); // ticks so upcoming→ongoing→completed flips live

  // Category is a clock event, not a server one — re-bucket every 30s so a
  // booking moves through its lifecycle without a manual refresh.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/me');
      setBookings(res.data?.data?.bookings || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pre-categorise once per data load so the tab filter is a constant-time
  // lookup instead of recomputing per render.
  const buckets = useMemo(() => {
    const out = { all: bookings, upcoming: [], ongoing: [], pending: [], completed: [], cancelled: [] };
    for (const b of bookings) {
      const c = categorize(b);
      if (out[c]) out[c].push(b);
    }
    return out;
  }, [bookings, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = buckets[tab] || [];

  // When the modal updates a booking (e.g. cancel), reload the list and try
  // to keep the same row open so the user can verify the new state.
  const handleChanged = async () => {
    await load();
    if (selected?.bookingCode) {
      // Look up the freshest copy and re-open the modal with it.
      try {
        const res = await api.get(`/bookings/me/${selected.bookingCode}`);
        setSelected(res.data?.data?.booking || null);
      } catch {
        setSelected(null);
      }
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold">My Bookings</h1>
        <p className="text-sm text-ink-muted mt-1">Track your upcoming trips, completed visits and cancellations — all in one place.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => {
          const count = (buckets[t.key] || []).length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${
                active
                  ? 'bg-brand text-white border-brand shadow-soft'
                  : 'border-gray-200 text-ink hover:border-brand/40 hover:text-brand bg-white'
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-white/20' : 'bg-slate-100 text-ink-muted'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-soft p-16 text-center">
          <Loader2 className="animate-spin mx-auto text-brand" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-3">
          {visible.map((b) => (
            <BookingRow key={b.bookingCode} booking={b} onOpen={() => setSelected(b)} />
          ))}
        </div>
      )}

      <BookingDetailsModal
        booking={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onChanged={handleChanged}
      />
    </div>
  );
}

function BookingRow({ booking, onOpen }) {
  const item = booking.item || {};
  const Icon = TYPE_ICON[item.type] || FileText;
  const badge = STATUS_BADGE[booking.status] || { label: booking.status, cls: 'bg-slate-100 text-slate-700' };
  const cat = categorize(booking);
  const scheduleLine = booking.scheduledFor
    ? booking.scheduledEndAt
      ? `${fmtDate(booking.scheduledFor)} → ${fmtDate(booking.scheduledEndAt)}`
      : fmtDate(booking.scheduledFor)
    : '—';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl shadow-soft overflow-hidden hover:shadow-card transition flex flex-col sm:flex-row group"
    >
      <div className="sm:w-44 h-32 sm:h-auto bg-slate-100 shrink-0 relative">
        {item.image ? (
          <img src={fileUrl(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <Icon size={28} />
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-white/95 backdrop-blur text-ink text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shadow">
          <Icon size={10} /> {TYPE_LABEL[item.type] || item.type}
        </span>
      </div>

      <div className="flex-1 p-4 sm:p-5 flex flex-col">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold text-base sm:text-lg leading-snug truncate group-hover:text-brand transition">
              {item.name}
            </h3>
            {item.hotel?.name && (
              <div className="text-xs text-ink-muted mt-0.5">{item.hotel.name}</div>
            )}
            <div className="text-xs text-ink-muted mt-1 flex items-center gap-3 flex-wrap">
              {item.location && (
                <span className="inline-flex items-center gap-1"><MapPin size={11} /> {item.location}</span>
              )}
              <span className="inline-flex items-center gap-1"><Calendar size={11} /> {scheduleLine}</span>
              {booking.guest?.count > 0 && (
                <span className="inline-flex items-center gap-1"><Users size={11} /> {booking.guest.count}</span>
              )}
            </div>
          </div>
          <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        <div className="mt-auto pt-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] text-ink-muted uppercase tracking-wide">
              {cat === 'pending' ? 'Amount due' : 'Total'}
            </div>
            <div className="font-bold text-lg text-brand">{fmtMoney(booking.pricing?.total, booking.currency)}</div>
            <div className="text-[10px] text-ink-muted font-mono mt-0.5">{booking.bookingCode}</div>
          </div>
          <span className="text-xs font-semibold text-brand inline-flex items-center gap-1 group-hover:gap-2 transition-all">
            View details <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ tab }) {
  const messages = {
    upcoming: { title: 'No upcoming bookings', body: 'When you book a future trip, it\'ll appear here.' },
    ongoing: { title: 'Nothing happening right now', body: 'A booking shows here while the experience is actually taking place.' },
    pending: { title: 'No pending payments', body: 'All caught up — there are no bookings awaiting payment.' },
    completed: { title: 'No completed bookings yet', body: 'After your first trip wraps up, it\'ll move here.' },
    cancelled: { title: 'No cancellations', body: 'You haven\'t cancelled any bookings.' },
    all: { title: "You haven't booked anything yet", body: 'Once you make a booking, the voucher, item details and payment summary all live here.' },
  };
  const m = messages[tab] || messages.all;
  return (
    <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-brand/10 text-brand items-center justify-center mb-4">
        <BookOpen size={26} />
      </div>
      <h2 className="font-semibold text-lg text-ink">{m.title}</h2>
      <p className="text-sm text-ink-muted mt-1 max-w-md mx-auto">{m.body}</p>
      <Link to="/retreats" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand text-white font-medium hover:brightness-110 transition">
        Browse retreats
      </Link>
    </div>
  );
}
