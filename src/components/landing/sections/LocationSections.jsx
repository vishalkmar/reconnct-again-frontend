import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, X, Sparkles } from 'lucide-react';
import { useGeo } from '../../../context/GeoContext.jsx';
import publicApi from '../../../services/publicApi';
import { optimizeImg } from '../../../utils/format';
import { Section, SectionHead, Rail, RailSkeleton } from '../Rail.jsx';
import AudienceCard from '../cards/AudienceCard.jsx';
import NearYouCard from '../cards/NearYouCard.jsx';

/* Amber nudge shown while exact location is unavailable (app "Location is off").
   Phones + the installed app only — hidden on the desktop website. */
export function LocationOffBanner() {
  const { servicesOff, promptEnableLocation } = useGeo();
  if (!servicesOff) return null;
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 mt-3.5 md:hidden`}>
      <button
        type="button"
        onClick={promptEnableLocation}
        className="w-full flex items-center gap-2.5 bg-[#FEF3C7] rounded-2xl px-3.5 py-3 text-left hover:brightness-[0.98]"
      >
        <MapPin size={20} className="text-[#B45309] shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-extrabold text-[#92400E]">Location is off</span>
          <span className="block text-xs text-[#B45309] mt-px">Turn on location in your browser to see experiences near you.</span>
        </span>
        <span className="shrink-0 bg-rc-brand text-white text-xs font-extrabold px-3 py-1.5 rounded-full">Turn on</span>
      </button>
    </div>
  );
}

/* "Connect With" — audience icon cards from the taxonomy. */
export function ConnectWithSection({ audiences, loaded = true }) {
  if (!loaded) {
    return (
      <Section>
        <SectionHead icon={Sparkles} title="Connect With" />
        <RailSkeleton count={5} width={88} height={130} />
      </Section>
    );
  }
  if (!audiences?.length) return null;
  return (
    <Section>
      <SectionHead icon={Sparkles} title="Connect With" seeAllTo="/connect" />
      <Rail gap={14} ariaLabel="Connect with">
        {audiences.map((a) => <AudienceCard key={a.id} aud={a} />)}
      </Rail>
    </Section>
  );
}

/*
  "Near you" — nearest real experiences to the visitor's coordinates,
  distance-sorted by the server (radius 50 km, limit 20 — same as the app).
  Hidden when there are no coords or nothing nearby.
*/
export function NearYouSection() {
  const { coords } = useGeo();
  const [data, setData] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!(coords && coords.lat != null)) { setData([]); return undefined; }
    let alive = true;
    setBusy(true);
    publicApi.nearbyExperiences(coords.lat, coords.lon, { radius: 50, limit: 20 })
      .then((d) => { if (alive) setData(d?.experiences || []); })
      .catch(() => { if (alive) setData([]); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [coords?.lat, coords?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!(coords && coords.lat != null)) return null;
  if (!busy && !data.length) return null;
  return (
    <Section>
      <SectionHead icon={MapPin} title="Near you" seeAllTo="/experiences?nearby=1" />
      {busy ? <RailSkeleton width={168} height={200} /> : (
        <Rail ariaLabel="Near you">
          {data.map((it, i) => <NearYouCard key={`near-${it.id || i}`} item={it} />)}
        </Rail>
      )}
    </Section>
  );
}

// Last-resort neutral cityscape if the fetched landmark photo fails (app value).
const YAH_FALLBACK_IMG = 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80';
const YAH_KEY = 'yah_popup_shown';

/*
  "You are here" — one-time popup with a real photo of a famous place near the
  visitor (/public/geo/place-image), the exact address and a CTA. Shown once
  per browser (localStorage), same key as the app uses on-device.
*/
export function YouAreHereModal() {
  const { detectedCity, area, fullAddress, pincode } = useGeo();
  const [place, setPlace] = useState(null);
  const [open, setOpen] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const alreadyShown = () => { try { return localStorage.getItem(YAH_KEY) === '1'; } catch { return true; } };

  useEffect(() => {
    if (!detectedCity || alreadyShown()) return undefined;
    let alive = true;
    publicApi.placeImage(detectedCity, undefined, area)
      .then((d) => {
        if (!alive || !d || !d.image || alreadyShown()) return;
        setPlace(d);
        setOpen(true);
        try { localStorage.setItem(YAH_KEY, '1'); } catch { /* ignore */ }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [detectedCity, area]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || !place) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-6" role="dialog" aria-modal="true" aria-label="You are here">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-[380px] bg-white rounded-[22px] overflow-hidden shadow-card">
        <div className="relative h-[200px] bg-[#DCE0E6]">
          <img
            src={optimizeImg(imgErr ? YAH_FALLBACK_IMG : place.image)}
            onError={() => setImgErr(true)}
            alt={place.name || detectedCity}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="rc-scrim absolute inset-0" />
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute top-2.5 right-2.5 grid place-items-center w-7 h-7 rounded-full bg-black/35 text-white">
            <X size={14} />
          </button>
          <div className="absolute left-4 right-4 bottom-4 text-white">
            <div className="flex items-center gap-1 text-xs font-bold opacity-95 tracking-wide"><MapPin size={13} />You are here</div>
            <div className="text-[22px] font-black mt-0.5 truncate">{detectedCity}</div>
            {!!place.name && <div className="text-xs text-white/90 truncate">Near {place.name}</div>}
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm font-semibold text-rc-ink leading-5 line-clamp-3">{fullAddress || detectedCity}</p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {!!detectedCity && <span className="bg-rc-brand-soft text-rc-brand-text text-xs font-extrabold px-3 py-1.5 rounded-full">{detectedCity}</span>}
            {!!pincode && <span className="bg-rc-brand-soft text-rc-brand-text text-xs font-extrabold px-3 py-1.5 rounded-full">PIN {pincode}</span>}
          </div>
          <Link
            to="/experiences?nearby=1"
            onClick={() => setOpen(false)}
            className="mt-4 flex items-center justify-center h-12 rounded-full bg-rc-brand text-white font-extrabold hover:bg-rc-brand-dark transition"
          >
            Explore experiences near me
          </Link>
        </div>
      </div>
    </div>
  );
}
