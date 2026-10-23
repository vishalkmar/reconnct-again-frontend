/*
  The Reconnct wordmark (public/reconnct-logo-white.png) painted through a CSS
  mask so one asset works white on the gold hero and gold on white surfaces.
*/
export default function BrandMark({ color = '#FFB900', className = 'h-7 w-32' }) {
  return (
    <span
      role="img"
      aria-label="Reconnct"
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{
        backgroundColor: color,
        mask: 'url(/reconnct-logo-white.png) left center / contain no-repeat',
        WebkitMask: 'url(/reconnct-logo-white.png) left center / contain no-repeat',
      }}
    />
  );
}
