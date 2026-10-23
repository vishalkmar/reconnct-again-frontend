import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Calendar, Users, MapPin, Loader2, ChevronRight, Hotel as HotelIcon,
  Sparkles, Bed, Trophy, FileText, Compass, CheckCircle2,
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
    <div className="max-w-[1400px]">
      <div className="relative isolate overflow-hidden rounded-[26px] mb-5 sm:mb-6">
        <picture>
          <source srcSet="/partner/lake-800.webp 800w, /partner/lake-1400.webp 1400w, /partner/lake-2000.webp 2000w" sizes="(min-width: 1024px) 75vw, 100vw" type="image/webp" />
          <img src="/partner/lake-1400.webp" alt="" className="absolute inset-0 -z-20 w-full h-full object-cover object-[center_45%]" />
        </picture>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/75 to-white/10" aria-hidden="true" />
        <span className="hidden md:block absolute right-10 lg:right-16 top-6 text-[72px] lg:text-[88px] leading-none drop-shadow-[0_14px_14px_rgba(0,0,0,0.25)] select-none" aria-hidden="true">🧳</span>
        <span className="hidden md:block absolute right-[150px] lg:right-[200px] top-5 text-[34px] leading-none -rotate-12 select-none" aria-hidden="true">✈️</span>
        <div className="px-5 sm:px-8 lg:px-10 pt-7 sm:pt-9">
          <h1 className="font-display font-bold text-[30px] sm:text-[40px] leading-tight text-rc-navy">My Bookings</h1>
          <p className="text-[14px] sm:text-[16px] text-rc-navy/85 mt-1.5 max-w-[640px]">Track your upcoming trips, completed visits and cancellations — all in one place.</p>
          <span className="block h-[3px] w-9 rounded-full bg-rc-brand mt-4" aria-hidden="true" />
        </div>

        {/* Tabs */}
        <div className="rc-rail gap-2.5 px-5 sm:px-8 lg:px-10 pt-5 pb-5 sm:pb-6" role="tablist" aria-label="Filter bookings">
          {TABS.map((t) => {
            const count = (buckets[t.key] || []).length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`shrink-0 inline-flex items-center gap-2 h-11 sm:h-12 px-4 sm:px-6 rounded-full text-sm sm:text-[15px] font-semibold whitespace-nowrap transition ${
                  active
                    ? 'bg-rc-brand text-white shadow-[0_10px_22px_-12px_rgba(255,185,0,0.95)]'
                    : 'bg-white/95 text-rc-navy shadow-[0_4px_14px_-8px_rgba(16,24,40,0.3)] hover:bg-[#FFF6DD]'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`grid place-items-center min-w-[24px] h-6 px-1.5 rounded-full text-[11px] font-bold ${
                    active ? 'bg-white/30 text-white' : 'bg-[#F2EFE9] text-rc-navy'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[22px] border border-[#F1ECE3] p-16 text-center">
          <Loader2 className="animate-spin mx-auto text-rc-brand" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-4">
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
      className="group w-full text-left bg-white rounded-[22px] border border-[#F1ECE3] shadow-[0_14px_34px_-26px_rgba(16,24,40,0.5)] hover:shadow-[0_22px_44px_-26px_rgba(16,24,40,0.55)] hover:-translate-y-0.5 transition overflow-hidden flex flex-col sm:flex-row"
    >
      <div className="relative sm:w-[240px] lg:w-[280px] h-[170px] sm:h-auto sm:min-h-[190px] shrink-0 overflow-hidden bg-[#F4F2EE] m-0 sm:m-2 sm:rounded-[18px]">
        {item.image ? (
          <img src={fileUrl(item.image)} alt={item.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-rc-ink-faint"><Icon size={36} /></div>
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/95 text-rc-navy text-[12.5px] font-semibold shadow-sm">
          <Icon size={14} className="text-[#E5A72A]" /> {TYPE_LABEL[item.type] || item.type}
        </span>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-4 p-5 sm:pl-5 sm:pr-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display font-bold text-[19px] sm:text-[22px] leading-snug text-rc-navy line-clamp-2">
              {item.name}
            </div>
            {item.hotel?.name && (
              <div className="text-sm text-rc-ink-muted mt-0.5">{item.hotel.name}</div>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 text-sm text-rc-ink-muted">
              {item.location && (
                <span className="inline-flex items-center gap-1.5"><MapPin size={15} /> {item.location}</span>
              )}
              <span className="inline-flex items-center gap-1.5"><Calendar size={15} /> {scheduleLine}</span>
              {booking.guest?.count > 0 && (
                <span className="inline-flex items-center gap-1.5"><Users size={15} /> {booking.guest.count}</span>
              )}
            </div>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12.5px] font-bold ${badge.cls}`}>
            {booking.status === 'confirmed' && <CheckCircle2 size={15} />}
            {badge.label}
          </span>
        </div>

        <div className="mt-auto pt-4 border-t border-[#F3EEE5] flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] text-rc-ink-muted uppercase tracking-[0.12em] font-semibold">
              {cat === 'pending' ? 'Amount due' : 'Total'}
            </div>
            <div className="font-black text-[24px] leading-tight text-[#E5A72A] mt-0.5">{fmtMoney(booking.pricing?.total, booking.currency)}</div>
            <div className="text-[12px] text-rc-ink-muted font-mono mt-0.5">{booking.bookingCode}</div>
          </div>
          <span className="shrink-0 inline-flex items-center gap-2 h-11 px-5 rounded-full border-2 border-[#F5D58A] text-[#C98A00] text-sm font-bold group-hover:bg-rc-brand group-hover:border-rc-brand group-hover:text-white transition">
            View details <ChevronRight size={16} className="group-hover:translate-x-0.5 transition" />
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
    <div className="bg-white rounded-[22px] border border-[#F1ECE3] shadow-[0_14px_34px_-26px_rgba(16,24,40,0.5)] p-12 text-center">
      <div className="inline-flex w-16 h-16 rounded-full bg-[#FFF1CC] text-[#C98A00] items-center justify-center mb-4">
        <BookOpen size={28} />
      </div>
      <h2 className="font-display font-bold text-xl text-rc-navy">{m.title}</h2>
      <p className="text-sm text-rc-ink-muted mt-1.5 max-w-md mx-auto">{m.body}</p>
      <Link to="/retreats" className="inline-flex items-center mt-5 h-11 px-6 rounded-full bg-rc-brand text-rc-navy font-bold hover:brightness-105 transition">
        Browse retreats
      </Link>
    </div>
  );
}
