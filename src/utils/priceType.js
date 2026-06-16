// Price-type options shown in admin pricing sections + the public unit label.
export const PRICE_TYPE_OPTIONS = [
  { value: 'per_night', label: 'Per night' },
  { value: 'per_person', label: 'Per person' },
  { value: 'package', label: 'Package price' },
  { value: 'custom', label: 'Custom' },
];

export const PRICE_TYPES = PRICE_TYPE_OPTIONS.map((o) => o.value);

// Short suffix after the amount, e.g. "/ night", "/ person", custom label, etc.
export const priceUnitLabel = (priceType, priceLabel) => {
  switch (priceType) {
    case 'per_night': return 'per night';
    case 'per_person': return 'per person';
    case 'package': return 'package price';
    case 'custom': return String(priceLabel || '').trim() || 'price';
    default: return '';
  }
};

// Compact "/ unit" form for tight card layouts.
export const priceUnitShort = (priceType, priceLabel) => {
  switch (priceType) {
    case 'per_night': return '/ night';
    case 'per_person': return '/ person';
    case 'package': return '';
    case 'custom': return priceLabel ? `· ${String(priceLabel).trim()}` : '';
    default: return '';
  }
};
