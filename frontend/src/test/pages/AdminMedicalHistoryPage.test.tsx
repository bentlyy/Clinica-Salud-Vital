import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import AdminMedicalHistoryPage from '@/modules/clinical-records/pages/AdminMedicalHistoryPage';
import type { ClinicalRecord } from '@/modules/clinical-records/types/clinical-record.types';

const clinicalRecordService = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('@/modules/clinical-records/services/clinical-record.service', () => ({
  clinicalRecordService,
}));

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      'admin_medical_history:noDoctor': 'Sin médico asignado',
      'admin_medical_history:status.completed': 'Completado',
      'admin_medical_history:status.draft': 'Borrador',
      'admin_medical_history:status.cancelled': 'Cancelado',
      'admin_medical_history:title': 'Historial Médico (Admin)',
      'admin_medical_history:subtitle': 'Registros agrupados por médico',
      'admin_medical_history:emptyTitle': 'Sin registros',
      'admin_medical_history:emptyDesc': 'No hay registros clínicos todavía',
      'admin_medical_history:recordCount': '{{count}} registros',
      'admin_medical_history:colPatient': 'Paciente',
      'admin_medical_history:colDiagnosis': 'Diagnóstico',
      'admin_medical_history:colDate': 'Fecha',
      'admin_medical_history:colStatus': 'Estado',
    };
    return { t: (key: string, opts?: Record<string, unknown>) => {
      const value = translations[key] ?? key;
      if (opts && value.includes('{{')) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name]));
      }
      return value;
    }, i18n: { language: 'es' } };
  },
}));

const record: ClinicalRecord = {
  id: 1,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 3,
  chief_complaint: 'Dolor abdominal',
  diagnosis: 'Gastritis',
  treatment: 'Omeprazol',
  status: 'completed',
  patient_name: 'Maria Garcia',
  doctor_name: 'Dr. Perez',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
};

const recordDraft: ClinicalRecord = {
  ...record,
  id: 2,
  patient_name: 'Juan Diaz',
  diagnosis: 'Migraña',
  status: 'draft',
};

function renderPage() {
  return render(
    <AppThemeProvider>
      <AdminMedicalHistoryPage />
    </AppThemeProvider>,
  );
}

describe('AdminMedicalHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeletons while loading', () => {
    clinicalRecordService.list.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('shows the empty state when there are no records', async () => {
    clinicalRecordService.list.mockResolvedValue({ data: [], total: 0 });
    renderPage();
    expect(await screen.findByText('Sin registros')).toBeInTheDocument();
    expect(screen.getByText('No hay registros clínicos todavía')).toBeInTheDocument();
  });

  it('groups records by doctor with status chips', async () => {
    clinicalRecordService.list.mockResolvedValue({ data: [record, recordDraft], total: 2 });
    renderPage();

    expect(await screen.findByText('Dr. Perez')).toBeInTheDocument();
    expect(screen.getByText('2 registros')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('Juan Diaz')).toBeInTheDocument();
    expect(screen.getByText('Gastritis')).toBeInTheDocument();
    expect(screen.getByText('Migraña')).toBeInTheDocument();
    expect(screen.getByText('Completado')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
  });

  it('handles the list failing gracefully', async () => {
    clinicalRecordService.list.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('Sin registros')).toBeInTheDocument();
  });
});
