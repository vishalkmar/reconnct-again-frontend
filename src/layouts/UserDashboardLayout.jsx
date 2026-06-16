import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import UserDashboardSidebar from '../components/user/UserDashboardSidebar.jsx';
import UserDashboardTopbar from '../components/user/UserDashboardTopbar.jsx';

export default function UserDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-alt flex">
      <UserDashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64">
        <UserDashboardTopbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
