import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import api, { fileUrl } from '../../services/api';

/**
 * Renders admin-managed promo banners for a given page + position.
 * Place wherever you want banners to appear, e.g.:
 *   <PromoBannerSection page="home" position="below-video-testimonials" />
 *
 * Banner types handled:
 *   image-single, image-carousel, image-text, video-single, video-carousel
 */
export default function PromoBannerSection({ page, position }) {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.get('/promo-banners', { params: { page, position } })
      .then((r) => { if (!cancelled) setBanners(r.data?.data?.items || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [page, position]);

  if (!banners.length) return null;

  return (
    <section className="py-8 md:py-12 space-y-8">
      {banners.map((b) => (
        <BannerRenderer key={b.id} banner={b} />
      ))}
    </section>
  );
}

function BannerRenderer({ banner }) {
  const slides = banner.slides || [];
  if (!slides.length) return null;

  const outerCls = banner.widthMode === 'full'
    ? 'w-full'
    : 'container-app';

  const height = banner.heightPx || 360;
  const isCarousel = banner.type === 'image-carousel' || banner.type === 'video-carousel';

  // Single slide: render directly without Swiper chrome.
  if (!isCarousel || slides.length === 1) {
    return (
      <div className={outerCls}>
        <div
          className="rounded-2xl overflow-hidden bg-slate-100 relative"
          style={{ height: `${height}px` }}
        >
          <Slide slide={slides[0]} type={banner.type} banner={banner} />
        </div>
      </div>
    );
  }

  // Carousel
  return (
    <div className={outerCls}>
      <div
        className="rounded-2xl overflow-hidden bg-slate-100 relative promo-banner-swiper"
        style={{ height: `${height}px` }}
      >
        <Swiper
          modules={[Navigation, Pagination, ...(banner.autoplay ? [Autoplay] : [])]}
          navigation
          pagination={{ clickable: true }}
          autoplay={banner.autoplay ? { delay: banner.intervalMs || 5000, disableOnInteraction: false } : false}
          loop={slides.length > 1}
          className="h-full"
        >
          {slides.map((s) => (
            <SwiperSlide key={s.id}>
              <Slide slide={s} type={banner.type} banner={banner} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

function Slide({ slide, type, banner }) {
  const isVideo = slide.mediaType === 'video';
  const showOverlay = type === 'image-text' && (slide.overlayHeading || slide.overlayText || banner.heading);

  const media = isVideo ? <VideoPlayer slide={slide} autoplay={banner.autoplay} /> : <ImageView slide={slide} />;

  const inner = (
    <div className="w-full h-full relative">
      {media}
      {showOverlay && (
        <div className="absolute inset-0 bg-gradient-to-tr from-black/55 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-10 text-white">
          <h3 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold drop-shadow-lg leading-tight">
            {slide.overlayHeading || banner.heading}
          </h3>
          {(slide.overlayText || banner.description) && (
            <p className="mt-2 md:text-lg opacity-95 max-w-2xl drop-shadow">
              {slide.overlayText || banner.description}
            </p>
          )}
          {(banner.ctaLabel && banner.ctaUrl) && (
            <Link
              to={banner.ctaUrl}
              className="mt-4 inline-flex w-fit items-center gap-2 px-6 py-2.5 rounded-full bg-white text-ink font-semibold shadow-lg hover:bg-surface-alt transition"
            >
              {banner.ctaLabel}
            </Link>
          )}
        </div>
      )}
      {slide.caption && !showOverlay && (
        <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
          {slide.caption}
        </div>
      )}
    </div>
  );

  if (slide.linkUrl) {
    return <Link to={slide.linkUrl} className="block w-full h-full">{inner}</Link>;
  }
  return inner;
}

function ImageView({ slide }) {
  return (
    <img
      src={fileUrl(slide.mediaUrl)}
      alt={slide.caption || ''}
      className="w-full h-full object-cover"
    />
  );
}

function VideoPlayer({ slide, autoplay }) {
  const url = slide.mediaUrl || '';
  const provider = slide.videoProvider || detectProvider(url);

  if (provider === 'youtube') {
    const id = url.split(/(?:v=|\/)/).pop().split('?')[0];
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      mute: autoplay ? '1' : '0',
      loop: '1',
      playlist: id,
      controls: '1',
      modestbranding: '1',
      rel: '0',
    });
    return (
      <iframe
        src={`https://www.youtube.com/embed/${id}?${params}`}
        title=""
        className="w-full h-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  if (provider === 'vimeo') {
    const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
    return (
      <iframe
        src={`https://player.vimeo.com/video/${id}?autoplay=${autoplay ? 1 : 0}&muted=${autoplay ? 1 : 0}&loop=1`}
        title=""
        className="w-full h-full"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    );
  }
  // MP4 / other
  return (
    <video
      src={url.startsWith('http') ? url : fileUrl(url)}
      className="w-full h-full object-cover"
      controls
      muted={autoplay}
      autoPlay={autoplay}
      loop
      playsInline
    />
  );
}

function detectProvider(url = '') {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/vimeo\.com/i.test(url)) return 'vimeo';
  return 'mp4';
}
