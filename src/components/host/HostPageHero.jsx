/*
  Photo banner used at the top of every Host / Supplier page — same look as the
  member dashboard (photo, white wash on the left, Fraunces title). `actions`
  sits on the right (buttons), `art` is an optional decorative emoji.
*/
const PHOTOS = {
  lake: { webp: '/partner/lake-800.webp 800w, /partner/lake-1400.webp 1400w, /partner/lake-2000.webp 2000w', src: '/partner/lake-1400.webp', pos: 'object-[center_45%]' },
  coast: { webp: '/hero/santorini-640.webp 640w, /hero/santorini-1024.webp 1024w, /hero/santorini-1795.webp 1795w', src: '/hero/santorini-1600.jpg', pos: 'object-[center_60%]' },
};

export default function HostPageHero({
  title, subtitle, actions = null, art = null, photo = 'lake', eyebrow = null, children = null, className = '',
}) {
  const p = PHOTOS[photo] || PHOTOS.lake;
  return (
    <div className={`relative isolate overflow-hidden rounded-[26px] mb-5 sm:mb-6 shadow-[0_20px_44px_-32px_rgba(16,24,40,0.55)] ${className}`}>
      <picture>
        <source srcSet={p.webp} sizes="(min-width: 1024px) 75vw, 100vw" type="image/webp" />
        <img src={p.src} alt="" className={`absolute inset-0 -z-20 w-full h-full object-cover ${p.pos}`} />
      </picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/80 to-white/15" aria-hidden="true" />
      {art && (
        <span className="hidden md:block absolute right-8 lg:right-14 top-1/2 -translate-y-1/2 text-[72px] lg:text-[84px] leading-none drop-shadow-[0_14px_14px_rgba(0,0,0,0.22)] select-none pointer-events-none" aria-hidden="true">{art}</span>
      )}
      <div className={`relative flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 sm:px-8 lg:px-10 py-7 sm:py-9 ${art ? 'md:pr-40 lg:pr-48' : ''}`}>
        <div className="min-w-0">
          {eyebrow && (
            <div className="inline-flex items-center h-7 px-3 rounded-full bg-[#FFF1CC] text-[#B07800] text-[11px] font-bold tracking-[0.16em] uppercase mb-3">{eyebrow}</div>
          )}
          <h1 className="font-display font-bold text-[28px] sm:text-[38px] leading-tight text-rc-navy">{title}</h1>
          {subtitle && <p className="text-[14px] sm:text-[16px] text-rc-navy/85 mt-1.5 max-w-[680px]">{subtitle}</p>}
          <span className="block h-[3px] w-9 rounded-full bg-rc-brand mt-4" aria-hidden="true" />
        </div>
        {actions && <div className="shrink-0 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
