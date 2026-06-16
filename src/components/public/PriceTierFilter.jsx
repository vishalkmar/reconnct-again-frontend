import { useMemo } from 'react';
import { IndianRupee } from 'lucide-react';

/**
 * Vertical radio list of price tiers used by Hotels / Packages / Events.
 * Each tier sits on its own line with a radio button — no dropdown, no
 * inner scroll, so the whole sidebar scrolls naturally with the page.
 *
 * Props
 *   priceMin / priceMax  → live dataset range (numbers)
 *   value                → currently-selected maxPrice (string or number)
 *   onChange             → (nextMaxPriceString: string) => void.  '' clears.
 *   currency             → display label, defaults to 'INR'
 *   tierCount            → how many tiers to render (default 5)
 */
export default function PriceTierFilter({
  priceMin = 0,
  priceMax,
  value,
  onChange,
  currency = 'INR',
  tierCount = 5,
}) {
  const tiers = useMemo(() => {
    const fromLive = generateTiers(Number(priceMin) || 0, Number(priceMax) || 0, tierCount);
    if (fromLive.length > 0) return fromLive;
    return [5000, 10000, 25000, 50000, 100000];
  }, [priceMin, priceMax, tierCount]);

  const current = String(value || '');
  const haveLiveRange = Number(priceMax) > 0;

  return (
    <div className="space-y-1.5">
      <RadioRow
        label="Any price"
        checked={current === ''}
        onChange={() => onChange('')}
      />
      {tiers.map((t) => (
        <RadioRow
          key={t}
          label={`Under ${currency} ${t.toLocaleString()}`}
          checked={current === String(t)}
          onChange={() => onChange(String(t))}
        />
      ))}
      {haveLiveRange && (
        <p className="mt-1.5 text-[11px] text-ink-muted flex items-center gap-1">
          <IndianRupee size={11} />
          Range: {currency} {Number(priceMin).toLocaleString()} – {Number(priceMax).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// One-line radio row. Whole row is clickable; the visual radio is just
// styled so the click target is the whole label (better mobile UX).
function RadioRow({ label, checked, onChange }) {
  return (
    <label
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition ${
        checked ? 'bg-brand/5 text-brand font-semibold' : 'hover:bg-slate-50 text-ink'
      }`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="accent-brand"
      />
      <span className="flex-1 truncate">{label}</span>
    </label>
  );
}

function roundStep(step) {
  if (step <= 0) return 100;
  if (step >= 5000) return Math.ceil(step / 1000) * 1000;
  if (step >= 1000) return Math.ceil(step / 500) * 500;
  if (step >= 100) return Math.ceil(step / 100) * 100;
  return Math.max(50, Math.ceil(step / 50) * 50);
}

function roundUpToNice(n) {
  if (n <= 0) return 0;
  if (n >= 100000) return Math.ceil(n / 5000) * 5000;
  if (n >= 10000) return Math.ceil(n / 1000) * 1000;
  if (n >= 1000) return Math.ceil(n / 500) * 500;
  if (n >= 100) return Math.ceil(n / 50) * 50;
  return Math.ceil(n / 10) * 10;
}

function generateTiers(min, max, count) {
  if (!max || max <= 0) return [];
  const cleanMax = roundUpToNice(max);
  const cleanMin = Math.max(0, Math.floor(min / 100) * 100);
  if (cleanMax - cleanMin < 500 || count <= 1) return [cleanMax];
  const step = roundStep((cleanMax - cleanMin) / count);
  const tiers = new Set();
  let v = Math.max(cleanMin + step, step);
  while (v < cleanMax && tiers.size < count - 1) {
    tiers.add(v);
    v += step;
  }
  tiers.add(cleanMax);
  return [...tiers].sort((a, b) => a - b);
}
