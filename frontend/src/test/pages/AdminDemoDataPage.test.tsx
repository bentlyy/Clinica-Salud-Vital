import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import AdminDemoDataPage from '@/modules/admin/pages/AdminDemoDataPage';

const apiClient = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'demo_data:title': 'Datos de Demostración',
        'demo_data:description': 'Información de ejemplo precargada en el sistema.',
        'demo_data:tab_bookings': 'Reservas',
        'demo_data:tab_clinical': 'Historial Clínico',
        'demo_data:tab_lab': 'Exámenes',
        'demo_data:patient': 'Paciente',
        'demo_data:doctor': 'Doctor',
        'demo_data:specialty': 'Especialidad',
        'demo_data:date': 'Fecha',
        'demo_data:time': 'Hora',
        'demo_data:status': 'Estado',
        'demo_data:diagnosis': 'Diagnóstico',
        'demo_data:request_number': 'N° Solicitud',
        'demo_data:priority': 'Prioridad',
        'demo_data:no_bookings': 'No hay reservas.',
        'demo_data:no_records': 'No hay historial clínico.',
        'demo_data:no_lab': 'No hay exámenes.',
      };
      return translations[key] ?? fallback ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

const bookingsResponse = {
  data: {
    items: [
      { id: 1, date: '2026-08-10', time: '10:30', status: 'confirmed', doctor_name: 'Dr. Perez', specialty: 'Cardiología', patient_name: 'Maria Garcia', patient_rut: '11.111.111-1' },
    ],
  },
};

const recordsResponse = {
  data: {
    items: [
      { id: 1, doctor_name: 'Dr. Perez', patient_name: 'Ana Torres', patient_rut: '22.222.222-2', diagnosis: 'Migraña', created_at: '2026-08-01T10:00:00Z', status: 'completed' },
    ],
  },
};

const labResponse = {
  data: {
    items: [
      { id: 1, request_number: 'LAB-001', doctor_name: 'Dr. Perez', patient_name: 'Luis Soto', status: 'pending', priority: 'normal', created_at: '2026-08-02T10:00:00Z' },
    ],
  },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <AdminDemoDataPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('AdminDemoDataPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading indicator while fetching the demo data', () => {
    apiClient.get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('renders the bookings table with data', async () => {
    apiClient.get
      .mockResolvedValueOnce(bookingsResponse)
      .mockResolvedValueOnce(recordsResponse)
      .mockResolvedValueOnce(labResponse);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    });
    expect(screen.getByText('Dr. Perez')).toBeInTheDocument();
    expect(screen.getByText('Cardiología')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('switches to the clinical records tab', async () => {
    apiClient.get
      .mockResolvedValueOnce(bookingsResponse)
      .mockResolvedValueOnce(recordsResponse)
      .mockResolvedValueOnce(labResponse);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    });

    const clinicalTab = screen.getByText(/Historial Clínico/);
    clinicalTab.click();
    await waitFor(() => {
      expect(screen.getByText('Ana Torres')).toBeInTheDocument();
    });
    expect(screen.getByText('Migraña')).toBeInTheDocument();
  });

  it('switches to the lab tab', async () => {
    apiClient.get
      .mockResolvedValueOnce(bookingsResponse)
      .mockResolvedValueOnce(recordsResponse)
      .mockResolvedValueOnce(labResponse);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    });

    const labTab = screen.getByText(/Exámenes/);
    labTab.click();
    await waitFor(() => {
      expect(screen.getByText('LAB-001')).toBeInTheDocument();
    });
    expect(screen.getByText('normal')).toBeInTheDocument();
  });

  it('shows the empty state when there is no data', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { items: [] } })
      .mockResolvedValueOnce({ data: { items: [] } })
      .mockResolvedValueOnce({ data: { items: [] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No hay reservas.')).toBeInTheDocument();
    });
  });
});
