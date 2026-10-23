/*
  Shown while a lazy-loaded page chunk downloads. Kept tiny and dependency
  free so it is part of the first bundle. A short delay avoids a flash on
  fast networks.
*/
export default function RouteFallback() {
  return (
    <div className="min-h-[60vh] grid place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 opacity-0 animate-[fadeIn_200ms_ease-out_250ms_forwards]">
        <span className="w-10 h-10 rounded-full border-[3px] border-[#FDEFD3] border-t-[#FFB900] animate-spin" />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
