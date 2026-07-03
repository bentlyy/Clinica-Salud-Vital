import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from '../../components/ErrorBoundary';
import { I18nContext } from '../../i18n/useI18n';

function ThrowError({ message = 'Test error' }) {
  throw new Error(message);
}

function SafeChild() {
  return <div>child content</div>;
}

function createI18nValue(translations) {
  return {
    t: (key) => translations[key] || key,
    tAll: () => ({}),
    locale: 'es',
  };
}

function renderBoundary({ children, i18nValue } = {}) {
  const contextValue = i18nValue || createI18nValue({});
  return render(
    <I18nContext.Provider value={contextValue}>
      <ErrorBoundary>{children || <SafeChild />}</ErrorBoundary>
    </I18nContext.Provider>
  );
}

function renderBoundaryWithoutI18n({ children } = {}) {
  return render(<ErrorBoundary>{children || <SafeChild />}</ErrorBoundary>);
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normal state', () => {
    it('renders children when no error', () => {
      renderBoundary({ children: <SafeChild /> });
      expect(screen.getByText('child content')).toBeInTheDocument();
    });

    it('does not show error UI buttons', () => {
      renderBoundary({ children: <SafeChild /> });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders error UI when child throws', () => {
      renderBoundary({ children: <ThrowError /> });
      expect(screen.getByText('error_boundary.title')).toBeInTheDocument();
      expect(screen.getByText('error_boundary.message')).toBeInTheDocument();
    });

    it('renders retry button with correct class', () => {
      renderBoundary({ children: <ThrowError /> });
      const retryBtn = screen.getByText('error_boundary.retry');
      expect(retryBtn).toBeInTheDocument();
      expect(retryBtn).toHaveClass('error-boundary__btn--retry');
    });

    it('renders go home button', () => {
      renderBoundary({ children: <ThrowError /> });
      expect(screen.getByText('error_boundary.go_home')).toBeInTheDocument();
    });
  });

  describe('i18n integration', () => {
    const esTranslations = createI18nValue({
      'error_boundary.title': 'Algo salió mal',
      'error_boundary.message': 'Ocurrió un error inesperado',
      'error_boundary.retry': 'Reintentar',
      'error_boundary.go_home': 'Volver al inicio',
    });

    it('renders translated strings from context', () => {
      renderBoundary({ children: <ThrowError />, i18nValue: esTranslations });
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
      expect(screen.getByText('Ocurrió un error inesperado')).toBeInTheDocument();
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
      expect(screen.getByText('Volver al inicio')).toBeInTheDocument();
    });

    it('falls back to key when context has no t function', () => {
      renderBoundaryWithoutI18n({ children: <ThrowError /> });
      expect(screen.getByText('error_boundary.title')).toBeInTheDocument();
      expect(screen.getByText('error_boundary.message')).toBeInTheDocument();
    });
  });

  describe('retry behavior', () => {
    it('resets state on retry click', () => {
      let shouldThrow = true;
      function ConditionalThrow() {
        if (shouldThrow) throw new Error('Oops');
        return <div>recovered</div>;
      }
      renderBoundary({ children: <ConditionalThrow /> });
      expect(screen.getByText('error_boundary.retry')).toBeInTheDocument();
      shouldThrow = false;
      fireEvent.click(screen.getByText('error_boundary.retry'));
      expect(screen.getByText('recovered')).toBeInTheDocument();
    });
  });

  describe('goHome behavior', () => {
    it('navigates to root on go home click', () => {
      renderBoundary({ children: <ThrowError /> });
      fireEvent.click(screen.getByText('error_boundary.go_home'));
      expect(window.location.href).toBe('http://localhost:3000/');
    });
  });
});
