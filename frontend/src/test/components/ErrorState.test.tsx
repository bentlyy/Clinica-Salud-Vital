import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from '../../components/ErrorState';

vi.mock('../../i18n/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key === 'error_state.retry' ? 'Reintentar' : key }),
}));

describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Algo salió mal" />);
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByText('Reintentar')).not.toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
