import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/shared/providers/AuthProvider';
import { FeatureProvider } from '@/shared/providers/FeatureProvider';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { AppRouter } from '@/app/router/AppRouter';
import '@/app/config/global.css';
import '@/i18n/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppThemeProvider>
          <AuthProvider>
            <FeatureProvider>
              <ErrorBoundary>
                <AppRouter />
              </ErrorBoundary>
            </FeatureProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  borderRadius: '10px',
                  padding: '12px 16px',
                },
              }}
            />
          </AuthProvider>
        </AppThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
