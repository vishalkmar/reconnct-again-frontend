/**
 * Checkbox chips — multi-select array of strings, useful for things like
 * meals served, diets catered, facilities available, etc.
 */
export default function CheckboxChips({ options = [], value = [], onChange }) {
  const toggle = (opt) => {
    const set = new Set(value || []);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    onChange?.(Array.from(set));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value?.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full border text-sm transition ${
              active
                ? 'bg-brand text-white border-brand shadow-soft'
                : 'bg-white text-ink border-slate-200 hover:border-brand/60 hover:text-brand'
            }`}
          >
            {active ? '✓ ' : ''}{opt}
          </button>
        );
      })}
    </div>
  );
}
