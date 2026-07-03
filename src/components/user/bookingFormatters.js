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
// so we treat any past-dated confirmed booking as completed for display.
export const categorize = (booking) => {
  if (!booking) return 'other';
  if (booking.status === 'cancelled' || booking.status === 'refunded') return 'cancelled';
  if (booking.status === 'pending_payment') return 'pending';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endIso = booking.scheduledEndAt || booking.scheduledFor;
  const end = endIso ? new Date(endIso) : null;
  if (booking.status === 'completed') return 'completed';
  if (booking.status === 'confirmed' && end && end < today) return 'completed';
  return 'upcoming';
};

export const isPaid = (booking) =>
  !!booking?.payment?.paidAt || ['confirmed', 'completed', 'refunded'].includes(booking?.status);
