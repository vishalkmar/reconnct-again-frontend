// India's 28 states + 8 union territories. Mirrors the backend seeder
// (backend/src/scripts/seedIndianStates.js). Used to constrain the Location
// dropdown/filter to states only, shown by name (no country suffix).
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const STATE_SET = new Set(INDIAN_STATES.map((s) => s.toLowerCase().trim()));
export const isIndianState = (name) => STATE_SET.has(String(name || '').toLowerCase().trim());

// Keep only the Indian-state locations from a list of {name,...} taxonomy rows,
// sorted alphabetically by name.
export const onlyStateLocations = (locations = []) =>
  (locations || [])
    .filter((l) => isIndianState(l.name))
    .sort((a, b) => a.name.localeCompare(b.name));

export default INDIAN_STATES;
