import { useId } from 'react';

/**
 * Dual-thumb range slider for picking a price range.
 *
 * Props:
 *   value     — [lo, hi] tuple
 *   onChange  — (next: [lo, hi]) => void
 *   min       — lower bound (default 0)
 *   max       — upper bound (default 100000)
 *   step      — increment (default 500)
 *   currency  — display label (default 'INR')
 */
export default function PriceRangeSlider({
  value,
  onChange,
  min = 0,
  max = 100000,
  step = 500,
  currency = 'INR',
}) {
  const id = useId();
  const [lo, hi] = value;

  const safeLo = Math.max(min, Math.min(lo ?? min, max));
  const safeHi = Math.max(min, Math.min(hi ?? max, max));

  const setLo = (raw) => {
    const v = Math.min(raw, safeHi - step);
    onChange([Math.max(min, v), safeHi]);
  };
  const setHi = (raw) => {
    const v = Math.max(raw, safeLo + step);
    onChange([safeLo, Math.min(max, v)]);
  };

  const loPct = ((safeLo - min) / (max - min)) * 100;
  const hiPct = ((safeHi - min) / (max - min)) * 100;

  const fmt = (n) => `${currency} ${Number(n).toLocaleString()}`;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-ink">{fmt(safeLo)}</span>
        <span className="text-ink">{fmt(safeHi)}</span>
      </div>

      <div className="relative h-6">
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 rounded-full pointer-events-none" />
        {/* Selected range fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-brand rounded-full pointer-events-none"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
        />

        {/* Lo thumb */}
        <input
          id={`${id}-lo`}
          type="range"
          min={min} max={max} step={step} value={safeLo}
          onChange={(e) => setLo(Number(e.target.value))}
          className="price-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
        />
        {/* Hi thumb */}
        <input
          id={`${id}-hi`}
          type="range"
          min={min} max={max} step={step} value={safeHi}
          onChange={(e) => setHi(Number(e.target.value))}
          className="price-thumb absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={min} max={max}
          className="input text-xs h-8"
          value={safeLo}
          onChange={(e) => setLo(Number(e.target.value || min))}
          aria-label="Min price"
        />
        <input
          type="number"
          min={min} max={max}
          className="input text-xs h-8"
          value={safeHi}
          onChange={(e) => setHi(Number(e.target.value || max))}
          aria-label="Max price"
        />
      </div>
    </div>
  );
}
