import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  MessageCircle,
  PackageOpen,
  Sparkles,
  Star,
  Heart,
  MapPin,
  Award,
  Compass,
} from 'lucide-react';
import api, { fileUrl } from '../../services/api';

const DEFAULT_CENTER_IMAGE = '/retreatlogo.png';

// Both CTAs open a WhatsApp chat with our expert, pre-filled with the right
// intent (retreat vs hotel) so the team can assist instantly.
const WHATSAPP_NUMBER = '919540111307';
const waLink = (msg) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
const RETREAT_WA_MSG = 'Hi, I am confused to find the best retreat. I need assistance choosing the right one for me.';
const HOTEL_WA_MSG = 'Hi, I need a personalised hotel recommendation. Please help me pick the best wellness hotel for my plan.';
const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="%230f9f8f"/><stop offset="1" stop-color="%232563eb"/></linearGradient></defs><rect width="700" height="700" fill="%23f8fafc"/><circle cx="350" cy="350" r="230" fill="url(%23g)" opacity=".12"/><circle cx="350" cy="278" r="86" fill="%2394a3b8"/><path d="M190 574c30-116 102-174 160-174s130 58 160 174" fill="%2394a3b8"/></svg>`
);

// Whitelist of icons the admin can pick from (keep in sync with the admin
// page's QUICK_ICON_CHOICES). Anything outside falls back to PackageOpen.
const ICON_MAP = {
  PackageOpen, BedDouble, CalendarDays, Sparkles,
  Heart, MessageCircle, MapPin, Award, Star, Compass,
};
const resolveIcon = (name) => ICON_MAP[name] || PackageOpen;

const FALLBACK = {
  heading: 'Not sure which retreat is perfect for you?',
  subheading:
    'Tell us your mood, destination preference and budget. Our wellness team will shortlist stays, packages and healing experiences that actually fit your plan.',
  primaryCtaLabel: 'Get personalised recommendations',
  primaryCtaUrl: '/retreats',
  whatsappCtaLabel: 'WhatsApp expert',
  whatsappUrl: 'https://wa.me/?text=Hi%2C%20I%20need%20help%20choosing%20a%20wellness%20retreat.',
  quickLinks: [
    { label: 'Top packages', tooltip: 'Curated wellness packages with stay, meals and healing activities.', url: '/retreats', icon: 'PackageOpen' },
    { label: 'Hotels',       tooltip: 'Hand-picked wellness hotels and retreat stays.',                       url: '/hotels',   icon: 'BedDouble' },
    { label: 'All in one place', tooltip: 'Compare hotels, packages and events together.',                   url: '/retreats', icon: 'CalendarDays' },
  ],
  centerImageUrl: null,
  liveMatchTitle: 'Live match',
  liveMatchSubtitle: 'Hotels + packages + events',
  topRatedTitle: 'Top rated',
  topRatedSubtitle: '4.9 wellness score',
  bottomBadgeTitle: '48 hr plan',
  bottomBadgeSubtitle: 'Custom shortlist',
  ringBadgeText: '10+',
  ringBadgeLabel: 'wellness filters',
};

export default function PersonalisedRecommendationCTA() {
  const [cfg, setCfg] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api.get('/personalised-recommendation')
      .then((res) => {
        if (cancelled) return;
        const remote = res.data?.data?.personalisedRecommendation || {};
        // Merge: any blank/empty field from remote falls back to FALLBACK so
        // the page never renders an empty placeholder.
        const merged = { ...FALLBACK };
        Object.entries(remote).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) merged[k] = v;
        });
        setCfg(merged);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const quickLinks = (cfg.quickLinks?.length ? cfg.quickLinks : FALLBACK.quickLinks).slice(0, 6);
  const centerSrc = cfg.centerImageUrl ? fileUrl(cfg.centerImageUrl) : DEFAULT_CENTER_IMAGE;

  return (
    <section className="relative overflow-hidden bg-[#f7fbfb] py-14 md:py-20">
      <style>{`
        @keyframes retreat-ring-spin { to { transform: rotate(360deg); } }
        @keyframes retreat-ring-spin-reverse { to { transform: rotate(-360deg); } }
        .retreat-ring-outer { animation: retreat-ring-spin 18s linear infinite; }
        .retreat-ring-inner { animation: retreat-ring-spin-reverse 13s linear infinite; }
      `}</style>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,159,143,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(15,159,143,0.07)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="container-app relative grid lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] gap-12 items-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-brand/15 shadow-sm text-xs font-bold uppercase tracking-[0.18em] text-brand">
            <Sparkles size={14} className="fill-brand/20" />
            Personal retreat match
          </div>

          <h2 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.04] text-ink">
            {cfg.heading}
          </h2>
          <p className="mt-5 text-lg md:text-xl leading-relaxed text-ink-muted max-w-xl">
            {cfg.subheading}
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            {/* Personalised retreat recommendation → WhatsApp */}
            <a
              href={waLink(RETREAT_WA_MSG)}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-brand px-7 py-4 text-white font-bold shadow-xl shadow-brand/20 hover:bg-brand-dark transition"
              title="Get a personalised retreat recommendation on WhatsApp"
            >
              {cfg.primaryCtaLabel}
              <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-0.5 transition">
                <ArrowRight size={15} />
              </span>
            </a>
            {/* Personalised hotel recommendation → WhatsApp */}
            <a
              href={waLink(HOTEL_WA_MSG)}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-ink font-bold border border-slate-200 shadow-sm hover:border-brand/40 hover:text-brand transition"
              title="Get a personalised hotel recommendation on WhatsApp"
            >
              <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BedDouble size={16} />
              </span>
              Personalised hotel recommendation
            </a>
          </div>

          <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-2xl">
            {quickLinks.map((item, idx) => {
              const Icon = resolveIcon(item.icon);
              return (
                <QuickLinkCard
                  key={`${item.label}-${idx}`}
                  url={item.url}
                  label={item.label}
                  tooltip={item.tooltip}
                  Icon={Icon}
                />
              );
            })}
          </div>
        </div>

        <div className="relative min-h-[520px] lg:min-h-[610px] flex items-center justify-center">
          {cfg.liveMatchTitle && (
            <div className="absolute left-6 top-20 z-20 rounded-2xl bg-white/95 border border-slate-200 shadow-xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-ink">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                {cfg.liveMatchTitle}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">{cfg.liveMatchSubtitle}</div>
            </div>
          )}

          {cfg.topRatedTitle && (
            <div className="absolute right-2 md:right-8 top-10 z-20 rounded-2xl bg-white/95 border border-slate-200 shadow-xl px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center">
                  <Star size={19} className="fill-current" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-ink">{cfg.topRatedTitle}</div>
                  <div className="text-xs text-ink-muted">{cfg.topRatedSubtitle}</div>
                </div>
              </div>
            </div>
          )}

          {cfg.bottomBadgeTitle && (
            <div className="absolute right-5 bottom-24 z-20 rounded-2xl bg-white/95 border border-slate-200 shadow-xl px-5 py-4">
              <div className="text-sm font-extrabold text-ink">{cfg.bottomBadgeTitle}</div>
              <div className="text-xs text-ink-muted">{cfg.bottomBadgeSubtitle}</div>
            </div>
          )}

          <div className="relative w-[min(88vw,520px)] aspect-square">
            <div className="retreat-ring-outer absolute inset-0 rounded-full border-[3px] border-dashed border-brand/35" />
            <div className="retreat-ring-inner absolute inset-[18px] rounded-full border-[2px] border-dotted border-sky-300/80" />
            <div className="absolute inset-[34px] rounded-full bg-white/75 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.95),0_28px_80px_rgba(15,159,143,0.18)]" />
            <div className="absolute inset-[66px] rounded-full overflow-hidden bg-white shadow-2xl">
              <img
                src={centerSrc}
                alt="Wellness retreat expert"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
              />
            </div>
            <div className="absolute left-1/2 bottom-20 -translate-x-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-brand to-sky-500 text-white shadow-2xl flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-black">{cfg.ringBadgeText}</div>
              <div
                className="text-xs font-semibold leading-tight"
                dangerouslySetInnerHTML={{ __html: (cfg.ringBadgeLabel || '').replace(' ', '<br />') }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Quick-link card with a proper tooltip on hover/focus/tap. Tooltip text is
 * always present in the markup (just hidden until interaction) so screen
 * readers still see it.
 */
function QuickLinkCard({ url, label, tooltip, Icon }) {
  const [open, setOpen] = useState(false);
  const isExt = /^https?:\/\//i.test(url || '');
  const inner = (
    <>
      <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-3 group-hover:bg-brand group-hover:text-white transition">
        <Icon size={18} />
      </div>
      <div className="font-bold text-ink text-sm">{label}</div>

      {/* Real tooltip — absolutely-positioned, visible only on hover/focus */}
      {open && tooltip && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none w-56"
          style={{ animation: 'tooltipIn 0.18s ease-out both' }}
        >
          <div className="bg-slate-900 text-white text-[11.5px] rounded-xl px-3 py-2 leading-snug shadow-2xl">
            {tooltip}
          </div>
          <div className="mx-auto w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5" />
        </div>
      )}
      {/* Hidden copy for screen readers + native title fallback */}
      <span className="sr-only">{tooltip}</span>
    </>
  );

  const cls = 'group relative rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';
  const handlers = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    title: tooltip || undefined,
  };

  if (!url) return <div className={cls} {...handlers}>{inner}</div>;
  if (isExt) return <a href={url} target="_blank" rel="noreferrer" className={cls} {...handlers}>{inner}</a>;
  return <Link to={url} className={cls} {...handlers}>{inner}</Link>;
}
