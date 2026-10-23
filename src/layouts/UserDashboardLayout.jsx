import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserDashboardSidebar from '../components/user/UserDashboardSidebar.jsx';
import UserDashboardTopbar from '../components/user/UserDashboardTopbar.jsx';
import MobileTopBar from '../components/pwa/MobileTopBar.jsx';
import useAppShell from '../hooks/useAppShell';

const TITLES = [
  [/^\/dashboard\/bookings/, 'My bookings'],
  [/^\/dashboard\/transactions/, 'Transactions'],
  [/^\/dashboard\/wishlist/, 'Wishlist'],
  [/^\/dashboard\/notifications/, 'Notifications'],
  [/^\/dashboard\/support/, 'Help & support'],
  [/^\/dashboard\/profile/, 'Edit profile'],
  [/^\/dashboard\/refer/, 'Refer & earn'],
  [/^\/dashboard/, 'Dashboard'],
];

const COLLAPSE_KEY = 'rc_member_sidebar_collapsed';

export default function UserDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop icon-rail mode, remembered per browser.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const toggleCollapse = () => setCollapsed((v) => {
    try { localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1'); } catch { /* ignore */ }
    return !v;
  });
  const { pathname } = useLocation();
  const appShell = useAppShell();
  // The support chat runs full-bleed (no topbar, tiny margin) like the admin one.
  const isChat = pathname.startsWith('/dashboard/support');

  // Phone / installed app: app bar + bottom tabs (the Profile tab is the menu).
  if (appShell) {
    const title = (TITLES.find(([re]) => re.test(pathname)) || [null, 'Dashboard'])[1];
    return (
      <div className="min-h-screen bg-[#FBFAF8]">
        <MobileTopBar title={title} />
        <main
          className={isChat ? 'px-2 pb-2 overflow-hidden' : 'px-4 pb-6'}
          style={{ paddingTop: `calc(${isChat ? '3.75rem' : '4.5rem'} + env(safe-area-inset-top))` }}
        >
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFAF8] flex">
      <UserDashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-200 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[272px]'}`}>
        {!isChat && <UserDashboardTopbar onMenuClick={() => setSidebarOpen(true)} />}
        <main className={isChat ? 'flex-1 p-2.5 overflow-hidden' : 'flex-1 p-4 md:p-7 2xl:p-8'}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
