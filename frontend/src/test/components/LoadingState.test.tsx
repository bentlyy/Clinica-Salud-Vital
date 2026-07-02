import { render, screen } from '@testing-library/react';
import LoadingState from '../../components/LoadingState';

vi.mock('../../i18n/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key === 'loading_state.message' ? 'Cargando...' : key }),
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

  it('applies fullPage class when fullPage is true', () => {
    const { container } = render(<LoadingState fullPage />);
    expect(container.firstChild).toHaveClass('loading-state-full');
  });

  it('does not apply fullPage class by default', () => {
    const { container } = render(<LoadingState />);
    expect(container.firstChild).not.toHaveClass('loading-state-full');
  });

  it('renders spinner div', () => {
    const { container } = render(<LoadingState />);
    expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
  });
});
