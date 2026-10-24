import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, Menu, X, Search, LayoutDashboard, BookOpen, Heart, LogOut,
  Home as HomeIcon, Compass, MapPinned, Building2, Store,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useSupplierAuth } from '../../context/SupplierAuthContext.jsx';
import BrandMark from './BrandMark.jsx';
import { PlayMark } from '../pwa/InstallApp.jsx';
import { PLAY_STORE_URL } from '../../config/appLinks';
import CityPicker from './CityPicker.jsx';
import { usePwa } from '../../context/PwaContext.jsx';

const NAV = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/experiences', label: 'Experiences', icon: Compass },
  { to: '/destinations', label: 'Destinations', icon: MapPinned },
];

/*
  Public site header — solid white bar: logo, main nav (gold underline on the
  active item), a search pill that opens the experiences list, the city pill,
  notifications and the account avatar. Phones get logo + search + account +
  menu drawer.
*/
export default function SiteHeader() {
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer]);

  const navCls = ({ isActive }) => `relative py-2 text-[15px] font-medium transition ${
    isActive
      ? 'text-rc-brand-dark after:absolute after:left-0 after:right-0 after:-bottom-[9px] after:h-[3px] after:rounded-full after:bg-rc-brand'
      : 'text-rc-navy hover:text-rc-brand-dark'
  }`;

  return (
    <header className={`rc-site-header fixed top-0 inset-x-0 z-40 bg-white border-b border-rc-border transition-shadow ${scrolled ? 'shadow-[0_4px_20px_rgba(16,24,40,0.06)]' : ''}`}>
      <div className="px-4 sm:px-6 lg:px-10 2xl:px-20 h-16 lg:h-[88px] flex items-center gap-3 lg:gap-6">
        <Link to="/" aria-label="Reconnct home" className="shrink-0">
          <BrandMark className="h-7 w-32 lg:h-9 lg:w-44" />
        </Link>

        <nav className="hidden lg:flex items-center gap-9 ml-6" aria-label="Main">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={navCls}>{n.label}</NavLink>)}
        </nav>

        <div className="flex-1 flex justify-center">
          <HeaderSearch />
        </div>

        <div className="hidden sm:block"><CityPicker size="lg" /></div>

        <Link
          to="/experiences"
          aria-label="Search experiences"
          className="lg:hidden grid place-items-center w-10 h-10 rounded-full bg-rc-bg text-rc-navy"
        >
          <Search size={18} />
        </Link>

        <AccountArea />

        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Open menu"
          className="lg:hidden grid place-items-center w-10 h-10 rounded-full text-rc-navy hover:bg-rc-bg"
        >
          <Menu size={21} />
        </button>
      </div>

      {drawer && <MobileDrawer onClose={() => setDrawer(false)} />}
    </header>
  );
}

// Header search pill (desktop): Enter opens the experiences list with ?q=.
function HeaderSearch() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [q, setQ] = useState('');
  // Mirror the query when the user is already on /experiences?q=…
  useEffect(() => {
    if (pathname === '/experiences') setQ(new URLSearchParams(search).get('q') || '');
  }, [pathname, search]);
  return (
    <form
      role="search"
      onSubmit={(e) => { e.preventDefault(); const t = q.trim(); navigate(t ? `/experiences?q=${encodeURIComponent(t)}` : '/experiences'); }}
      className="hidden lg:flex items-center w-full max-w-[480px] h-[54px] rounded-full bg-[#EEF1F8] px-5 focus-within:ring-2 focus-within:ring-rc-brand/40"
    >
      <Search size={20} className="text-rc-navy/70 shrink-0" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search experiences, destinations, activities..."
        aria-label="Search experiences"
        className="flex-1 min-w-0 bg-transparent px-3 text-sm text-rc-navy placeholder:text-rc-navy/50 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
    </form>
  );
}

function AccountArea() {
  const { user, isAuthenticated, requestLogin, logout } = useUserAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => requestLogin()}
        className="h-10 lg:h-12 px-5 rounded-full text-sm font-bold bg-rc-brand text-rc-navy hover:bg-rc-brand-dark transition"
      >
        Sign in
      </button>
    );
  }

  const first = (user?.name || 'Me').split(/\s+/)[0];
  const initial = first.charAt(0).toUpperCase();
  const items = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/dashboard/bookings', label: 'My bookings', icon: BookOpen },
    { to: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
    { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    { to: '/host', label: 'Switch to hosting', icon: Building2 },
  ];

  return (
    <div className="flex items-center gap-2 lg:gap-5">
      <Link
        to="/dashboard/notifications"
        aria-label="Notifications"
        className="hidden sm:grid relative place-items-center w-11 h-11 rounded-full text-rc-navy hover:bg-rc-bg"
      >
        <Bell size={24} strokeWidth={1.9} />
        <span className="absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
      </Link>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Account menu for ${user?.name || 'member'}`}
          className="grid place-items-center w-10 h-10 lg:w-[54px] lg:h-[54px] rounded-full bg-rc-navy text-white text-base lg:text-xl font-semibold hover:ring-4 hover:ring-rc-brand/30 transition"
        >
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : initial}
        </button>
        {open && (
          <div role="menu" className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-card border border-rc-border py-2 text-rc-ink">
            <div className="px-4 pb-2 mb-1 border-b border-rc-border">
              <div className="text-sm font-bold truncate">{user?.name || 'Member'}</div>
              <div className="text-xs text-rc-ink-muted truncate">{user?.email}</div>
            </div>
            {items.map((it) => (
              <Link key={it.to} to={it.to} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-rc-bg">
                <it.icon size={16} className="text-rc-ink-muted" />{it.label}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={() => { logout(); setOpen(false); toast.success('Signed out'); navigate('/'); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} />Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileDrawer({ onClose }) {
  const { isAuthenticated, requestLogin } = useUserAuth();
  const { supplier } = useSupplierAuth();
  const { isPwa, isAndroid } = usePwa();
  const navigate = useNavigate();
  const link = 'flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold text-rc-ink hover:bg-rc-bg';

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[min(320px,86vw)] bg-white shadow-card flex flex-col">
        <div className="flex items-center justify-between px-4 h-16 border-b border-rc-border">
          <BrandMark className="h-6 w-28" />
          <button type="button" onClick={onClose} aria-label="Close menu" className="grid place-items-center w-9 h-9 rounded-full hover:bg-rc-bg"><X size={20} /></button>
        </div>
        <div className="p-4"><CityPicker /></div>
        <nav className="px-2 flex-1 overflow-y-auto" aria-label="Mobile">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={onClose} className={link}><n.icon size={18} className="text-rc-brand-dark" />{n.label}</Link>
          ))}
          <div className="h-px bg-rc-border my-2 mx-4" />
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" onClick={onClose} className={link}><LayoutDashboard size={18} className="text-rc-ink-muted" />Dashboard</Link>
              <Link to="/dashboard/bookings" onClick={onClose} className={link}><BookOpen size={18} className="text-rc-ink-muted" />My bookings</Link>
              <Link to="/dashboard/wishlist" onClick={onClose} className={link}><Heart size={18} className="text-rc-ink-muted" />Wishlist</Link>
              <Link to="/host" onClick={onClose} className={link}><Building2 size={18} className="text-rc-ink-muted" />Switch to hosting</Link>
            </>
          ) : (
            <button type="button" onClick={() => { onClose(); requestLogin(); }} className={`${link} w-full`}>
              <LayoutDashboard size={18} className="text-rc-ink-muted" />Sign in / Sign up
            </button>
          )}
          {(supplier || !isPwa) && (
          <Link to={supplier ? '/supplier/dashboard' : '/supplier/login'} onClick={onClose} className={link}>
            <Store size={18} className="text-rc-ink-muted" />{supplier ? 'Supplier dashboard' : 'Partner login'}
          </Link>
          )}
        </nav>
        {/* The app is Android-only, so the download entry shows on Android phones only. */}
        {!isPwa && isAndroid && (
          <div className="p-4 border-t border-rc-border">
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={onClose} className="flex items-center justify-center gap-2.5 h-12 rounded-2xl bg-black text-white font-bold">
              <PlayMark size={20} /> Get it on Google Play
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
