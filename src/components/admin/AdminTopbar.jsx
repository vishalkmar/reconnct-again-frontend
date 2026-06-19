import { useEffect, useRef, useState } from 'react';
import { Menu, LogOut, ExternalLink, ChevronDown, Building2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

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
