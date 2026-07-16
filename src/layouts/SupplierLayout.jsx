import { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate, NavLink } from 'react-router-dom';
import {
  Menu, LogOut, X, LayoutDashboard, ListChecks, Wallet, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSupplierAuth } from '../context/SupplierAuthContext.jsx';

const NAV = [
  { to: '/supplier/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/supplier/listings', label: 'My Listings', icon: ListChecks },
  { to: '/supplier/transactions', label: 'Transactions', icon: Wallet },
];

function SupplierSidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-5 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/15 text-brand-dark flex items-center justify-center"><Building2 size={17} /></div>
            <span className="font-display font-bold">Supplier Portal</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-ink-muted"><X size={20} /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive ? 'bg-brand text-ink font-semibold' : 'text-ink-muted hover:bg-surface-alt hover:text-ink'
              }`}>
              <item.icon size={18} />
              {item.label}
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
