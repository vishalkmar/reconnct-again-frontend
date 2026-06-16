import { useEffect, useMemo, useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote, Play, X, Sparkles } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import api, { fileUrl } from '../../services/api';
import useSectionThemes from '../../hooks/useSectionThemes.js';

/**
 * Public testimonials section.
 *
 * Each testimonial carries its own type (text/image/video/gallery/image_text/
 * video_text/image_video) and a displayMode ('carousel' | 'grid') chosen in
 * the admin. We split items by displayMode and render each band accordingly.
 *
 * Per-card width/height (admin-pinned px values) override the default
 * responsive sizing when set.
 */
export default function TestimonialsSection() {
  const themes = useSectionThemes();
  const carouselTheme = themes.testimonialsCarousel;
  const gridTheme = themes.testimonialsGrid;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Fetch all active testimonials, then filter client-side so we can
    // honour the "empty placements = legacy default" rule.
    api.get('/testimonials')
      .then((res) => { if (!cancelled) setItems(res.data?.data?.items || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const { carouselItems, gridItems } = useMemo(() => {
    // Only include testimonials placed in "home_clients_say" or "home_grid"
    // (or with empty placements + non-video type, which falls back here).
    const filtered = items.filter((t) => {
      const placements = Array.isArray(t.placements) ? t.placements : [];
      if (placements.length === 0) {
        const isVideo = ['video', 'video_text', 'image_video'].includes(t.type);
        return !isVideo;
      }
      return placements.some((p) => p === 'home_clients_say' || p === 'home_grid');
    });
    const sorted = [...filtered].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return {
      carouselItems: sorted.filter((t) => {
        const placements = Array.isArray(t.placements) ? t.placements : [];
        if (placements.includes('home_grid') && !placements.includes('home_clients_say')) return false;
        return (t.displayMode || 'carousel') === 'carousel';
      }),
      gridItems: sorted.filter((t) => {
        const placements = Array.isArray(t.placements) ? t.placements : [];
        if (placements.includes('home_grid')) return true;
        return t.displayMode === 'grid';
      }),
    };
  }, [items]);

  if (loading) {
    return (
      <section className="py-12 md:py-16">
        <div className="container-app">
          <div className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <>
      {carouselItems.length > 0 && (
        <CarouselBand items={carouselItems} onPlayVideo={setPlaying} theme={carouselTheme} />
      )}
      {gridItems.length > 0 && (
        <GridBand items={gridItems} onPlayVideo={setPlaying} theme={gridTheme} />
      )}
      {playing && <VideoPlayerModal item={playing} onClose={() => setPlaying(null)} />}
    </>
  );
}

/* ---------- Carousel band ---------- */
function CarouselBand({ items, onPlayVideo, theme }) {
  const headingColor = readableText(theme.bg);
  const mutedHeading = headingColor === '#ffffff' ? 'rgba(255,255,255,0.78)' : 'rgba(15,23,42,0.68)';

  return (
    <section
      className="relative py-16 md:py-24 overflow-hidden"
      style={{ background: theme.bg, color: theme.text }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_32%),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:auto,44px_44px,44px_44px]" />
      <div className="container-app relative z-10">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[11px] uppercase tracking-[0.24em] font-black mb-5"
            style={{ background: `${headingColor}18`, color: headingColor }}
          >
            <Sparkles size={13} />
            Traveller voices
          </div>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-display font-black leading-[1.05]"
            style={{ color: headingColor }}
          >
            Stories That Made The Journey Worth It
          </h2>
          <p
            className="mt-4 text-base md:text-lg leading-relaxed max-w-2xl mx-auto"
            style={{ color: mutedHeading }}
          >
            Real words from guests who found calmer stays, kinder hosts and wellness breaks that felt personal.
          </p>
        </div>

        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          centeredSlides={items.length <= 3}
          centerInsufficientSlides
          loop={items.length > 3}
          spaceBetween={20}
          slidesPerView={1.1}
          breakpoints={{
            640: { slidesPerView: 1.8 },
            1024: { slidesPerView: 2.6 },
            1280: { slidesPerView: 3.2 },
          }}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation={{ prevEl: '.tt-prev', nextEl: '.tt-next' }}
          className="testimonial-premium-carousel !pb-14 !overflow-visible"
        >
          {items.map((t) => (
            <SwiperSlide key={t.id} className="!h-auto">
              <TestimonialCard t={t} onPlayVideo={onPlayVideo} theme={theme} />
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            className="tt-prev w-11 h-11 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition"
            style={{ background: theme.card, color: theme.accent }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="tt-next w-11 h-11 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition"
            style={{ background: theme.card, color: theme.accent }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Static grid band ---------- */
function GridBand({ items, onPlayVideo, theme }) {
  return (
    <section
      className="py-12 md:py-16"
      style={{ background: theme.bg, color: theme.text }}
    >
      <div className="container-app">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold" style={{ color: theme.text }}>
            Stories from <span style={{ color: theme.accent }}>our travellers</span>
          </h2>
          <p className="mt-3 max-w-xl mx-auto" style={{ color: theme.text, opacity: 0.7 }}>
            Real experiences shared by people who lived them.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 justify-items-center">
          {items.map((t) => (
            <TestimonialCard key={t.id} t={t} onPlayVideo={onPlayVideo} flat theme={theme} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Single dynamic card — adapts to type ---------- */
function TestimonialCard({ t, onPlayVideo, flat, theme }) {
  const customStyle = {};
  if (t.cardWidth) customStyle.width = `${t.cardWidth}px`;
  if (t.cardHeight) customStyle.minHeight = `${t.cardHeight}px`;
  // Admin-controlled padding/margin apply uniformly to all four sides of the
  // outer card (the article itself), not to the inner body. Inline style wins
  // over Tailwind p-* / m-* utilities, so this overrides defaults cleanly.
  if (t.cardPadding !== null && t.cardPadding !== undefined) customStyle.padding = `${t.cardPadding}px`;
  if (t.cardMargin !== null && t.cardMargin !== undefined) customStyle.margin = `${t.cardMargin}px`;
  // Theme colours come from /api/section-themes — keep them on the card
  // background and inner text so admin colour picks flow through.
  if (theme?.card) customStyle.background = theme.card;
  if (theme?.text) customStyle.color = theme.text;

  // Media-bearing cards need overflow-hidden so the inner image/video gets
  // clipped to the rounded card corners. The text-only card does NOT use
  // overflow-hidden, otherwise the avatar circle (which deliberately sits at
  // the top edge of the card) gets sliced off.
  const baseClasses = `rounded-[1.45rem] shadow-[0_24px_60px_rgba(15,23,42,0.15)] overflow-hidden h-full flex flex-col w-full max-w-md border border-white/70 transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.20)]`;
  const textBaseClasses = `rounded-[1.45rem] shadow-[0_24px_60px_rgba(15,23,42,0.15)] h-full flex flex-col w-full max-w-md border border-white/70 transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.20)]`;

  // Type → renderer
  switch (t.type) {
    case 'video':
      return (
        <article className={baseClasses} style={customStyle}>
          <VideoFrame t={t} onPlayVideo={onPlayVideo} />
          <CardBody t={t} />
        </article>
      );
    case 'video_text':
      return (
        <article className={baseClasses} style={customStyle}>
          <VideoFrame t={t} onPlayVideo={onPlayVideo} />
          <CardBody t={t} />
        </article>
      );
    case 'image':
      return (
        <article className={baseClasses} style={customStyle}>
          <ImageFrame t={t} />
          <CardBody t={t} />
        </article>
      );
    case 'image_text':
      return (
        <article className={baseClasses} style={customStyle}>
          <ImageFrame t={t} />
          <CardBody t={t} />
        </article>
      );
    case 'gallery':
      return (
        <article className={baseClasses} style={customStyle}>
          <GalleryFrame t={t} />
          {(t.authorName || t.content) && <CardBody t={t} />}
        </article>
      );
    case 'image_video':
      return (
        <article className={baseClasses} style={customStyle}>
          <div className="grid grid-cols-2 gap-1">
            <ImageFrame t={t} compact />
            <VideoFrame t={t} onPlayVideo={onPlayVideo} compact />
          </div>
          <CardBody t={t} />
        </article>
      );
    case 'text':
    default:
      return (
        // p-6 is the default outer card padding; an admin-supplied cardPadding
        // value in customStyle overrides it (inline style wins).
        <article
          className={`${textBaseClasses} ${customStyle.padding ? '' : 'px-7 py-8'} text-center items-center`}
          style={customStyle}
        >
          {t.authorAvatar && (
            <div className="mb-4 mx-auto relative">
              <div className="w-20 h-20 rounded-full ring-4 ring-brand/15 shadow-md overflow-hidden bg-slate-100">
                <img src={fileUrl(t.authorAvatar)} alt={t.authorName || ''} className="w-full h-full object-cover" />
              </div>
              <span className="absolute -right-1 bottom-1 w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center shadow-md">
                <Star size={15} className="fill-current" />
              </span>
            </div>
          )}
          {t.rating && (
            <div className="flex items-center justify-center gap-0.5 text-amber-400 mb-3">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} size={15} className="fill-amber-400" />
              ))}
            </div>
          )}
          {t.content && (
            <blockquote className="text-[14px] text-ink-muted text-center italic leading-7 flex-1 max-w-[28rem]">
              <Quote size={28} className="text-wellness/30 mx-auto mb-2" />
              {t.content}
            </blockquote>
          )}
          {t.authorName && (
            <div className="mt-6 pt-4 border-t text-center w-full">
              <div className="font-black text-ink">{t.authorName}</div>
              {t.authorTitle && <div className="text-xs text-ink-muted">{t.authorTitle}</div>}
            </div>
          )}
        </article>
      );
  }
}

/* ---------- Sub-components ---------- */
function ImageFrame({ t, compact }) {
  const url = t.media?.[0]?.url || t.authorAvatar;
  if (!url) return null;
  return (
    <div className={`bg-slate-100 ${compact ? 'aspect-square' : 'aspect-[4/3]'} overflow-hidden`}>
      <img src={fileUrl(url)} alt={t.authorName || ''} className="w-full h-full object-cover" />
    </div>
  );
}

function VideoFrame({ t, onPlayVideo, compact }) {
  const fileVideo = t.media?.find((m) => m.mediaType === 'video');
  const url = fileVideo?.url || t.videoUrl;
  const poster = t.videoPoster || t.media?.find((m) => m.mediaType === 'image')?.url;
  if (!url) return null;
  return (
    <button
      type="button"
      onClick={() => onPlayVideo?.({ url, poster, ...t })}
      className={`relative bg-slate-100 ${compact ? 'aspect-square' : 'aspect-[16/10]'} overflow-hidden group block w-full`}
    >
      {poster ? (
        <img src={fileUrl(poster)} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-brand to-wellness" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-white/95 group-hover:bg-white flex items-center justify-center shadow-xl transition group-hover:scale-110">
          <Play size={20} className="text-brand fill-brand ml-0.5" />
        </div>
      </div>
    </button>
  );
}

function GalleryFrame({ t }) {
  const imgs = (t.media || []).filter((m) => m.mediaType !== 'video');
  if (!imgs.length) return null;
  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      autoplay={{ delay: 3500 }}
      pagination={{ clickable: true }}
      loop={imgs.length > 1}
      className="w-full aspect-[4/3]"
    >
      {imgs.map((m) => (
        <SwiperSlide key={m.id}>
          <img src={fileUrl(m.url)} alt="" className="w-full h-full object-cover" />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

function CardBody({ t }) {
  return (
    <div className="p-5 flex-1 flex flex-col">
      {t.rating && (
        <div className="flex items-center gap-0.5 text-amber-400 mb-2">
          {Array.from({ length: t.rating }).map((_, i) => (
            <Star key={i} size={13} className="fill-amber-400" />
          ))}
        </div>
      )}
      {t.content && (
        <p className="text-sm text-ink-muted italic leading-relaxed flex-1">
          “{t.content}”
        </p>
      )}
      {t.authorName && (
        <div className="mt-3 pt-3 border-t flex items-center gap-3">
          {t.authorAvatar && (
            <img
              src={fileUrl(t.authorAvatar)}
              className="w-9 h-9 rounded-full object-cover"
              alt={t.authorName}
            />
          )}
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{t.authorName}</div>
            {t.authorTitle && <div className="text-xs text-ink-muted truncate">{t.authorTitle}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function readableText(hex) {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  const clean = hex.replace('#', '').trim();
  if (![3, 6].includes(clean.length)) return '#ffffff';
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0f172a' : '#ffffff';
}

/* ---------- Video player modal ---------- */
function VideoPlayerModal({ item, onClose }) {
  const { url } = item;
  const isYoutube = url && /youtube\.com|youtu\.be/.test(url);
  const isVimeo = url && /vimeo\.com/.test(url);
  const youtubeId = isYoutube ? url.split(/(?:v=|\/)/).pop().split('?')[0] : null;
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/80 hover:text-white">
          <X size={28} />
        </button>
        {isYoutube ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="w-full h-full"
            title="Testimonial video"
          />
        ) : isVimeo ? (
          <iframe
            src={url.replace('vimeo.com', 'player.vimeo.com/video')}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="w-full h-full"
            title="Testimonial video"
          />
        ) : (
          <video src={fileUrl(url)} controls autoPlay className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
