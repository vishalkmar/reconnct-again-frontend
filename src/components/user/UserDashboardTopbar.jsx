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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[#F1ECE3]">
      <div className="flex items-center justify-between gap-3 px-4 md:px-8 h-[76px] lg:h-[88px]">
        <button onClick={onMenuClick} className="lg:hidden grid place-items-center w-10 h-10 rounded-full bg-[#F4F2EE] text-rc-navy" aria-label="Open menu">
          <Menu size={20} />
        </button>

        <div className="hidden lg:block min-w-0">
          <h2 className="font-sans text-[22px] font-extrabold text-rc-navy truncate">
            Welcome back, {firstName}! <span aria-hidden>👋</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/dashboard/notifications" className="relative grid place-items-center w-11 h-11 rounded-full text-rc-navy hover:bg-[#FFF6DD] transition" title="Notifications" aria-label="Notifications">
            <Bell size={22} strokeWidth={1.9} />
          </Link>
          <Link
            to="/host"
            className="hidden sm:inline-flex items-center gap-2 h-11 px-4 rounded-full text-sm font-bold bg-rc-brand text-rc-navy hover:brightness-105 shadow-[0_8px_18px_-10px_rgba(255,185,0,0.9)] transition"
          >
            <Store size={16} /> Switch to Host
          </Link>
          <Link
            to="/"
            className="hidden md:inline-flex items-center gap-2 h-11 px-4 rounded-full text-sm font-semibold bg-[#FFF6DD] text-rc-navy hover:bg-[#FFEDB8] transition"
          >
            <ExternalLink size={15} /> View site
          </Link>
          <div className="hidden md:flex items-center gap-3 pl-2 lg:pl-4 lg:ml-1 lg:border-l lg:border-[#F1ECE3]">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-[#FFE7A8]" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-rc-brand text-white flex items-center justify-center text-lg font-bold ring-4 ring-[#FFF1CC]">
                {initials}
              </div>
            )}
            <div className="leading-tight max-w-[180px]">
              <div className="font-bold text-rc-navy truncate">{user?.name || 'Traveller'}</div>
              <div className="text-xs text-rc-ink-muted truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 h-11 px-3 sm:px-4 rounded-full bg-[#FFEDEC] text-[#D93025] hover:bg-[#D93025] hover:text-white text-sm font-bold transition"
            title="Sign out"
          >
            <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
