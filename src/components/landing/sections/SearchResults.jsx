import ExperienceCard from '../cards/ExperienceCard.jsx';

/*
  In-place results that replace the home feed while searching / filtering
  (app parity): "N results" + Clear, responsive grid, empty state.
*/
export default function SearchResults({ results, busy, onClear }) {
  const list = results || [];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 min-h-[50vh]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-sans text-base sm:text-lg font-black text-[#242235]" aria-live="polite">
          {busy ? 'Searching…' : `${list.length} result${list.length === 1 ? '' : 's'}`}
        </h2>
        <button type="button" onClick={onClear} className="text-sm font-bold text-rc-brand hover:text-rc-brand-dark">Clear</button>
      </div>

      {busy && !results ? (
        <ResultsSkeleton />
      ) : list.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {list.map((it) => <ExperienceCard key={it.id} item={it} />)}
        </div>
      ) : (
        <p className="text-rc-ink-muted py-10 text-center">No experiences match. Try a different search or filter.</p>
      )}
    </div>
  );
}

export function ResultsSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => <div key={i} className="rc-skeleton rounded-2xl h-[250px]" />)}
    </div>
  );
}
