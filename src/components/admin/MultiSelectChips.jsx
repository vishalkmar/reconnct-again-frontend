import { Check } from 'lucide-react';

export default function MultiSelectChips({ options, value = [], onChange, color = 'brand' }) {
  const toggle = (id) => {
    const set = new Set(value);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  };

  const accentBg = color === 'wellness' ? 'bg-wellness text-white' : 'bg-brand text-white';
  const accentBorder = color === 'wellness' ? 'border-wellness' : 'border-brand';

  if (!options?.length) {
    return (
      <p className="text-xs text-ink-muted italic">
        No options available — create some first in the Content section.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o.id);
        return (
          <button
            type="button"
            key={o.id}
            onClick={() => toggle(o.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border-2 transition ${
              active
                ? `${accentBg} ${accentBorder}`
                : 'border-slate-200 bg-white hover:border-slate-400'
            }`}
          >
            {active && <Check size={14} />}
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
