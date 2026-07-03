import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, ListChecks, PlusCircle, UserCircle, ArrowLeft, X } from 'lucide-react';
import useSiteLogo from '../../hooks/useSiteLogo.js';

const items = [
  { to: '/host', label: 'Host Dashboard', icon: LayoutDashboard, end: true },
  { to: '/host/listings', label: 'My Listings', icon: ListChecks },
  { to: '/host/listings/new', label: 'Create Listing', icon: PlusCircle },
  { to: '/host/profile', label: 'Host Profile', icon: UserCircle },
];

export default function HostSidebar({ open, onClose }) {
  const { logoSrc, companyName } = useSiteLogo();
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-brand text-ink shadow-soft' : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f1830] text-white transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
          <Link to="/host" className="flex items-center gap-2">
            <img src={logoSrc} alt={companyName} className="h-9 w-auto object-contain bg-white/95 rounded px-1.5 py-0.5" />
            <span className="font-display font-bold text-sm">Host Center</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={onClose}>
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          <Link
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <ArrowLeft size={18} /> Back to My Account
          </Link>
        </div>
      </aside>
    </>
  );
}
