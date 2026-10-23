/*
  Bookable dates + time slots for an experience — ported from the app's
  utils/booking.js so web and app offer exactly the same dates/slots
  (schedule.dates[].date / .slots, as written by "Manage dates & slots").
*/
// Local-date key (YYYY-MM-DD) — avoids the UTC shift of toISOString().
export const ymd = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const to12h = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${ap}`;
};

const slotMinutes = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

// Sorted list of bookable date keys; today only while a slot is still ahead.
export function bookableDates(schedule = {}) {
  const dates = Array.isArray(schedule?.dates) ? schedule.dates : [];
  const todayKey = ymd(new Date());
  const now = nowMinutes();
  const out = new Set();
  dates.forEach((d) => {
    if (!d || !d.date || d.date < todayKey) return;
    if (d.date === todayKey) {
      const slots = Array.isArray(d.slots) ? d.slots : [];
      if (slots.length > 0 && !slots.some((s) => slotMinutes(s.start) > now)) return;
    }
    out.add(d.date);
  });
  return [...out].sort();
}

export function slotsForDate(schedule = {}, dateKey) {
  const dates = Array.isArray(schedule?.dates) ? schedule.dates : [];
  const row = dateKey ? dates.find((d) => d.date === dateKey) : null;
  let slots = (row && row.slots) || [];
  if (dateKey === ymd(new Date())) {
    const now = nowMinutes();
    slots = slots.filter((s) => slotMinutes(s.start) > now);
  }
  return slots.map((s) => ({ ...s, label: `${to12h(s.start)} – ${to12h(s.end)}` }));
}

export const prettyDate = (key) => new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
