/*
  The Reconnct wordmark (public/reconnct-logo-white.png) painted through a CSS
  mask so one asset works white on the gold hero and gold on white surfaces.

  `by` adds the "by traveon" endorsement under the wordmark, right-aligned
  (Reconnct is a Traveon product). `byTone` picks its colours for the surface:
  'light' (white/cream backgrounds) or 'dark' (navy / photo backgrounds).
  `bySize` is the endorsement's font-size class.
*/
export default function BrandMark({
  color = '#FFB900', className = 'h-7 w-32', by = false, byTone = 'light', bySize = 'text-[11px]',
}) {
  const mark = (
    <span
      role={by ? undefined : 'img'}
      aria-label={by ? undefined : 'Reconnct'}
      aria-hidden={by ? 'true' : undefined}
      className={`inline-block shrink-0 align-middle ${by ? '' : className}`}
      style={{
        backgroundColor: color,
        mask: 'url(/reconnct-logo-white.png) left center / contain no-repeat',
        WebkitMask: 'url(/reconnct-logo-white.png) left center / contain no-repeat',
        ...(by ? { width: '100%', aspectRatio: '600 / 111' } : null),
      }}
    />
  );
  if (!by) return mark;

  const dark = byTone === 'dark';
  return (
    <span role="img" aria-label="Reconnct by Traveon" className={`inline-flex flex-col items-end shrink-0 align-middle ${className.replace(/\b(lg:|sm:|md:)?h-\[?[\w.]+\]?/g, '').trim()}`}>
      {mark}
      <span className={`${bySize} leading-none mt-[5px] pr-[1%] whitespace-nowrap tracking-tight`} aria-hidden="true">
        <span className={`font-medium ${dark ? 'text-white/70' : 'text-[#8A8F9C]'}`}>by </span>
        <span className={`font-extrabold ${dark ? 'text-white' : 'text-rc-navy'}`}>traveon</span>
      </span>
    </span>
  );
}
