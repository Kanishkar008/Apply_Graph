import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { useHealthCheck } from '../hooks/useHealthCheck';

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const health = useHealthCheck(30000);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content container (offset for desktop sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Sticky top navigation bar */}
        <TopNav
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          health={health}
        />

        {/* Page body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ health }} />
        </main>
      </div>
    </div>
  );
};
