import { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';

/**
 * Clickable star rating input — replaces plain number boxes for any 0–5
 * rating so admins set ratings visually (same star language as the star-class
 * dropdown). Supports half-stars: click the left half of a star for x.5, the
 * right half for x. The numeric value is shown alongside, with a quick Clear.
 */
export default function StarRatingInput({ value = 0, onChange, max = 5, size = 22 }) {
  const [hover, setHover] = useState(null);
  const display = hover ?? (Number(value) || 0);

  const pick = (e, starIndex) => {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - left < width / 2;
    const next = starIndex - (isLeftHalf ? 0.5 : 0);
    onChange?.(next);
  };

  const move = (e, starIndex) => {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - left < width / 2;
    setHover(starIndex - (isLeftHalf ? 0.5 : 0));
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: max }, (_, i) => {
          const starIndex = i + 1;
          const filled = display >= starIndex;
          const half = !filled && display >= starIndex - 0.5;
          return (
            <button
              key={starIndex}
              type="button"
              onMouseMove={(e) => move(e, starIndex)}
              onClick={(e) => pick(e, starIndex)}
              className="p-0.5 text-amber-400 hover:scale-110 transition"
              title={`${starIndex} star${starIndex > 1 ? 's' : ''}`}
            >
              {half ? (
                <StarHalf size={size} className="fill-amber-400 text-amber-400" />
              ) : (
                <Star size={size} className={filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
              )}
            </button>
          );
        })}
      </div>
      <span className="text-sm font-semibold text-ink tabular-nums">
        {(Number(value) || 0).toFixed(1)}
      </span>
      {Number(value) > 0 && (
        <button
          type="button"
          onClick={() => onChange?.(0)}
          className="text-xs text-ink-muted hover:text-red-500 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
