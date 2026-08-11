import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { PrescriptionFormDialog } from '@/modules/prescriptions/components/PrescriptionFormDialog';
import type { Prescription, CreatePrescriptionInput } from '@/modules/prescriptions/types/prescription.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      newPrescription: 'Nueva Receta',
      editPrescription: 'Editar Receta',
      patient: 'Paciente',
      patient_name_label: 'Nombre del Paciente',
      medications: 'Medicamentos',
      addMedication: 'Agregar',
      medication_number: 'Medicamento',
      medicationName: 'Nombre',
      dosage: 'Dosis',
      dosage_placeholder: 'ej. 500mg',
      frequency: 'Frecuencia',
      frequency_placeholder: 'ej. cada 8 horas',
      duration: 'Duración',
      duration_placeholder: 'ej. 7 días',
      instructions_label: 'Instrucciones especiales',
      instructions_placeholder: 'ej. Tomar con alimentos',
      additional_notes: 'Notas Adicionales',
      generalNotes: 'Observaciones generales de la receta...',
      cancel: 'Cancelar',
      saving: 'Guardando...',
      update_btn: 'Actualizar',
      create_btn: 'Crear Receta',
    };
    return { t: (key: string, fallback?: string) => translations[key] ?? fallback ?? key, i18n: { language: 'es' } };
  },
}));

const prescription: Prescription = {
  id: 1,
  tenant_id: 1,
  patient_id: 10,
  doctor_id: 5,
  medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'cada 8h', duration: '7 dias' }],
  notes: 'Tomar con alimentos',
  doctor_name: 'Dr. Perez',
  patient_name: 'Maria Garcia',
  created_at: '2026-08-01T10:00:00Z',
};

function renderDialog(overrides: Partial<React.ComponentProps<typeof PrescriptionFormDialog>> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    isSaving: false,
  };
  return render(
    <AppThemeProvider>
      <PrescriptionFormDialog {...props} {...overrides} />
    </AppThemeProvider>,
  );
}

describe('PrescriptionFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the create dialog with fields', () => {
    renderDialog();
    expect(screen.getByText('Nueva Receta')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre del Paciente/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear Receta' })).toBeInTheDocument();
  });

  it('renders the edit dialog pre-filled when editing', () => {
    renderDialog({ prescription });
    expect(screen.getByText('Editar Receta')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre del Paciente/i)).toHaveValue('Maria Garcia');
    expect(screen.getByLabelText('Nombre')).toHaveValue('Paracetamol');
    expect(screen.getByLabelText(/Notas Adicionales/i)).toHaveValue('Tomar con alimentos');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
  });

  it('shows validation errors when submitting an empty form', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Crear Receta' }));
    expect(await screen.findByText('El nombre del paciente es requerido')).toBeInTheDocument();
    expect(await screen.findByText('El nombre del medicamento es requerido')).toBeInTheDocument();
    expect(await screen.findByText('La dosis es requerida')).toBeInTheDocument();
  });

  it('adds a medication row when clicking the add button', () => {
    renderDialog();
    expect(screen.getAllByLabelText('Nombre')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getAllByLabelText('Nombre')).toHaveLength(2);
  });

  it('calls onClose when clicking cancel', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the saving state and disables the submit button', () => {
    renderDialog({ isSaving: true });
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
  });

  it('submits a valid form with patientId provided', async () => {
    const onSave = vi.fn();
    renderDialog({ patientId: 10, patientName: 'Maria Garcia', onSave });

    expect(screen.getByLabelText(/Paciente/i)).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Ibuprofeno' } });
    fireEvent.change(screen.getByLabelText(/Dosis/i), { target: { value: '400mg' } });
    fireEvent.change(screen.getByLabelText(/Frecuencia/i), { target: { value: 'cada 6h' } });
    fireEvent.change(screen.getByLabelText(/Duración/i), { target: { value: '5 dias' } });

    fireEvent.click(screen.getByRole('button', { name: 'Crear Receta' }));

    await vi.waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const input = onSave.mock.calls[0][0] as CreatePrescriptionInput;
    expect(input.patient_id).toBe(10);
    expect(input.medications).toEqual([
      expect.objectContaining({ name: 'Ibuprofeno', dosage: '400mg', frequency: 'cada 6h', duration: '5 dias' }),
    ]);
  });
});
