import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar.jsx';
import AdminTopbar from '../components/admin/AdminTopbar.jsx';
import { AdminViewProvider } from '../context/AdminViewContext.jsx';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // The chat console runs full-bleed (no topbar, tiny margin) like desktop WhatsApp.
  const isChat = useLocation().pathname.startsWith('/admin/chat-support');

  return (
    <AdminViewProvider>
      <div className="min-h-screen bg-surface-alt flex">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col lg:ml-64">
          {!isChat && <AdminTopbar onMenuClick={() => setSidebarOpen(true)} />}
          <main className={isChat ? 'flex-1 p-2.5 overflow-hidden' : 'flex-1 p-4 md:p-8'}>
            <Outlet />
          </main>
        </div>
      </div>
    </AdminViewProvider>
  );
}
