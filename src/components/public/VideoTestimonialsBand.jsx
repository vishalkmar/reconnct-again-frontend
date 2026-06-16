import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, X, Volume2, VolumeX, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import api, { fileUrl } from '../../services/api';
import useSectionThemes from '../../hooks/useSectionThemes.js';

/**
 * VideoTestimonialsBand
 *
 * Dark-themed band above "Find by Activity". Shows testimonials tagged with
 * placement `home_video_band` (defaults to any video-type testimonial for
 * legacy data).
 *
 * Behaviour: each card autoplays its video muted & looped inline. Clicking
 * the card opens a full-screen player with sound. The full-screen modal has
 * a close (X) button.
 *
 * Theme is sourced from `useSectionThemes().videoBand`, so background, card
 * and text colours are admin-configurable.
 */
export default function VideoTestimonialsBand() {
  const themes = useSectionThemes();
  const t = themes.videoBand;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/testimonials', { params: { placement: 'home_video_band' } })
      .then((res) => { if (!cancelled) setItems(res.data?.data?.items || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="container-app py-12">
        <div className="h-72 bg-slate-100 rounded-3xl animate-pulse" />
      </section>
    );
  }

  if (!items.length) return null;

  const heroCount = items.length >= 100 ? `${Math.floor(items.length / 100) * 100}+` : '50+';

  return (
    <section className="container-app py-12 md:py-16">
      <div
        className="relative rounded-[2rem] overflow-hidden p-[5px] shadow-[0_28px_80px_rgba(15,23,42,0.16)]"
        style={{
          background: `linear-gradient(135deg, ${t.accent}, ${t.bg} 36%, ${t.text})`,
          color: t.text,
        }}
      >
        <div
          className="relative rounded-[1.7rem] overflow-hidden p-6 md:p-10 lg:p-12"
          style={{
            background: `linear-gradient(135deg, ${t.bg} 0%, ${t.card} 54%, ${t.bg} 100%)`,
          }}
        >
          <div className="absolute inset-0 opacity-[0.11] bg-[linear-gradient(rgba(255,255,255,0.85)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.85)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/20 rounded-[1.7rem]" />

          {/* Header */}
          <div className="relative z-10 mb-8 md:mb-10 max-w-3xl">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] mb-4"
              style={{ background: `${t.text}18`, color: t.text }}
            >
              <Sparkles size={13} />
              Guest video stories
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-black leading-[1.02]" style={{ color: t.text }}>
              <span style={{ color: t.accent }}>{heroCount}</span> retreat stories,
              <br className="hidden sm:block" /> real wellness moments
            </h2>
            <p className="mt-4 text-sm md:text-base max-w-xl leading-relaxed" style={{ color: t.text, opacity: 0.78 }}>
              Watch quick guest clips from stays, yoga escapes and healing journeys booked through us.
            </p>
          </div>

          {/* Video cards — carousel if > 3, plain row when exactly 3 or fewer */}
          {items.length <= 3 ? (
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => (
                <AutoVideoCard key={item.id} t={item} theme={t} onPlay={setPlaying} />
              ))}
            </div>
          ) : (
            <div className="relative z-10">
              <Swiper
                modules={[Navigation, Pagination]}
                spaceBetween={20}
                slidesPerView={1}
                slidesPerGroup={1}
                breakpoints={{
                  640: { slidesPerView: 2, slidesPerGroup: 2 },
                  1024: { slidesPerView: 3, slidesPerGroup: 3 },
                }}
                navigation={{ prevEl: '.vb-prev', nextEl: '.vb-next' }}
                pagination={{ clickable: true, el: '.vb-pagination' }}
                className="!pb-2"
              >
                {items.map((item) => (
                  <SwiperSlide key={item.id} className="!h-auto">
                    <AutoVideoCard t={item} theme={t} onPlay={setPlaying} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}

          {/* Footer — link on the left, carousel controls on the right when carousel-mode */}
          <div className="relative z-10 mt-10 flex items-center justify-between gap-4 flex-wrap">
            <Link
              to="/retreats"
              className="inline-flex items-center gap-2 text-sm font-black group"
              style={{ color: t.text, opacity: 0.85 }}
            >
              Explore wellness stories
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center transition group-hover:translate-x-0.5"
                style={{ background: t.text + '1A' }}
              >
                <ArrowRight size={14} />
              </span>
            </Link>

            {items.length > 3 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Previous"
                  className="vb-prev w-10 h-10 rounded-full flex items-center justify-center transition hover:scale-105"
                  style={{ background: t.text + '14', color: t.text }}
                >
                  <ChevronLeft size={18} />
                </button>
                <div
                  className="vb-pagination flex items-center gap-1.5"
                  style={{ '--swiper-pagination-color': t.accent, '--swiper-pagination-bullet-inactive-color': t.text }}
                />
                <button
                  type="button"
                  aria-label="Next"
                  className="vb-next w-10 h-10 rounded-full flex items-center justify-center transition hover:scale-105"
                  style={{ background: t.text + '14', color: t.text }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {playing && <VideoPlayerModal item={playing} onClose={() => setPlaying(null)} />}
    </section>
  );
}

// Extract a YouTube video ID from any of the common URL shapes.
const youtubeIdFromUrl = (url) => {
  if (!url) return null;
  // youtu.be/<id>?...
  let m = /youtu\.be\/([A-Za-z0-9_-]{6,})/.exec(url);
  if (m) return m[1];
  // youtube.com/watch?v=<id>
  m = /[?&]v=([A-Za-z0-9_-]{6,})/.exec(url);
  if (m) return m[1];
  // youtube.com/embed/<id>
  m = /\/embed\/([A-Za-z0-9_-]{6,})/.exec(url);
  if (m) return m[1];
  return null;
};
const vimeoIdFromUrl = (url) => {
  if (!url) return null;
  const m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  return m ? m[1] : null;
};

function AutoVideoCard({ t, theme, onPlay }) {
  const videoRef = useRef(null);
  const fileVideo = t.media?.find((m) => m.mediaType === 'video');
  const url = fileVideo?.url || t.videoUrl;
  const poster =
    t.videoPoster ||
    t.media?.find((m) => m.mediaType === 'image')?.url ||
    t.authorAvatar;

  const youtubeId = youtubeIdFromUrl(url);
  const vimeoId = vimeoIdFromUrl(url);
  const isMp4 = url && /\.(mp4|webm|mov|avi)(\?.*)?$/i.test(url);
  const isLocalUpload = url && /^\/uploads\//.test(url);
  const canInlineVideo = url && (isMp4 || isLocalUpload || !!fileVideo);

  // Admin-pinned card dimensions
  const style = {};
  if (t.cardWidth) style.width = `${t.cardWidth}px`;
  if (t.cardHeight) style.height = `${t.cardHeight}px`;
  if (t.cardPadding !== null && t.cardPadding !== undefined) style.padding = `${t.cardPadding}px`;
  if (t.cardMargin !== null && t.cardMargin !== undefined) style.margin = `${t.cardMargin}px`;

  // Resume autoplay when tab regains focus
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !canInlineVideo) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && el.paused) {
        el.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [canInlineVideo]);

  return (
    <button
      type="button"
      onClick={() => url && onPlay({ url, poster, ...t })}
      className="group relative block w-full rounded-[1.45rem] overflow-hidden aspect-[3/4] text-left transition hover:-translate-y-1.5 hover:shadow-2xl ring-1 ring-white/20"
      style={{
        background: theme.card,
        boxShadow: '0 18px 45px rgba(15, 23, 42, 0.18)',
        ...style,
      }}
    >
      {/* Autoplay layer — three modes depending on source:
           1. Uploaded / direct MP4 → muted <video autoPlay loop>
           2. YouTube → iframe in "background" mode (autoplay, mute, loop)
           3. Vimeo  → iframe with the equivalent params
           4. Anything else → still poster image */}
      {canInlineVideo ? (
        <video
          ref={videoRef}
          src={fileUrl(url)}
          poster={poster ? fileUrl(poster) : undefined}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : youtubeId ? (
        <iframe
          // playlist=ID is required for YouTube's loop=1 to actually loop a single video
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3`}
          allow="autoplay; encrypted-media; picture-in-picture"
          className="absolute inset-0 w-full h-full pointer-events-none scale-[1.4]"
          title={t.authorName || 'Testimonial video'}
        />
      ) : vimeoId ? (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&loop=1&muted=1&background=1&controls=0`}
          allow="autoplay; fullscreen; picture-in-picture"
          className="absolute inset-0 w-full h-full pointer-events-none scale-[1.4]"
          title={t.authorName || 'Testimonial video'}
        />
      ) : poster ? (
        <img
          src={fileUrl(poster)}
          alt={t.authorName || ''}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-700"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
      )}

      {/* Bottom gradient for legibility — taller now so quote text reads */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/55 to-transparent pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/15 rounded-[1.45rem]" />

      {/* Muted-pill hint */}
      {(canInlineVideo || youtubeId || vimeoId) && (
        <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center text-white pointer-events-none">
          <VolumeX size={14} />
        </span>
      )}

      {/* Big play overlay — opens full-screen with sound */}
      {url && (
        <span
          className="absolute top-3 left-3 w-12 h-12 rounded-full ring-2 ring-white/70 bg-black/45 backdrop-blur flex items-center justify-center transition group-hover:bg-wellness group-hover:ring-wellness pointer-events-none"
        >
          <Play size={16} className="text-white fill-white ml-0.5" />
        </span>
      )}

      {/* Author info + quote — bottom */}
      <div className="absolute inset-x-0 bottom-0 p-5 text-white pointer-events-none">
        {t.content && (
          <p className="text-xs md:text-sm italic leading-snug text-white/90 line-clamp-3 mb-2">
            “{t.content}”
          </p>
        )}
        {t.authorName && (
          <div className="font-semibold leading-tight text-sm md:text-base">{t.authorName}</div>
        )}
        {t.authorTitle && (
          <div className="text-[11px] md:text-xs text-white/75 mt-0.5">{t.authorTitle}</div>
        )}
      </div>
    </button>
  );
}

function VideoPlayerModal({ item, onClose }) {
  const { url } = item;
  const isYoutube = url && /youtube\.com|youtu\.be/.test(url);
  const isVimeo = url && /vimeo\.com/.test(url);
  const youtubeId = isYoutube ? url.split(/(?:v=|\/)/).pop().split('?')[0] : null;
  const [muted, setMuted] = useState(false);
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition"
          aria-label="Close"
        >
          <X size={20} />
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
          <>
            <video
              src={fileUrl(url)}
              controls
              autoPlay
              muted={muted}
              className="w-full h-full"
            />
            <button
              onClick={() => setMuted((m) => !m)}
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
