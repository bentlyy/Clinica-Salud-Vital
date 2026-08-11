import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PremiumLocked } from '@/shared/components/PremiumLocked';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        title: 'Función Premium',
        message: 'Esta función requiere un plan premium.',
        see_plans: 'Ver planes',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

describe('PremiumLocked', () => {
  it('renders the feature name when provided', () => {
    render(<PremiumLocked featureName="Laboratorio Avanzado" />);
    expect(screen.getByRole('heading', { name: 'Laboratorio Avanzado' })).toBeInTheDocument();
  });

  it('renders the default title when no feature name is provided', () => {
    render(<PremiumLocked />);
    expect(screen.getByRole('heading', { name: 'Función Premium' })).toBeInTheDocument();
  });

  it('renders the message and the plans button', () => {
    render(<PremiumLocked featureName="X" />);
    expect(screen.getByText('Esta función requiere un plan premium.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver planes/i })).toBeInTheDocument();
  });

  it('renders a lock icon', () => {
    const { container } = render(<PremiumLocked featureName="X" />);
    expect(container.querySelector('[data-testid="LockIcon"]')).toBeInTheDocument();
  });

  it('navigates to /saas when the plans button is clicked', () => {
    render(<PremiumLocked featureName="X" />);
    fireEvent.click(screen.getByRole('button', { name: /ver planes/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/saas');
  });
});
