import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import ReportsPage from '@/modules/reports/pages/ReportsPage';
import type { Report } from '@/modules/reports/types/report.types';

// --- Hoisted mocks ---

const generateReportMock = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

const reportDetailMock = vi.hoisted(() => ({
  data: undefined as Report | undefined,
}));

const downloadReportMock = vi.hoisted(() => vi.fn());

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('framer-motion', () => {
  const PassThrough = ({
    children,
    initial: _initial,
    animate: _animate,
    transition: _transition,
    whileHover: _whileHover,
    whileTap: _whileTap,
    exit: _exit,
    ...rest
  }: { children?: React.ReactNode } & Record<string, unknown>) => <div {...rest}>{children}</div>;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children ?? null,
  };
});

vi.mock('@/modules/reports/hooks/useReports', () => ({
  useGenerateReport: () => generateReportMock,
  useReportDetail: () => reportDetailMock,
}));

vi.mock('@/modules/reports/utils/reportGenerator', () => ({
  downloadReport: downloadReportMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        title: 'Reportes',
        subtitle: 'Genera y descarga reportes',
        reportType: 'Tipo de reporte',
        'reportTypes.appointments': 'Citas',
        'reportTypes.revenue': 'Ingresos',
        'reportTypes.patients': 'Pacientes',
        'reportTypes.laboratory': 'Laboratorio',
        'typeDescriptions.appointments': 'Reporte de citas médicas',
        'typeDescriptions.revenue': 'Reporte de ingresos',
        'typeDescriptions.patients': 'Reporte de pacientes',
        'typeDescriptions.laboratory': 'Reporte de laboratorio',
        dateRange: 'Rango de fechas',
        dateFrom: 'Desde',
        dateTo: 'Hasta',
        generateReport: 'Generar reporte',
        generating: 'Generando...',
        reportStatus: 'Estado del reporte',
        columnId: 'ID',
        columnType: 'Tipo',
        columnPeriod: 'Periodo',
        columnStatus: 'Estado',
        columnDate: 'Fecha',
        actions: 'Acciones',
        'statusLabels.generating': 'Generando',
        'statusLabels.completed': 'Completado',
        'statusLabels.failed': 'Fallido',
        download: 'Descargar',
        selectType: 'Selecciona un tipo de reporte',
        selectTypeMessage: 'Elige una tarjeta para configurar el reporte.',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <ReportsPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

const completedReport: Report = {
  id: 1,
  tenant_id: 1,
  type: 'appointments',
  status: 'completed',
  config: { type: 'appointments', date_from: '2026-08-01', date_to: '2026-08-31' },
  result_url: 'report-content',
  created_at: '2026-08-01T10:00:00Z',
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateReportMock.mutate = vi.fn();
    generateReportMock.isPending = false;
    reportDetailMock.data = undefined;
    generateReportMock.mutate.mockImplementation(
      (_input: unknown, opts?: { onSuccess?: (report: Report) => void }) => opts?.onSuccess?.(completedReport),
    );
  });

  it('renders the page title and the four report type cards', () => {
    renderPage();
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.getByText('Citas')).toBeInTheDocument();
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    expect(screen.getByText('Laboratorio')).toBeInTheDocument();
  });

  it('shows the empty state when no report type is selected', () => {
    renderPage();
    expect(screen.getByText('Selecciona un tipo de reporte')).toBeInTheDocument();
    expect(screen.getByText('Elige una tarjeta para configurar el reporte.')).toBeInTheDocument();
  });

  it('shows the date range form after selecting a report type', () => {
    renderPage();
    fireEvent.click(screen.getByText('Citas'));
    expect(screen.getByText('Rango de fechas')).toBeInTheDocument();
    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
  });

  it('generates a report when type and dates are filled', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Citas'));
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-08-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }));

    await waitFor(() => {
      expect(generateReportMock.mutate).toHaveBeenCalledWith(
        { type: 'appointments', date_from: '2026-08-01', date_to: '2026-08-31' },
        expect.any(Object),
      );
    });
  });

  it('shows the report status table with a download button when completed', async () => {
    reportDetailMock.data = completedReport;
    renderPage();
    expect(screen.getByText('Estado del reporte')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Completado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Descargar/i }));
    expect(downloadReportMock).toHaveBeenCalledWith('appointments', 'report-content', '2026-08-01', '2026-08-31');
  });

  it('shows generating status label for in-progress reports', () => {
    reportDetailMock.data = { ...completedReport, status: 'generating' };
    renderPage();
    expect(screen.getByText('Generando')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar/i })).not.toBeInTheDocument();
  });
});
