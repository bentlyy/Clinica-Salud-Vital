import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingState } from '@/shared/components/ui/LoadingState';

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
