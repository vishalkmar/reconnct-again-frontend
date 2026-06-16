import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Share2, Sparkles, ArrowLeft, Users, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/pagination';

import api, { fileUrl } from '../../services/api';
import WishlistButton from '../../components/public/WishlistButton.jsx';
import useRequireLogin from '../../hooks/useRequireLogin.js';
import LivePriceEstimator from '../../components/public/LivePriceEstimator.jsx';
import { priceUnitLabel } from '../../utils/priceType.js';
import { calculateTaxPricing, taxIncludedLabel } from '../../utils/taxPricing.js';

export default function AddOnDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const requireLogin = useRequireLogin();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  // Estimator state lifted up so the Book CTA can forward the chosen
  // guest count straight into the booking preview as ?guests=N.
  const [guests, setGuests] = useState(1);
  const pricePricing = calculateTaxPricing(activity?.price, activity?.gstRate, activity?.tcsRate);

  const handleBook = () => {
    if (!activity) return;
    const target = `/book/addon/${activity.id}?guests=${Math.max(1, guests)}`;
    requireLogin(() => navigate(target), { redirectTo: target });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/add-ons/${slug}`)
      .then((res) => { if (!cancelled) setActivity(res.data?.data?.activity); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const onShare = () => {
    if (navigator.share) {
      navigator.share({ title: activity?.name, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="container-app py-12">
        <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container-app section text-center">
        <h1 className="heading">Activity not found</h1>
        <Link to="/" className="btn-primary mt-6 inline-flex">Back home</Link>
      </div>
    );
  }

  const galleryImages = [
    ...(activity.mainImage ? [{ id: 'main', url: activity.mainImage }] : []),
    ...(activity.gallery || []),
  ];

  return (
    <>
      <div className="bg-surface-alt">
        <div className="container-app py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand"
          >
            <ArrowLeft size={14} /> Back
          </Link>
        </div>

        <div className="container-app pb-6">
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              {galleryImages.length > 0 ? (
                <div className="rounded-2xl overflow-hidden bg-slate-100">
                  <Swiper
                    modules={[Navigation, Thumbs, Pagination]}
                    navigation
                    thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                    pagination={{ clickable: true }}
                    className="aspect-[16/10]"
                  >
                    {galleryImages.map((g) => (
                      <SwiperSlide key={g.id}>
                        <img src={fileUrl(g.url)} alt="" className="w-full h-full object-cover" />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                  {galleryImages.length > 1 && (
                    <Swiper
                      modules={[Thumbs]}
                      onSwiper={setThumbsSwiper}
                      slidesPerView={6}
                      spaceBetween={6}
                      watchSlidesProgress
                      className="px-2 py-2"
                    >
                      {galleryImages.map((g) => (
                        <SwiperSlide key={g.id} className="cursor-pointer">
                          <img
                            src={fileUrl(g.url)}
                            alt=""
                            className="aspect-square object-cover rounded-md"
                          />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  )}
                </div>
              ) : (
                <div className="aspect-[16/10] rounded-2xl bg-slate-100 flex items-center justify-center text-ink-muted">
                  <Sparkles size={48} />
                </div>
              )}
            </div>

            {/* Booking card */}
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-2">
                  {activity.isFeatured && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 font-semibold">
                      POPULAR
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-display font-bold leading-tight">{activity.name}</h1>

                <div className="space-y-2 mt-4 text-sm">
                  {activity.location?.name && (
                    <div className="flex items-center gap-2 text-ink-muted">
                      <MapPin size={14} /> {activity.location.name}
                      {activity.location.country && `, ${activity.location.country}`}
                    </div>
                  )}
                  {(activity.minAge || activity.maxAge) && (
                    <div className="flex items-center gap-2 text-ink-muted">
                      <Users size={14} /> Age {activity.minAge || 0}–{activity.maxAge || '∞'}
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t pt-4">
                  <div className="text-xs text-ink-muted">From</div>
                  <div>
                    <span className="text-3xl font-bold text-brand">
                      {activity.currency} {Math.round(pricePricing.total).toLocaleString()}
                    </span>
                    {activity.priceOriginal && Number(activity.priceOriginal) > Number(activity.price) && (
                      <span className="ml-2 line-through text-ink-muted">
                        {Number(activity.priceOriginal).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {pricePricing.hasTaxes ? `${taxIncludedLabel(pricePricing)} · ` : ''}{priceUnitLabel(activity.priceType, activity.priceLabel) || 'per person'}
                  </div>
                </div>

                <div className="mt-4">
                  <LivePriceEstimator
                    unitPrice={Number(activity.price) || 0}
                    currency={activity.currency || 'INR'}
                    unitLabel="guest"
                    defaultUnits={guests}
                    gstRate={activity.gstRate}
                    tcsRate={activity.tcsRate}
                    onChange={setGuests}
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary w-full mt-4"
                  onClick={handleBook}
                >
                  Book for {guests} guest{guests === 1 ? '' : 's'}
                </button>

                <div className="flex items-center gap-3 mt-3 text-xs text-ink-muted">
                  <button onClick={onShare} className="inline-flex items-center gap-1 hover:text-brand">
                    <Share2 size={14} /> Share
                  </button>
                  <WishlistButton type="addon" id={activity.id} variant="pill" size={14} className="!py-1 !px-2.5 !text-xs" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-app py-8 space-y-6">
        {activity.highlightsRich && (
          <Section title="Highlights">
            <div className="rich-prose" dangerouslySetInnerHTML={{ __html: activity.highlightsRich }} />
          </Section>
        )}

        {activity.descriptionRich && (
          <Section title="About this activity">
            <div className="rich-prose" dangerouslySetInnerHTML={{ __html: activity.descriptionRich }} />
          </Section>
        )}

        {activity.faqs?.length > 0 && (
          <Section title="Frequently asked questions">
            <div className="space-y-2">
              {activity.faqs.map((f, i) => (
                <FaqItem key={i} q={f.question} a={f.answer} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <section className="card p-6">
      <h3 className="font-display font-semibold text-lg mb-3">{title}</h3>
      {children}
    </section>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3.5 text-left bg-white hover:bg-surface-alt/50"
      >
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown size={16} className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 text-sm text-ink-muted rich-prose" dangerouslySetInnerHTML={{ __html: a }} />
      )}
    </div>
  );
}
