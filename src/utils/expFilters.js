/*
  Filter model for experience search — a direct port of the app's FilterSheet
  helpers (App/reconnct/src/screens/FilterSheet.jsx). Every taxonomy filter is
  multi-select and the API takes comma lists (audienceIds / categoryIds /
  typeIds), plus the three fixed price bands.
*/
export const PRICE_BANDS = [
  { key: 'under', label: 'Under ₹1,500', sub: 'Budget-friendly', priceMax: 1500 },
  { key: 'mid', label: '₹1,500 – ₹5,000', sub: 'Mid-range', priceMin: 1500, priceMax: 5000 },
  { key: 'premium', label: '₹5,000+', sub: 'Premium', priceMin: 5000 },
];

export const idsOf = (draft, key) => {
  const many = draft && draft[`${key}s`];
  if (Array.isArray(many)) return many.filter((v) => v != null);
  const one = draft && draft[key];
  return one != null ? [one] : [];
};

export const toggleId = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export const normalizeDraft = (draft = {}) => ({
  ...draft,
  audienceId: undefined,
  categoryId: undefined,
  typeId: undefined,
  audienceIds: idsOf(draft, 'audienceId'),
  categoryIds: idsOf(draft, 'categoryId'),
  typeIds: idsOf(draft, 'typeId'),
  priceBand: draft.priceBand || null,
});

export const activeFilterCount = (draft = {}) => (
  (idsOf(draft, 'audienceId').length ? 1 : 0)
  + (idsOf(draft, 'categoryId').length ? 1 : 0)
  + (idsOf(draft, 'typeId').length ? 1 : 0)
  + (draft.priceBand ? 1 : 0)
);

export function draftToParams(draft = {}) {
  const band = PRICE_BANDS.find((b) => b.key === draft.priceBand);
  const list = (key) => {
    const ids = idsOf(draft, key);
    return ids.length ? ids.join(',') : undefined;
  };
  return {
    audienceIds: list('audienceId'),
    categoryIds: list('categoryId'),
    typeIds: list('typeId'),
    priceMin: band && band.priceMin != null ? band.priceMin : undefined,
    priceMax: band && band.priceMax != null ? band.priceMax : undefined,
  };
}

// URL query string ⇄ draft, so filtered pages are shareable / refresh-safe.
const numList = (v) => (v ? String(v).split(',').map((x) => parseInt(x, 10)).filter(Number.isInteger) : []);

export function draftFromSearch(searchParams) {
  return normalizeDraft({
    audienceIds: numList(searchParams.get('audienceIds') || searchParams.get('audienceId')),
    categoryIds: numList(searchParams.get('categoryIds') || searchParams.get('categoryId')),
    typeIds: numList(searchParams.get('typeIds') || searchParams.get('typeId')),
    priceBand: PRICE_BANDS.some((b) => b.key === searchParams.get('price')) ? searchParams.get('price') : null,
  });
}

export function draftToSearch(draft, extra = {}) {
  const out = {};
  const put = (k, ids) => { if (ids.length) out[k] = ids.join(','); };
  put('audienceIds', idsOf(draft, 'audienceId'));
  put('categoryIds', idsOf(draft, 'categoryId'));
  put('typeIds', idsOf(draft, 'typeId'));
  if (draft.priceBand) out.price = draft.priceBand;
  Object.entries(extra).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') out[k] = String(v); });
  return out;
}
