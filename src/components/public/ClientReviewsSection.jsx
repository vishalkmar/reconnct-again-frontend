import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import api from '../../services/api';

export default function ClientReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/reviews/featured', { params: { limit: 18 } })
      .then((res) => {
        if (!cancelled) setReviews(res.data?.data?.items || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-[#119889]">
        <div className="container-app">
          <div className="h-80 rounded-3xl bg-white/15 animate-pulse" />
        </div>
      </section>
    );
  }

  if (!reviews.length) return null;

  return (
    <section className="relative overflow-hidden py-16 md:py-20 bg-[#119889] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:46px_46px]" />
      <div className="container-app relative z-10">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] font-bold px-3 py-1.5 rounded-full bg-white/15 text-white mb-5">
            <Star size={12} className="fill-current text-amber-300" /> Verified stories
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-black leading-tight text-white">
            Guest Love, Real Retreat Stories
          </h2>
          <p className="mt-4 text-white/85 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Honest words from travellers who found calmer stays, kinder hosts and wellness breaks that felt personal.
          </p>
        </div>

        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          centeredSlides={false}
          loop={reviews.length > 3}
          slidesPerView={1}
          spaceBetween={22}
          breakpoints={{
            700: { slidesPerView: 2 },
            1100: { slidesPerView: 3 },
          }}
          autoplay={{ delay: 4200, disableOnInteraction: false }}
          pagination={{ clickable: true, el: '.client-review-pagination' }}
          navigation={{ prevEl: '.client-review-prev', nextEl: '.client-review-next' }}
          className="!overflow-visible"
        >
          {reviews.map((review) => (
            <SwiperSlide key={review.id} className="!h-auto">
              <ReviewCard review={review} />
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            type="button"
            aria-label="Previous review"
            className="client-review-prev w-12 h-12 rounded-full bg-white text-[#119889] shadow-lg flex items-center justify-center hover:scale-105 transition"
          >
            <ChevronLeft size={19} />
          </button>
          <div className="client-review-pagination flex items-center gap-1.5" />
          <button
            type="button"
            aria-label="Next review"
            className="client-review-next w-12 h-12 rounded-full bg-white text-[#119889] shadow-lg flex items-center justify-center hover:scale-105 transition"
          >
            <ChevronRight size={19} />
          </button>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }) {
  const name = review.name || 'Guest traveller';
  const initial = name.charAt(0).toUpperCase();
  const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));

  return (
    <article className="h-full rounded-[1.65rem] bg-white text-slate-700 px-7 py-8 shadow-[0_24px_60px_rgba(15,23,42,0.16)] border border-white/80 flex flex-col items-center text-center transition hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(15,23,42,0.20)]">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand/20 to-sky-100 p-1 shadow-md">
          <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-2xl font-black text-brand">
            {initial}
          </div>
        </div>
        <span className="absolute -right-1 bottom-1 w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center shadow-md">
          <Star size={16} className="fill-current" />
        </span>
      </div>

      {rating > 0 && (
        <div className="flex items-center justify-center gap-1 text-amber-400 mt-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={16} className={n <= rating ? 'fill-current' : 'opacity-30'} />
          ))}
        </div>
      )}

      <Quote size={31} className="mt-4 text-brand/30" />
      <blockquote className="mt-2 text-[15px] leading-8 italic text-slate-600 line-clamp-6 flex-1">
        "{review.comment || 'A peaceful stay, kind hosts and a retreat experience that felt personal from start to finish.'}"
      </blockquote>

      <div className="w-full border-t border-slate-200 mt-7 pt-5">
        <div className="font-black text-lg text-slate-900">{name}</div>
        <div className="text-sm text-slate-500 truncate mt-0.5">
          {review.entity?.name || 'Verified guest'}
        </div>
      </div>
    </article>
  );
}
