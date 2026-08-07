// Shared date-range presets used across the admin filters (Transactions, Users,
// Suppliers…). `rangeForPeriod` returns { from, to } as YYYY-MM-DD strings.
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const PERIOD_OPTIONS = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'last3m', label: 'Last 3 months' },
  { value: 'last6m', label: 'Last 6 months' },
  { value: 'last1y', label: 'Last 1 year' },
  { value: 'thisYear', label: 'This year' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'custom', label: 'Custom range' },
];

export function rangeForPeriod(mode) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const back = (fn) => { const d = new Date(now); fn(d); return { from: iso(d), to: iso(now) }; };
  switch (mode) {
    case 'today': { const d = iso(now); return { from: d, to: d }; }
    case 'yesterday': { const d = new Date(now); d.setDate(d.getDate() - 1); const s = iso(d); return { from: s, to: s }; }
    case 'thisMonth': return { from: iso(new Date(y, m, 1)), to: iso(now) };
    case 'lastMonth': return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case 'last3m': return back((d) => d.setMonth(d.getMonth() - 3));
    case 'last6m': return back((d) => d.setMonth(d.getMonth() - 6));
    case 'last1y': return back((d) => d.setFullYear(d.getFullYear() - 1));
    case 'thisYear': return { from: iso(new Date(y, 0, 1)), to: iso(now) };
    case 'lastYear': return { from: iso(new Date(y - 1, 0, 1)), to: iso(new Date(y - 1, 11, 31)) };
    default: return { from: '', to: '' };
  }
}

// 10 price buckets for the Transactions amount filter (values in ₹).
export const PRICE_RANGES = [
  { label: 'Any amount', min: '', max: '' },
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { label: '₹1,000 – ₹2,000', min: 1000, max: 2000 },
  { label: '₹2,000 – ₹3,000', min: 2000, max: 3000 },
  { label: '₹3,000 – ₹5,000', min: 3000, max: 5000 },
  { label: '₹5,000 – ₹7,500', min: 5000, max: 7500 },
  { label: '₹7,500 – ₹10,000', min: 7500, max: 10000 },
  { label: '₹10,000 – ₹15,000', min: 10000, max: 15000 },
  { label: '₹15,000 – ₹25,000', min: 15000, max: 25000 },
  { label: 'Over ₹25,000', min: 25000, max: '' },
];
