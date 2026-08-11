import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import ClinicalPage from '@/modules/clinical/pages/ClinicalPage';

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
        tabClinical: 'Área Clínica',
        tabBookings: 'Citas',
        tabClinicalRecords: 'Historial Clínico',
        tabPrescriptions: 'Recetas',
        tabMedicalHistory: 'Historial Médico',
        tabPatients: 'Pacientes',
        tabAvailability: 'Disponibilidad',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/modules/bookings/pages/BookingsPage', () => ({
  default: () => <div data-testid="page-bookings">Bookings</div>,
}));

vi.mock('@/modules/clinical-records/pages/ClinicalRecordsPage', () => ({
  default: () => <div data-testid="page-records">Records</div>,
}));

vi.mock('@/modules/prescriptions/pages/PrescriptionsPage', () => ({
  default: () => <div data-testid="page-prescriptions">Prescriptions</div>,
}));

vi.mock('@/modules/medical-history/pages/MedicalHistoryPage', () => ({
  default: () => <div data-testid="page-medical-history">Medical history</div>,
}));

vi.mock('@/modules/patients/pages/PatientsPage', () => ({
  default: () => <div data-testid="page-patients">Patients</div>,
}));

vi.mock('@/modules/availability/pages/AvailabilityPage', () => ({
  default: () => <div data-testid="page-availability">Availability</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <ClinicalPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('ClinicalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = 'admin';
  });

  it('shows the base 4 tabs for non-doctor roles', () => {
    renderPage();
    expect(screen.getByText('Área Clínica')).toBeInTheDocument();
    expect(screen.getByText('Citas')).toBeInTheDocument();
    expect(screen.getByText('Historial Clínico')).toBeInTheDocument();
    expect(screen.getByText('Recetas')).toBeInTheDocument();
    expect(screen.getByText('Historial Médico')).toBeInTheDocument();
    expect(screen.queryByText('Pacientes')).not.toBeInTheDocument();
    expect(screen.queryByText('Disponibilidad')).not.toBeInTheDocument();
  });

  it('shows 6 tabs for doctors including patients and availability', () => {
    mockUser.role = 'doctor';
    renderPage();
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    expect(screen.getByText('Disponibilidad')).toBeInTheDocument();
  });

  it('renders the bookings page content by default', () => {
    renderPage();
    expect(screen.getByTestId('page-bookings')).toBeInTheDocument();
  });

  it('switches tab content when clicking another tab', () => {
    renderPage();
    fireEvent.click(screen.getByText('Historial Clínico'));
    expect(screen.getByTestId('page-records')).toBeInTheDocument();
    expect(screen.queryByTestId('page-bookings')).not.toBeInTheDocument();
  });
});
