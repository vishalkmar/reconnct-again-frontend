import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  X,
  Users as UsersIcon,
  Wallet,
  Calendar as CalendarIcon,
  Sparkles,
  SlidersHorizontal,
  LineChart,
  Truck,
} from 'lucide-react';

// This build ships the admin "Main" dashboard (booking management) plus the
// Experience builder + its setup. The original project's website-content
// Configure modules are intentionally omitted.
const mainItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarIcon },
  { to: '/admin/revenue', label: 'Revenue', icon: LineChart },
  { to: '/admin/experiences', label: 'Experiences', icon: Sparkles },
  { to: '/admin/suppliers', label: 'Suppliers & Contract', icon: Truck },
  { to: '/admin/users', label: 'Users', icon: UsersIcon },
  { to: '/admin/transactions', label: 'Transactions', icon: Wallet },
  { to: '/admin/experience-setup', label: 'Experience Setup', icon: SlidersHorizontal },
];

export default function AdminSidebar({ open, onClose }) {
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
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <span className="font-display text-xl font-semibold tracking-tight text-white">
              reconn<span className="text-accent">ct</span>
            </span>
            <span className="font-display text-sm text-white/70">Admin</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {mainItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} end>
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
