import { Outlet } from 'react-router-dom';
import Header from '../components/public/Header.jsx';
import Footer from '../components/public/Footer.jsx';
import PageHero, { PageHeroProvider } from '../components/public/PageHero.jsx';
import BookRetreatsCTA from '../components/public/BookRetreatsCTA.jsx';
import ScrollToTopButton from '../components/public/ScrollToTopButton.jsx';
import ScrollToTop from '../components/public/ScrollToTop.jsx';
import UserLoginModal from '../components/public/UserLoginModal.jsx';
import CursorGlow from '../components/public/CursorGlow.jsx';

/**
 * Header is `fixed` and transparent at the top of pages that have a hero —
 * the hero shows through. On pages without a hero, Header stays solid so
 * its links are readable. PageHeroProvider broadcasts that state to both
 * Header and PageHero so the two stay in lockstep.
 */
export default function PublicLayout() {
  return (
    <PageHeroProvider>
      {/* Always start a new route at the top of the page */}
      <ScrollToTop />
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <main className="flex-1">
          <PageHero />
          <Outlet />
        </main>
        <BookRetreatsCTA />
        <Footer />
      </div>
      <ScrollToTopButton />
      <UserLoginModal />
      <CursorGlow />
    </PageHeroProvider>
  );
}
