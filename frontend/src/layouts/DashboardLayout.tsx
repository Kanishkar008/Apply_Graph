import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { ToastContainer } from '../components/ui/Toast';
import { useHealthCheck } from '../hooks/useHealthCheck';

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const health = useHealthCheck(30000);

  return (
    <ToastContainer>
      <div className="min-h-screen bg-[#0d1117] text-slate-100 flex selection:bg-brand-500/30 selection:text-white">
        {/* Sidebar navigation */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        />

        {/* Main content container with dynamic offset based on sidebar collapse */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
            isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
          }`}
        >
          {/* Top navigation bar */}
          <TopNav
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            health={health}
          />

          {/* Page body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
            <Outlet context={{ health }} />
          </main>
        </div>
      </div>
    </ToastContainer>
  );
};
