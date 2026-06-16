import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LayoutDashboard, BookOpen, Wallet, Heart, Gift, LogOut, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';

export default function UserMenu({ darkOnTransparent = false }) {
  const { user, requestLogin, logout, isAuthenticated } = useUserAuth();
  const { count: wishlistCount } = useWishlist();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => requestLogin()}
        className={`inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full border transition ${
          darkOnTransparent
            ? 'border-white/70 text-white hover:bg-white/10'
            : 'border-brand text-brand hover:bg-brand hover:text-white'
        }`}
      >
        <User size={16} />
        Login
      </button>
    );
  }

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    logout();
    setOpen(false);
    toast.success('Signed out');
    navigate('/');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 transition border ${
          darkOnTransparent
            ? 'border-white/50 hover:bg-white/10 text-white'
            : 'border-gray-200 hover:border-brand/40 hover:bg-brand/5 text-ink'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <span className={`w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-semibold`}>
            {initials}
          </span>
        )}
        <span className="hidden sm:inline text-sm font-medium max-w-[8rem] truncate">
          {user?.name || user?.email}
        </span>
        <ChevronDown size={14} className="opacity-70" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-xl py-1.5 z-50 text-ink"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-sm font-semibold truncate">{user?.name || 'Traveller'}</div>
            <div className="text-xs text-gray-500 truncate">{user?.email}</div>
          </div>
          <MenuItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setOpen(false)} />
          <MenuItem to="/dashboard/profile" icon={User} label="My Profile" onClick={() => setOpen(false)} />
          <MenuItem to="/dashboard/bookings" icon={BookOpen} label="My Bookings" onClick={() => setOpen(false)} />
          <MenuItem to="/dashboard/transactions" icon={Wallet} label="Transactions" onClick={() => setOpen(false)} />
          <MenuItem
            to="/dashboard/wishlist"
            icon={Heart}
            label="Wishlist"
            badge={wishlistCount > 0 ? wishlistCount : null}
            onClick={() => setOpen(false)}
          />
          <MenuItem to="/dashboard/refer" icon={Gift} label="Refer & Earn" onClick={() => setOpen(false)} />
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ to, icon: Icon, label, onClick, badge }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-brand/5 hover:text-brand transition"
      role="menuitem"
    >
      <Icon size={16} className="opacity-70" />
      <span className="flex-1">{label}</span>
      {badge != null && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold">
          {badge}
        </span>
      )}
    </Link>
  );
}
