export const TCS_RATES = [0, 1, 5, 10, 20];

export const TCS_OPTIONS = [
  { value: 0, label: 'TCS: Off' },
  { value: 1, label: 'TCS: 1%' },
  { value: 5, label: 'TCS: 5%' },
  { value: 10, label: 'TCS: 10%' },
  { value: 20, label: 'TCS: 20%' },
];

export const normalizeTcsRate = (v) => {
  const n = Math.round(Number(v));
  return TCS_RATES.includes(n) ? n : 0;
};
