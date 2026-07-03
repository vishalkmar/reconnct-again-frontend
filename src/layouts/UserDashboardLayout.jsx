import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserDashboardSidebar from '../components/user/UserDashboardSidebar.jsx';
import UserDashboardTopbar from '../components/user/UserDashboardTopbar.jsx';

export default function UserDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // The support chat runs full-bleed (no topbar, tiny margin) like the admin one.
  const isChat = useLocation().pathname.startsWith('/dashboard/support');

  return (
    <div className="min-h-screen bg-surface-alt flex">
      <UserDashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64">
        {!isChat && <UserDashboardTopbar onMenuClick={() => setSidebarOpen(true)} />}
        <main className={isChat ? 'flex-1 p-2.5 overflow-hidden' : 'flex-1 p-4 md:p-8'}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
