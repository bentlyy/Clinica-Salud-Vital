import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import PatientLabResultsPage from '@/modules/laboratory/pages/PatientLabResultsPage';

const api = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key),
    i18n: { changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
vi.mock('@/shared/services/api-client', () => ({ apiClient: { get: api.get } }));

const requests = [
  {
    id: 1,
    status: 'completed',
    created_at: '2026-08-10T10:00:00.000Z',
    doctor_name: 'Dr. Perez',
    items: [
      { id: 1, test_name: 'Hemograma', result_value: '14.2', test_id: 1 },
      { id: 2, test_name: 'Glucosa', result_value: '95', test_id: 2 },
    ],
  },
  {
    id: 2,
    status: 'pending',
    created_at: '2026-08-11T10:00:00.000Z',
    doctor_name: 'Dra. Gomez',
    items: [{ id: 3, test_name: 'TSH', result_value: undefined, test_id: 3 }],
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <PatientLabResultsPage />
        </AppThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('PatientLabResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state while fetching', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Cargando resultados...')).toBeInTheDocument();
  });

  it('renders the error state when the request fails', async () => {
    api.get.mockRejectedValue(new Error('fail'));
    renderPage();
    expect(await screen.findByText('fail')).toBeInTheDocument();
  });

  it('renders the empty state when there are no results', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText('Aún no tienes resultados de laboratorio disponibles.')).toBeInTheDocument();
  });

  it('renders stats, request cards and status labels', async () => {
    api.get.mockResolvedValue({ data: requests });
    renderPage();
    // Stats
    expect(await screen.findByText('Total Solicitudes')).toBeInTheDocument();
    expect(screen.getByText('Completados')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    // Sections with counts
    expect(screen.getByText('Pendientes (1)')).toBeInTheDocument();
    expect(screen.getByText('Completados (1)')).toBeInTheDocument();
    // Request cards: test names joined + status chips (hardcoded Spanish labels)
    expect(screen.getByText('Hemograma, Glucosa')).toBeInTheDocument();
    expect(screen.getAllByText('TSH').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Completado')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    // Item chips
    expect(screen.getByText('Hemograma: 14.2')).toBeInTheDocument();
    expect(screen.getByText('Glucosa: 95')).toBeInTheDocument();
    // Footer summary: 3 items total, 2 with results
    expect(screen.getByText('3 exámenes en total — 2 con resultados')).toBeInTheDocument();
    expect(screen.getByText('2/3 completados')).toBeInTheDocument();
  });

  it('shows delivered/signed requests as completed and flags out-of-range values', async () => {
    api.get.mockResolvedValue({
      data: [
        {
          id: 1,
          status: 'delivered',
          created_at: new Date().toISOString(),
          doctor_name: 'Dr. Perez',
          items: [
            { id: 1, test_name: 'Glucosa', result_value: '250', test_id: 1, reference_ranges: { glucose: { min: 70, max: 110 } } },
          ],
        },
        {
          id: 2,
          status: 'signed',
          created_at: '2025-01-01T10:00:00.000Z',
          doctor_name: 'Dra. Gomez',
          items: [
            { id: 2, test_name: 'Colesterol', result_value: '200', test_id: 2, reference_ranges: { cholesterol: { min: 100, max: 200 } } },
          ],
        },
      ],
    });
    renderPage();
    expect(await screen.findByText('Glucosa: 250')).toBeInTheDocument();
    // Both delivered and signed render as "Completado"
    expect(screen.getAllByText('Completado').length).toBeGreaterThanOrEqual(2);
    // Out-of-range banner (mock t returns the default string without interpolation)
    expect(screen.getByText(/Este informe contiene .* fuera de rango/)).toBeInTheDocument();
    // "Nuevo" badge for recently published results
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });
});
