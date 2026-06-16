// Client-side room price estimate that mirrors the backend booking engine
// (backend/src/services/booking.service.js) so the room detail page can show a
// live total before the server quote. The server stays the source of truth at
// checkout; this is just for instant feedback.

export function matchTier(tiers, person) {
  if (!Array.isArray(tiers)) return null;
  const a = Number(person?.age);
  if (Number.isNaN(a)) return null;
  const bed = person?.bed === 'with' ? 'with' : 'without';
  const inBand = (t) => a >= Number(t.ageFrom) && a <= Number(t.ageTo);
  return tiers.find((t) => inBand(t) && t.bed === bed) || tiers.find(inBand) || null;
}

// Per-night charge for one extra person (0 when free / unmatched).
export function extraPersonNightly(tiers, person) {
  const t = matchTier(tiers, person);
  return t && t.priceType === 'custom' ? Number(t.price) || 0 : 0;
}

// Returns { rooms, nights, base, extra, subtotal }. Rooms auto-grow so the
// party (adults + extra guests) always fits the room's max occupancy.
export function computeRoomEstimate({
  price,
  maxOccupancy = 2,
  tiers = [],
  nights = 1,
  adults = 1,
  extraPersons = [],
  minRooms = 1,
}) {
  const n = Math.max(1, Number(nights) || 1);
  const occ = Math.max(1, Number(maxOccupancy) || 2);
  const people = Math.max(1, Number(adults) || 1) + (extraPersons?.length || 0);
  const rooms = Math.max(Number(minRooms) || 1, Math.ceil(people / occ));
  const base = (Number(price) || 0) * n * rooms;
  const extraNightly = (extraPersons || []).reduce((s, p) => s + extraPersonNightly(tiers, p), 0);
  const extra = extraNightly * n;
  return { rooms, nights: n, base, extra, subtotal: base + extra, people };
}
