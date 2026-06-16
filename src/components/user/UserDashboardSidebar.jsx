import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User as UserIcon,
  BookOpen,
  Wallet,
  Heart,
  Gift,
  X,
} from 'lucide-react';
import useSiteLogo from '../../hooks/useSiteLogo.js';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/profile', label: 'My Profile', icon: UserIcon },
  { to: '/dashboard/bookings', label: 'My Bookings', icon: BookOpen },
  { to: '/dashboard/transactions', label: 'Transactions', icon: Wallet },
  { to: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
  // Refer & Earn is temporarily hidden from the member nav (logic kept intact —
  // the /dashboard/refer route and backend refer-earn flow still work). Un-comment
  // the line below to bring the tab back.
  // { to: '/dashboard/refer', label: 'Refer & Earn', icon: Gift },
];

export default function UserDashboardSidebar({ open, onClose }) {
  const { logoSrc, companyName } = useSiteLogo();
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
      isActive
        ? 'bg-brand text-ink shadow-soft'
        : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-ink text-white transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img
              src={logoSrc}
              alt={companyName}
              className="h-9 w-auto object-contain bg-white/95 rounded px-1.5 py-0.5"
            />
            <span className="font-display font-bold text-sm">My Account</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={onClose}>
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
