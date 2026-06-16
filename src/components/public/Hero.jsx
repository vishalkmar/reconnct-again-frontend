import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

import api, { fileUrl } from '../../services/api';

const HEIGHT_CLASSES = {
  sm: 'h-[260px] md:h-[340px]',
  md: 'h-[360px] md:h-[480px]',
  lg: 'h-[440px] md:h-[600px]',
  full: 'h-[80vh] md:h-[88vh]',
};

const POSITION_CLASSES = {
  left: 'items-center justify-start text-left',
  center: 'items-center justify-center text-center',
  right: 'items-center justify-end text-right',
};

// Outer wrapper class (controls how the section is laid out on the page)
const wrapperFor = (hero) => {
  switch (hero.widthMode) {
    case 'full':
      return 'w-full px-0';
    case 'large':
      return 'container-app';
    case 'medium':
      return 'container-app max-w-5xl';
    case 'small':
      return 'container-app max-w-3xl';
    case 'custom':
      return 'mx-auto';
    default:
      return 'container-app';
  }
};

const customWidthStyle = (hero) => {
  if (hero.widthMode === 'custom') {
    const v = Math.max(10, Math.min(100, hero.widthValue || 100));
    return { width: `${v}%`, maxWidth: `${v}%` };
  }
  return undefined;
};

// Inner container class — full bleed has no rounded corners; rest are rounded
const innerClass = (hero) =>
  hero.widthMode === 'full' ? 'rounded-none' : 'rounded-2xl';

// Height class — switches to inline style if custom
const heightFor = (hero) => {
  if (hero.height === 'custom' && hero.heightValue) {
    return { className: '', style: { height: `${hero.heightValue}vh` } };
  }
  return { className: HEIGHT_CLASSES[hero.height || 'lg'], style: undefined };
};

function HeroOverlay({ hero }) {
  if (!hero.heading && !hero.subheading && !hero.ctaLabel) return null;
  return (
    <div
      className={`absolute inset-0 flex ${POSITION_CLASSES[hero.textPosition || 'center']} px-6 md:px-16`}
      style={{ color: hero.textColor || '#fff' }}
    >
      <div className="max-w-3xl space-y-4">
        {hero.heading && (
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold leading-tight drop-shadow-lg">
            {hero.heading}
          </h1>
        )}
        {hero.subheading && (
          <p className="text-base md:text-lg lg:text-xl opacity-95 drop-shadow">
            {hero.subheading}
          </p>
        )}
        {hero.ctaLabel && hero.ctaUrl && (
          <Link
            to={hero.ctaUrl}
            className="inline-flex items-center gap-2 mt-2 bg-brand text-white font-semibold px-7 py-3 rounded-full hover:bg-brand-dark transition shadow-lg"
          >
            {hero.ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

function DarkenLayer({ opacity = 35 }) {
  return (
    <div
      className="absolute inset-0 bg-black pointer-events-none"
      style={{ opacity: opacity / 100 }}
    />
  );
}

function SingleImageHero({ hero, withText }) {
  const m = hero.media?.[0];
  if (!m) return null;
  const h = heightFor(hero);
  return (
    <div
      className={`relative w-full overflow-hidden ${innerClass(hero)} ${h.className}`}
      style={h.style}
    >
      <img src={fileUrl(m.url)} alt={m.alt || hero.name} className="w-full h-full object-cover" />
      {withText && <DarkenLayer opacity={hero.overlayOpacity} />}
      {withText && <HeroOverlay hero={hero} />}
    </div>
  );
}

function VideoHero({ hero }) {
  const m = hero.media?.[0];
  if (!m) return null;
  const h = heightFor(hero);
  return (
    <div
      className={`relative w-full overflow-hidden bg-black ${innerClass(hero)} ${h.className}`}
      style={h.style}
    >
      <video
        src={fileUrl(m.url)}
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
      />
      <DarkenLayer opacity={hero.overlayOpacity} />
      <HeroOverlay hero={hero} />
    </div>
  );
}

function ImageCarouselHero({ hero, withText }) {
  if (!hero.media?.length) return null;
  const h = heightFor(hero);
  return (
    <div
      className={`relative w-full overflow-hidden ${innerClass(hero)} ${h.className}`}
      style={h.style}
    >
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        loop
        pagination={{ clickable: true }}
        autoplay={hero.autoplay ? { delay: hero.intervalMs || 5000, disableOnInteraction: false } : false}
        className="w-full h-full"
      >
        {hero.media.map((m) => (
          <SwiperSlide key={m.id}>
            <img src={fileUrl(m.url)} alt={m.alt || ''} className="w-full h-full object-cover" />
          </SwiperSlide>
        ))}
      </Swiper>
      {withText && <DarkenLayer opacity={hero.overlayOpacity} />}
      {withText && <HeroOverlay hero={hero} />}
    </div>
  );
}

function VideoCarouselHero({ hero }) {
  if (!hero.media?.length) return null;
  const h = heightFor(hero);
  return (
    <div
      className={`relative w-full overflow-hidden bg-black ${innerClass(hero)} ${h.className}`}
      style={h.style}
    >
      <Swiper
        modules={[Autoplay, Pagination]}
        loop
        pagination={{ clickable: true }}
        autoplay={hero.autoplay ? { delay: hero.intervalMs || 8000, disableOnInteraction: false } : false}
        className="w-full h-full"
      >
        {hero.media.map((m) => (
          <SwiperSlide key={m.id}>
            <video
              src={fileUrl(m.url)}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          </SwiperSlide>
        ))}
      </Swiper>
      <DarkenLayer opacity={hero.overlayOpacity} />
      <HeroOverlay hero={hero} />
    </div>
  );
}

function HeroRenderer({ hero }) {
  switch (hero.type) {
    case 'image':
      return <SingleImageHero hero={hero} withText={false} />;
    case 'image_text':
      return <SingleImageHero hero={hero} withText />;
    case 'image_carousel':
      return <ImageCarouselHero hero={hero} withText={false} />;
    case 'image_carousel_text':
      return <ImageCarouselHero hero={hero} withText />;
    case 'video':
      return <VideoHero hero={hero} />;
    case 'video_carousel':
      return <VideoCarouselHero hero={hero} />;
    default:
      return null;
  }
}

export default function Hero({ pageKey = 'home', suppressFallback = false }) {
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/heroes/active', { params: { pageKey } })
      .then((res) => {
        if (cancelled) return;
        setHeroes(res.data?.data?.heroes || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  if (loading) {
    if (suppressFallback) return null;
    return (
      <div className="w-full pt-6">
        <div className="container-app">
          <div className="h-[440px] md:h-[600px] bg-slate-100 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!heroes.length) {
    if (suppressFallback) return null;
    // Graceful fallback when admin hasn't created a hero yet
    return (
      <div className="w-full">
        <div className="relative h-[400px] md:h-[520px] overflow-hidden bg-gradient-to-br from-brand to-wellness flex items-center justify-center text-center px-6">
          <div className="text-white max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Wellness, Yoga &amp; Travel Retreats
            </h1>
            <p className="opacity-90 text-base md:text-lg">
              Curated by Traveon — set up a hero from the admin panel to replace this default.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {heroes.map((h) => (
        <div
          key={h.id}
          className={wrapperFor(h)}
          style={customWidthStyle(h)}
        >
          <HeroRenderer hero={h} />
        </div>
      ))}
    </div>
  );
}
