import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import ManagementPage from '@/modules/management/pages/ManagementPage';

// --- Hoisted values ---

const mockUser = vi.hoisted(() => ({
  id: 1,
  email: 'admin@clinic.com',
  role: 'admin',
  name: 'Admin User',
  tenant_id: 1,
}));

// --- Mocks ---

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        tabManagement: 'Gestión',
        tabAnalytics: 'Analíticas',
        tabReports: 'Reportes',
        tabAudit: 'Auditoría',
        tabBilling: 'Facturación',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/modules/analytics/pages/AdminAnalyticsPage', () => ({
  default: () => <div data-testid="page-analytics">Analytics</div>,
}));

vi.mock('@/modules/reports/pages/ReportsPage', () => ({
  default: () => <div data-testid="page-reports">Reports</div>,
}));

vi.mock('@/modules/audit/pages/AuditPage', () => ({
  default: () => <div data-testid="page-audit">Audit</div>,
}));

vi.mock('@/modules/billing/pages/BillingPage', () => ({
  default: () => <div data-testid="page-billing">Billing</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <ManagementPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('ManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = 'admin';
  });

  it('shows 4 tabs for admin users', () => {
    renderPage();
    expect(screen.getByText('Gestión')).toBeInTheDocument();
    expect(screen.getByText('Analíticas')).toBeInTheDocument();
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.getByText('Auditoría')).toBeInTheDocument();
    expect(screen.getByText('Facturación')).toBeInTheDocument();
  });

  it('shows only 2 tabs for doctors', () => {
    mockUser.role = 'doctor';
    renderPage();
    expect(screen.getByText('Analíticas')).toBeInTheDocument();
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.queryByText('Auditoría')).not.toBeInTheDocument();
    expect(screen.queryByText('Facturación')).not.toBeInTheDocument();
  });

  it('renders the analytics page content by default', () => {
    renderPage();
    expect(screen.getByTestId('page-analytics')).toBeInTheDocument();
  });

  it('switches tab content when clicking another tab', () => {
    renderPage();
    fireEvent.click(screen.getByText('Reportes'));
    expect(screen.getByTestId('page-reports')).toBeInTheDocument();
    expect(screen.queryByTestId('page-analytics')).not.toBeInTheDocument();
  });
});
