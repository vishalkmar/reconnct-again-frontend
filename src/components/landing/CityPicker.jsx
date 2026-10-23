import { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronDown, LocateFixed, Check, Search } from 'lucide-react';
import { useGeo } from '../../context/GeoContext.jsx';
import publicApi from '../../services/publicApi';

/*
  City pill + popover — web version of the app's "Choose Location" sheet.
  Lists cities that have live experiences (/public/cities); "Use my location"
  clears the manual pick so the detected city applies again.
*/
export default function CityPicker({ tone = 'light', compact = false, size = 'md' }) {
  const { city, selectedCity, setSelectedCity, detectedCity, refresh } = useGeo();
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState([]);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open || cities.length) return;
    publicApi.cities().then((d) => setCities(d?.cities || [])).catch(() => {});
  }, [open, cities.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const pick = (name) => { setSelectedCity(name); setOpen(false); setQ(''); };
  const shown = cities.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const pill = tone === 'onBrand'
    ? 'bg-white/25 text-white hover:bg-white/35'
    : 'bg-rc-brand-soft text-rc-navy hover:brightness-95';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center rounded-full font-bold transition ${pill} ${
          size === 'lg' ? 'gap-2 h-10 lg:h-[54px] px-4 lg:px-6 text-sm lg:text-[15px]' : 'gap-1 h-9 px-3 text-xs'
        }`}
      >
        <MapPin size={size === 'lg' ? 18 : 13} className={size === 'lg' ? 'text-rc-brand fill-rc-brand/20' : ''} />
        <span className={`truncate ${compact ? 'max-w-[84px]' : 'max-w-[140px]'}`}>{city || 'Delhi'}</span>
        <ChevronDown size={size === 'lg' ? 15 : 13} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="dialog" aria-label="Choose location" className="absolute z-50 mt-2 right-0 sm:left-0 sm:right-auto w-[min(300px,calc(100vw-32px))] bg-white rounded-2xl shadow-card border border-rc-border p-3 text-rc-ink">
          <div className="text-sm font-extrabold px-1 mb-2">Choose location</div>
          <button
            type="button"
            onClick={() => { pick(null); refresh(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rc-brand-soft text-rc-brand-text text-sm font-bold hover:brightness-95"
          >
            <LocateFixed size={16} />
            <span className="flex-1 text-left truncate">Use my location{detectedCity ? ` · ${detectedCity}` : ''}</span>
            {!selectedCity && <Check size={16} />}
          </button>
          <div className="relative mt-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rc-ink-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search city"
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-rc-border text-sm focus:outline-none focus:ring-2 focus:ring-rc-brand/50"
            />
          </div>
          <ul className="mt-2 max-h-64 overflow-y-auto">
            {shown.map((c) => (
              <li key={c.name}>
                <button
                  type="button"
                  onClick={() => pick(c.name)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-rc-bg"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="flex items-center gap-2 text-xs text-rc-ink-muted">
                    {c.count} {c.count === 1 ? 'experience' : 'experiences'}
                    {selectedCity === c.name && <Check size={14} className="text-rc-brand-dark" />}
                  </span>
                </button>
              </li>
            ))}
            {!shown.length && <li className="px-3 py-3 text-xs text-rc-ink-muted">No cities found.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
