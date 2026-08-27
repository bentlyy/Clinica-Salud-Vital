import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { ClinicalRecordFormDialog } from '@/modules/clinical-records/components/ClinicalRecordFormDialog';
import type { ClinicalRecord } from '@/modules/clinical-records/types/clinical-record.types';

vi.mock('@/modules/clinical-templates/hooks/useClinicalTemplates', () => ({
  useClinicalTemplates: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        new_record: 'Nuevo Registro',
        edit_record: 'Editar Registro',
        patient_name: 'Nombre del Paciente',
        patient_name_required: 'El nombre del paciente es requerido',
        patient: 'Paciente',
        select_patient: 'Selecciona un paciente',
        template_optional: 'Plantilla (opcional)',
        select_template: 'Seleccionar plantilla',
        chief_complaint: 'Motivo de consulta',
        chief_complaint_required: 'El motivo de consulta es requerido',
        diagnosis: 'Diagnóstico',
        diagnosis_required: 'El diagnóstico es requerido',
        treatment: 'Tratamiento',
        treatment_required: 'El tratamiento es requerido',
        vital_signs: 'Signos vitales',
        temperature: 'Temperatura',
        blood_pressure: 'Presión Arterial',
        heart_rate: 'Frecuencia Cardíaca',
        weight: 'Peso',
        height: 'Estatura',
        oxygen_saturation: 'Saturación O2',
        additional_notes: 'Notas adicionales',
        notes_placeholder: 'Escribe notas adicionales...',
        saving: 'Guardando...',
        update: 'Actualizar',
        create_record: 'Crear Registro',
        cancel: 'Cancelar',
      };
      const value = translations[key] ?? key;
      if (opts && value.includes('{{')) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name]));
      }
      return value;
    },
    i18n: { language: 'es' },
  }),
}));

const onSave = vi.fn();
const onClose = vi.fn();

const record: ClinicalRecord = {
  id: 5,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 3,
  chief_complaint: 'Dolor abdominal',
  diagnosis: 'Gastritis',
  treatment_plan: 'Omeprazol 20mg',
  notes: 'Seguimiento en 2 semanas',
  vitals: { temperature: '36.5', blood_pressure: '' },
  patient_name: 'Maria Garcia',
  doctor_name: 'Dr. Perez',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
};

function renderDialog(props: Partial<Parameters<typeof ClinicalRecordFormDialog>[0]> = {}) {
  return render(
    <AppThemeProvider>
      <ClinicalRecordFormDialog
        open
        onClose={onClose}
        onSave={onSave}
        isSaving={false}
        {...props}
      />
    </AppThemeProvider>,
  );
}

describe('ClinicalRecordFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the create title and the vitals fields', () => {
    renderDialog();
    expect(screen.getByText('Nuevo Registro')).toBeInTheDocument();
    expect(screen.getByText('Signos vitales')).toBeInTheDocument();
    expect(screen.getByLabelText(/Temperatura/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Presión Arterial/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Saturación O2/)).toBeInTheDocument();
  });

  it('validates required fields on empty submit', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Crear Registro' }));

    expect(await screen.findByText('El nombre del paciente es requerido')).toBeInTheDocument();
    expect(await screen.findByText('El motivo de consulta es requerido')).toBeInTheDocument();
    expect(await screen.findByText('El diagnóstico es requerido')).toBeInTheDocument();
    expect(await screen.findByText('El tratamiento es requerido')).toBeInTheDocument();
  });

  it('shows a disabled patient field when patientId is provided', () => {
    renderDialog({ patientId: 10, patientName: 'Maria Garcia' });
    expect(screen.getByLabelText('Paciente')).toBeDisabled();
    expect(screen.getByLabelText('Paciente')).toHaveValue('Maria Garcia');
    expect(screen.queryByLabelText(/Nombre del Paciente/)).not.toBeInTheDocument();
  });

  it('pre-fills fields in edit mode and submits the sanitized input', async () => {
    renderDialog({ record });
    expect(screen.getByText('Editar Registro')).toBeInTheDocument();

    await vi.waitFor(() => {
      expect(screen.getByLabelText(/Tratamiento/)).toHaveValue('Omeprazol 20mg');
    });

    expect(screen.getByLabelText(/Motivo de consulta/)).toHaveValue('Dolor abdominal');
    expect(screen.getByLabelText(/Diagnóstico/)).toHaveValue('Gastritis');
    expect(screen.getByLabelText(/Temperatura/)).toHaveValue('36.5');

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    expect(onSave).toHaveBeenCalledWith({
      patient_id: 10,
      chief_complaint: 'Dolor abdominal',
      diagnosis: 'Gastritis',
  treatment_plan: 'Omeprazol 20mg',
      notes: 'Seguimiento en 2 semanas',
      template_id: undefined,
      vitals: { temperature: '36.5' },
    });
  });

  it('calls onClose when cancel is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the saving state and disables the submit button', () => {
    renderDialog({ isSaving: true, patientId: 10, patientName: 'Maria Garcia' });
    const submit = within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardando...' });
    expect(submit).toBeDisabled();
  });
});
