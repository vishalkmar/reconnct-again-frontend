import { Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { GeoProvider } from '../context/GeoContext.jsx';
import { usePwa } from '../context/PwaContext.jsx';
import SiteHeader from '../components/landing/SiteHeader.jsx';
import SiteFooter from '../components/landing/SiteFooter.jsx';
import MobileTopBar from '../components/pwa/MobileTopBar.jsx';

// Inner-page titles for the installed app's top bar. Tab roots get no back
// button (like the Android app's tabs).
const PAGE = [
  [/^\/experiences\/[^/]+/, 'Experience', true],
  [/^\/experiences$/, 'Experiences', false],
  [/^\/connect/, 'Reconnect', false],
  [/^\/search/, 'Search', false],
  [/^\/profile/, 'Profile', false],
  [/^\/privacy/, 'Privacy Policy', true],
  [/^\/terms/, 'Terms & Conditions', true],
  [/^\/download/, 'Get the app', true],
  [/^\/destinations/, 'Destinations', true],
  [/^\/delete-account/, 'Delete account', true],
];

/*
  Shell for the public site (/, /experiences, /connect, legal, …).
  Browser: solid site header (64px, 88px on desktop) + footer. Installed app:
  the home page keeps the site header, every other page gets an app bar
  instead, there is no footer (the bottom tab bar takes over) and pages slide in.
*/
export default function PublicSiteLayout() {
  const { pathname } = useLocation();
  const { isPwa } = usePwa();
  const reduce = useReducedMotion();
  const page = PAGE.find(([re]) => re.test(pathname));
  const appBar = isPwa && pathname !== '/' && page;

  return (
    <GeoProvider>
      <div className="min-h-screen flex flex-col bg-rc-bg text-rc-ink font-sans">
        {appBar
          ? <MobileTopBar title={page[1]} back={page[2]} />
          : <SiteHeader />}
        <main
          className={`flex-1 ${appBar ? 'pt-14' : 'pt-16 lg:pt-[88px]'}`}
          style={appBar ? { paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' } : undefined}
        >
          {isPwa && !reduce ? (
            <motion.div key={pathname} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <Outlet />
            </motion.div>
          ) : <Outlet />}
        </main>
        {!isPwa && <SiteFooter />}
      </div>
    </GeoProvider>
  );
}
