import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import PatientPrescriptionsPage from '@/modules/prescriptions/pages/PatientPrescriptionsPage';

const apiClient = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'prescriptions:title': 'Mis Recetas',
        'prescriptions:subtitle': 'Consulta tus recetas médicas',
        'prescriptions:loading': 'Cargando recetas...',
        'prescriptions:error_loading': 'Error al cargar las recetas',
        'prescriptions:empty_title': 'Sin recetas',
        'prescriptions:empty_desc': 'Aún no tienes recetas disponibles.',
        'prescriptions:total': 'Total Recetas',
        'prescriptions:with_medications': 'Con Medicamentos',
        'prescriptions:total_medications': 'Medicamentos',
        'prescriptions:by_doctor': 'Receta — Dr. {{name}}',
      };
      const value = translations[key] ?? fallback ?? key;
      if (opts && value.includes('{{')) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name]));
      }
      return value;
    },
    i18n: { language: 'es' },
  }),
}));

interface Med {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

const prescriptions = [
  {
    clinical_record_id: 1,
    patient_id: 10,
    doctor_id: 5,
    patient_name: 'Maria Garcia',
    doctor_name: 'Dr. Perez',
    created_at: '2026-08-01T10:00:00Z',
    medications: [
      { name: 'Paracetamol', dosage: '500mg', frequency: 'cada 8h', duration: '7 dias' } as Med,
    ],
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <PatientPrescriptionsPage />
      </AppThemeProvider>
    </QueryClientProvider>,
  );
}

describe('PatientPrescriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading state while fetching', () => {
    apiClient.get.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Cargando recetas...')).toBeInTheDocument();
  });

  it('shows the empty state when there are no prescriptions', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText('Sin recetas')).toBeInTheDocument();
    expect(screen.getByText('Aún no tienes recetas disponibles.')).toBeInTheDocument();
  });

  it('renders stat cards and prescription rows', async () => {
    apiClient.get.mockResolvedValue({ data: prescriptions });
    renderPage();

    expect(await screen.findByText('Mis Recetas')).toBeInTheDocument();
    expect(screen.getByText('Total Recetas')).toBeInTheDocument();
    expect(screen.getByText('Con Medicamentos')).toBeInTheDocument();
    expect(screen.getByText('Medicamentos')).toBeInTheDocument();
    expect(screen.getByText('Receta — Dr. Dr. Perez')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
  });

  it('shows the error state when the request fails', async () => {
    apiClient.get.mockRejectedValue(new Error('Network error'));
    renderPage();
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });
});
