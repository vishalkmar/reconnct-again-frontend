import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import publicApi from '../../services/publicApi';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { imageOf } from '../../utils/format';

/*
  /destinations — every city that has live experiences (/public/cities), each
  shown with a real photo from one of its own listings, linking to
  /experiences?city=… .
*/
export default function DestinationsPage() {
  const [cities, setCities] = useState(null);
  const [items, setItems] = useState([]);
  useDocumentMeta({ title: 'Destinations · Reconnct', description: 'Explore Reconnct experiences city by city.' });

  useEffect(() => {
    let alive = true;
    Promise.all([publicApi.cities(), publicApi.listExperiences({})])
      .then(([c, l]) => { if (alive) { setCities(c?.cities || []); setItems(l?.items || []); } })
      .catch(() => { if (alive) setCities([]); });
    return () => { alive = false; };
  }, []);

  // First listing photo per city (case-insensitive match on the city name).
  const coverOf = useMemo(() => {
    const map = {};
    items.forEach((e) => {
      const k = (e.city || '').trim().toLowerCase();
      if (k && !map[k]) map[k] = imageOf(e);
    });
    return (name) => map[(name || '').trim().toLowerCase()] || imageOf(null);
  }, [items]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-rc-brand-dark text-xs font-bold tracking-[0.25em] uppercase">Destinations</p>
      <h1 className="font-sans text-3xl sm:text-5xl font-black text-rc-navy mt-2">Where will you reconnect?</h1>
      <p className="text-rc-ink-muted mt-2 max-w-xl">Pick a city to see every experience waiting there.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {cities == null
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="rc-skeleton h-64 rounded-3xl" />)
          : cities.map((c) => (
            <Link
              key={c.name}
              to={`/experiences?city=${encodeURIComponent(c.name)}`}
              className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden bg-rc-navy focus:outline-none focus-visible:ring-4 focus-visible:ring-rc-brand/50"
            >
              <img src={coverOf(c.name)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute left-5 right-5 bottom-5 text-white flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-sm text-white/85"><MapPin size={15} className="text-rc-brand" />India</div>
                  <div className="font-sans text-2xl sm:text-3xl font-black mt-1">{c.name}</div>
                  <div className="text-sm text-white/85">{c.count} {c.count === 1 ? 'experience' : 'experiences'}</div>
                </div>
                <span className="grid place-items-center w-11 h-11 rounded-full bg-rc-brand text-rc-navy group-hover:translate-x-1 transition"><ArrowRight size={20} /></span>
              </div>
            </Link>
          ))}
      </div>
      {cities && !cities.length && <p className="text-center text-rc-ink-muted py-16">New destinations are on their way.</p>}
    </div>
  );
}
