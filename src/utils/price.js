// Shared "from" price formatting so we never surface a bare "INR 0" anywhere.
// When no real price is available we show "On request" instead.

export const hasPrice = (v) => Number(v) > 0;

// Returns a display string like "INR 12,500" or "On request".
export function fromPriceLabel(value, currency = 'INR') {
  const n = Number(value) || 0;
  if (n <= 0) return 'On request';
  return `${currency} ${n.toLocaleString()}`;
}

// Pick the best "from" price for a hotel: the admin/derived priceFrom, else the
// cheapest priced room from a loaded rooms list.
export function hotelFromPrice(hotel, rooms = []) {
  const base = Number(hotel?.priceFrom) || 0;
  if (base > 0) return base;
  const prices = (rooms || []).map((r) => Number(r.price) || 0).filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : 0;
}
