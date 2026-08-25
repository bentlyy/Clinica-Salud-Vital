import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '@/modules/landing/LandingPage';

// --- Hoisted mocks ---

const mockNavigate = vi.hoisted(() => vi.fn());
const mockLogin = vi.hoisted(() => vi.fn());

// --- Mocks ---

vi.mock('react-google-recaptcha', () => ({
  default: () => <div data-testid="mock-recaptcha" />,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    brandName: 'Vitaria',
    navFeatures: 'Características',
    navHowItWorks: 'Cómo funciona',
    navPricing: 'Precios',
    navTestimonials: 'Testimonios',
    navFaq: 'FAQ',
    navLogin: 'Iniciar sesión',
    navCta: 'Comenzar',
    heroTitle: 'La plataforma de salud moderna',
    heroSubtitle: 'Gestiona tu clínica desde un solo lugar',
    heroCtaPrimary: 'Crear cuenta gratis',
    featuresLabel: 'Características',
    featuresTitle: 'Todo lo que necesitas',
    pricingTitle: 'Planes y precios',
    pricingMostPopular: 'Más popular',
    faqTitle: 'Preguntas frecuentes',
    ctaTitle: 'Empieza hoy',
    ctaButton: 'Comenzar ahora',
    loginTitle: 'Inicia sesión en tu cuenta',
    loginEmailLabel: 'Correo electrónico',
    loginPasswordLabel: 'Contraseña',
    loginSubmit: 'Ingresar',
    loginGuestDashboard: 'Ver demo como invitado',
    loginGuestBooking: 'Reservar como invitado',
  };
  const t = (key: string, fallback?: string) => translations[key] ?? fallback ?? key;
  return {
    useTranslation: () => ({ t, i18n: { language: 'es', changeLanguage: vi.fn() } }),
    Trans: ({ i18nKey }: { i18nKey: string }) => <>{translations[i18nKey] ?? i18nKey}</>,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the hero section with brand and title without crashing', () => {
    renderPage();
    expect(screen.getByText('Vitaria')).toBeInTheDocument();
    expect(screen.getByText('La plataforma de salud moderna')).toBeInTheDocument();
  });

  it('renders the main navigation links', () => {
    renderPage();
    expect(screen.getAllByText('Características').length).toBeGreaterThan(0);
    expect(screen.getByText('Cómo funciona')).toBeInTheDocument();
    expect(screen.getByText('Precios')).toBeInTheDocument();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
  });

  it('renders the features section with all 6 feature cards', () => {
    renderPage();
    expect(screen.getByText('Todo lo que necesitas')).toBeInTheDocument();
    const featureCards = document.querySelectorAll('.lp-feature-card');
    expect(featureCards.length).toBe(6);
  });

  it('renders the pricing section with 3 plans', () => {
    renderPage();
    expect(screen.getByText('Planes y precios')).toBeInTheDocument();
    const pricingCards = document.querySelectorAll('.lp-pricing-card');
    expect(pricingCards.length).toBe(3);
  });

  it('renders the FAQ section and toggles an answer', () => {
    renderPage();
    const firstQuestion = screen.getByRole('button', { name: /faq1Q/ });
    expect(firstQuestion).toBeInTheDocument();
    expect(document.querySelector('.lp-faq-item.lp-faq-open')).toBeNull();

    fireEvent.click(firstQuestion);
    expect(document.querySelector('.lp-faq-item.lp-faq-open')).not.toBeNull();

    fireEvent.click(firstQuestion);
    expect(document.querySelector('.lp-faq-item.lp-faq-open')).toBeNull();
  });

  it('opens the login modal when clicking the hero CTA', () => {
    renderPage();
    expect(screen.queryByText('Inicia sesión en tu cuenta')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Crear cuenta gratis'));
    expect(screen.getByText('Inicia sesión en tu cuenta')).toBeInTheDocument();
    expect(screen.getByText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByText('Contraseña')).toBeInTheDocument();
  });

  it('closes the login modal when clicking the close button', () => {
    renderPage();
    fireEvent.click(screen.getByText('Crear cuenta gratis'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Inicia sesión en tu cuenta')).not.toBeInTheDocument();
  });

  it('navigates to /booking when the guest booking button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Crear cuenta gratis'));
    fireEvent.click(screen.getByText('Reservar como invitado'));
    expect(mockNavigate).toHaveBeenCalledWith('/booking');
  });
});
