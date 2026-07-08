import { Plus, Trash2, IndianRupee, Baby, User } from 'lucide-react';

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
 */
const METHODS = [
  { value: 'per_person', label: 'Per person' },
  { value: 'per_day', label: 'Per day' },
  { value: 'days', label: 'Days (multi-day)' },
  { value: 'per_hours', label: 'Price by hours' },
];

const UNIT = { per_person: '/ person', per_day: '/ day', days: '/ day', per_hours: '/ session' };

export default function ExperiencePricing({ priceMethod = 'per_person', pricing = {}, onChange }) {
  const p = {
    adultPrice: 0,
    childrenEnabled: false,
    childBands: [],
    duration: { hours: 0, minutes: 0 },
    days: 1,
    ...pricing,
  };

  const setPricing = (patch) => onChange({ pricing: { ...p, ...patch } });

  const setBand = (i, patch) => {
    const next = p.childBands.map((b, idx) => (idx === i ? { ...b, ...patch } : b));
    setPricing({ childBands: next });
  };
  const addBand = () => {
    // Chain the next band from the previous one's end age for convenience.
    const last = p.childBands[p.childBands.length - 1];
    const start = last ? Math.min(14, Number(last.endAge) + 1) : 0;
    setPricing({ childBands: [...p.childBands, { startAge: start, endAge: Math.min(14, start + 4), charge: true, price: 0 }] });
  };
  const removeBand = (i) => setPricing({ childBands: p.childBands.filter((_, idx) => idx !== i) });

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
            <p className="text-xs text-ink-muted">Define age bands (years). Toggle <strong>Set a price</strong> off to make that band free.</p>
            {p.childBands.map((b, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 bg-surface-alt rounded-lg p-3">
                <div>
                  <span className="block text-[11px] text-ink-muted mb-1">Start age</span>
                  <NumberBox value={b.startAge} onChange={(v) => setBand(i, { startAge: v })} min={0} max={14} suffix="yr" />
                </div>
                <span className="pb-2 text-ink-muted">to</span>
                <div>
                  <span className="block text-[11px] text-ink-muted mb-1">End age</span>
                  <NumberBox value={b.endAge} onChange={(v) => setBand(i, { endAge: v })} min={0} max={14} suffix="yr" />
                </div>
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
              <Plus size={14} /> Add age band
            </button>
          </div>
        )}
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
