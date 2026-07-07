import { useEffect, useRef, useState } from 'react';
import { Menu, LogOut, ExternalLink, ChevronDown, Building2, Bell, UserPlus, CalendarCheck, CreditCard, Store } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';

const NOTIF_ICON = {
  user_registered: UserPlus,
  booking: CalendarCheck,
  payment: CreditCard,
  host_listing: Store,
};
const NOTIF_TINT = {
  user_registered: 'text-blue-600 bg-blue-50',
  booking: 'text-brand bg-brand/10',
  payment: 'text-green-600 bg-green-50',
  host_listing: 'text-purple-600 bg-purple-50',
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

function NotificationBell() {
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
    const load = () => api.get('/admin/notifications')
      .then((res) => { if (alive) setItems(res.data?.data?.notifications || []); })
      .catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-surface-alt"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-ink-muted" />
        {items.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[26rem] max-w-[92vw] max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-100 z-40">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Notifications</div>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-ink-muted text-center">Nothing yet</div>
          ) : items.map((n) => {
            const Icon = NOTIF_ICON[n.kind] || Bell;
            const tint = NOTIF_TINT[n.kind] || 'text-ink-muted bg-surface-alt';
            return (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tint}`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{n.title}</div>
                  <div className="text-xs text-ink-muted break-words">{n.body}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">{timeAgo(n.at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminTopbar({ onMenuClick }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b shadow-soft">
      <div className="flex items-center justify-between px-4 md:px-8 h-16">
        <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-surface-alt rounded">
          <Menu size={22} />
        </button>

        <div className="hidden lg:block">
          <h2 className="text-lg font-display font-semibold">Welcome back, {admin?.name?.split(' ')[0] || 'Admin'} 👋</h2>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link
            to="/"
            target="_blank"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border hover:bg-surface-alt"
          >
            <ExternalLink size={14} /> View site
          </Link>

          {/* Profile dropdown */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 text-sm px-1.5 py-1 rounded-lg hover:bg-surface-alt"
            >
              <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold">
                {admin?.name?.charAt(0) || 'A'}
              </div>
              <div className="leading-tight text-left hidden md:block">
                <div className="font-medium">{admin?.name || 'Admin'}</div>
                <div className="text-xs text-ink-muted">{admin?.email}</div>
              </div>
              <ChevronDown size={16} className="text-ink-muted" />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-40">
                <div className="px-4 py-2 border-b border-gray-100 md:hidden">
                  <div className="font-medium text-sm">{admin?.name || 'Admin'}</div>
                  <div className="text-xs text-ink-muted">{admin?.email}</div>
                </div>
                <button
                  onClick={() => { setOpen(false); navigate('/admin/company-profile'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-alt"
                >
                  <Building2 size={16} className="text-brand" /> Company profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-wellness hover:bg-surface-alt"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
