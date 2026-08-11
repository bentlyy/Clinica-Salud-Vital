import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { PatientLayout } from '@/shared/components/layout/PatientLayout';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockLogout = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({ user: null as Record<string, unknown> | null }));
const useMediaQueryMock = vi.hoisted(() => vi.fn(() => false));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockAuth.user,
    logout: mockLogout,
    isAuthenticated: Boolean(mockAuth.user),
    isLoading: false,
  }),
}));

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>();
  return { ...actual, useMediaQuery: useMediaQueryMock };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const patientUser = {
  id: 1,
  name: 'Ana Pérez',
  email: 'ana@mail.com',
  role: 'patient',
  tenant_id: 1,
  tenant_name: 'Clínica',
  tenant_slug: 'clinica',
  token_version: 1,
  iat: 1,
  exp: 9999999999,
};

function renderPatient(user: Record<string, unknown> | null = patientUser) {
  mockAuth.user = user;
  return render(
    <MemoryRouter initialEntries={['/patient']}>
      <AppThemeProvider>
        <Routes>
          <Route element={<PatientLayout />}>
            <Route path="/patient" element={<div>Patient content</div>} />
          </Route>
        </Routes>
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('PatientLayout', () => {
  beforeEach(() => {
    useMediaQueryMock.mockReturnValue(false);
    localStorage.clear();
  });

  afterEach(() => {
    mockNavigate.mockReset();
    mockLogout.mockReset();
  });

  it('renders the portal title and the page content', () => {
    renderPatient();
    expect(screen.getByText('patient_nav:portal')).toBeInTheDocument();
    expect(screen.getByText('Patient content')).toBeInTheDocument();
  });

  it('renders the user avatar initial', () => {
    renderPatient();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('does not render the bottom navigation on desktop', () => {
    renderPatient();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('opens the profile menu and logs out', () => {
    renderPatient();
    fireEvent.click(screen.getByText('A').closest('button')!);
    expect(screen.getByText('settings')).toBeInTheDocument();
    fireEvent.click(screen.getByText('logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('navigates to settings from the profile menu', () => {
    renderPatient();
    fireEvent.click(screen.getByText('A').closest('button')!);
    fireEvent.click(screen.getByText('settings'));
    expect(mockNavigate).toHaveBeenCalledWith('/patient/settings');
  });

  it('toggles the theme and persists the mode', () => {
    renderPatient();
    fireEvent.click(screen.getByTestId('DarkModeIcon').closest('button')!);
    expect(localStorage.getItem('theme_mode')).toBe('dark');
  });

  it('renders the bottom navigation on mobile and navigates on tap', () => {
    useMediaQueryMock.mockReturnValue(true);
    renderPatient();
    expect(screen.getByText('patient_nav.home')).toBeInTheDocument();
    expect(screen.getByText('patient_nav.bookings')).toBeInTheDocument();
    expect(screen.getByText('patient_nav.history')).toBeInTheDocument();
    expect(screen.getByText('patient_nav.laboratory')).toBeInTheDocument();
    expect(screen.getByText('patient_nav.profile')).toBeInTheDocument();

    fireEvent.click(screen.getByText('patient_nav.bookings'));
    expect(mockNavigate).toHaveBeenCalledWith('/patient/bookings');
  });
});
