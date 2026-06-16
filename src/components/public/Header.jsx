import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Search, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import { usePageHero } from './PageHero.jsx';
import UserMenu from './UserMenu.jsx';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import useSiteLogo from '../../hooks/useSiteLogo.js';

const fallbackLinks = [
  { label: 'Hotels', path: '/hotels' },
  { label: 'Packages', path: '/retreats' },
  { label: 'Events', path: '/events' },
  { label: 'About', path: '/about' },
  { label: 'Help', path: '/help' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [links, setLinks] = useState(fallbackLinks);
  const { logoSrc, companyName } = useSiteLogo();
  const { hasHero } = usePageHero();
  const { isAuthenticated, requestLogin } = useUserAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    api.get('/header-links')
      .then((res) => {
        const data = res.data?.data?.links;
        if (Array.isArray(data) && data.length) setLinks(data);
      })
      .catch(() => {});
  }, []);

  // Transparent only when sitting over a hero AND not scrolled. On pages
  // with no hero (or once scrolled), the bar is solid white so its links
  // remain readable.
  const solid = scrolled || open || !hasHero;

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition ${
      solid
        ? isActive ? 'text-brand' : 'text-ink hover:text-brand'
        : isActive ? 'text-white' : 'text-white/90 hover:text-white'
    } ${!solid ? 'drop-shadow' : ''}`;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 w-full transition-all duration-300 ${
        solid ? 'bg-white/95 backdrop-blur shadow-soft' : 'bg-transparent'
      }`}
    >
      <div className="container-app flex items-center justify-between h-16 lg:h-20">
        <Link to="/" className="flex items-center">
          <img
            src={logoSrc}
            alt={companyName}
            className={`h-10 lg:h-12 w-auto object-contain transition ${
              solid ? '' : 'drop-shadow-lg'
            }`}
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <NavLink key={l.label} to={l.path} className={navLinkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <button
            className={`p-2 rounded-full transition ${
              solid ? 'text-ink hover:bg-surface-alt' : 'text-white hover:bg-white/10'
            }`}
            aria-label="Search"
          >
            <Search size={20} />
          </button>
          <a
            href="https://traveon.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-lg font-semibold tracking-wide text-sky-300 hover:text-sky-200 transition"
            style={{ textShadow: solid ? 'none' : '0 1px 6px rgba(0,0,0,0.35)' }}
          >
            Traveon
            <ExternalLink size={13} />
          </a>
          <UserMenu darkOnTransparent={!solid} />
        </div>

        <button
          className={`lg:hidden p-2 rounded ${
            solid ? 'hover:bg-surface-alt text-ink' : 'hover:bg-white/10 text-white'
          }`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t bg-white">
          <nav className="container-app py-4 flex flex-col gap-3">
            {links.map((l) => (
              <NavLink
                key={l.label}
                to={l.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `py-2 font-medium ${isActive ? 'text-brand' : 'text-ink'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <a
              href="https://traveon.in"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-500 mt-2"
            >
              Traveon <ExternalLink size={13} />
            </a>
            <div className="pt-3 mt-2 border-t border-gray-100">
              {isAuthenticated ? (
                <NavLink
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-brand text-white font-medium"
                >
                  Go to dashboard
                </NavLink>
              ) : (
                <button
                  type="button"
                  onClick={() => { setOpen(false); requestLogin(); }}
                  className="inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-brand text-white font-medium"
                >
                  Login / Sign up
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
