import { Outlet } from 'react-router-dom';
import { GeoProvider } from '../context/GeoContext.jsx';
import SiteHeader from '../components/landing/SiteHeader.jsx';
import SiteFooter from '../components/landing/SiteFooter.jsx';

/*
  Shell for the public site (/, /experiences, /connect, legal, …): site header
  (hamburger menu on phones) + footer. The installed app shows exactly the
  same mobile website — the footer hides its "get the app" band and staff
  links there by itself.
*/
export default function PublicSiteLayout() {
  return (
    <GeoProvider>
      <div className="min-h-screen flex flex-col bg-rc-bg text-rc-ink font-sans">
        <SiteHeader />
        <main className="flex-1 pt-16 lg:pt-[88px]">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </GeoProvider>
  );
}
