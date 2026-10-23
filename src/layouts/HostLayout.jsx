import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu, ExternalLink, LogOut, Bell, Ticket, Clock, Wallet, UserCog, MessageCircle, UserRound,
} from 'lucide-react';
import MobileTopBar from '../components/pwa/MobileTopBar.jsx';
import PartnerMenu from '../components/pwa/PartnerMenu.jsx';
import useAppShell from '../hooks/useAppShell';
import toast from 'react-hot-toast';
import HostSidebar from '../components/host/HostSidebar.jsx';
import { useUserAuth } from '../context/UserAuthContext.jsx';
import api from '../services/api.js';

const NOTIF_ICON = { host_booking: Ticket, reminder: Clock };
const NOTIF_TINT = { host_booking: 'text-brand-dark bg-amber-100', reminder: 'text-blue-600 bg-blue-100' };

function HostNotificationBell() {
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
    const load = () => api.get('/notifications')
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
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm flex items-center justify-between">
            Notifications
            <Link to="/host/notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-brand">View all</Link>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-ink-muted text-center">Nothing yet</div>
          ) : items.slice(0, 8).map((n) => {
            const Icon = NOTIF_ICON[n.kind] || Bell;
            const tint = NOTIF_TINT[n.kind] || 'text-ink-muted bg-surface-alt';
            return (
              <button
                key={n.id}
                onClick={() => { setOpen(false); if (n.bookingId) navigate(`/host/bookings/${n.bookingId}`); }}
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

const HOST_TITLES = [
  [/^\/host\/listings\/new/, 'New listing'],
  [/^\/host\/listings\/[^/]+\/edit/, 'Edit listing'],
  [/^\/host\/listings\/[^/]+\/resolve/, 'Resolve objections'],
  [/^\/host\/listings\/[^/]+\/bookings/, 'Listing bookings'],
  [/^\/host\/listings\/[^/]+\/view/, 'Listing'],
  [/^\/host\/listings/, 'My listings'],
  [/^\/host\/all-bookings/, 'All bookings'],
  [/^\/host\/bookings\//, 'Booking'],
  [/^\/host\/transactions/, 'Transactions'],
  [/^\/host\/notifications/, 'Notifications'],
  [/^\/host\/account-manager/, 'Key account manager'],
  [/^\/host\/support/, 'Host support'],
  [/^\/host\/profile/, 'Host profile'],
  [/^\/host/, 'Host dashboard'],
];

export default function HostLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useUserAuth();
  const navigate = useNavigate();
  const path = useLocation().pathname;
  // The listing wizard runs edge-to-edge; support chat runs full-bleed with a
  // tiny margin; everything else gets normal padding.
  const isWizard = /\/host\/listings\/(new|[^/]+\/edit)/.test(path);
  const isChat = path.startsWith('/host/support');
  const appShell = useAppShell();

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/', { replace: true });
  };

  // Phone / installed app: app bar + bottom tabs; the Profile tab carries the
  // rest of the sidebar as a menu (incl. switching back to member mode).
  if (appShell) {
    const title = HOST_TITLES.find(([re]) => re.test(path))?.[1] || 'Host mode';
    const tabRoot = /^\/host(\/(listings|all-bookings|profile))?\/?$/.test(path);
    return (
      <div className="min-h-screen bg-surface-alt">
        <MobileTopBar title={title} back={!tabRoot} right={<HostNotificationBell />} />
        <main
          className={isWizard ? 'px-3' : isChat ? 'px-2 pb-2 overflow-hidden' : 'px-4 pb-6'}
          style={{ paddingTop: `calc(${isWizard || isChat ? '3.75rem' : '4.5rem'} + env(safe-area-inset-top))` }}
        >
          {path === '/host/profile' && (
            <PartnerMenu
              header={(
                <div className="flex items-center gap-3 bg-white rounded-2xl shadow-soft p-4">
                  <span className="grid place-items-center w-12 h-12 rounded-full bg-brand text-white font-bold">{(user?.name || 'H').charAt(0).toUpperCase()}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wide text-brand-dark">Host mode</div>
                    <div className="font-semibold text-ink truncate">{user?.name || 'Host'}</div>
                  </div>
                </div>
              )}
              items={[
                { to: '/host/transactions', label: 'Transactions', icon: Wallet },
                { to: '/host/notifications', label: 'Notifications', icon: Bell },
                { to: '/host/account-manager', label: 'Key account manager', icon: UserCog },
                { to: '/host/support', label: 'Host support', icon: MessageCircle },
                { to: '/profile', label: 'Switch to member mode', icon: UserRound },
              ]}
              onLogout={handleLogout}
            />
          )}
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt flex">
      <HostSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="sticky top-0 z-30 bg-white border-b shadow-soft">
          <div className="flex items-center justify-between px-4 md:px-8 h-16">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-surface-alt rounded" aria-label="Open menu">
              <Menu size={22} />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide bg-brand/15 text-brand-dark px-2.5 py-1 rounded-full">Host mode</span>
              <h2 className="text-lg font-display font-semibold">Welcome, {(user?.name || '').split(/\s+/)[0] || 'Host'}</h2>
            </div>
            <div className="flex items-center gap-3">
              <HostNotificationBell />
              <Link to="/dashboard" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border hover:bg-surface-alt">
                <ExternalLink size={14} /> My Account
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
        <main className={isWizard ? 'flex-1 p-0' : isChat ? 'flex-1 p-2.5 overflow-hidden' : 'flex-1 p-4 md:p-8'}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
