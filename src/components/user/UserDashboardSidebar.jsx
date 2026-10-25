import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User as UserIcon,
  BookOpen,
  Wallet,
  Heart,
  Gift,
  Bell,
  MessageCircle,
  Store,
  X,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import BrandMark from '../landing/BrandMark.jsx';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/profile', label: 'My Profile', icon: UserIcon },
  { to: '/dashboard/bookings', label: 'My Bookings', icon: BookOpen },
  { to: '/dashboard/transactions', label: 'Transactions', icon: Wallet },
  { to: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/support', label: 'Support', icon: MessageCircle },
  // Refer & Earn is temporarily hidden from the member nav (logic kept intact —
  // the /dashboard/refer route and backend refer-earn flow still work). Un-comment
  // the line below to bring the tab back.
  // { to: '/dashboard/refer', label: 'Refer & Earn', icon: Gift },
];

/*
  Member sidebar — light panel in the landing-site look (white, gold active
  pill). `collapsed` (desktop only) shrinks it to an icon rail; on phones it
  slides in as a drawer.
*/
export default function UserDashboardSidebar({ open, onClose, collapsed = false, onToggleCollapse }) {
  const linkClass = ({ isActive }) =>
    `group flex items-center gap-3.5 h-12 rounded-2xl text-[15px] font-medium transition ${
      collapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'
    } ${
      isActive
        ? 'bg-[#FFD666] text-rc-navy font-semibold shadow-[0_8px_20px_-12px_rgba(255,185,0,0.9)]'
        : 'text-rc-navy/80 hover:bg-[#FFF6DD] hover:text-rc-navy'
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
        className={`fixed inset-y-0 left-0 z-50 w-[272px] ${collapsed ? 'lg:w-[88px]' : 'lg:w-[272px]'} bg-white border-r border-[#F1ECE3] transform transition-all duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col`}
      >
        <div className={`flex items-center justify-between h-[88px] shrink-0 ${collapsed ? 'lg:justify-center lg:px-0 px-6' : 'px-6'}`}>
          <Link to="/dashboard" className={`flex flex-col items-start gap-1 ${collapsed ? 'lg:hidden' : ''}`} onClick={onClose}>
            <BrandMark by className="w-[136px]" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-rc-navy/60">My Account</span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:grid place-items-center w-9 h-9 rounded-full bg-[#F4F2EE] text-rc-navy/70 hover:bg-[#FFF1CC] hover:text-rc-navy transition"
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
          <button onClick={onClose} className="lg:hidden grid place-items-center w-9 h-9 rounded-full bg-[#F4F2EE] text-rc-navy/70" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto pb-6 space-y-1.5 ${collapsed ? 'lg:px-3 px-5' : 'px-5'}`}>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={onClose} title={collapsed ? item.label : undefined}>
              <item.icon size={21} strokeWidth={1.8} className="shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
            </NavLink>
          ))}

          {/* Switch to hosting — same account, manage your own experiences. */}
          <div className="pt-4 mt-4 border-t border-[#F1ECE3]">
            <Link
              to="/host"
              onClick={onClose}
              title={collapsed ? 'Switch to Host' : undefined}
              className={`flex items-center gap-3.5 h-12 rounded-2xl text-[15px] font-semibold bg-rc-navy text-white hover:bg-[#25253F] shadow-[0_10px_22px_-14px_rgba(26,26,46,0.9)] transition ${collapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'}`}
            >
              <Store size={20} className="text-rc-brand shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>Switch to Host</span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
