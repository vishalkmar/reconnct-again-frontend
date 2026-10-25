import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShieldOff, ExternalLink, Home } from 'lucide-react';
import { usePwa } from '../../context/PwaContext.jsx';
import BrandMark from '../landing/BrandMark.jsx';

/*
  Wraps the admin + team route trees. In the installed app (PWA / TWA) only
  member and supplier accounts are allowed — same as the Android app — so
  these portals render a "not available in the app" screen instead. In a
  normal browser tab it is a transparent pass-through.
*/
export default function PwaRouteGuard() {
  const { isPwa } = usePwa();
  const { pathname, search } = useLocation();
  if (!isPwa) return <Outlet />;

  // Open the same URL in the real browser. `?pwa=0` clears the dev override.
  const browserUrl = `${window.location.origin}${pathname}${search ? `${search}&` : '?'}pwa=0`;

  return (
    <div className="min-h-screen grid place-items-center bg-rc-bg px-6 text-center" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-card p-8">
        <BrandMark by className="w-36 mx-auto" bySize="text-[12px]" />
        <span className="mx-auto mt-6 grid place-items-center w-16 h-16 rounded-2xl bg-rc-brand-soft text-rc-brand-text">
          <ShieldOff size={30} />
        </span>
        <h1 className="font-sans text-xl font-black text-rc-navy mt-5">Not available in the app</h1>
        <p className="text-sm text-rc-ink-muted mt-2">
          The Reconnct app is for members and partners. Staff portals open in a web browser.
        </p>
        <a
          href={browserUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 h-12 rounded-full bg-rc-navy text-white font-bold"
        >
          <ExternalLink size={16} /> Open in browser
        </a>
        <Link to="/" className="mt-3 flex items-center justify-center gap-2 h-12 rounded-full border border-rc-border font-bold text-rc-ink">
          <Home size={16} /> Back to home
        </Link>
      </div>
    </div>
  );
}
