import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ListChecks, PlusCircle, UserCircle, UserCog, Wallet, ArrowLeft, X, CalendarCheck,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import BrandMark from '../landing/BrandMark.jsx';

const items = [
  // Same order and wording as the Supplier Portal (SupplierLayout) so both
  // owner portals read identically; Support/Profile stay because the host app
  // has those tabs too, and Create Listing keeps its shortcut.
  { to: '/host', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/host/listings', label: 'My Listings', icon: ListChecks },
  { to: '/host/all-bookings', label: 'All Bookings', icon: CalendarCheck },
  { to: '/host/transactions', label: 'Transactions', icon: Wallet },
  { to: '/host/account-manager', label: 'Key Account Manager', icon: UserCog },
  { to: '/host/listings/new', label: 'Create Listing', icon: PlusCircle },
  { to: '/host/profile', label: 'Profile', icon: UserCircle },
];

/*
  Host sidebar — same light look as the member sidebar (white panel, gold
  active pill), with a desktop collapse-to-icons mode.
*/
export default function HostSidebar({ open, onClose, collapsed = false, onToggleCollapse }) {
  const { pathname } = useLocation();
  // "Create Listing" has its own entry, so My Listings shouldn't light up too.
  const onCreate = /\/host\/listings\/new\/?$/.test(pathname);
  const linkClass = ({ isActive: rawActive }, to) => {
    const isActive = rawActive && !(onCreate && to === '/host/listings');
    return `flex items-center gap-3.5 h-12 rounded-2xl text-[15px] font-medium transition ${
      collapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'
    } ${
      isActive
        ? 'bg-[#FFD666] text-rc-navy font-semibold shadow-[0_8px_20px_-12px_rgba(255,185,0,0.9)]'
        : 'text-rc-navy/80 hover:bg-[#FFF6DD] hover:text-rc-navy'
    }`;
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[272px] ${collapsed ? 'lg:w-[88px]' : 'lg:w-[272px]'} bg-white border-r border-[#F1ECE3] transform transition-all duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col`}
      >
        <div className={`flex items-center justify-between h-[88px] shrink-0 ${collapsed ? 'lg:justify-center lg:px-0 px-6' : 'px-6'}`}>
          <Link to="/host" className={`flex flex-col items-start gap-1 ${collapsed ? 'lg:hidden' : ''}`} onClick={onClose}>
            <BrandMark by className="w-[136px]" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-rc-navy/60">Host Center</span>
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

        <nav className={`flex-1 overflow-y-auto pb-4 space-y-1.5 ${collapsed ? 'lg:px-3 px-5' : 'px-5'}`}>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={(st) => linkClass(st, item.to)} onClick={onClose} title={collapsed ? item.label : undefined}>
              <item.icon size={21} strokeWidth={1.8} className="shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={`shrink-0 pb-5 pt-4 border-t border-[#F1ECE3] ${collapsed ? 'lg:px-3 px-5' : 'px-5'}`}>
          <Link
            to="/dashboard"
            onClick={onClose}
            title={collapsed ? 'Back to My Account' : undefined}
            className={`flex items-center gap-3.5 h-12 rounded-2xl text-[15px] font-semibold bg-rc-navy text-white hover:bg-[#25253F] shadow-[0_10px_22px_-14px_rgba(26,26,46,0.9)] transition ${collapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'}`}
          >
            <ArrowLeft size={20} className="text-rc-brand shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Back to My Account</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
