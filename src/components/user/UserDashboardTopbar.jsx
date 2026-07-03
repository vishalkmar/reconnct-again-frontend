import { Menu, LogOut, ExternalLink, Store, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useUserAuth } from '../../context/UserAuthContext.jsx';

export default function UserDashboardTopbar({ onMenuClick }) {
  const { user, logout } = useUserAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/', { replace: true });
  };

  const firstName = (user?.name || '').split(/\s+/)[0] || 'Traveller';
  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white border-b shadow-soft">
      <div className="flex items-center justify-between px-4 md:px-8 h-16">
        <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-surface-alt rounded" aria-label="Open menu">
          <Menu size={22} />
        </button>

        <div className="hidden lg:block">
          <h2 className="text-lg font-display font-semibold">
            Welcome back, {firstName} <span aria-hidden>👋</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/dashboard/notifications" className="p-2 rounded-lg hover:bg-surface-alt text-ink" title="Notifications" aria-label="Notifications">
            <Bell size={18} />
          </Link>
          <Link
            to="/host"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-brand text-ink hover:brightness-105 transition"
          >
            <Store size={14} /> Switch to Host
          </Link>
          <Link
            to="/"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border hover:bg-surface-alt"
          >
            <ExternalLink size={14} /> View site
          </Link>
          <div className="hidden md:flex items-center gap-2 text-sm">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold">
                {initials}
              </div>
            )}
            <div className="leading-tight">
              <div className="font-medium">{user?.name || 'Traveller'}</div>
              <div className="text-xs text-ink-muted">{user?.email}</div>
            </div>
          </div>
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
  );
}
