import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react', async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    lazy: (factory) => {
      let Component = null;
      factory().then(mod => { Component = (mod.default || (() => null)); });
      return function LazyResolved(props) {
        const [ready, setReady] = actual.useState(false);
        actual.useEffect(() => {
          factory().then(mod => {
            Component = (mod.default || (() => null));
            setReady(true);
          });
        }, []);
        if (!ready) return null;
        return actual.createElement(Component, props);
      };
    },
  };
});

vi.mock('../../components/Navbar', () => ({
  default: () => <div data-testid="navbar">NavbarStub</div>,
}));

vi.mock('../../routes/ProtectedRoute', () => ({
  default: ({ children, role }: { children: React.ReactNode; role?: string }) => (
    <div data-testid="protected-route" data-expected-role={role || 'any'}>{children}</div>
  ),
}));

vi.mock('../../components/WithFeature', () => ({
  default: ({ children, featureKey }: { children: React.ReactNode; featureKey: string }) => (
    <div data-testid="feature-gate" data-feature={featureKey}>{children}</div>
  ),
}));

vi.mock('../../pages/HomePage', () => ({ default: () => <div data-testid="page-home">HomePage</div> }));
vi.mock('../../pages/LoginPage', () => ({ default: () => <div data-testid="page-login">LoginPage</div> }));
vi.mock('../../pages/RegisterPage', () => ({ default: () => <div data-testid="page-register">RegisterPage</div> }));
vi.mock('../../pages/BookingPage', () => ({ default: () => <div data-testid="page-booking">BookingPage</div> }));
vi.mock('../../pages/SpecialistsPage', () => ({ default: () => <div data-testid="page-specialists">SpecialistsPage</div> }));
vi.mock('../../pages/ConfirmPage', () => ({ default: () => <div data-testid="page-confirm">ConfirmPage</div> }));
vi.mock('../../pages/MyBookingsPage', () => ({ default: () => <div data-testid="page-my-bookings">MyBookingsPage</div> }));
vi.mock('../../pages/MyMedicalHistoryPage', () => ({ default: () => <div data-testid="page-my-medical-history">MyMedicalHistoryPage</div> }));
vi.mock('../../pages/MyMedicalHistoryDetailPage', () => ({ default: () => <div data-testid="page-my-medical-history-detail">MyMedicalHistoryDetailPage</div> }));
vi.mock('../../pages/MyLabResultsPage', () => ({ default: () => <div data-testid="page-my-lab-results">MyLabResultsPage</div> }));
vi.mock('../../pages/LabResultDetailPage', () => ({ default: () => <div data-testid="page-lab-result-detail">LabResultDetailPage</div> }));
vi.mock('../../pages/DoctorPanel', () => ({ default: () => <div data-testid="page-doctor-panel">DoctorPanel</div> }));
vi.mock('../../pages/DoctorAvailabilityPage', () => ({ default: () => <div data-testid="page-doctor-availability">DoctorAvailabilityPage</div> }));
vi.mock('../../pages/DoctorCalendarPage', () => ({ default: () => <div data-testid="page-doctor-calendar">DoctorCalendarPage</div> }));
vi.mock('../../pages/DoctorClinicalRecordsPage', () => ({ default: () => <div data-testid="page-doctor-clinical-records">DoctorClinicalRecordsPage</div> }));
vi.mock('../../pages/DoctorPatientHistoryPage', () => ({ default: () => <div data-testid="page-doctor-patient-history">DoctorPatientHistoryPage</div> }));
vi.mock('../../pages/DoctorLabResultsPage', () => ({ default: () => <div data-testid="page-doctor-lab-results">DoctorLabResultsPage</div> }));
vi.mock('../../pages/RegisterDoctorPage', () => ({ default: () => <div data-testid="page-register-doctor">RegisterDoctorPage</div> }));
vi.mock('../../pages/AnalyticsPage', () => ({ default: () => <div data-testid="page-analytics">AnalyticsPage</div> }));
vi.mock('../../pages/AdminSpecialtiesPage', () => ({ default: () => <div data-testid="page-admin-specialties">AdminSpecialtiesPage</div> }));
vi.mock('../../pages/AdminLabTestsPage', () => ({ default: () => <div data-testid="page-admin-lab-tests">AdminLabTestsPage</div> }));
vi.mock('../../pages/AdminDemoDataPage', () => ({ default: () => <div data-testid="page-admin-demo-data">AdminDemoDataPage</div> }));
vi.mock('../../pages/LabTechnicianDashboardPage', () => ({ default: () => <div data-testid="page-lab-dashboard">LabTechnicianDashboardPage</div> }));
vi.mock('../../pages/SuperAdminDashboardPage', () => ({ default: () => <div data-testid="page-super-admin-dashboard">SuperAdminDashboardPage</div> }));
vi.mock('../../pages/SuperAdminTenantsPage', () => ({ default: () => <div data-testid="page-super-admin-tenants">SuperAdminTenantsPage</div> }));
vi.mock('../../pages/SuperAdminTenantDetailPage', () => ({ default: () => <div data-testid="page-super-admin-tenant-detail">SuperAdminTenantDetailPage</div> }));
vi.mock('../../pages/SuperAdminDemoDataPage', () => ({ default: () => <div data-testid="page-super-admin-demo-data">SuperAdminDemoDataPage</div> }));
vi.mock('../../pages/NotFoundPage', () => ({ default: () => <div data-testid="page-not-found">NotFoundPage</div> }));

import AppRoutes from '../../routes/AppRoutes';

function renderRoutes(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe('AppRoutes', () => {
  describe('public routes render correct pages', () => {
    it('renders HomePage on /', async () => {
      renderRoutes(['/']);
      expect(await screen.findByTestId('page-home')).toBeInTheDocument();
    });

    it('renders LoginPage on /login', async () => {
      renderRoutes(['/login']);
      expect(await screen.findByTestId('page-login')).toBeInTheDocument();
    });

    it('renders RegisterPage on /register', async () => {
      renderRoutes(['/register']);
      expect(await screen.findByTestId('page-register')).toBeInTheDocument();
    });

    it('renders BookingPage on /booking', async () => {
      renderRoutes(['/booking']);
      expect(await screen.findByTestId('page-booking')).toBeInTheDocument();
    });

    it('renders SpecialistsPage on /specialists', async () => {
      renderRoutes(['/specialists']);
      expect(await screen.findByTestId('page-specialists')).toBeInTheDocument();
    });

    it('renders ConfirmPage on /confirm/:token', async () => {
      renderRoutes(['/confirm/some-token']);
      expect(await screen.findByTestId('page-confirm')).toBeInTheDocument();
    });
  });

  describe('protected routes are wrapped in ProtectedRoute', () => {
    it('/my-bookings has ProtectedRoute', async () => {
      renderRoutes(['/my-bookings']);
      const container = await screen.findByTestId('protected-route');
      expect(container).toBeInTheDocument();
    });

    it('/my-medical-history has ProtectedRoute', async () => {
      renderRoutes(['/my-medical-history']);
      expect(await screen.findByTestId('protected-route')).toBeInTheDocument();
    });

    it('/my-medical-history/:id has ProtectedRoute', async () => {
      renderRoutes(['/my-medical-history/123']);
      expect(await screen.findByTestId('protected-route')).toBeInTheDocument();
    });

    it('/my-lab-results has ProtectedRoute + WithFeature[laboratory]', async () => {
      renderRoutes(['/my-lab-results']);
      expect(await screen.findByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('feature-gate')).toHaveAttribute('data-feature', 'laboratory');
    });

    it('/my-lab-results/:id has ProtectedRoute + WithFeature[laboratory]', async () => {
      renderRoutes(['/my-lab-results/42']);
      expect(await screen.findByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('feature-gate')).toHaveAttribute('data-feature', 'laboratory');
    });

    it('/doctors has ProtectedRoute (no role)', async () => {
      renderRoutes(['/doctors']);
      expect(await screen.findByTestId('protected-route')).toHaveAttribute('data-expected-role', 'any');
    });
  });

  describe('doctor routes require doctor role', () => {
    const doctorPaths = [
      { path: '/doctor', testId: 'page-doctor-panel' },
      { path: '/doctor/availability', testId: 'page-doctor-availability' },
      { path: '/doctor/calendar', testId: 'page-doctor-calendar' },
      { path: '/doctor/clinical-records', testId: 'page-doctor-clinical-records' },
      { path: '/doctor/patient-history', testId: 'page-doctor-patient-history' },
    ];

    it.each(doctorPaths)('$path has ProtectedRoute[role=doctor] and renders $testId', async ({ path, testId }) => {
      renderRoutes([path]);
      const route = await screen.findByTestId('protected-route');
      expect(route).toHaveAttribute('data-expected-role', 'doctor');
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });

    it('/doctor/lab-results has ProtectedRoute[role=doctor] + WithFeature[laboratory]', async () => {
      renderRoutes(['/doctor/lab-results']);
      expect(await screen.findByTestId('protected-route')).toHaveAttribute('data-expected-role', 'doctor');
      expect(screen.getByTestId('feature-gate')).toHaveAttribute('data-feature', 'laboratory');
    });

    it('/doctor/lab-results/:id has ProtectedRoute[role=doctor] + WithFeature[laboratory]', async () => {
      renderRoutes(['/doctor/lab-results/99']);
      expect(await screen.findByTestId('protected-route')).toHaveAttribute('data-expected-role', 'doctor');
      expect(screen.getByTestId('feature-gate')).toHaveAttribute('data-feature', 'laboratory');
    });
  });

  describe('admin routes require admin role', () => {
    const adminPaths = [
      { path: '/admin/register-doctor', testId: 'page-register-doctor' },
      { path: '/admin/analytics', testId: 'page-analytics' },
      { path: '/admin/specialties', testId: 'page-admin-specialties' },
      { path: '/admin/demo-data', testId: 'page-admin-demo-data' },
    ];

    it.each(adminPaths)('$path has ProtectedRoute[role=admin] and renders $testId', async ({ path, testId }) => {
      renderRoutes([path]);
      const route = await screen.findByTestId('protected-route');
      expect(route).toHaveAttribute('data-expected-role', 'admin');
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });

    it('/admin/lab-tests has ProtectedRoute[role=admin] + WithFeature[laboratory]', async () => {
      renderRoutes(['/admin/lab-tests']);
      expect(await screen.findByTestId('protected-route')).toHaveAttribute('data-expected-role', 'admin');
      expect(screen.getByTestId('feature-gate')).toHaveAttribute('data-feature', 'laboratory');
    });
  });

  describe('lab_technician routes require lab_technician role', () => {
    it('/lab has ProtectedRoute[role=lab_technician] + WithFeature[laboratory]', async () => {
      renderRoutes(['/lab']);
      expect(await screen.findByTestId('protected-route')).toHaveAttribute('data-expected-role', 'lab_technician');
      expect(screen.getByTestId('feature-gate')).toHaveAttribute('data-feature', 'laboratory');
    });

    it('/lab/requests/:id has ProtectedRoute[role=lab_technician] + WithFeature[laboratory]', async () => {
      renderRoutes(['/lab/requests/5']);
      expect(await screen.findByTestId('protected-route')).toHaveAttribute('data-expected-role', 'lab_technician');
      expect(screen.getByTestId('feature-gate')).toHaveAttribute('data-feature', 'laboratory');
    });
  });

  describe('superadmin routes require superadmin role', () => {
    const superAdminPaths = [
      { path: '/super-admin', testId: 'page-super-admin-dashboard' },
      { path: '/super-admin/tenants', testId: 'page-super-admin-tenants' },
      { path: '/super-admin/demo-data', testId: 'page-super-admin-demo-data' },
    ];

    it.each(superAdminPaths)('$path has ProtectedRoute[role=superadmin] and renders $testId', async ({ path, testId }) => {
      renderRoutes([path]);
      const route = await screen.findByTestId('protected-route');
      expect(route).toHaveAttribute('data-expected-role', 'superadmin');
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });

    it('/super-admin/tenants/:id has ProtectedRoute[role=superadmin]', async () => {
      renderRoutes(['/super-admin/tenants/7']);
      expect(await screen.findByTestId('protected-route')).toHaveAttribute('data-expected-role', 'superadmin');
    });
  });

  describe('404 catch-all', () => {
    it('renders NotFoundPage on unknown route', async () => {
      renderRoutes(['/some/unknown/path']);
      expect(await screen.findByTestId('page-not-found')).toBeInTheDocument();
    });

    it('renders Navbar on unknown route', async () => {
      renderRoutes(['/nonexistent']);
      expect(await screen.findByTestId('navbar')).toBeInTheDocument();
    });
  });

  describe('Navbar renders for all routes', () => {
    const paths = ['/', '/login', '/register', '/booking', '/specialists', '/confirm/token'];

    it.each(paths)('renders Navbar on %s', async (path) => {
      renderRoutes([path]);
      expect(await screen.findByTestId('navbar')).toBeInTheDocument();
    });
  });

  describe('AppRoutes is a valid component', () => {
    it('exports a function component', () => {
      expect(typeof AppRoutes).toBe('function');
    });
  });
});
