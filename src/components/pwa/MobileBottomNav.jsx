import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Search, Link2, Compass, UserRound, LayoutDashboard, ListChecks, CalendarCheck,
} from 'lucide-react';
import { usePwa } from '../../context/PwaContext.jsx';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import api from '../../services/api';

/*
  App-style bottom tab bar — the web twin of the Android app's BottomNav:
    member   : Home · Search · Reconnect · Experiences · Profile
    supplier : Dashboard · Listings · Bookings · Profile   (/supplier/*)
    host     : Dashboard · Listings · Bookings · Profile   (/host/*)
  Shown inside the installed app everywhere it applies, and on phone-width
  browsers for the signed-in areas (dashboard / host / supplier / search /
  profile). Never on admin/team, auth, checkout or the experience detail page
  (that one has its own Book-now bar).
*/
const MEMBER = [
  { to: '/', label: 'Home', icon: Home, match: (p) => p === '/' },
  { to: '/search', label: 'Search', icon: Search, match: (p) => p.startsWith('/search') },
  { to: '/connect', label: 'Reconnect', icon: Link2, match: (p) => p.startsWith('/connect') },
  { to: '/experiences', label: 'Experiences', icon: Compass, match: (p) => p === '/experiences' },
  { to: '/profile', label: 'Profile', icon: UserRound, match: (p) => p.startsWith('/profile') || p.startsWith('/dashboard') },
];
const partnerTabs = (base) => [
  { to: base === '/host' ? '/host' : `${base}/dashboard`, label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === base || p === `${base}/` || p.startsWith(`${base}/dashboard`) },
  { to: `${base}/listings`, label: 'Listings', icon: ListChecks, match: (p) => p.startsWith(`${base}/listings`) },
  { to: `${base}/all-bookings`, label: 'Bookings', icon: CalendarCheck, match: (p) => p.startsWith(`${base}/all-bookings`) || p.startsWith(`${base}/bookings`) },
  { to: `${base}/${base === '/host' ? 'profile' : 'account'}`, label: 'Profile', icon: UserRound, match: (p) => /\/(profile|account|transactions|notifications|account-manager)/.test(p) },
];

// Chat screens hide the tabs (full-height conversation, like WhatsApp).
const HIDDEN = /^\/(admin|team|login|book\/|checkout\/|booking-success\/|supplier\/(login|reset-password)|delete-account|unsubscribe|dashboard\/support|host\/support|(host|supplier)\/listings\/(new|[^/]+\/edit))/;
const MEMBER_AREA = /^\/(dashboard|profile|search)(\/|$)/;
const PUBLIC_AREA = /^\/($|experiences$|connect|privacy|terms|download)/;

export function navKindFor(pathname, isPwa) {
  if (HIDDEN.test(pathname)) return null;
  if (pathname.startsWith('/supplier')) return 'supplier';
  if (pathname.startsWith('/host')) return 'host';
  if (MEMBER_AREA.test(pathname)) return 'member';
  if (isPwa && PUBLIC_AREA.test(pathname)) return 'member';
  return null;
}

const useNarrow = () => {
  const q = '(max-width: 767px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return narrow;
};

// Unread support replies for the signed-in member ({ user, supplier } counts),
// polled while the tab bar is on screen and the page is visible.
function useSupportUnread(enabled) {
  const { isAuthenticated } = useUserAuth();
  const [unread, setUnread] = useState({ user: 0, supplier: 0 });
  useEffect(() => {
    if (!enabled || !isAuthenticated) return undefined;
    let alive = true;
    const check = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      api.get('/support/me/unread')
        .then((res) => { if (alive) setUnread(res.data?.data?.unread || { user: 0, supplier: 0 }); })
        .catch(() => {});
    };
    check();
    const t = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', check); };
  }, [enabled, isAuthenticated]);
  return unread;
}

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { isPwa } = usePwa();
  const narrow = useNarrow();
  const kind = navKindFor(pathname, isPwa);
  const visible = !!kind && (isPwa || narrow);
  const unread = useSupportUnread(visible && (kind === 'member' || kind === 'host'));
  const badgeFor = (t) => t.label === 'Profile' && ((kind === 'member' && unread.user > 0) || (kind === 'host' && unread.supplier > 0));

  // Lets CSS reserve room at the bottom of every page for the bar.
  useEffect(() => {
    document.documentElement.classList.toggle('has-bottom-nav', visible);
    return () => document.documentElement.classList.remove('has-bottom-nav');
  }, [visible]);

  if (!visible) return null;
  const tabs = kind === 'member' ? MEMBER : partnerTabs(kind === 'host' ? '/host' : '/supplier');

  return (
    <nav
      aria-label="App navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-rc-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex max-w-xl mx-auto">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center justify-center h-16 gap-1"
              >
                <span className={`grid place-items-center h-8 w-14 rounded-full transition ${active ? 'bg-rc-brand-soft' : ''}`}>
                  <span className="relative">
                    <t.icon size={20} strokeWidth={active ? 2.4 : 1.9} className={active ? 'text-rc-brand-text' : 'text-rc-navy/70'} />
                    {badgeFor(t) && <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-label="New support message" />}
                  </span>
                </span>
                <span className={`text-[11px] leading-none ${active ? 'font-bold text-rc-navy' : 'text-rc-navy/70'}`}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
