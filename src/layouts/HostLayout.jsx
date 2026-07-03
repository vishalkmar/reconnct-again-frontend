import { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, ExternalLink, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import HostSidebar from '../components/host/HostSidebar.jsx';
import { useUserAuth } from '../context/UserAuthContext.jsx';

export default function HostLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useUserAuth();
  const navigate = useNavigate();
  // The listing wizard runs edge-to-edge; everything else gets normal padding.
  const isWizard = /\/host\/listings\/(new|[^/]+\/edit)/.test(useLocation().pathname);

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/', { replace: true });
  };

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
        <main className={isWizard ? 'flex-1 p-0' : 'flex-1 p-4 md:p-8'}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
