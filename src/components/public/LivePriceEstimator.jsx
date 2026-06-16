import { useState } from 'react';
import { calculateTaxPricing, taxIncludedLabel } from '../../utils/taxPricing.js';

/**
 * Tiny "estimate your total" widget for any bookable detail page. The user
 * types or steps a number and the displayed total recomputes on every
 * keystroke — no submit, no debounce. Used on AddOn / Event / Package /
 * Room detail pages so the per-person (or per-night, per-ticket…) price
 * the user is reading converts into the real out-of-pocket figure before
 * they even click Book.
 *
 * Props
 *   unitPrice   - base rupee figure (number)
 *   currency    - 'INR' etc (string, default 'INR')
 *   unitLabel   - singular noun ("guest", "ticket", "night")
 *   defaultUnits - initial count (default 1)
 *   minUnits    - clamp (default 1)
 *   maxUnits    - clamp (default 50)
 *   note        - small text under the total
 *   onChange    - optional callback (units) => void so the parent can
 *                 forward the same number into its Book CTA
 */
export default function LivePriceEstimator({
  unitPrice,
  currency = 'INR',
  unitLabel = 'guest',
  defaultUnits = 1,
  minUnits = 1,
  maxUnits = 50,
  note = '',
  gstRate = 0,
  tcsRate = 0,
  onChange,
}) {
  const [units, setUnits] = useState(defaultUnits);
  const safePrice = Math.max(0, Number(unitPrice) || 0);
  const safeUnits = clamp(Number(units) || minUnits, minUnits, maxUnits);
  const total = safePrice * safeUnits;
  const taxPricing = calculateTaxPricing(total, gstRate, tcsRate);
  const resolvedNote = note || (taxPricing.hasTaxes ? taxIncludedLabel(taxPricing) : '');

  const patch = (next) => {
    const c = clamp(next, minUnits, maxUnits);
    setUnits(c);
    onChange?.(c);
  };

  // Allow blanks while typing so the user can delete + retype, but cap on
  // commit. Treat empty string as `minUnits`.
  const handleInput = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setUnits('');
      return;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    patch(n);
  };

  const handleBlur = () => {
    if (units === '' || units < minUnits) patch(minUnits);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        Estimate your total
      </p>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="number"
          min={minUnits}
          max={maxUnits}
          value={units}
          onChange={handleInput}
          onBlur={handleBlur}
          className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-lg font-bold text-center focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
          aria-label={`Number of ${unitLabel}s`}
        />
        <span className="text-sm text-ink-muted">
          {unitLabel}{safeUnits === 1 ? '' : 's'}
        </span>
      </div>

      {/* Live total */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-ink-muted">
            {currency} {safePrice.toLocaleString()} × {safeUnits} {unitLabel}{safeUnits === 1 ? '' : 's'}
          </span>
          <span className="text-2xl font-bold text-brand">
            {currency} {Math.round(taxPricing.total).toLocaleString()}
          </span>
        </div>
        {resolvedNote && <p className="mt-1 text-[11px] text-ink-muted">{resolvedNote}</p>}
      </div>
    </div>
  );
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
