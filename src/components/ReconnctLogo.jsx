/** Original bundled wordmark, tinted yellow on both light and dark navigation. */
export default function ReconnctLogo() {
  return (
    <span
      role="img"
      aria-label="Reconnct"
      className="inline-block h-7 w-32 shrink-0 align-middle"
      style={{
        backgroundColor: '#FFBF00',
        mask: 'url(/reconnct-logo-white.png) center / contain no-repeat',
        WebkitMask: 'url(/reconnct-logo-white.png) center / contain no-repeat',
      }}
    />
  );
}
