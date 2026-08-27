import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from '@/shared/components/ErrorBoundary';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

function ThrowError({ message = 'Test error' }: { message?: string }): never {
  throw new Error(message);
}

function SafeChild() {
  return <div>child content</div>;
}

function renderBoundary(children: React.ReactNode = <SafeChild />) {
  return render(
    <MemoryRouter>
      <ErrorBoundary>{children}</ErrorBoundary>
    </MemoryRouter>
  );
}

describe('ErrorBoundary', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normal state', () => {
    it('renders children when no error', () => {
      renderBoundary(<SafeChild />);
      expect(screen.getByText('child content')).toBeInTheDocument();
    });

    it('does not show error UI when no error', () => {
      renderBoundary(<SafeChild />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders error UI when child throws', () => {
      renderBoundary(<ThrowError />);
      expect(screen.getByText(/Algo salió mal/i)).toBeInTheDocument();
      expect(screen.getByText(/Ha ocurrido un error inesperado/i)).toBeInTheDocument();
    });

    it('renders error message from thrown error', () => {
      renderBoundary(<ThrowError message="Custom error" />);
      expect(screen.getByText('Custom error')).toBeInTheDocument();
    });

    it('renders retry button', () => {
      renderBoundary(<ThrowError />);
      expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
    });

    it('renders go home button', () => {
      renderBoundary(<ThrowError />);
      expect(screen.getByRole('button', { name: /Ir al inicio/i })).toBeInTheDocument();
    });
  });

  describe('retry behavior', () => {
    it('resets state on retry click', () => {
      let shouldThrow = true;
      function ConditionalThrow() {
        if (shouldThrow) throw new Error('Oops');
        return <div>recovered</div>;
      }
      renderBoundary(<ConditionalThrow />);
      expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
      expect(screen.getByText('recovered')).toBeInTheDocument();
    });
  });

  describe('goHome behavior', () => {
    it('navigates to dashboard on go home click', () => {
      renderBoundary(<ThrowError />);
      fireEvent.click(screen.getByRole('button', { name: /Ir al inicio/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
