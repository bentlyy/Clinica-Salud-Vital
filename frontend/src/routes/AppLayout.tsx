import React, { Suspense, ReactNode, useState, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const AppLayout = React.memo(function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAuthed = !!user;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  if (!isAuthed) {
    return (
      <>
        <Navbar />
        <Suspense fallback={<div className="app-layout-fallback">Cargando...</div>}>
          {children}
        </Suspense>
      </>
    );
  }

  return (
    <div className={`ds-layout${sidebarCollapsed ? ' ds-sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="ds-layout-main">
        <Topbar />
        <main className="ds-main-content">
          <Suspense fallback={<div className="app-layout-fallback">Cargando...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
});

export default AppLayout;
