import { useState } from 'react';
import { Plus, Trash2, IndianRupee, Baby, User, Percent, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Dynamic pricing block (Task 4 #9).
 *
 *   priceMethod: per_person | per_day | days | per_hours
 *   pricing: {
 *     adultPrice, childrenEnabled,
 *     childBands: [{ startAge, endAge, charge, price }],
 *     duration: { hours, minutes },   // per_day / per_hours
 *     days,                           // days
 *   }
 *
 * - per_person : adult price + optional children age-bands
 * - per_day    : duration (hrs/min) → then adult + children
 * - days       : number of days → then adult + children
 * - per_hours  : duration (hrs/min) → then adult + children
 *
 * Controlled via `priceMethod`, `pricing` and `onChange({ priceMethod?, pricing? })`.
 *
 * `gstIncluded` (prop) turns on the "Included GST" switch — only meaningful on
 * the B2B block, so the B2C reference block leaves it off. It writes
 * pricing.gstIncluded / pricing.gstIncludedRate, which ride along inside the
 * pricing JSON every upload surface already sends.
 */
const METHODS = [
  { value: 'per_person', label: 'Per person' },
  { value: 'per_day', label: 'Per day' },
  { value: 'days', label: 'Days (multi-day)' },
  { value: 'per_hours', label: 'Price by hours' },
];

const UNIT = { per_person: '/ person', per_day: '/ day', days: '/ day', per_hours: '/ session' };

export default function ExperiencePricing({ priceMethod = 'per_person', pricing = {}, onChange, gstIncluded = false }) {
  const p = {
    adultPrice: 0,
    childrenEnabled: false,
    childBands: [],
    duration: { hours: 0, minutes: 0 },
    days: 1,
    ...pricing,
  };

  const setPricing = (patch) => onChange({ pricing: { ...p, ...patch } });

  const mode = p.childMode || 'age'; // 'age' (default) | 'height'
  const setBand = (i, patch) => {
    const next = p.childBands.map((b, idx) => (idx === i ? { ...b, ...patch } : b));
    setPricing({ childBands: next });
  };
  const addBand = () => {
    const last = p.childBands[p.childBands.length - 1];
    if (mode === 'height') {
      const start = last ? (Number(last.endHeight) || 0) + 1 : 80;
      setPricing({ childBands: [...p.childBands, { startHeight: start, endHeight: start + 20, charge: true, price: 0 }] });
    } else {
      const start = last ? Math.min(14, Number(last.endAge) + 1) : 0;
      setPricing({ childBands: [...p.childBands, { startAge: start, endAge: Math.min(14, start + 4), charge: true, price: 0 }] });
    }
  };
  const removeBand = (i) => setPricing({ childBands: p.childBands.filter((_, idx) => idx !== i) });
  // Switching the basis re-seeds a single default band of the new kind, so a
  // band never carries stale age keys while shown as height (or vice-versa).
  const setMode = (m) => {
    if (mode === m) return;
    const seed = m === 'height'
      ? { startHeight: 80, endHeight: 120, charge: false, price: 0 }
      : { startAge: 0, endAge: 5, charge: false, price: 0 };
    setPricing({ childMode: m, childBands: [seed] });
  };

  return (
    <div className="space-y-5">
      {/* Method */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Price method</label>
          <select className="input" value={priceMethod} onChange={(e) => onChange({ priceMethod: e.target.value })}>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Number of days (days) */}
        {priceMethod === 'days' && (
          <div>
            <label className="label">Number of days</label>
            <NumberBox value={p.days} onChange={(v) => setPricing({ days: v })} suffix="days" min={1} />
          </div>
        )}
      </div>

      {/* Adult price */}
      <div>
        <label className="label inline-flex items-center gap-1.5"><User size={14} /> Adult price</label>
        <Money value={p.adultPrice} onChange={(v) => setPricing({ adultPrice: v })} suffix={UNIT[priceMethod]} />
      </div>

      {/* Included GST — B2B block only */}
      {gstIncluded && <IncludedGst pricing={p} setPricing={setPricing} />}

      {/* Children */}
      <div className="rounded-xl border border-gray-200 p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="inline-flex items-center gap-2 font-medium text-ink"><Baby size={16} className="text-brand" /> Add children pricing</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[rgb(var(--brand))]"
            checked={!!p.childrenEnabled}
            onChange={(e) => setPricing({ childrenEnabled: e.target.checked, childBands: e.target.checked && p.childBands.length === 0 ? [{ startAge: 0, endAge: 5, charge: false, price: 0 }] : p.childBands })}
          />
        </label>

        {p.childrenEnabled && (
          <div className="mt-4 space-y-3">
            {/* Basis: age (default) or height — one at a time */}
            <div className="flex flex-wrap gap-5">
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={mode === 'age'} onChange={() => setMode('age')} />
                Based on age
              </label>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={mode === 'height'} onChange={() => setMode('height')} />
                Based on height
              </label>
            </div>
            <p className="text-xs text-ink-muted">Define {mode === 'height' ? 'height ranges (cm)' : 'age bands (years)'}. Toggle <strong>Set a price</strong> off to make that band free.</p>
            {p.childBands.map((b, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 bg-surface-alt rounded-lg p-3">
                {mode === 'height' ? (
                  <>
                    <div>
                      <span className="block text-[11px] text-ink-muted mb-1">Min height</span>
                      <NumberBox value={b.startHeight} onChange={(v) => setBand(i, { startHeight: v })} min={0} suffix="cm" />
                    </div>
                    <span className="pb-2 text-ink-muted">to</span>
                    <div>
                      <span className="block text-[11px] text-ink-muted mb-1">Max height</span>
                      <NumberBox value={b.endHeight} onChange={(v) => setBand(i, { endHeight: v })} min={0} suffix="cm" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="block text-[11px] text-ink-muted mb-1">Start age</span>
                      <NumberBox value={b.startAge} onChange={(v) => setBand(i, { startAge: v })} min={0} max={14} suffix="yr" />
                    </div>
                    <span className="pb-2 text-ink-muted">to</span>
                    <div>
                      <span className="block text-[11px] text-ink-muted mb-1">End age</span>
                      <NumberBox value={b.endAge} onChange={(v) => setBand(i, { endAge: v })} min={0} max={14} suffix="yr" />
                    </div>
                  </>
                )}
                <label className="inline-flex items-center gap-1.5 pb-2 text-sm cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={!!b.charge} onChange={(e) => setBand(i, { charge: e.target.checked })} />
                  Set a price
                </label>
                {b.charge ? (
                  <div>
                    <span className="block text-[11px] text-ink-muted mb-1">Child price</span>
                    <Money value={b.price} onChange={(v) => setBand(i, { price: v })} />
                  </div>
                ) : (
                  <span className="pb-2 text-xs font-medium text-emerald-600">Free</span>
                )}
                <button type="button" onClick={() => removeBand(i)} className="ml-auto p-2 text-rose-500 hover:bg-rose-50 rounded-lg" title="Remove band">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addBand} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <Plus size={14} /> {mode === 'height' ? 'Add height band' : 'Add age band'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/*
  "Included GST" — the adder tells us their quoted B2B price already carries GST.

  18% is the platform default and the only one that saves silently. 5% and 28%
  are shown in red and, if picked, have to survive TWO deliberate steps: a
  warning toast, then a confirm dialog whose "No, keep 18%" button pulses while
  "Apply anyway" stays a muted grey — the attention deliberately sits on backing
  out, because the wrong slab here is expensive to unwind once bookings exist.
*/
const GST_SLABS = [
  { value: 18, label: '18% (default)', risky: false },
  { value: 5, label: '5%', risky: true },
  { value: 28, label: '28%', risky: true },
];
const DEFAULT_SLAB = 18;

function IncludedGst({ pricing, setPricing }) {
  const on = !!pricing.gstIncluded;
  const rate = Number(pricing.gstIncludedRate) || DEFAULT_SLAB;
  const [pending, setPending] = useState(null); // the risky slab awaiting confirmation

  const toggle = (checked) => setPricing({
    gstIncluded: checked,
    // Turning it on lands on the safe default; turning it off clears the rate.
    gstIncludedRate: checked ? (Number(pricing.gstIncludedRate) || DEFAULT_SLAB) : 0,
  });

  const pick = (value) => {
    const slab = GST_SLABS.find((s) => s.value === value);
    if (!slab || !slab.risky) return setPricing({ gstIncludedRate: value });
    // Step 1 — a warning at the top of the screen.
    toast(
      `You're moving off the standard 18% GST to ${value}%. Please double-check this is really the slab for this experience.`,
      { icon: '⚠️', duration: 6000, position: 'top-center' },
    );
    // Step 2 — the confirm dialog.
    setPending(value);
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <label className="flex items-center justify-between cursor-pointer">
        <span className="inline-flex items-center gap-2 font-medium text-ink">
          <Percent size={16} className="text-brand" /> Included GST
          <span className="block text-[11px] text-ink-muted font-normal">
            Is GST already included in the price above?
          </span>
        </span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[rgb(var(--brand))]"
          checked={on}
          onChange={(e) => toggle(e.target.checked)}
        />
      </label>

      {on && (
        <div className="mt-3">
          <span className="block text-[11px] text-ink-muted mb-1">GST rate included in this price</span>
          <select
            className="input w-56"
            value={rate}
            onChange={(e) => pick(Number(e.target.value))}
          >
            {GST_SLABS.map((s) => (
              // The non-default slabs stay red in the list so an accidental
              // pick is visible before it's made, not only after.
              <option key={s.value} value={s.value} style={s.risky ? { color: '#dc2626' } : undefined}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-ink-muted mt-1">
            Center Ops sees this at go-live and decides whether the platform GST applies on top.
          </p>
        </div>
      )}

      {pending != null && (
        <ConfirmRiskySlab
          value={pending}
          onDeny={() => setPending(null)}
          onApply={() => { setPricing({ gstIncludedRate: pending }); setPending(null); }}
        />
      )}
    </div>
  );
}

function ConfirmRiskySlab({ value, onDeny, onApply }) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={onDeny}>
      {/* Local keyframes — the deny button pulses to pull the eye to it. */}
      <style>{`
        @keyframes gstDenyPulse {
          0%,100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(220,38,38,.55); }
          50%     { transform: scale(1.045); box-shadow: 0 0 0 10px rgba(220,38,38,0); }
        }
        .gst-deny-blink { animation: gstDenyPulse 1s ease-in-out infinite; }
      `}</style>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={22} />
        </div>
        <h3 className="font-display font-bold text-lg mb-1">Change GST from 18% to {value}%?</h3>
        <p className="text-sm text-ink-muted mb-6">
          18% is the standard slab. {value}% applies only to specific categories — picking it by mistake means
          every booking on this experience is taxed wrongly. Are you certain?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onDeny}
            className="gst-deny-blink w-full px-5 py-2.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
          >
            No, keep it at 18%
          </button>
          <button
            type="button"
            onClick={onApply}
            className="w-full px-5 py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium hover:bg-gray-200 hover:text-gray-600"
          >
            Apply {value}% anyway
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberBox({ value, onChange, min, max, suffix }) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        placeholder="0"
        value={value || ''}
        onChange={(e) => {
          let v = e.target.value === '' ? 0 : Number(e.target.value);
          if (min != null && v < min) v = min;
          if (max != null && v > max) v = max;
          onChange(v);
        }}
        className="input w-28 pr-10"
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">{suffix}</span>}
    </div>
  );
}

function Money({ value, onChange, suffix }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="number"
          min={0}
          placeholder="0"
          value={value || ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="input pl-8 w-40"
        />
      </div>
      {suffix && <span className="text-sm text-ink-muted">{suffix}</span>}
    </div>
  );
}
