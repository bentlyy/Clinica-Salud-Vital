import { render, screen } from '@testing-library/react';
import EmptyState from '../../components/EmptyState';

describe('EmptyState', () => {
  it('renders title when provided', () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders message when provided', () => {
    render(<EmptyState message="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState icon="📦" title="Empty" />);
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState action={<button>Add Item</button>} />);
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  it('renders nothing when no props provided', () => {
    const { container } = render(<EmptyState />);
    expect(container.querySelector('.empty-state')).toBeInTheDocument();
  });

  it('renders all props together', () => {
    render(
      <EmptyState
        icon="📭"
        title="No results"
        message="Try a different search"
        action={<a href="/help">Help</a>}
      />
    );
    expect(screen.getByText('📭')).toBeInTheDocument();
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Try a different search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /help/i })).toBeInTheDocument();
  });
});
