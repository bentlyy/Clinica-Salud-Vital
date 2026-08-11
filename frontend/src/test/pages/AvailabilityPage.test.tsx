import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import AvailabilityPage from '@/modules/availability/pages/AvailabilityPage';
import type { AvailabilityRule, AvailabilityException } from '@/modules/availability/types/availability.types';

const rulesMock = vi.hoisted(() => ({
  data: undefined as AvailabilityRule[] | undefined,
  isLoading: true,
  isError: false,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const exceptionsMock = vi.hoisted(() => ({
  data: undefined as AvailabilityException[] | undefined,
  isLoading: true,
}));

const mutationsMock = vi.hoisted(() => ({
  createRule: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false })),
  deleteRule: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  createException: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  deleteException: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      my_schedules: 'Mis Horarios',
      config_subtitle: 'Configura tu disponibilidad',
      add_schedule: 'Agregar Horario',
      loading_schedules: 'Cargando horarios...',
      loading_exceptions: 'Cargando excepciones...',
      empty_title: 'Sin horarios',
      empty_message: 'Configura tu primer horario',
      exceptions_title: 'Excepciones',
      add_exception: 'Agregar Excepción',
      no_exceptions: 'Sin excepciones',
      new_schedule: 'Nuevo Horario',
      days_of_week: 'Días de la semana',
      start_time_label: 'Hora de inicio',
      end_time_label: 'Hora de término',
      cancel: 'Cancelar',
      save: 'Guardar',
      delete_schedule: 'Eliminar horario',
      delete_schedule_confirm: '¿Confirmas la eliminación?',
      delete: 'Eliminar',
      new_exception: 'Nueva Excepción',
      date_label: 'Fecha',
      reason_label: 'Motivo',
      reason_placeholder: 'Describe el motivo',
      select_at_least_one_day: 'Selecciona al menos un día',
      select_start_time: 'Selecciona hora de inicio',
      select_end_time: 'Selecciona hora de término',
      end_time_after_start: 'La hora de término debe ser posterior',
      select_date: 'Selecciona una fecha',
      enter_reason: 'Ingresa un motivo',
      delete_exception: 'Eliminar excepción',
      delete_exception_confirm: '¿Confirmas la eliminación de la excepción?',
    };
    return {
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    };
  },
}));

vi.mock('@/modules/availability/hooks/useAvailability', () => ({
  useAvailabilityRules: () => rulesMock,
  useCreateAvailabilityRule: () => mutationsMock.createRule(),
  useDeleteAvailabilityRule: () => mutationsMock.deleteRule(),
  useAvailabilityExceptions: () => exceptionsMock,
  useCreateAvailabilityException: () => mutationsMock.createException(),
  useDeleteAvailabilityException: () => mutationsMock.deleteException(),
}));

const rule: AvailabilityRule = {
  id: 1,
  doctor_id: 2,
  day_of_week: 1,
  start_time: '08:00',
  end_time: '12:00',
  created_at: '2026-08-01T10:00:00Z',
};

const exception: AvailabilityException = {
  id: 3,
  doctor_id: 2,
  date: '2026-09-01',
  start_time: null,
  end_time: null,
  reason: 'Vacaciones',
  created_at: '2026-08-01T10:00:00Z',
};

function renderPage() {
  return render(
    <AppThemeProvider>
      <AvailabilityPage />
    </AppThemeProvider>,
  );
}

describe('AvailabilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rulesMock.isLoading = true;
    rulesMock.isError = false;
    rulesMock.error = null;
    rulesMock.data = undefined;
    rulesMock.refetch = vi.fn();
    exceptionsMock.isLoading = true;
    exceptionsMock.data = undefined;
  });

  it('shows loading state', () => {
    renderPage();
    expect(screen.getByText('Cargando horarios...')).toBeInTheDocument();
  });

  it('shows error state with retry', () => {
    rulesMock.isLoading = false;
    rulesMock.isError = true;
    rulesMock.error = new Error('Network error');
    renderPage();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('renders empty state when there are no rules', () => {
    rulesMock.isLoading = false;
    rulesMock.data = [];
    exceptionsMock.isLoading = false;
    exceptionsMock.data = [];
    renderPage();
    expect(screen.getByText('Mis Horarios')).toBeInTheDocument();
    expect(screen.getByText('Sin horarios')).toBeInTheDocument();
    expect(screen.getByText('Sin excepciones')).toBeInTheDocument();
  });

  it('renders the grid and exception chips when data is loaded', () => {
    rulesMock.isLoading = false;
    rulesMock.data = [rule];
    exceptionsMock.isLoading = false;
    exceptionsMock.data = [exception];
    renderPage();
    expect(screen.getByText(/Vacaciones/)).toBeInTheDocument();
  });

  it('opens the new schedule dialog and validates empty days', async () => {
    rulesMock.isLoading = false;
    rulesMock.data = [];
    exceptionsMock.isLoading = false;
    exceptionsMock.data = [];

    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Agregar Horario' })[0]);
    expect(screen.getByText('Nuevo Horario')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Selecciona al menos un día')).toBeInTheDocument();
  });

  it('submits a new rule for the selected days', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    mutationsMock.createRule.mockReturnValue({ mutateAsync, isPending: false });
    rulesMock.isLoading = false;
    rulesMock.data = [];
    exceptionsMock.isLoading = false;
    exceptionsMock.data = [];

    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Agregar Horario' })[0]);

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(await screen.findByText('Lunes'));
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith({ day_of_week: 1, start_time: '08:00', end_time: '12:00' });
  });

  it('shows the delete confirmation dialog and confirms deletion', () => {
    const mutate = vi.fn((_id, opts) => opts?.onSuccess?.());
    mutationsMock.deleteRule.mockReturnValue({ mutate, isPending: false });
    rulesMock.isLoading = false;
    rulesMock.data = [rule];
    exceptionsMock.isLoading = false;
    exceptionsMock.data = [];

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }));
    const dialog = screen.getByRole('dialog');
    expect(screen.getByText('Eliminar horario')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    expect(mutate).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('opens the exception dialog and validates the form', async () => {
    rulesMock.isLoading = false;
    rulesMock.data = [];
    exceptionsMock.isLoading = false;
    exceptionsMock.data = [];

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Excepción' }));
    expect(screen.getByText('Nueva Excepción')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Selecciona una fecha')).toBeInTheDocument();
    expect(await screen.findByText('Ingresa un motivo')).toBeInTheDocument();
  });
});
