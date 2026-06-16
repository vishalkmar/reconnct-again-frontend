import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Force the window to start at the top whenever the route path changes.
 * React Router doesn't reset scroll on navigation by default, so without
 * this you can land mid-page after clicking an internal link.
 *
 * Hash links (e.g. #section) are honoured — we only reset when the path
 * actually changed.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // let the browser handle in-page anchors
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}
