import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Sparkles, LogOut, Menu, X, ShieldCheck, ClipboardCheck, Users, HeartHandshake,
} from 'lucide-react';
import { useTeamAuth } from '../context/TeamAuthContext.jsx';

const ROLE_LABEL = {
  bd: 'Business Developer',
  cops: 'Center Operations',
  account_manager: 'Account Manager',
  csm: 'Customer Success Manager',
  qcops: 'Quality Check Operations',
  marketing_manager: 'Marketing Manager',
};

export default function TeamLayout() {
  const { member, logout } = useTeamAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const perms = member?.permissions || {};

  const navItems = [
    { to: '/team/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/team/suppliers', label: 'My Suppliers', icon: Truck, show: !!perms.canCreateSupplier },
    { to: '/team/experiences', label: 'My Experiences', icon: Sparkles, show: !!perms.canAddExperience },
    { to: '/team/review-queue', label: 'Review Queue', icon: ClipboardCheck, show: !!perms.canReviewListings },
    { to: '/team/my-suppliers', label: 'Assigned Suppliers', icon: Users, show: !!perms.canManageAccounts },
    { to: '/team/my-customers', label: 'My Customers', icon: HeartHandshake, show: !!perms.canManageCustomers },
  ].filter((i) => i.show);

  const doLogout = () => { logout(); navigate('/team/login'); };

  const Sidebar = (
    <div className="h-full flex flex-col bg-slate-900 text-white w-64">
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-brand/20 text-brand flex items-center justify-center"><ShieldCheck size={20} /></div>
        <div>
          <div className="font-display font-bold leading-tight">Team Portal</div>
          <div className="text-[11px] text-white/50">reconnct</div>
        </div>
        <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-white/60"><X size={20} /></button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive ? 'bg-brand text-ink font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}>
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 pt-3 border-t border-white/10">
        <div className="px-3.5 py-3 rounded-xl bg-white/5 mb-2">
          <div className="text-sm font-semibold truncate">{member?.name}</div>
          <div className="text-[11px] text-white/50 truncate">{ROLE_LABEL[member?.roleType] || member?.roleType}</div>
          <div className="text-[10px] font-mono text-brand mt-0.5">{member?.employeeCode}</div>
        </div>
        <button onClick={doLogout} className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-alt flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">{Sidebar}</div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">{Sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:ml-64">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => setOpen(true)} className="text-ink-muted"><Menu size={22} /></button>
          <span className="font-display font-bold">Team Portal</span>
        </div>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
