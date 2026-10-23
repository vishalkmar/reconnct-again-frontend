import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import BrandMark from './BrandMark.jsx';
import { usePwa } from '../../context/PwaContext.jsx';
import { PlayStoreButton } from '../pwa/InstallApp.jsx';

const COLS = [
  {
    title: 'Explore',
    links: [
      { to: '/experiences', label: 'All experiences' },
      { to: '/connect', label: 'Reconnect with…' },
      { to: '/experiences?nearby=1', label: 'Near you' },
      { to: '/experiences?featured=1', label: 'Featured' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/dashboard/bookings', label: 'My bookings' },
      { to: '/dashboard/wishlist', label: 'Wishlist' },
      { to: '/dashboard/support', label: 'Help & support' },
    ],
  },
  {
    title: 'Partners',
    links: [
      { to: '/host', label: 'Host an experience' },
      { to: '/supplier/login', label: 'Supplier login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms & Conditions' },
      { to: '/delete-account', label: 'Delete my account' },
    ],
  },
];

export default function SiteFooter() {
  const { isPwa, isIOS } = usePwa();
  const { pathname } = useLocation();
  return (
    <footer className="bg-rc-navy text-white/80 mt-16">
      {/* App download band — the app is Android-only: shown on Android (install /
          APK) and desktop (QR on /download), never on iPhone or inside the app. */}
      {!isPwa && !isIOS && pathname !== '/download' && (
      <div id="get-app" className="scroll-mt-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="text-rc-brand text-xs font-bold tracking-[0.2em] uppercase">Reconnct for Android</p>
            <h2 className="font-sans text-2xl sm:text-3xl font-black text-white mt-2">Your next experience, one tap away</h2>
            <p className="text-sm text-white/70 mt-2 max-w-xl">
              Browse, book and manage experiences on the go — same account, same bookings, everywhere.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PlayStoreButton source="footer" />
          </div>
        </div>
      </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div className="col-span-2 md:col-span-1">
          <BrandMark className="h-7 w-32" />
          <p className="text-sm mt-4 leading-relaxed max-w-xs">
            Curated experiences for every relationship — friends, family, partner, kids, and yourself.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h3 className="font-sans text-sm font-bold text-white mb-3">{c.title}</h3>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.to}><Link to={l.to} className="text-sm hover:text-rc-brand transition">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
          <span>© {new Date().getFullYear()} Reconnct. Experiences that connect.</span>
          {/* Discreet staff entry — hidden inside the PWA (Task 2). */}
          {!isPwa && (
          <span data-staff-links className="flex items-center gap-4">
            <Link to="/team/login" className="hover:text-white">Team portal</Link>
            <Link to="/admin/login" className="inline-flex items-center gap-1 hover:text-white"><ShieldCheck size={12} />Admin</Link>
          </span>
          )}
        </div>
      </div>
    </footer>
  );
}
