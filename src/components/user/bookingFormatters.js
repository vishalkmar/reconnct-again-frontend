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

// Frontend-side categorisation. Backend status never auto-flips to "completed",
// so we treat any booking whose scheduled time has already passed as completed
// — same rule the backend's isCompletedNow (experienceReview.controller.js)
// uses for the rate/review prompts, so "completed" never disagrees between the
// booking list, the review popup, and My Bookings. Prefer scheduledEndAt (full
// duration), then the exact scheduledAt timestamp, falling back to the
// date-only scheduledFor for older bookings that predate that column.
export const categorize = (booking) => {
  if (!booking) return 'other';
  if (booking.status === 'cancelled' || booking.status === 'refunded') return 'cancelled';
  if (booking.status === 'pending_payment') return 'pending';
  if (booking.status === 'completed') return 'completed';

  const endIso = booking.scheduledEndAt || booking.scheduledAt || booking.scheduledFor;
  const end = endIso ? new Date(endIso) : null;
  if (booking.status === 'confirmed' && end && end.getTime() <= Date.now()) return 'completed';
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
