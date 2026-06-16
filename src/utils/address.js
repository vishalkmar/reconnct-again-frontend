// Derive a short, human "City/State, Country" label from a long free-text
// address (used for PWA-listed properties that have no taxonomy location).
// e.g. "Netaji Subhash Place, Shalimar Bagh, North West Delhi, Delhi, 110035, India"
//   → "Delhi, India"

const isPincode = (s) => /^\d{4,7}$/.test(s.replace(/\s/g, ''));

export function addressShort(address) {
  if (!address) return '';
  const parts = String(address)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && !isPincode(s));
  if (parts.length === 0) return '';
  // Last part is usually the country, second-last the state.
  const country = parts[parts.length - 1];
  const state = parts.length >= 2 ? parts[parts.length - 2] : '';
  const label = [state, country].filter(Boolean).join(', ');
  return label || country;
}

// State + country only (no city), e.g. "Delhi, India".
export function stateCountry(address) {
  return addressShort(address);
}
