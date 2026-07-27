import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoadingState } from '@/shared/components/ui/LoadingState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        loading: 'Cargando...',
      };
      if (opts?.message) return opts.message as string;
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

describe('LoadingState', () => {
  it('renders default message when no message prop', () => {
    render(<LoadingState />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('renders custom message when message prop provided', () => {
    render(<LoadingState message="Cargando datos..." />);
    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
  });

  it('renders a circular progress spinner', () => {
    const { container } = render(<LoadingState />);
    const spinner = container.querySelector('.MuiCircularProgress-root');
    expect(spinner).toBeInTheDocument();
  });
});
