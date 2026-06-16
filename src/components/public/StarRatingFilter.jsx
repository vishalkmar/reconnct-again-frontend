// Shared "user rating" filter — vertical list of rows, each one labelled
// with yellow stars + a friendly tier name ("4.5+ Excellent" etc).
//
// Used on Hotels / Retreats / Events list pages so the rating filter
// looks identical everywhere and the visual matches the star rating
// users see on the cards themselves.

const DEFAULT_BUCKETS = [
  { value: '4.5', label: 'Excellent',  starsFilled: 5 },
  { value: '4',   label: 'Very Good',  starsFilled: 4 },
  { value: '3.5', label: 'Good',       starsFilled: 4 }, // 3.5 rounds visually to 4 full + 1 half — keep 4 filled for simplicity
  { value: '3',   label: 'Average',    starsFilled: 3 },
];

export default function StarRatingFilter({ value, onChange, buckets = DEFAULT_BUCKETS }) {
  return (
    <div className="space-y-1.5">
      <RatingRow
        active={!value}
        onChange={() => onChange('')}
        label="Any rating"
        starsFilled={0}
      />
      {buckets.map((b) => (
        <RatingRow
          key={b.value}
          active={value === b.value}
          onChange={() => onChange(value === b.value ? '' : b.value)}
          label={`${b.value}+ ${b.label}`}
          starsFilled={b.starsFilled}
        />
      ))}
    </div>
  );
}

function RatingRow({ active, onChange, label, starsFilled }) {
  return (
    <label
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition ${
        active ? 'bg-amber-50 text-amber-700 font-semibold' : 'hover:bg-slate-50 text-ink'
      }`}
    >
      <input
        type="radio"
        checked={active}
        onChange={onChange}
        className="accent-amber-500"
      />
      <span className="inline-flex items-center gap-0.5 leading-none text-base">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < starsFilled ? 'text-amber-500' : 'text-slate-200'}>
            ★
          </span>
        ))}
      </span>
      <span className="flex-1 text-[12px]">{label}</span>
    </label>
  );
}
