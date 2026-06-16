// GST (tax) options shown wherever a price is entered in the admin.
// 0 = "Off" (no GST — the default). The chosen percent is added to the price
// and auto-calculated at checkout.
export const GST_RATES = [0, 5, 18, 28, 40];

export const GST_OPTIONS = [
  { value: 0, label: 'GST: Off' },
  { value: 5, label: 'GST: 5%' },
  { value: 18, label: 'GST: 18%' },
  { value: 28, label: 'GST: 28%' },
  { value: 40, label: 'GST: 40%' },
];

export const normalizeGstRate = (v) => {
  const n = Math.round(Number(v));
  return GST_RATES.includes(n) ? n : 0;
};

// price including GST
export const withGst = (price, rate) => {
  const p = Number(price) || 0;
  const r = normalizeGstRate(rate);
  return p + (p * r) / 100;
};

// just the GST amount
export const gstAmount = (price, rate) => {
  const p = Number(price) || 0;
  return (p * normalizeGstRate(rate)) / 100;
};
