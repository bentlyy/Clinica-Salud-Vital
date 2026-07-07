import React, { Suspense, ReactNode } from 'react';
import Navbar from '../components/Navbar';

const AppLayout = React.memo(function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="app-layout-fallback">Cargando...</div>}>
        {children}
      </Suspense>
    </>
  );
});

export default AppLayout;
