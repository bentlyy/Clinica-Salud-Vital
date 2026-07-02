import { Suspense, ReactNode } from 'react';
import Navbar from '../components/Navbar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>}>
        {children}
      </Suspense>
    </>
  );
}
