// Shared formatters used by every booking-facing surface (list, transactions,
// details modal, success page). Centralised so display rules stay consistent.

export const TYPE_LABEL = {
  package: 'Retreat',
  room: 'Hotel Room',
  event: 'Event',
  addon: 'Add-on Activity',
  experience: 'Experience',
  event_activity: 'Activity',
};

export const STATUS_BADGE = {
  pending_payment: { label: 'Pending payment', cls: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', cls: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700' },
  refunded: { label: 'Refunded', cls: 'bg-slate-200 text-slate-700' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
};

export const fmtMoney = (n, currency = 'INR') =>
  `${currency === 'INR' ? '₹' : currency + ' '}${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const DEFAULT_DURATION_MIN = 120; // 2h floor when an experience has no duration
const IST_OFFSET_MIN = 5 * 60 + 30;

// The booked slot's end from "Preferred time: 1:57 PM – 2:00 PM" — the truest
// completion moment, matching the backend (utils/bookingLifecycle).
const slotEnd = (booking) => {
  const m = String(booking.specialRequests || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–—-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  const ymd = String(booking.scheduledFor || booking.scheduledAt || '').slice(0, 10);
  const [y, mo, d] = ymd.split('-').map(Number);
  if (!y || !mo || !d) return null;
  let hh = parseInt(m[4], 10) % 12;
  if (/PM/i.test(m[6])) hh += 12;
  return Date.UTC(y, mo - 1, d, hh, parseInt(m[5], 10) || 0) - IST_OFFSET_MIN * 60000;
};

// End instant of a booking: explicit scheduledEndAt, else the booked slot end,
// else start + duration. The old code compared against the START, so a
// 10–11am slot wrongly read as completed at 10:00.
const bookingEnd = (booking) => {
  if (booking.scheduledEndAt) return new Date(booking.scheduledEndAt).getTime();
  const se = slotEnd(booking);
  if (se) return se;
  const startIso = booking.scheduledAt || booking.scheduledFor;
  if (!startIso) return null;
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return null;
  const mins = Number(booking.item?.durationMinutes) || DEFAULT_DURATION_MIN;
  return start + mins * 60000;
};

// Frontend-side categorisation, end-based so it matches the backend's
// bookingLifecycle exactly: Upcoming until it starts, Ongoing while it's
// running, Completed only once it has ended — so this list, the review popup
// and the supplier/host boards never disagree.
export const categorize = (booking) => {
  if (!booking) return 'other';
  if (booking.status === 'cancelled' || booking.status === 'refunded') return 'cancelled';
  if (booking.status === 'pending_payment') return 'pending';
  if (booking.status === 'completed') return 'completed';
  if (booking.status !== 'confirmed') return 'upcoming';

  const now = Date.now();
  const startIso = booking.scheduledAt || booking.scheduledFor;
  const start = startIso ? new Date(startIso).getTime() : null;
  if (start && now < start) return 'upcoming';
  const end = bookingEnd(booking);
  if (end && now < end) return 'ongoing';
  if (end) return 'completed';
  return 'upcoming';
};

export const isPaid = (booking) =>
  !!booking?.payment?.paidAt || ['confirmed', 'completed', 'refunded'].includes(booking?.status);

// A "transaction" is any booking money actually moved on, OR one that's still
// mid-payment (Pending) or gave up (Failed) — everything the Transactions tab
// (web + app) needs, in one shared place so both platforms bucket identically.
// A cancelled booking that was never paid isn't a transaction at all.
export const isTransactionRow = (booking) =>
  !!booking?.payment?.paidAt || booking?.status === 'pending_payment' || booking?.status === 'refunded';

// 'pending' | 'failed' | 'completed' | 'refunded' | 'other'. "Failed" is a
// pending_payment booking whose last attempt is authoritatively dead
// (payment.failedAt set by the backend on webhook FAIL/USER_DROPPED or an
// EXPIRED/TERMINATED/CANCELLED Cashfree order/link) — `status` itself never
// becomes "failed" so the same booking can still be retried.
export const transactionStatus = (booking) => {
  if (!booking) return 'other';
  if (booking.status === 'refunded') return 'refunded';
  if (booking.status === 'confirmed' || booking.status === 'completed') return 'completed';
  if (booking.status === 'pending_payment') return booking.payment?.failedAt ? 'failed' : 'pending';
  return 'other';
};
