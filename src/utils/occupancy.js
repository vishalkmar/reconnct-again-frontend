// Human label for a room's occupancy. 1/2/3 map to Single/Double/Triple
// occupancy; anything larger falls back to a guest count.
export function occupancyLabel(n) {
  const v = Number(n) || 0;
  if (v === 1) return 'Single occupancy';
  if (v === 2) return 'Double occupancy';
  if (v === 3) return 'Triple occupancy';
  return `Up to ${v} guests`;
}

export default occupancyLabel;
