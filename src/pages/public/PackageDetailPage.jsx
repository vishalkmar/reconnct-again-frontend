import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Calendar, Users, Heart, Share2, Check, X as XIcon,
  ShieldCheck, Award, Flame, ChevronDown, Play,
  Utensils, Sparkles, Hotel, Shield, RefreshCcw, XCircle, BookOpen,
  Award as AwardIcon, Clock, Heart as HeartIcon, Compass,
  User as UserIcon, Briefcase, Languages, Instagram, Globe, Linkedin, Youtube,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/pagination';

import api, { fileUrl } from '../../services/api';
import { fromPriceLabel, hasPrice } from '../../utils/price.js';
import { priceUnitLabel } from '../../utils/priceType.js';
import { calculateTaxPricing, taxIncludedLabel } from '../../utils/taxPricing.js';
import WishlistButton from '../../components/public/WishlistButton.jsx';
import useRequireLogin from '../../hooks/useRequireLogin.js';
import ReviewsBlock from '../../components/public/ReviewsBlock.jsx';
import AddOnsCarousel from '../../components/public/AddOnsCarousel.jsx';
import DatePicker from '../../components/common/DatePicker.jsx';
import LivePriceEstimator from '../../components/public/LivePriceEstimator.jsx';

export default function PackageDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const requireLogin = useRequireLogin();
  const [pkg, setPkg] = useState(null);
  const [insideAddOns, setInsideAddOns] = useState([]);
  const [outsideAddOns, setOutsideAddOns] = useState([]);
  const [similarPackages, setSimilarPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  // Live traveller count for the LivePriceEstimator on the right rail.
  // Forwarded into the booking preview via ?guests=N.
  const [travellers, setTravellers] = useState(1);
  const sidebarPricing = calculateTaxPricing(pkg?.priceFrom, pkg?.gstRate, pkg?.tcsRate);

  const handleBook = () => {
    if (!pkg) return;
    const target = `/book/package/${pkg.id}?guests=${Math.max(1, travellers)}`;
    requireLogin(() => navigate(target), { redirectTo: target });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/packages/${slug}`)
      .then((res) => {
        if (cancelled) return;
        const p = res.data?.data?.package;
        setPkg(p);
        if (p?.id) {
          // Suggested add-ons, split:
          //   • Inside  → activities attached to THIS package.
          //   • Outside → activities physically in the same city (cityName).
          const loadAddOns = async () => {
            try {
              const inside = await api.get('/add-ons', { params: { packageId: p.id, exclusive: true, limit: 12 } });
              const insideItems = inside.data?.data?.items || [];
              if (!cancelled) setInsideAddOns(insideItems);

              const insideIds = new Set(insideItems.map((i) => i.id));
              const city = p.cityName || p.locationDetail;
              if (city) {
                const out = await api.get('/add-ons', { params: { city, limit: 12 } });
                const outItems = (out.data?.data?.items || []).filter((i) => !insideIds.has(i.id));
                if (!cancelled) setOutsideAddOns(outItems);
              } else if (insideItems.length === 0) {
                const gen = await api.get('/add-ons', { params: { scope: 'general', limit: 8 } });
                if (!cancelled) setOutsideAddOns(gen.data?.data?.items || []);
              }
            } catch { /* swallow */ }
          };
          loadAddOns();

          // Similar retreats — prefer same-location, then any other package
          const loadSimilar = async () => {
            try {
              let pool = [];
              if (p.location?.slug) {
                const r1 = await api.get('/packages', { params: { location: p.location.slug, limit: 12 } });
                pool = (r1.data?.data?.items || []).filter((x) => x.id !== p.id);
              }
              if (pool.length === 0) {
                const r2 = await api.get('/packages', { params: { limit: 12 } });
                pool = (r2.data?.data?.items || []).filter((x) => x.id !== p.id);
              }
              if (!cancelled) setSimilarPackages(pool.slice(0, 8));
            } catch { /* swallow */ }
          };
          loadSimilar();
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const onShare = () => {
    if (navigator.share) {
      navigator.share({ title: pkg?.name, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const onInterested = () => {
    if (!pkg) return;
    api.post(`/packages/${pkg.id}/interested`)
      .then((res) => {
        toast.success("Got it — we've noted your interest");
        setPkg((p) => ({ ...p, interestedCount: res.data?.data?.interestedCount ?? p.interestedCount }));
      })
      .catch(() => toast.error('Could not save'));
  };

  if (loading) {
    return (
      <div className="container-app py-12">
        <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="container-app section text-center">
        <h1 className="heading">Package not found</h1>
        <Link to="/retreats" className="btn-primary mt-6 inline-flex">Browse all retreats</Link>
      </div>
    );
  }

  const galleryImages = [
    ...(pkg.primaryImage ? [{ id: 'primary', url: pkg.primaryImage }] : []),
    ...(pkg.gallery || []),
  ];

  const hasVideo = !!pkg.videoUrl;
  const isYoutube = hasVideo && /youtube\.com|youtu\.be/.test(pkg.videoUrl);
  const isVimeo = hasVideo && /vimeo\.com/.test(pkg.videoUrl);
  const youtubeId = isYoutube ? pkg.videoUrl.split(/(?:v=|\/)/).pop().split('?')[0] : null;

  // The page now supports three independent rich-text blocks for highlights,
  // inclusions and exclusions. The legacy combined `richContent` and the older
  // structured arrays are still rendered as fallbacks if the newer fields are
  // empty, so existing packages keep working.
  const hasHighlightsRich = !!pkg.highlightsRich && pkg.highlightsRich.trim() !== '';
  const hasInclusionsRich = !!pkg.inclusionsRich && pkg.inclusionsRich.trim() !== '';
  const hasExclusionsRich = !!pkg.exclusionsRich && pkg.exclusionsRich.trim() !== '';
  const hasAnyRichSection = hasHighlightsRich || hasInclusionsRich || hasExclusionsRich;
  const hasRichContent = !!pkg.richContent && pkg.richContent.trim() !== '';
  const hasLegacyLists =
    (pkg.highlights?.length > 0) ||
    (pkg.includes?.length > 0) ||
    (pkg.excludes?.length > 0);

  return (
    <>
      {/* Title bar */}
      <div className="bg-white border-b">
        <div className="container-app py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-ink-muted uppercase tracking-widest">
              {pkg.categories?.[0]?.name || 'Wellness Retreat'}
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mt-1">{pkg.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-ink-muted flex-wrap">
              {pkg.rating > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star size={14} className="fill-accent text-accent" />
                  <strong>{Number(pkg.rating).toFixed(2)}</strong>
                  <span>({pkg.reviewCount} reviews)</span>
                </span>
              )}
              {pkg.locationDetail && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {pkg.locationDetail}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={onShare} className="btn-ghost text-sm">
              <Share2 size={16} /> Share
            </button>
            <button onClick={onInterested} className="btn-outline text-sm">
              <Heart size={16} /> I'm interested
            </button>
            <WishlistButton type="package" id={pkg.id} variant="pill" />
          </div>
        </div>
      </div>

      <div className="container-app py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Gallery */}
          {galleryImages.length > 0 && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[16/10]">
                <Swiper
                  modules={[Navigation, Thumbs, Pagination]}
                  navigation
                  pagination={{ clickable: true }}
                  thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                  className="w-full h-full"
                >
                  {galleryImages.map((g) => (
                    <SwiperSlide key={g.id}>
                      <img src={fileUrl(g.url)} className="w-full h-full object-cover" alt={pkg.name} />
                    </SwiperSlide>
                  ))}
                </Swiper>
                {hasVideo && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className="absolute bottom-4 left-4 bg-white/95 hover:bg-white text-ink px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2"
                  >
                    <Play size={14} className="fill-current" /> Watch video
                  </button>
                )}
              </div>
              {galleryImages.length > 1 && (
                <Swiper
                  onSwiper={setThumbsSwiper}
                  modules={[Thumbs]}
                  watchSlidesProgress
                  spaceBetween={8}
                  slidesPerView={5}
                  className="thumbs"
                >
                  {galleryImages.map((g) => (
                    <SwiperSlide key={g.id}>
                      <img src={fileUrl(g.url)} className="w-full h-16 object-cover rounded cursor-pointer" alt="" />
                    </SwiperSlide>
                  ))}
                </Swiper>
              )}
            </div>
          )}

          {/* Quick info row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={Calendar} label="Duration" value={`${pkg.durationDays}d / ${pkg.durationNights}n`} />
            <Stat
              icon={Users}
              label="Group size"
              value={`${pkg.minGroupSize}-${pkg.maxGroupSize}`}
            />
            {pkg.freeCancellation && (
              <Stat icon={ShieldCheck} label="Cancellation" value="Free" color="text-emerald-600" />
            )}
            {pkg.interestedCount > 0 && (
              <Stat
                icon={Flame}
                label="Interested"
                value={`${pkg.interestedCount} people`}
                color="text-amber-600"
              />
            )}
          </div>

          {/* Description (rich-text) */}
          {pkg.description && (
            <Section title="About this retreat">
              <RichHtml html={pkg.description} />
            </Section>
          )}

          {/* Admin-added additional fields — each as its own block */}
          {(Array.isArray(pkg.extraSections) ? pkg.extraSections : [])
            .filter((s) => s && s.value)
            .map((s, i) => (
              <Section key={`xs-${i}`} title={s.name || 'More information'}>
                {s.type === 'image' ? (
                  <img src={fileUrl(s.value)} alt={s.name || ''} className="rounded-xl max-h-[28rem] w-full object-cover" />
                ) : (
                  <RichHtml html={s.value} />
                )}
              </Section>
            ))}

          {/* Highlights — independent rich-text */}
          {hasHighlightsRich && (
            <Section title="Highlights">
              <RichHtml html={pkg.highlightsRich} />
            </Section>
          )}

          {/* What's included — independent rich-text */}
          {hasInclusionsRich && (
            <Section title="What's included">
              <RichHtml html={pkg.inclusionsRich} />
            </Section>
          )}

          {/* What's not included — independent rich-text */}
          {hasExclusionsRich && (
            <Section title="What's not included">
              <RichHtml html={pkg.exclusionsRich} />
            </Section>
          )}

          {/* Legacy combined block — only shown if none of the new fields are set */}
          {!hasAnyRichSection && hasRichContent && (
            <Section title="What's included">
              <RichHtml html={pkg.richContent} />
            </Section>
          )}

          {/* Legacy structured lists fallback (only if no rich blocks set) */}
          {!hasAnyRichSection && !hasRichContent && hasLegacyLists && (
            <>
              {pkg.highlights?.length > 0 && (
                <Section title="Highlights">
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {pkg.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check size={16} className="text-emerald-600 mt-0.5 shrink-0" /> {h}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {(pkg.includes?.length > 0 || pkg.excludes?.length > 0) && (
                <div className="grid md:grid-cols-2 gap-6">
                  {pkg.includes?.length > 0 && (
                    <Section title="Included" compact>
                      <ul className="space-y-1.5">
                        {pkg.includes.map((it, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check size={16} className="text-emerald-600 mt-0.5 shrink-0" /> {it}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}
                  {pkg.excludes?.length > 0 && (
                    <Section title="Not included" compact>
                      <ul className="space-y-1.5">
                        {pkg.excludes.map((it, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <XIcon size={16} className="text-red-500 mt-0.5 shrink-0" /> {it}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}
                </div>
              )}
            </>
          )}

          {/* Retreat Experience */}
          {pkg.retreatExperience && (
            <Section title="The retreat experience" icon={HeartIcon}>
              <RichHtml html={pkg.retreatExperience} />
            </Section>
          )}

          {/* What makes this retreat special */}
          {pkg.whatMakesSpecial && (
            <Section title="What makes this retreat special" icon={AwardIcon}>
              <RichHtml html={pkg.whatMakesSpecial} />
            </Section>
          )}

          {/* Full program timing */}
          {pkg.fullProgramTiming && (
            <Section title="Full program timing" icon={Clock}>
              <RichHtml html={pkg.fullProgramTiming} />
            </Section>
          )}

          {/* Benefits */}
          {pkg.benefits && (
            <Section title="Benefits" icon={Sparkles}>
              <RichHtml html={pkg.benefits} />
            </Section>
          )}

          {/* Food */}
          {(pkg.food || pkg.meals?.length > 0 || pkg.diets?.length > 0) && (
            <Section title="Food" icon={Utensils}>
              {pkg.food && <RichHtml html={pkg.food} />}
              {pkg.meals?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-2">Meals provided</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {pkg.meals.map((m) => (
                      <span key={m} className="inline-flex items-center gap-1 text-ink">
                        <Check size={14} className="text-brand" /> {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {pkg.diets?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-2">Diets catered</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {pkg.diets.map((d) => (
                      <span key={d} className="inline-flex items-center gap-1 text-ink">
                        <Check size={14} className="text-brand" /> {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Facilities */}
          {pkg.facilities?.length > 0 && (
            <Section title="Facilities available" icon={Hotel}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm">
                {pkg.facilities.map((f) => (
                  <span key={f} className="inline-flex items-center gap-2 text-ink">
                    <Check size={14} className="text-brand shrink-0" /> {f}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Itinerary */}
          {pkg.itinerary?.length > 0 && (
            <Section title="Day-by-day itinerary">
              <div className="space-y-3">
                {pkg.itinerary.map((d, i) => (
                  <details key={i} className="group bg-surface-alt rounded-xl">
                    <summary className="cursor-pointer px-4 py-3 flex items-center justify-between font-semibold text-sm">
                      <span>Day {d.day || i + 1} · {d.title}</span>
                      <ChevronDown size={16} className="group-open:rotate-180 transition" />
                    </summary>
                    {d.description && (
                      <div className="px-4 pb-4">
                        {/* Render as HTML so admin's rich-text formatting (lists, icons, headings) survives. */}
                        {/^\s*</.test(d.description)
                          ? <RichHtml html={d.description} className="text-sm" />
                          : <p className="text-sm text-ink-muted whitespace-pre-line">{d.description}</p>}
                      </div>
                    )}
                  </details>
                ))}
              </div>
            </Section>
          )}

          {/* Host */}
          {pkg.hostName && (
            <Section title="Your host">
              <div className="flex items-start gap-4 bg-surface-alt rounded-xl p-5">
                {pkg.hostImage && (
                  <img src={fileUrl(pkg.hostImage)} className="w-16 h-16 rounded-full object-cover" alt={pkg.hostName} />
                )}
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    {pkg.hostName}
                    {pkg.isGoldHost && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                        <Award size={10} /> Gold host
                      </span>
                    )}
                  </h4>
                  {pkg.hostBio && <RichHtml html={pkg.hostBio} className="mt-1 text-sm" />}
                </div>
              </div>
            </Section>
          )}

          {/* FAQs */}
          {pkg.faqs?.length > 0 && (
            <Section title="FAQs">
              <div className="space-y-2">
                {pkg.faqs.map((q, i) => (
                  <details key={i} className="group bg-white border rounded-xl">
                    <summary className="cursor-pointer px-4 py-3 flex items-center justify-between font-medium text-sm">
                      <span>{q.question}</span>
                      <ChevronDown size={16} className="group-open:rotate-180 transition" />
                    </summary>
                    {q.answer && (
                      <p className="px-4 pb-4 text-sm text-ink-muted whitespace-pre-line">{q.answer}</p>
                    )}
                  </details>
                ))}
              </div>
            </Section>
          )}

          {/* Booking terms */}
          {pkg.bookingTerms && (
            <Section title="Booking terms" icon={BookOpen}>
              <RichHtml html={pkg.bookingTerms} />
            </Section>
          )}

          {/* Cancellation policy */}
          {pkg.cancellationPolicy && (
            <Section title="Cancellation policy" icon={XCircle}>
              <RichHtml html={pkg.cancellationPolicy} />
            </Section>
          )}

          {/* Refunds policy */}
          {pkg.refundsPolicy && (
            <Section title="Refunds policy" icon={RefreshCcw}>
              <RichHtml html={pkg.refundsPolicy} />
            </Section>
          )}

          {/* Terms & Conditions */}
          {pkg.termsConditions && (
            <Section title="Terms & Conditions" icon={Shield}>
              <RichHtml html={pkg.termsConditions} />
            </Section>
          )}

          {/* Trainers leading this retreat */}
          {pkg.trainers?.length > 0 && (
            <Section title={pkg.trainers.length === 1 ? 'Your trainer' : 'Your trainers'} icon={UserIcon}>
              <p className="text-sm text-ink-muted -mt-1 mb-4">
                Meet the professionals guiding this retreat — each is hand-picked for their experience and approach.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pkg.trainers.map((t) => (
                  <TrainerCard key={t.id} trainer={t} />
                ))}
              </div>
            </Section>
          )}

          {/* Activities included with / attached to this package */}
          <AddOnsCarousel
            title="Activities in this package"
            addOns={insideAddOns}
            subtitle="Experiences curated as part of this retreat."
          />

          {/* Nearby activities — same city, shown with full address */}
          <AddOnsCarousel
            title={(pkg.cityName || pkg.locationDetail) ? `Activities nearby in ${pkg.cityName || pkg.locationDetail}` : 'Other suggested activities'}
            addOns={outsideAddOns}
            subtitle="Popular experiences around your retreat you can add on."
            viewAllHref={pkg.location?.slug ? `/add-ons?location=${pkg.location.slug}` : '/add-ons'}
          />

          {/* Similar retreats */}
          {similarPackages.length > 0 && (
            <Section title="Similar retreats you may love" icon={Compass}>
              <p className="text-sm text-ink-muted -mt-1 mb-4">
                {pkg.location?.name
                  ? `More wellness retreats in ${pkg.location.name}.`
                  : 'Hand-picked retreats from our collection.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {similarPackages.map((p) => (
                  <SimilarPackageCard key={p.id} pkg={p} />
                ))}
              </div>
            </Section>
          )}

          {/* Reviews */}
          <ReviewsBlock
            entityType="package"
            entityId={pkg.id}
            reviews={pkg.reviews}
            reviewCount={pkg.reviewCount}
            averageRating={pkg.rating}
          />
        </div>

        {/* Sidebar booking card */}
        <aside id="book" className="lg:sticky lg:top-24 self-start">
          <div className="card p-6">
            <div className="text-xs text-ink-muted uppercase tracking-widest">From</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-bold text-brand">
                {hasPrice(pkg.priceFrom)
                  ? `${pkg.currency || 'INR'} ${Math.round(sidebarPricing.total).toLocaleString()}`
                  : fromPriceLabel(pkg.priceFrom, pkg.currency)}
              </span>
              {hasPrice(pkg.priceFrom) && pkg.priceOriginal && Number(pkg.priceOriginal) > Number(pkg.priceFrom) && (
                <span className="line-through text-sm text-ink-muted">
                  {Number(pkg.priceOriginal).toLocaleString()}
                </span>
              )}
            </div>
            {hasPrice(pkg.priceFrom) && (
              <div className="text-[11px] text-ink-muted mt-0.5">
                {sidebarPricing.hasTaxes ? `${taxIncludedLabel(sidebarPricing)} · ` : ''}{priceUnitLabel(pkg.priceType, pkg.priceLabel) || 'per traveller'}
              </div>
            )}

            <div className="mt-4">
              <LivePriceEstimator
                unitPrice={Number(pkg.priceFrom) || 0}
                currency={pkg.currency || 'INR'}
                unitLabel="traveller"
                defaultUnits={travellers}
                maxUnits={pkg.maxGroupSize || 30}
                gstRate={pkg.gstRate}
                tcsRate={pkg.tcsRate}
                onChange={setTravellers}
              />
            </div>

            <button
              type="button"
              onClick={handleBook}
              className="btn-primary w-full mt-4"
            >
              Book for {travellers} traveller{travellers === 1 ? '' : 's'}
            </button>
            <button
              type="button"
              onClick={() => setShowAvailability(true)}
              className="btn-outline w-full mt-2"
            >
              Check availability
            </button>
            <button onClick={onInterested} className="btn-ghost w-full mt-2 text-sm">
              <Heart size={14} /> I'm interested
            </button>

            <ul className="mt-5 pt-5 border-t space-y-2 text-sm">
              {pkg.freeCancellation && (
                <li className="flex items-center gap-2 text-emerald-700">
                  <ShieldCheck size={16} /> FREE cancellation
                </li>
              )}
              {pkg.timing && (
                <li className="flex items-center gap-2 text-ink-muted">
                  <Calendar size={16} /> {pkg.timing}
                </li>
              )}
              {pkg.locationDetail && (
                <li className="flex items-center gap-2 text-ink-muted">
                  <MapPin size={16} /> {pkg.locationDetail}
                </li>
              )}
            </ul>

            {pkg.problems?.length > 0 && (
              <div className="mt-5 pt-5 border-t">
                <div className="text-xs uppercase tracking-widest text-ink-muted mb-2">Helps with</div>
                <div className="flex flex-wrap gap-1.5">
                  {pkg.problems.map((p) => (
                    <span key={p.id} className="text-[11px] px-2 py-0.5 rounded-full bg-wellness/10 text-wellness font-medium">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Video modal */}
      {showVideo && hasVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            ><XIcon size={28} /></button>
            {isYoutube ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full h-full"
                title="Video"
              />
            ) : isVimeo ? (
              <iframe
                src={pkg.videoUrl.replace('vimeo.com', 'player.vimeo.com/video')}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="w-full h-full"
                title="Video"
              />
            ) : (
              <video src={pkg.videoUrl} controls autoPlay className="w-full h-full" />
            )}
          </div>
        </div>
      )}

      {/* Check availability modal */}
      {showAvailability && (
        <CheckAvailabilityModal
          pkg={pkg}
          onClose={() => setShowAvailability(false)}
        />
      )}
    </>
  );
}

// Modal that captures Name, Phone, Date and POSTs to
// /api/packages/:id/check-availability. The owner + assigned salesperson
// pick this up in their PWA dashboards (and get a dummy voice call).
function CheckAvailabilityModal({ pkg, onClose }) {
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    requestedDate: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim()) { toast.error('Please enter your name'); return; }
    if (!form.customerPhone.trim()) { toast.error('Please enter a phone number'); return; }
    if (!form.requestedDate) { toast.error('Please pick a date'); return; }
    setSubmitting(true);
    try {
      await api.post(`/packages/${pkg.id}/check-availability`, form);
      setDone(true);
      toast.success("We've notified the retreat — they'll confirm shortly");
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl relative max-h-[92vh] flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white shadow-md text-ink hover:text-red-600 flex items-center justify-center transition"
          aria-label="Close"
        >
          <XIcon size={20} />
        </button>

        {done ? (
          <div className="px-6 sm:px-8 py-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <Check size={28} />
            </div>
            <h3 className="font-display text-xl font-bold">Request received</h3>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">
              We've notified the retreat about your interest. Our team will
              call/WhatsApp you within a few hours to confirm availability.
            </p>
            <button
              onClick={onClose}
              className="btn-primary mt-6 w-full"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-br from-brand to-emerald-600 px-6 sm:px-8 pt-6 pb-5 rounded-t-3xl text-white">
              <h3 className="text-lg sm:text-xl font-display font-bold leading-tight pr-12">
                Check availability
              </h3>
              <p className="mt-1 text-sm text-white/90 line-clamp-1">{pkg.name}</p>
            </div>

            <div className="overflow-y-auto px-6 sm:px-8 py-5 space-y-3.5">
              <div>
                <label className="label">Your name</label>
                <input
                  type="text" className="input"
                  value={form.customerName}
                  onChange={(e) => change('customerName', e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="label">Phone number</label>
                <input
                  type="tel" className="input"
                  value={form.customerPhone}
                  onChange={(e) => change('customerPhone', e.target.value)}
                  placeholder="+91 90000 00000"
                  required
                />
              </div>
              <div>
                <label className="label">Email (optional)</label>
                <input
                  type="email" className="input"
                  value={form.customerEmail}
                  onChange={(e) => change('customerEmail', e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="label">Preferred date</label>
                <DatePicker
                  value={form.requestedDate}
                  min={today}
                  onChange={(iso) => change('requestedDate', iso)}
                  placeholder="Pick a date"
                />
              </div>
              <div>
                <label className="label">Anything we should know? (optional)</label>
                <textarea
                  className="input" rows={3}
                  value={form.notes}
                  onChange={(e) => change('notes', e.target.value)}
                  placeholder="Group size, dietary preferences, special requests…"
                />
              </div>
            </div>

            <div className="border-t px-6 sm:px-8 py-4 bg-surface-alt rounded-b-3xl">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? 'Sending…' : 'Submit request'}
              </button>
              <p className="mt-2 text-[11px] text-ink-muted text-center">
                By submitting you agree to be contacted by Retreats by Traveon about your enquiry.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color = 'text-brand' }) {
  return (
    <div className="bg-surface-alt rounded-xl p-3">
      <div className={`flex items-center gap-2 ${color}`}>
        <Icon size={16} />
        <span className="text-xs uppercase tracking-widest text-ink-muted">{label}</span>
      </div>
      <div className="font-semibold mt-1 text-sm">{value}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children, compact }) {
  return (
    <section className={compact ? '' : 'border-t pt-6'}>
      <h2 className={`font-display ${compact ? 'text-lg' : 'text-xl'} font-bold mb-3 flex items-center gap-2`}>
        {Icon && <Icon size={18} className="text-brand" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function RichHtml({ html, className = '' }) {
  return (
    <div
      className={`rich-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// Compact card — the whole card is clickable and opens the full profile modal.
function TrainerCard({ trainer: t }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group text-left w-full rounded-2xl border bg-white p-4 hover:shadow-xl hover:-translate-y-0.5 hover:border-brand/40 transition-all flex gap-4 focus:outline-none focus:ring-2 focus:ring-brand/40"
      >
        <div className="shrink-0 w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-brand/10 to-emerald-100 flex items-center justify-center ring-2 ring-white shadow-sm">
          {t.photo ? (
            <img src={fileUrl(t.photo)} alt={t.name} className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={28} className="text-ink-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display font-semibold text-base leading-tight truncate group-hover:text-brand transition-colors">
            {t.name}
          </h4>
          {t.role && (
            <div className="text-xs text-brand font-medium mt-0.5 flex items-center gap-1 truncate">
              <Briefcase size={11} /> {t.role}
            </div>
          )}
          <div className="flex items-center gap-3 text-[11px] text-ink-muted mt-1.5 flex-wrap">
            {t.experienceYears != null && (
              <span className="inline-flex items-center gap-1">
                <Award size={11} /> {t.experienceYears}+ yrs
              </span>
            )}
            {t.languages?.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Languages size={11} /> {t.languages.slice(0, 2).join(', ')}
                {t.languages.length > 2 && ' +'}
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] font-semibold text-brand inline-flex items-center gap-1">
            View profile <span aria-hidden>→</span>
          </div>
        </div>
      </button>

      {open && <TrainerProfileModal trainer={t} onClose={() => setOpen(false)} />}
    </>
  );
}

// Full profile popup. Closes on overlay-click, X-button or Escape.
function TrainerProfileModal({ trainer: t, onClose }) {
  const socials = t.socials || {};

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const stop = (e) => e.stopPropagation();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      style={{ animation: 'fadeIn 0.2s ease-out both' }}
    >
      <div
        onClick={stop}
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl relative max-h-[92vh] flex flex-col"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-md text-ink hover:text-red-600 flex items-center justify-center transition"
          aria-label="Close trainer profile"
        >
          <XIcon size={20} />
        </button>

        {/* Banner / header */}
        <div className="relative bg-gradient-to-br from-brand to-emerald-600 px-6 sm:px-8 pt-8 pb-16 sm:pb-20 rounded-t-3xl text-white">
          <h3 className="text-2xl sm:text-3xl font-display font-bold leading-tight pr-12">
            {t.name}
          </h3>
          {t.role && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-white/90">
              <Briefcase size={14} /> {t.role}
            </div>
          )}
        </div>

        {/* Photo overlapping the banner */}
        <div className="relative -mt-12 sm:-mt-14 px-6 sm:px-8">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-slate-100 ring-4 ring-white shadow-xl">
            {t.photo ? (
              <img src={fileUrl(t.photo)} alt={t.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><UserIcon size={48} className="text-ink-muted" /></div>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 sm:px-8 py-5 space-y-5">
          {/* Quick stats row */}
          <div className="flex flex-wrap gap-2.5 text-xs">
            {t.experienceYears != null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 font-semibold">
                <Award size={13} /> {t.experienceYears}+ years experience
              </span>
            )}
            {t.languages?.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 text-sky-800 font-semibold">
                <Languages size={13} /> {t.languages.join(', ')}
              </span>
            )}
            {t.isFeatured && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 text-brand font-semibold">
                <Star size={13} className="fill-current" /> Featured
              </span>
            )}
          </div>

          {t.shortBio && (
            <p className="text-sm text-ink leading-relaxed italic border-l-4 border-brand/40 pl-4">
              {t.shortBio}
            </p>
          )}

          {t.bioRich && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">About</h4>
              <div
                className="rich-prose text-sm"
                dangerouslySetInnerHTML={{ __html: t.bioRich }}
              />
            </div>
          )}

          {t.specialties?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">Specialties</h4>
              <div className="flex flex-wrap gap-1.5">
                {t.specialties.map((s) => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-brand/10 text-brand font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {t.certifications?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">Certifications</h4>
              <ul className="space-y-1.5">
                {t.certifications.map((c, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <Award size={14} className="text-brand mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">{c.title || c.name}</span>
                      {c.issuer && <span className="text-ink-muted"> — {c.issuer}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(socials.instagram || socials.website || socials.linkedin || socials.youtube) && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">Connect</h4>
              <div className="flex items-center gap-2 flex-wrap">
                {socials.instagram && (
                  <a href={socials.instagram} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand hover:text-brand text-xs font-medium transition">
                    <Instagram size={13} /> Instagram
                  </a>
                )}
                {socials.website && (
                  <a href={socials.website} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand hover:text-brand text-xs font-medium transition">
                    <Globe size={13} /> Website
                  </a>
                )}
                {socials.linkedin && (
                  <a href={socials.linkedin} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand hover:text-brand text-xs font-medium transition">
                    <Linkedin size={13} /> LinkedIn
                  </a>
                )}
                {socials.youtube && (
                  <a href={socials.youtube} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand hover:text-brand text-xs font-medium transition">
                    <Youtube size={13} /> YouTube
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 sm:px-8 py-3.5 flex justify-end bg-surface-alt rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SuggestedAddOnCard({ addOn }) {
  return (
    <Link
      to={`/add-ons/${addOn.slug}`}
      className="card overflow-hidden hover:shadow-lg transition group block"
    >
      <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
        {addOn.mainImage ? (
          <img
            src={fileUrl(addOn.mainImage)}
            alt={addOn.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <Sparkles size={28} />
          </div>
        )}
        {addOn.isFeatured && (
          <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 font-semibold">
            POPULAR
          </span>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-semibold leading-tight line-clamp-2 group-hover:text-brand transition">
          {addOn.name}
        </h4>
        {addOn.location?.name && (
          <div className="text-xs text-ink-muted mt-1 flex items-center gap-1">
            <MapPin size={11} /> {addOn.location.name}
          </div>
        )}
        <div className="mt-3 pt-3 border-t flex items-baseline justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-brand">
              {addOn.currency} {Number(addOn.price).toLocaleString()}
            </span>
            <div className="text-[10px] text-ink-muted">per person</div>
          </div>
          <span className="text-xs text-brand font-semibold">View →</span>
        </div>
      </div>
    </Link>
  );
}

function SimilarPackageCard({ pkg: p }) {
  return (
    <Link
      to={`/retreats/${p.slug}`}
      className="card overflow-hidden hover:shadow-lg transition group block"
    >
      <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
        {p.primaryImage ? (
          <img
            src={fileUrl(p.primaryImage)}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-muted">
            <Compass size={28} />
          </div>
        )}
        {Number(p.rating) > 0 && (
          <span className="absolute top-2 right-2 bg-emerald-600 text-white font-bold rounded px-1.5 py-0.5 text-[11px] inline-flex items-center gap-1">
            <Star size={10} className="fill-current" />
            {Number(p.rating).toFixed(1)}
          </span>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-semibold leading-tight line-clamp-2 group-hover:text-brand transition">
          {p.name}
        </h4>
        {p.locationDetail && (
          <div className="text-xs text-ink-muted mt-1 flex items-center gap-1">
            <MapPin size={11} /> {p.locationDetail}
          </div>
        )}
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-base font-bold text-brand">
            {fromPriceLabel(p.priceFrom, p.currency)}
          </span>
          {p.durationDays && (
            <span className="text-[10px] text-ink-muted ml-auto">
              {p.durationDays}d / {p.durationNights}n
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
