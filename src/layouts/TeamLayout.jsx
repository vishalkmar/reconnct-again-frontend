import BrandMark from '../components/landing/BrandMark.jsx';
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Sparkles, LogOut, Menu, X, ClipboardCheck, Users, HeartHandshake, MapPinned, BadgeCheck, ListChecks,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { useTeamAuth } from '../context/TeamAuthContext.jsx';
import { hasDashboard } from '../components/team/teamNav.js';
import { ReviewNotifyProvider } from '../context/ReviewNotifyContext.jsx';
import ReviewBell from '../components/team/ReviewBell.jsx';

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
  // Desktop icon-rail mode, remembered per browser.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('rc_team_sidebar_collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapse = () => setCollapsed((v) => {
    try { localStorage.setItem('rc_team_sidebar_collapsed', v ? '0' : '1'); } catch { /* ignore */ }
    return !v;
  });
  const perms = member?.permissions || {};

  const isCops = member?.roleType === 'cops';
  const isQcops = member?.roleType === 'qcops';
  const isCm = member?.roleType === 'category_manager';
  // Center Ops and QCOPS work a single queue each — no dashboard, and none of
  // the Account Manager surfaces even if the permission happens to be set on
  // their account. Their sidebar is exactly their two working screens.
  const navItems = [
    { to: '/team/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: hasDashboard(member) && !isCm },
    { to: '/team/suppliers', label: 'My Suppliers', icon: Truck, show: !!perms.canCreateSupplier },
    { to: '/team/experiences', label: 'My Experiences', icon: Sparkles, show: !!perms.canAddExperience },
    { to: '/team/review-queue', label: 'Review Queue', icon: ClipboardCheck, show: !!perms.canReviewListings && !isQcops },
    { to: '/team/qc-visits', label: 'My QC Visits', icon: MapPinned, show: isQcops },
    { to: '/team/qc-listings', label: 'Listing Management', icon: BadgeCheck, show: isQcops },
    { to: '/team/qc-management', label: 'QCOPS Management', icon: BadgeCheck, show: !!perms.canReviewListings && !isQcops },
    { to: '/team/my-suppliers', label: 'Assigned Suppliers', icon: Users, show: !!perms.canManageAccounts && !isCops && !isQcops },
    { to: '/team/am-listings', label: 'Listings', icon: ListChecks, show: !!perms.canManageAccounts && !isCops && !isQcops },
    { to: '/team/my-customers', label: 'My Customers', icon: HeartHandshake, show: !!perms.canManageCustomers },
    { to: '/team/category', label: 'Category Overview', icon: LayoutDashboard, show: isCm },
    { to: '/team/category/suppliers', label: 'Suppliers', icon: Truck, show: isCm },
    { to: '/team/category/status', label: 'Experience Status', icon: ClipboardCheck, show: isCm },
    { to: '/team/category/reviews', label: 'Ratings & Reviews', icon: Sparkles, show: isCm },
    { to: '/team/category/revenue', label: 'Revenue', icon: BadgeCheck, show: isCm },
    { to: '/team/category/onboardings', label: 'Live Onboardings', icon: ListChecks, show: isCm },
    { to: '/team/category/churn', label: 'Churn', icon: Users, show: isCm },
    { to: '/team/category/delisted', label: 'Delisted', icon: MapPinned, show: isCm },
    { to: '/team/category/winback', label: 'Win-Back', icon: HeartHandshake, show: isCm },
  ].filter((i) => i.show);

  const doLogout = () => { logout(); navigate('/team/login'); };
  const firstName = (member?.name || '').split(/\s+/)[0] || 'there';
  const roleLabel = ROLE_LABEL[member?.roleType] || member?.roleType;

  const Sidebar = (
    <div className={`h-full flex flex-col bg-white border-r border-[#F1ECE3] w-[272px] ${collapsed ? 'lg:w-[88px]' : ''} transition-all duration-200`}>
      <div className={`flex items-center justify-between h-[88px] shrink-0 ${collapsed ? 'lg:justify-center lg:px-0 px-6' : 'px-6'}`}>
        <div className={`flex flex-col items-start gap-1 ${collapsed ? 'lg:hidden' : ''}`}>
          <BrandMark by className="w-[136px]" />
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-rc-navy/60">Team Portal</span>
        </div>
        <button
          type="button"
          onClick={toggleCollapse}
          className="hidden lg:grid place-items-center w-9 h-9 rounded-full bg-[#F4F2EE] text-rc-navy/70 hover:bg-[#FFF1CC] hover:text-rc-navy transition"
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
        <button onClick={() => setOpen(false)} className="lg:hidden grid place-items-center w-9 h-9 rounded-full bg-[#F4F2EE] text-rc-navy/70" aria-label="Close menu"><X size={18} /></button>
      </div>

      <nav className={`flex-1 overflow-y-auto pb-4 space-y-1.5 ${collapsed ? 'lg:px-3 px-5' : 'px-5'}`}>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} title={collapsed ? item.label : undefined}
            className={({ isActive }) => `flex items-center gap-3.5 h-12 rounded-2xl text-[15px] font-medium transition ${
              collapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'
            } ${
              isActive
                ? 'bg-[#FFD666] text-rc-navy font-semibold shadow-[0_8px_20px_-12px_rgba(255,185,0,0.9)]'
                : 'text-rc-navy/80 hover:bg-[#FFF6DD] hover:text-rc-navy'
            }`}>
            <item.icon size={21} strokeWidth={1.8} className="shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={`shrink-0 pb-5 pt-4 border-t border-[#F1ECE3] ${collapsed ? 'lg:px-3 px-5' : 'px-5'}`}>
        <div className={`flex items-center gap-3 px-3 py-3 rounded-2xl bg-[#FBF8F2] border border-[#F1ECE3] mb-2.5 ${collapsed ? 'lg:hidden' : ''}`}>
          <span className="grid place-items-center w-10 h-10 rounded-full bg-rc-brand text-white font-bold shrink-0">{(member?.name || '?').charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-rc-navy truncate">{member?.name}</div>
            <div className="text-[11px] text-rc-ink-muted truncate">{roleLabel}</div>
            <div className="text-[10px] font-mono font-semibold text-[#B07800] mt-0.5">{member?.employeeCode}</div>
          </div>
        </div>
        <button onClick={doLogout} title={collapsed ? 'Sign out' : undefined}
          className={`w-full flex items-center gap-2.5 h-12 rounded-2xl text-[15px] font-semibold bg-rc-navy text-white hover:bg-[#25253F] shadow-[0_10px_22px_-14px_rgba(26,26,46,0.9)] transition ${collapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4'}`}>
          <LogOut size={18} className="text-rc-brand shrink-0" /> <span className={collapsed ? 'lg:hidden' : ''}>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <ReviewNotifyProvider>
      {/* .rc-host = the shared portal skin (cards / inputs / buttons) in index.css */}
      <div className="rc-host min-h-screen bg-[#FBFAF8] flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block fixed inset-y-0 left-0 z-30">{Sidebar}</div>

        {/* Mobile sidebar overlay */}
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0">{Sidebar}</div>
          </div>
        )}

        <div className={`flex-1 min-w-0 flex flex-col transition-all duration-200 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[272px]'}`}>
          {/* Top bar with the review bell */}
          <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#F1ECE3]">
            <div className="flex items-center gap-3 px-4 md:px-8 h-[76px] lg:h-[88px]">
              <button onClick={() => setOpen(true)} className="lg:hidden grid place-items-center w-10 h-10 rounded-full bg-[#F4F2EE] text-rc-navy" aria-label="Open menu"><Menu size={20} /></button>
              <span className="lg:hidden"><BrandMark by className="w-28" bySize="text-[10px]" /></span>
              <div className="hidden lg:flex items-center gap-3 min-w-0">
                {roleLabel && <span className="inline-flex items-center h-8 px-3.5 rounded-full bg-[#FFF1CC] text-[#B07800] text-[12px] font-bold tracking-[0.08em] uppercase whitespace-nowrap">{roleLabel}</span>}
                <h2 className="font-sans text-[22px] font-extrabold text-rc-navy truncate">Welcome, {firstName}</h2>
              </div>
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <span className="grid place-items-center w-11 h-11 rounded-full hover:bg-[#FFF6DD] transition"><ReviewBell /></span>
                <button onClick={doLogout} className="hidden sm:inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-[#FFEDEC] text-[#D93025] hover:bg-[#D93025] hover:text-white text-sm font-bold transition" title="Sign out">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-7 2xl:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ReviewNotifyProvider>
  );
}
