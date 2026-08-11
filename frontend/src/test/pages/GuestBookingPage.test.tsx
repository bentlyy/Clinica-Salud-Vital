import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import GuestBookingPage from '@/modules/bookings/pages/GuestBookingPage';

const apiClient = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const mockNavigate = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

// NOTE: `t` must be a STABLE function (like react-i18next returns). The component
// memoizes `loadDoctors` on `[t]` and calls it from a useMemo side-effect; an
// unstable `t` would re-run the effect on every render and cause an infinite loop.
const gbpTranslations = vi.hoisted(() => ({
  // Stepper keys (dot-separated in the component)
  'guest_booking.step_personal': 'Datos personales',
  'guest_booking.step_doctor': 'Doctor y horario',
  'guest_booking.step_confirm': 'Confirmar',
  // Content keys (colon-separated)
  'guest_booking:title': 'Reservar cita',
  'guest_booking:name': 'Nombre',
  'guest_booking:email': 'Email',
  'guest_booking:phone': 'Teléfono',
  'guest_booking:rut': 'RUT',
  'guest_booking:select_doctor': 'Selecciona un doctor',
  'guest_booking:select_date': 'Fecha',
  'guest_booking:select_time': 'Horarios disponibles',
  'guest_booking:no_slots': 'No hay horarios disponibles',
  'guest_booking:confirm_booking': 'Confirmar reserva',
  'guest_booking:success': '¡Reserva confirmada!',
  'guest_booking:error': 'Error al reservar',
  'common:name': 'Nombre',
  'common:email': 'Email',
  'common:phone': 'Teléfono',
  'common:doctor': 'Doctor',
  'common:date': 'Fecha',
  'common:time': 'Hora',
  'common:next': 'Siguiente',
  'common:back': 'Atrás',
  'common:loading': 'Cargando...',
  'common:goHome': 'Ir al inicio',
  'validation:invalidFormat': 'RUT inválido',
  'errors:fetchError': 'Error al cargar los datos',
}));

const gbpT = vi.hoisted(
  () => (key: string, opts?: { defaultValue?: string }) =>
    gbpTranslations[key as keyof typeof gbpTranslations] ?? opts?.defaultValue ?? key,
);

vi.mock('@/shared/services/api-client', () => ({ apiClient }));

vi.mock('react-hot-toast', () => ({ default: toastMock }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: gbpT, i18n: { language: 'es' } }),
}));

const doctors = [{ id: 1, name: 'Dr. Perez', specialty: 'Cardiología' }];
const slots = [{ time: '10:00', available: true }, { time: '11:00', available: false }];

function mockBackend({ withDoctors = true, withSlots = true } = {}) {
  apiClient.get.mockImplementation((url: string) => {
    if (url === '/doctors/public') {
      return withDoctors
        ? Promise.resolve({ data: { data: doctors } })
        : Promise.resolve({ data: { data: [] } });
    }
    if (url === '/bookings/slots') {
      return withSlots
        ? Promise.resolve({ data: { data: slots } })
        : Promise.resolve({ data: { data: [] } });
    }
    return Promise.reject(new Error('unexpected url'));
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <GuestBookingPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

function fillPersonalData() {
  // Required fields render a MUI "*" suffix, so use regex matchers
  fireEvent.input(screen.getByLabelText(/Nombre/), { target: { value: 'Maria Garcia' } });
  fireEvent.input(screen.getByLabelText(/Email/), { target: { value: 'maria@x.cl' } });
  fireEvent.input(screen.getByLabelText(/Teléfono/), { target: { value: '+56911111111' } });
}

describe('GuestBookingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the personal data step with all fields', () => {
    renderPage();
    expect(screen.getByText('Reservar cita')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/)).toBeInTheDocument();
    expect(screen.getByLabelText('RUT')).toBeInTheDocument();
    // Stepper labels render from the dotted keys
    expect(screen.getByText('Datos personales')).toBeInTheDocument();
    expect(screen.getByText('Doctor y horario')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
  });

  it('keeps the next button disabled until personal data is filled', () => {
    renderPage();
    const nextButton = screen.getByRole('button', { name: 'Siguiente' });
    expect(nextButton).toBeDisabled();

    fillPersonalData();
    expect(nextButton).toBeEnabled();
  });

  it('shows a validation error for an invalid RUT', () => {
    renderPage();
    fillPersonalData();
    fireEvent.input(screen.getByLabelText('RUT'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('RUT inválido')).toBeInTheDocument();
    // Still on step 1
    expect(screen.getByLabelText(/Nombre/)).toBeInTheDocument();
  });

  it('loads doctors and slots, then confirms the booking', async () => {
    mockBackend();
    apiClient.post.mockResolvedValue({ data: { ok: true } });
    renderPage();

    fillPersonalData();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    // Step 2: doctor selection
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/doctors/public');
    });

    fireEvent.mouseDown(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Dr. Perez — Cardiología' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Dr. Perez — Cardiología' }));

    // Pick a date to load slots
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-08-15' } });
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/bookings/slots', {
        params: { doctor_id: 1, date: '2026-08-15' },
      });
    });
    expect(screen.getByText('Horarios disponibles')).toBeInTheDocument();

    // Select the available slot
    fireEvent.click(screen.getByText('10:00'));

    // Step 3: confirm
    const nextButton = screen.getByRole('button', { name: 'Siguiente' });
    expect(nextButton).toBeEnabled();
    fireEvent.click(nextButton);

    // Summary shows the personal and booking data
    expect(screen.getByText(/Maria Garcia/)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Perez/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/bookings/guest', {
        name: 'Maria Garcia',
        email: 'maria@x.cl',
        phone: '+56911111111',
        rut: undefined,
        doctor_id: 1,
        date: '2026-08-15',
        time: '10:00',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('¡Reserva confirmada!')).toBeInTheDocument();
    });
    expect(toastMock.success).toHaveBeenCalledWith('¡Reserva confirmada!');
  });

  it('shows the no-slots message when a date has no availability', async () => {
    mockBackend({ withSlots: false });
    renderPage();

    fillPersonalData();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/doctors/public');
    });

    fireEvent.mouseDown(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Dr. Perez — Cardiología' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Dr. Perez — Cardiología' }));

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-08-15' } });
    await waitFor(() => {
      expect(screen.getByText('No hay horarios disponibles')).toBeInTheDocument();
    });
  });
});
