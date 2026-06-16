import { Menu, LogOut, ExternalLink } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminTopbar({ onMenuClick }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

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
          <Link
            to="/"
            target="_blank"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border hover:bg-surface-alt"
          >
            <ExternalLink size={14} /> View site
          </Link>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold">
              {admin?.name?.charAt(0) || 'A'}
            </div>
            <div className="leading-tight">
              <div className="font-medium">{admin?.name || 'Admin'}</div>
              <div className="text-xs text-ink-muted">{admin?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-wellness/10 text-wellness hover:bg-wellness hover:text-white text-sm font-semibold transition"
            title="Logout"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
