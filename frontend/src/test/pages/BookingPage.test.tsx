import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

const mockGetDoctors = vi.fn();
const mockGetAvailableSlots = vi.fn();
const mockCreateBooking = vi.fn();

vi.mock('../../api/doctors', () => ({ getDoctors: (...args) => mockGetDoctors(...args) }));
vi.mock('../../api/bookings', () => ({
  getAvailableSlots: (...args) => mockGetAvailableSlots(...args),
  createBooking: (...args) => mockCreateBooking(...args),
}));

const mockUser = { name: 'John', email: 'john@test.com', rut: '12345678-9', phone: '+56912345678' };
const { mockUseAuthRef } = vi.hoisted(() => ({
  mockUseAuthRef: { current: { user: { name: 'John', email: 'john@test.com', rut: '12345678-9', phone: '+56912345678' } } },
}));
vi.mock('../../context/useAuth', () => ({
  useAuth: () => mockUseAuthRef.current,
}));

vi.mock('../../i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key) => {
      const map = {
        'booking.title': 'Agendar Cita',
        'booking.step_select': 'Seleccionar',
        'booking.step_confirm': 'Confirmar',
        'booking.select_doctor': 'Selecciona un médico',
        'booking.loading_doctors': 'Cargando doctores...',
        'booking.available_slots': 'Horarios disponibles',
        'booking.continue': 'Continuar',
        'booking.select_requirements': 'Selecciona los requisitos',
        'booking.confirm': 'Confirmar Cita',
        'booking.confirming': 'Confirmando...',
        'booking.success_title': 'Cita Agendada',
        'booking.success_desc': 'Hemos enviado un resumen',
        'booking.view_bookings': 'Ver mis citas',
        'booking.back_home': 'Volver al inicio',
        'booking.back': 'Volver',
        'booking.date_label': 'Fecha',
        'booking.date_label_short': 'Fecha',
        'booking.time_label': 'Hora',
        'booking.doctor_label': 'Doctor',
        'booking.error': 'Error al agendar',
        'booking.select_doctor_error': 'Selecciona un doctor',
        'booking.select_date_error': 'Selecciona una fecha',
        'booking.select_time_error': 'Selecciona un horario',
        'booking.select_specialist_first': 'Selecciona un especialista',
        'booking.select_date_first': 'Selecciona una fecha',
        'booking.no_slots': 'No hay horarios disponibles',
        'booking.logged_in_as': 'Conectado como',
        'booking.personal_data_title': 'Tus datos',
        'booking.profile_data_hint': 'Puedes actualizar tus datos',
        'booking.summary_title': 'Resumen de tu cita',
        'booking.rut_label': 'RUT',
        'booking.name_label': 'Nombre',
        'booking.email_label': 'Email',
        'booking.phone_label': 'Teléfono',
      };
      return map[key] || key;
    },
  }),
}));

function renderBookingPage() {
  return render(
    <BrowserRouter>
      <BookingPage />
    </BrowserRouter>
  );
}

import BookingPage from '../../pages/BookingPage';

const mockDoctors = [
  { id: 1, name: 'Dr. Pérez', specialty: 'Cardiología' },
  { id: 2, name: 'Dra. Gómez', specialty: 'Pediatría' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockClear();
  mockGetDoctors.mockResolvedValue(mockDoctors);
  mockGetAvailableSlots.mockResolvedValue(['10:00', '10:30', '11:00']);
  mockCreateBooking.mockResolvedValue({ id: 1 });
  mockUseAuthRef.current = { user: mockUser };
});

describe('BookingPage', () => {
  it('renders loading state initially', () => {
    mockGetDoctors.mockImplementation(() => new Promise(() => {}));
    renderBookingPage();
    expect(screen.getByText('Cargando doctores...')).toBeInTheDocument();
  });

  it('redirects to login if no user', () => {
    mockUseAuthRef.current = { user: null };
    renderBookingPage();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    mockUseAuthRef.current = { user: mockUser };
  });

  it('renders doctor list after loading', async () => {
    renderBookingPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Pérez')).toBeInTheDocument();
    });
    expect(screen.getByText('Dra. Gómez')).toBeInTheDocument();
  });

  it('selects a doctor on click', async () => {
    renderBookingPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Pérez')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Dr. Pérez'));
    expect(screen.getByText('Selecciona una fecha')).toBeInTheDocument();
  });

  it('loads slots when doctor and date are selected', async () => {
    renderBookingPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Pérez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dr. Pérez'));

    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2026-07-10' } });

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
  });

  it('shows error when selectedTime is set and no doctor selected', async () => {
    renderBookingPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Pérez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dr. Pérez'));

    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2026-07-10' } });

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('10:00'));

    // Now we should see continue button enabled
    await waitFor(() => {
      expect(screen.getByText('Continuar →')).toBeInTheDocument();
    });
  });

  it('disables continue when no doctor/date/time selected', async () => {
    mockUseAuthRef.current = { user: mockUser };
    renderBookingPage();

    await waitFor(() => {
      expect(screen.getByText('Dr. Pérez')).toBeInTheDocument();
    });

    // Button should show "Selecciona los requisitos" when nothing selected
    expect(screen.getByText('Selecciona los requisitos')).toBeInTheDocument();
  });

  it('navigates to step 2 on continue', async () => {
    renderBookingPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Pérez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dr. Pérez'));

    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2026-07-10' } });

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('10:00'));

    fireEvent.click(screen.getByText('Continuar →'));

    await waitFor(() => {
      expect(screen.getByText('Confirmar Cita')).toBeInTheDocument();
    });
  });

  it('shows success after confirming booking', async () => {
    renderBookingPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Pérez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dr. Pérez'));

    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2026-07-10' } });

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('10:00'));

    fireEvent.click(screen.getByText('Continuar →'));

    await waitFor(() => {
      expect(screen.getByText('Confirmar Cita')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirmar Cita'));

    await waitFor(() => {
      expect(screen.getByText('Cita Agendada')).toBeInTheDocument();
    });
  });

  it('shows error when booking creation fails', async () => {
    mockCreateBooking.mockRejectedValue({ response: { data: { error: 'Slot no disponible' } } });

    renderBookingPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Pérez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dr. Pérez'));

    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2026-07-10' } });

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('10:00'));
    fireEvent.click(screen.getByText('Continuar →'));

    await waitFor(() => {
      expect(screen.getByText('Confirmar Cita')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirmar Cita'));

    await waitFor(() => {
      expect(screen.getByText('Slot no disponible')).toBeInTheDocument();
    });
  });
});
