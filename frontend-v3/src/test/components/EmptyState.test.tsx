import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from '@/shared/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders message when provided', () => {
    render(<EmptyState title="Empty" message="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('does not render message when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText('Nothing here')).not.toBeInTheDocument();
  });

  it('renders default icon when no icon prop', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const icon = container.querySelector('.MuiSvgIcon-root');
    expect(icon).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(<EmptyState icon={<span data-testid="custom-icon">📦</span>} title="Empty" />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add Item', onClick }}
      />
    );
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  it('calls action.onClick when action button is clicked', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add Item', onClick }}
      />
    );
    screen.getByRole('button', { name: /add item/i }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders all props together', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={<span>📭</span>}
        title="No results"
        message="Try a different search"
        action={{ label: 'Help', onClick }}
      />
    );
    expect(screen.getByText('📭')).toBeInTheDocument();
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Try a different search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument();
  });
});
