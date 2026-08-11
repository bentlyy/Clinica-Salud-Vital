import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { ProfileTab } from '@/modules/settings/components/ProfileTab';

// --- Hoisted mocks ---

const mockProfile = vi.hoisted(() => ({
  data: undefined as unknown,
  isLoading: true,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const mockUser = vi.hoisted(() => ({
  id: 1,
  email: 'admin@clinic.com',
  role: 'admin',
  name: 'Admin User',
  tenant_id: 1,
  tenant_name: 'Clínica Central',
  tenant_slug: 'central',
}));

// --- Mocks ---

vi.mock('@/modules/settings/hooks/useSettings', () => ({
  useProfile: () => mockProfile,
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        loading_profile: 'Cargando perfil...',
        full_name: 'Nombre completo',
        email: 'Email',
        phone: 'Teléfono',
        role_label: 'Rol',
        user_id: 'ID de usuario',
        clinic: 'Clínica',
        personal_info: 'Información personal',
        account_info: 'Información de la cuenta',
        tab_profile: 'Perfil',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

function renderTab() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <ProfileTab />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('ProfileTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile.data = undefined;
    mockProfile.isLoading = true;
    mockProfile.error = null;
  });

  it('shows loading state while the profile is being fetched', () => {
    renderTab();
    expect(screen.getByText('Cargando perfil...')).toBeInTheDocument();
  });

  it('renders profile information from the API data', () => {
    mockProfile.isLoading = false;
    mockProfile.data = {
      id: 5,
      name: 'Dra. Maria Garcia',
      email: 'maria@clinic.com',
      phone: '+56912345678',
      role: 'doctor',
    };
    renderTab();
    expect(screen.getAllByText('Dra. Maria Garcia').length).toBeGreaterThan(0);
    expect(screen.getAllByText('maria@clinic.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Doctor').length).toBeGreaterThan(0);
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('falls back to the auth user when profile is not loaded yet', () => {
    mockProfile.isLoading = false;
    mockProfile.data = undefined;
    renderTab();
    expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('admin@clinic.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Administrador').length).toBeGreaterThan(0);
  });

  it('shows error state and retries when the request fails', () => {
    mockProfile.isLoading = false;
    mockProfile.error = new Error('Network error');
    renderTab();
    const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
    fireEvent.click(retryButton);
    expect(mockProfile.refetch).toHaveBeenCalled();
  });
});
