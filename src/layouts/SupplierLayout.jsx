import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, Link, useNavigate, NavLink } from 'react-router-dom';
import {
  Menu, LogOut, X, LayoutDashboard, ListChecks, Wallet, Bell, Ticket, Clock, UserCog,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSupplierAuth } from '../context/SupplierAuthContext.jsx';
import useSiteLogo from '../hooks/useSiteLogo.js';
import api from '../services/api';

const NAV = [
  { to: '/supplier/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/supplier/listings', label: 'My Listings', icon: ListChecks },
  { to: '/supplier/transactions', label: 'Transactions', icon: Wallet },
  { to: '/supplier/account-manager', label: 'Key Account Manager', icon: UserCog },
];

const NOTIF_ICON = { host_booking: Ticket, reminder: Clock };
const NOTIF_TINT = { host_booking: 'text-brand-dark bg-amber-100', reminder: 'text-blue-600 bg-blue-100' };

function SupplierNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => api.get('/supplier/notifications')
      .then(({ data }) => {
        if (!alive) return;
        const all = (data.data || data).notifications || [];
        setItems(all.filter((n) => n.kind === 'host_booking' || n.kind === 'reminder'));
      })
      .catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative p-2 rounded-lg hover:bg-surface-alt" aria-label="Notifications">
        <Bell size={20} className="text-ink-muted" />
        {items.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[26rem] max-w-[92vw] max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-100 z-40">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Notifications</div>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-ink-muted text-center">Nothing yet</div>
          ) : items.slice(0, 8).map((n) => {
            const Icon = NOTIF_ICON[n.kind] || Bell;
            const tint = NOTIF_TINT[n.kind] || 'text-ink-muted bg-surface-alt';
            return (
              <button
                key={n.id}
                onClick={() => { setOpen(false); if (n.bookingId) navigate(`/supplier/bookings/${n.bookingId}`); }}
                className="w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-surface-alt"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tint}`}><Icon size={15} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{n.title}</div>
                  <div className="text-xs text-ink-muted break-words">{n.body}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupplierSidebar({ open, onClose }) {
  const { logoSrc, companyName } = useSiteLogo();
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-brand text-ink shadow-soft' : 'text-slate-300 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f1830] text-white transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
          <Link to="/supplier/dashboard" className="flex items-center gap-2">
            <img src={logoSrc} alt={companyName} className="h-9 w-auto object-contain bg-white/95 rounded px-1.5 py-0.5" />
            <span className="font-display font-bold text-sm">Supplier Portal</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white" aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={onClose} className={linkClass}>
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default function SupplierLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { supplier, logout } = useSupplierAuth();
  const navigate = useNavigate();
  const path = useLocation().pathname;
  const isWizard = /\/supplier\/listings\/(new|[^/]+\/edit)/.test(path);

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/supplier/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface-alt flex">
      <SupplierSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="sticky top-0 z-30 bg-white border-b shadow-soft">
          <div className="flex items-center justify-between px-4 md:px-8 h-16">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-surface-alt rounded" aria-label="Open menu">
              <Menu size={22} />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide bg-brand/15 text-brand-dark px-2.5 py-1 rounded-full">Supplier mode</span>
              <h2 className="text-lg font-display font-semibold">{supplier?.companyName || 'Supplier'}</h2>
            </div>
            <div className="flex items-center gap-3">
              <SupplierNotificationBell />
              <Link to="/" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border hover:bg-surface-alt">
                View site
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-wellness/10 text-wellness hover:bg-wellness hover:text-white text-sm font-semibold transition"
                title="Sign out"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </header>
        <main className={isWizard ? 'flex-1 p-0' : 'flex-1 p-4 md:p-8'}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
