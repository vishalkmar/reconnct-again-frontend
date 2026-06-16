import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import Hero from './Hero.jsx';

/**
 * Translate a URL path to a stable hero `pageKey`.
 *
 * Rules:
 *   - "/" or empty                  → "home"
 *   - "/retreats" or "/retreats/x"  → "retreats"
 *   - any other "/foo" or "/foo/x"  → "foo"
 *
 * The same rule is applied in HeroFormModal when the admin picks a
 * page from the header-links list, so the two stay in lockstep.
 */
export const pathToPageKey = (pathname = '/') => {
  if (!pathname || pathname === '/') return 'home';
  const seg = pathname.split('/').filter(Boolean)[0];
  return (seg || 'home').toLowerCase();
};

const PageHeroContext = createContext({ hasHero: false, loading: true });

export const usePageHero = () => useContext(PageHeroContext);

/**
 * Provider — fetches whether the current URL has any active hero registered
 * and exposes that as `{hasHero, loading}` to the rest of the layout (mostly
 * used by `<Header/>` to decide if it can be transparent over a hero).
 */
export function PageHeroProvider({ children }) {
  const { pathname } = useLocation();
  const pageKey = useMemo(() => pathToPageKey(pathname), [pathname]);
  const [state, setState] = useState({ hasHero: false, loading: true });

  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      setState({ hasHero: false, loading: false });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    api.get('/heroes/active', { params: { pageKey } })
      .then((res) => {
        if (cancelled) return;
        const has = (res.data?.data?.heroes || []).length > 0;
        setState({ hasHero: has, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ hasHero: false, loading: false });
      });
    return () => { cancelled = true; };
  }, [pageKey, pathname]);

  return (
    <PageHeroContext.Provider value={{ ...state, pageKey }}>
      {children}
    </PageHeroContext.Provider>
  );
}

/**
 * Renders the hero (if registered) or a header-height spacer so page content
 * isn't hidden under the fixed header on pages without a hero.
 */
export default function PageHero() {
  const { hasHero, loading, pageKey } = usePageHero();

  // While loading we don't yet know — keep a header-height spacer so the
  // first paint doesn't jump
  if (loading) return <div className="h-16 lg:h-20" />;

  if (!hasHero) return <div className="h-16 lg:h-20" />;

  return <Hero key={pageKey} pageKey={pageKey} suppressFallback />;
}
