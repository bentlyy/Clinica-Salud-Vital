import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockNavigate, mockLogout, mockUserRef, mockToggleTheme, mockThemeRef, mockSetStoredLocale, mockHasFeatureFnRef, mockFeatureLoadingRef } = vi.hoisted(() => {
  const userRef = { current: null };
  const themeRef = { current: 'light' };
  const featureLoadingRef = { current: true };
  const hasFeatureFnRef = { current: vi.fn() };
  return {
    mockNavigate: vi.fn(),
    mockLogout: vi.fn(),
    mockUserRef: userRef,
    mockToggleTheme: vi.fn(),
    mockThemeRef: themeRef,
    mockSetStoredLocale: vi.fn(),
    mockHasFeatureFnRef: hasFeatureFnRef,
    mockFeatureLoadingRef: featureLoadingRef,
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ user: mockUserRef.current, logout: mockLogout }),
}));

vi.mock('../../context/useTheme', () => ({
  useTheme: () => ({ theme: mockThemeRef.current, toggleTheme: mockToggleTheme }),
}));

vi.mock('../../i18n/useI18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (key) => {
      const map = {
        'app.name': 'Salud Vital',
        'app.subtitle': 'Clínica Privada',
        'nav.booking': 'Reservar',
        'nav.doctor_panel': 'Panel',
        'nav.calendar': 'Calendario',
        'nav.clinical_records': 'Fichas Clínicas',
        'nav.doctor_lab_results': 'Resultados',
        'nav.specialties': 'Especialidades',
        'nav.lab_tests': 'Catálogo de Exámenes',
        'nav.register_doctor': 'Gestionar Personal',
        'nav.dashboard': 'Dashboard',
        'nav.tenants': 'Tenants',
        'nav.specialists': 'Especialistas',
        'nav.login': 'Iniciar Sesión',
        'nav.logout': 'Salir',
      };
      return map[key] || key;
    },
  }),
  setStoredLocale: mockSetStoredLocale,
}));

vi.mock('../../context/useFeature', () => ({
  useFeature: () => ({ hasFeature: mockHasFeatureFnRef.current, loading: mockFeatureLoadingRef.current }),
}));

import Navbar from '../../components/Navbar';

function renderNavbar() {
  return render(
    <BrowserRouter>
      <Navbar />
    </BrowserRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserRef.current = null;
  mockThemeRef.current = 'light';
  mockFeatureLoadingRef.current = true;
  mockHasFeatureFnRef.current = vi.fn();
});

describe('Navbar', () => {
  describe('brand', () => {
    it('renders app name and subtitle', () => {
      renderNavbar();
      expect(screen.getByText('Salud Vital')).toBeInTheDocument();
      expect(screen.getByText('Clínica Privada')).toBeInTheDocument();
    });

    it('navigates to / on brand click', () => {
      renderNavbar();
      const brandLink = screen.getByText('Salud Vital').closest('a');
      expect(brandLink).toHaveAttribute('href', '/');
    });
  });

  describe('unauthenticated user', () => {
    it('renders specialists, booking and login links', () => {
      renderNavbar();
      expect(screen.getByText('Especialistas')).toHaveAttribute('href', '/specialists');
      expect(screen.getByText('Reservar')).toHaveAttribute('href', '/booking');
      expect(screen.getByText('Iniciar Sesión')).toHaveAttribute('href', '/login');
    });

    it('does not render user info or logout', () => {
      renderNavbar();
      expect(screen.queryByText('Salir')).not.toBeInTheDocument();
      expect(screen.queryByText('Salir')).not.toBeInTheDocument();
    });
  });

  describe('role-based navigation', () => {
    it('patient role shows booking link and hides role-specific links', () => {
      mockUserRef.current = { role: 'patient', name: 'Paciente', email: 'pac@test.com' };
      renderNavbar();
      expect(screen.getByText('Reservar')).toBeInTheDocument();
      expect(screen.queryByText('Panel')).not.toBeInTheDocument();
      expect(screen.queryByText('Demo Data')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Laboratorio')).not.toBeInTheDocument();
    });

    it('doctor role shows all doctor links and booking', () => {
      mockUserRef.current = { role: 'doctor', name: 'Dr. Test', email: 'doc@test.com' };
      renderNavbar();
      expect(screen.getByText('Reservar')).toBeInTheDocument();
      expect(screen.getByText('Panel')).toHaveAttribute('href', '/doctor');
      expect(screen.getByText('Calendario')).toHaveAttribute('href', '/doctor/calendar');
      expect(screen.getByText('Fichas Clínicas')).toHaveAttribute('href', '/doctor/clinical-records');
      expect(screen.queryByText('Laboratorio')).not.toBeInTheDocument();
    });

    it('lab technician role shows lab links and booking', () => {
      mockUserRef.current = { role: 'lab_technician', name: 'Lab', email: 'lab@test.com' };
      renderNavbar();
      expect(screen.getByText('Reservar')).toBeInTheDocument();
      expect(screen.getByText('🔬 Laboratorio')).toHaveAttribute('href', '/lab');
      expect(screen.queryByText('Panel')).not.toBeInTheDocument();
    });

    it('admin role hides booking link and shows admin links', () => {
      mockUserRef.current = { role: 'admin', name: 'Admin', email: 'adm@test.com' };
      renderNavbar();
      expect(screen.queryByText('Reservar')).not.toBeInTheDocument();
      expect(screen.getByText('Demo Data')).toHaveAttribute('href', '/admin/demo-data');
      expect(screen.getByText('Especialidades')).toHaveAttribute('href', '/admin/specialties');
      expect(screen.getByText('Gestionar Personal')).toHaveAttribute('href', '/admin/register-doctor');
    });

    it('superadmin role shows superadmin links and booking', () => {
      mockUserRef.current = { role: 'superadmin', name: 'Super', email: 'super@test.com' };
      renderNavbar();
      expect(screen.getByText('Reservar')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toHaveAttribute('href', '/super-admin');
      expect(screen.getByText('Tenants')).toHaveAttribute('href', '/super-admin/tenants');
      expect(screen.getByText('Demo Data')).toHaveAttribute('href', '/super-admin/demo-data');
    });
  });

  describe('user info and logout', () => {
    it('shows user name and email when logged in', () => {
      mockUserRef.current = { role: 'patient', name: 'Juan Pérez', email: 'juan@test.com' };
      renderNavbar();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('juan@test.com')).toBeInTheDocument();
    });

    it('shows email as fallback when name is missing', () => {
      mockUserRef.current = { role: 'patient', email: 'anon@test.com' };
      renderNavbar();
      expect(screen.getByText('anon@test.com')).toBeInTheDocument();
    });

    it('calls logout and navigates to / on logout click', async () => {
      mockLogout.mockResolvedValue();
      mockUserRef.current = { role: 'patient', name: 'User', email: 'u@test.com' };
      renderNavbar();
      fireEvent.click(screen.getByText('Salir'));
      expect(mockLogout).toHaveBeenCalledTimes(1);
      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('locale switcher', () => {
    it('shows current locale code', () => {
      renderNavbar();
      expect(screen.getByText('ES')).toBeInTheDocument();
    });

    it('opens locale menu on click', () => {
      renderNavbar();
      fireEvent.click(screen.getByText('ES'));
      expect(screen.getByText('EN')).toBeInTheDocument();
      expect(screen.getByText('PT')).toBeInTheDocument();
      expect(screen.getByText('FR')).toBeInTheDocument();
    });

    it('calls setStoredLocale and closes menu on locale selection', () => {
      renderNavbar();
      fireEvent.click(screen.getByText('ES'));
      fireEvent.click(screen.getByText('EN'));
      expect(mockSetStoredLocale).toHaveBeenCalledWith('en');
      expect(screen.queryByText('PT')).not.toBeInTheDocument();
    });

    it('closes locale menu on backdrop click', () => {
      const { container } = renderNavbar();
      fireEvent.click(screen.getByText('ES'));
      expect(screen.getByText('EN')).toBeInTheDocument();
      const backdrop = container.querySelector('.navbar-locale-backdrop');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop);
      expect(screen.queryByText('EN')).not.toBeInTheDocument();
    });
  });

  describe('theme toggle', () => {
    it('shows moon icon in light mode', () => {
      renderNavbar();
      expect(screen.getByText('🌙')).toBeInTheDocument();
    });

    it('shows sun icon in dark mode', () => {
      mockThemeRef.current = 'dark';
      renderNavbar();
      expect(screen.getByText('☀️')).toBeInTheDocument();
    });

    it('calls toggleTheme on click', () => {
      renderNavbar();
      fireEvent.click(screen.getByLabelText('Toggle theme'));
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });
  });

  describe('mobile menu', () => {
    it('toggles mobile menu on hamburger click', () => {
      mockUserRef.current = { role: 'patient', email: 'u@test.com' };
      renderNavbar();
      const hamburger = screen.getByLabelText('Menu');
      fireEvent.click(hamburger);
      expect(hamburger.classList.contains('open')).toBe(true);
      fireEvent.click(hamburger);
      expect(hamburger.classList.contains('open')).toBe(false);
    });
  });

  describe('NavLabLink feature gate', () => {
    it('renders lab results link disabled when feature is off (loading false, hasFeature false)', () => {
      mockFeatureLoadingRef.current = false;
      mockHasFeatureFnRef.current = vi.fn().mockReturnValue(false);
      mockUserRef.current = { role: 'doctor', name: 'Dr', email: 'd@test.com' };
      renderNavbar();
      const labLink = screen.getByText('Resultados');
      expect(labLink.closest('a').classList.contains('nav-link-disabled')).toBe(true);
      expect(screen.getByText('🔒')).toBeInTheDocument();
    });

    it('renders lab results link enabled when feature is on', () => {
      mockFeatureLoadingRef.current = false;
      mockHasFeatureFnRef.current = vi.fn().mockReturnValue(true);
      mockUserRef.current = { role: 'doctor', name: 'Dr', email: 'd@test.com' };
      renderNavbar();
      const labLink = screen.getByText('Resultados');
      expect(labLink.closest('a').classList.contains('nav-link-disabled')).toBe(false);
      expect(screen.queryByText('🔒')).not.toBeInTheDocument();
    });

    it('lab link is enabled during feature loading', () => {
      mockFeatureLoadingRef.current = true;
      mockUserRef.current = { role: 'doctor', name: 'Dr', email: 'd@test.com' };
      renderNavbar();
      const labLink = screen.getByText('Resultados');
      expect(labLink.closest('a').classList.contains('nav-link-disabled')).toBe(false);
    });
  });
});
