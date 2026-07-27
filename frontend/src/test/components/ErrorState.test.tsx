import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState } from '@/shared/components/ui/ErrorState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        error_default_title: 'Algo salió mal',
        error_default_message: 'Ocurrió un error inesperado. Intenta de nuevo.',
        error_forbidden_title: 'Acceso denegado',
        error_forbidden_message: 'No tienes permisos para acceder a este recurso.',
        error_not_found_title: 'No encontrado',
        error_not_found_message: 'El recurso que buscas no existe o fue eliminado.',
        retry: 'Reintentar',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

describe('ErrorState', () => {
  it('renders default error title and message', () => {
    render(<ErrorState />);
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByText('Ocurrió un error inesperado. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('renders custom message from error prop', () => {
    const error = new Error('Custom error message');
    render(<ErrorState error={error} />);
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button', { name: /Reintentar/i })).not.toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders forbidden variant', () => {
    render(<ErrorState variant="forbidden" />);
    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
    expect(screen.getByText('No tienes permisos para acceder a este recurso.')).toBeInTheDocument();
  });

  it('renders notFound variant', () => {
    render(<ErrorState variant="notFound" />);
    expect(screen.getByText('No encontrado')).toBeInTheDocument();
    expect(screen.getByText('El recurso que buscas no existe o fue eliminado.')).toBeInTheDocument();
  });
});
