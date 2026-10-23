import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import BrandMark from '../landing/BrandMark.jsx';
import CityPicker from '../landing/CityPicker.jsx';
import FilterDrawer from '../landing/FilterDrawer.jsx';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useTaxonomy } from '../../hooks/usePublicApi';
import { draftToSearch } from '../../utils/expFilters';
import { greeting } from '../../utils/format';

/*
  Installed app (PWA / Play Store TWA) home header — the web twin of the
  Android app's golden Home header (App/reconnct/src/screens/HomeScreen.jsx):
  white logo, city pill, bell, "Good evening, <name>", "What's next?", and a
  search bar with a Filter button. Replaces the website hero + site header
  when the home page runs inside the app, so it opens like an app, not a site.
*/
// Stable reference — FilterDrawer resets its draft whenever `initial` changes.
const NO_FILTERS = {};

export default function AppHomeHeader() {
  const navigate = useNavigate();
  const { user, isAuthenticated, requestLogin } = useUserAuth();
  const taxonomy = useTaxonomy();
  const [query, setQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const firstName = (user?.name || '').split(/\s+/)[0] || 'Traveller';

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/experiences?q=${encodeURIComponent(q)}` : '/experiences');
  };

  const openBell = () => {
    if (isAuthenticated) navigate('/dashboard/notifications');
    else requestLogin?.();
  };

  return (
    <header
      className="rc-hero-grad relative rounded-b-[28px] px-4 pb-5 shadow-[0_14px_30px_-18px_rgba(201,138,0,0.8)]"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <Link to="/" aria-label="Reconnct home"><BrandMark color="#FFFFFF" className="h-6 w-[112px]" /></Link>
        <div className="flex items-center gap-2">
          <CityPicker tone="onBrand" compact />
          <button
            type="button"
            onClick={openBell}
            aria-label="Notifications"
            className="relative grid place-items-center w-10 h-10 rounded-full bg-white/20 text-white active:scale-95 transition"
          >
            <Bell size={20} strokeWidth={2} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#FFC629]" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-white/95 text-[15px] font-semibold">
        <Sparkles size={16} className="fill-white/40" /> {greeting()}, {firstName}
      </div>
      <h1 className="font-sans font-black text-white text-[30px] leading-tight mt-0.5">What’s next?</h1>

      <form onSubmit={submit} className="mt-3.5 flex items-center h-[52px] bg-white rounded-2xl pl-4 pr-1.5 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.35)]">
        <Search size={18} className="text-rc-ink-faint shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Experiences, destinations…"
          aria-label="Search experiences"
          enterKeyHint="search"
          className="flex-1 min-w-0 bg-transparent px-2.5 text-[15px] text-rc-navy placeholder:text-rc-ink-faint outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="grid place-items-center w-8 h-8 rounded-full text-rc-ink-faint">
            <X size={15} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowFilter(true)}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#FFF1CC] text-[#9A6400] text-sm font-bold active:scale-95 transition"
        >
          <SlidersHorizontal size={15} /> Filter
        </button>
      </form>

      <FilterDrawer
        open={showFilter}
        taxonomy={taxonomy}
        initial={NO_FILTERS}
        onClose={() => setShowFilter(false)}
        onApply={(d) => {
          setShowFilter(false);
          const params = new URLSearchParams(draftToSearch(d, { q: query.trim() || undefined }));
          navigate(`/experiences${params.toString() ? `?${params}` : ''}`);
        }}
      />
    </header>
  );
}
