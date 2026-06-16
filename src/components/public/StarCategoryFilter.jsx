// Shared "star category" filter — a vertical list of rows, each showing the
// full 5-star scale (filled = that category) so it matches the user-rating
// filter and the stars shown on cards. Multi-select via a comma-separated value.

const STAR_OPTIONS = [5, 4, 3, 2, 1];

export default function StarCategoryFilter({ value, onChange }) {
  const selected = (value || '').split(',').filter(Boolean);
  const isActive = (s) => selected.includes(String(s));
  const toggle = (s) => {
    const exists = isActive(s);
    const next = exists ? selected.filter((x) => x !== String(s)) : [...selected, String(s)];
    onChange(next.join(','));
  };

  return (
    <div className="space-y-1.5">
      {STAR_OPTIONS.map((s) => {
        const active = isActive(s);
        return (
          <label
            key={s}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition ${
              active ? 'bg-amber-50 text-amber-700 font-semibold' : 'hover:bg-slate-50 text-ink'
            }`}
          >
            <input type="checkbox" checked={active} onChange={() => toggle(s)} className="accent-amber-500" />
            <span className="inline-flex items-center gap-0.5 leading-none text-base">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < s ? 'text-amber-500' : 'text-slate-200'}>★</span>
              ))}
            </span>
            <span className="text-[11px] text-ink-muted ml-auto">{s}-star</span>
          </label>
        );
      })}
    </div>
  );
}
