import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useGeo } from '../../context/GeoContext.jsx';
import publicApi from '../../services/publicApi';
import { useTaxonomy } from '../../hooks/usePublicApi';
import HeroSection from '../../components/landing/sections/HeroSection.jsx';
import ConnectWithShowcase from '../../components/landing/sections/ConnectWithShowcase.jsx';
import OfferBannerCarousel from '../../components/landing/sections/OfferBannerCarousel.jsx';
import { InstallBanner } from '../../components/pwa/InstallApp.jsx';
import {
  LocationOffBanner, NearYouSection, YouAreHereModal,
} from '../../components/landing/sections/LocationSections.jsx';
import { FeedError } from '../../components/landing/sections/FeedSections.jsx';
import FeaturedShowcase from '../../components/landing/sections/FeaturedShowcase.jsx';
import LastMinuteDeals from '../../components/landing/sections/LastMinuteDeals.jsx';
import PartnerShowcase from '../../components/landing/sections/PartnerShowcase.jsx';
import TrendingShowcase from '../../components/landing/sections/TrendingShowcase.jsx';
import MomentsShowcase from '../../components/landing/sections/MomentsShowcase.jsx';
import {
  DealRail, FocusDealSection,
} from '../../components/landing/sections/DealSections.jsx';
import RatingModal from '../../components/user/RatingModal.jsx';
import api from '../../services/api';
import { useOnBackOnline } from '../../hooks/useOnline';
import usePullToRefresh from '../../hooks/usePullToRefresh.jsx';

/*
  Public home — the web version of the app's Home screen
  (App/reconnct/src/screens/HomeScreen.jsx), same sections in the same order
  and the same data rules, under the photo hero. Searching (hero or header)
  opens /experiences?q=… where the filters live.
*/
export default function HomeLandingPage() {
  const { isAuthenticated } = useUserAuth();

  // Auto "rate and review" popup for signed-in members — same endpoints and
  // 60 s poll as the app Home, so it appears the moment an experience ends.
  const [pendingReview, setPendingReview] = useState(null);
  const [reviewPopupClosed, setReviewPopupClosed] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) { setPendingReview(null); return undefined; }
    let alive = true;
    const check = () => api.get('/bookings/me/pending-review')
      .then((res) => { if (alive && !reviewPopupClosed) setPendingReview(res.data?.data?.booking || null); })
      .catch(() => {});
    check();
    const t = setInterval(check, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [isAuthenticated, reviewPopupClosed]);
  const { coords, city, selectedCity } = useGeo();
  const taxonomy = useTaxonomy();
  const [searchParams] = useSearchParams();

  // Main feed — app load(): the full list (nearest-first when we have coords,
  // hard city filter only when the visitor explicitly picked a city) plus the
  // featured list, falling back to the first 8 of the main list.
  const [items, setItems] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [list, feat] = await Promise.all([
        publicApi.listExperiences({
          ...(coords ? { lat: coords.lat, lon: coords.lon } : {}),
          city: selectedCity || undefined,
        }),
        publicApi.listExperiences({ featured: 1 }),
      ]);
      const all = list?.items || [];
      setItems(all);
      setFeatured(feat?.items?.length ? feat.items : all.slice(0, 8));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Could not load experiences');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, selectedCity, coords?.lat, coords?.lon]);

  useEffect(() => { load(); }, [load]);
  // Internet came back → repopulate on its own (app: reconnectNonce).
  useOnBackOnline(load);
  const pullIndicator = usePullToRefresh(load);

  // "Connect With Your Partner" — partner-audience experiences; no audiences
  // at all means "All" (anyone can do it) so those belong here too. Falls
  // back to the first 8 of the main list (app rule).
  const partnerItems = useMemo(() => {
    const p = items.filter((e) => !(e.audiences || []).length || (e.audiences || []).some((a) => a.slug === 'partner'));
    return p.length ? p : items.slice(0, 8);
  }, [items]);

  // Old shared links like /?q=yoga or /?categoryIds=3 → the experiences list.
  const legacy = searchParams.toString();
  if (/(^|&)(q|audienceIds|categoryIds|typeIds|price)=/.test(legacy)) {
    return <Navigate to={`/experiences?${legacy}`} replace />;
  }

  return (
    <div className="pb-6">
      {pullIndicator}
      <HeroSection />

      <>
          {/* Web-only: "Get the app" nudge for mobile browsers (hidden in the app) */}
          <InstallBanner />
          {/* Offer banners — auto-sliding carousel (admin-managed) */}
          <OfferBannerCarousel />
          {/* Exact location unavailable → persistent nudge to turn it on */}
          <LocationOffBanner />
          {/* Connect With — audience taxonomy, tap opens that audience's experiences */}
          <ConnectWithShowcase audiences={taxonomy.audiences} loaded={taxonomy.loaded} />
          {error ? (
            <FeedError message={error} onRetry={load} />
          ) : (
            <>
              {/* Near you — nearest real experiences, distance-sorted */}
              <NearYouSection />
              {/* Experiences for every moment — one tile per category */}
              <MomentsShowcase categories={taxonomy.categories} loaded={taxonomy.loaded} items={items} />
            </>
          )}
          {/* Featured — category tabs over a rail */}
          <FeaturedShowcase featured={featured} categories={taxonomy.categories} loading={loading} />

          {/* Deals (web designs + remaining app rails), partner band, trending — app order */}
          {items.length > 0 && (
            <>
              <LastMinuteDeals data={items.slice(0, 10)} />
              <FocusDealSection data={items.slice(1, 11)} />
            </>
          )}
          <PartnerShowcase data={partnerItems.slice(0, 10)} />
          {items.length > 0 && (
            <>
              <DealRail title="Last Minute Deals 3" data={items.slice(2, 12)} kind="clean" gap={14} />
              <DealRail title="Last Minute Deals 4" data={items.slice(1, 11)} kind="overlay" cardW={270} cardH={290} gap={14} />
              <DealRail title="Last Minute Deals 5" data={items.slice(3, 13)} kind="framed" cardW={270} cardImageH={186} gap={14} />
              <TrendingShowcase items={items} />
            </>
          )}
      </>

      {/* One-time "You are here" popup */}
      <YouAreHereModal />

      <RatingModal
        open={!!pendingReview && !reviewPopupClosed}
        variant="auto"
        booking={pendingReview}
        onClose={() => setReviewPopupClosed(true)}
        onDismissForever={() => { setReviewPopupClosed(true); setPendingReview(null); }}
        onSubmitted={() => setPendingReview(null)}
      />
    </div>
  );
}
