import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/app/config/fonts.ts',
        'src/modules/auth/pages/LoginPage.tsx',
        'src/modules/bookings/pages/BookingsPage.tsx',
        'src/modules/bookings/types/booking.types.ts',
        'src/modules/doctors/pages/DoctorsPage.tsx',
        'src/modules/notifications/pages/NotificationsPage.tsx',
        'src/modules/patients/pages/PatientsPage.tsx',
        'src/shared/components/ConfirmDialog.tsx',
        'src/shared/components/EmptyState.tsx',
        'src/shared/components/ErrorBoundary.tsx',
        'src/shared/components/ErrorState.tsx',
        'src/shared/components/LoadingState.tsx',
        'src/shared/components/PageHeader.tsx',
        'src/shared/components/PlaceholderPage.tsx',
        'src/shared/constants/permissions.ts',
        'src/shared/providers/AuthProvider.tsx',
        'src/shared/utils/animations.ts',
        'src/shared/utils/role.utils.ts',
        'src/shared/utils/localeUtils.ts',
      ],
      exclude: ['src/test/**', 'src/**/*.d.ts'],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 30,
        statements: 70,
      },
    },
  },
});
