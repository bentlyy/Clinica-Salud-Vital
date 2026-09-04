import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from '@/shared/components/ui/Pagination';

function renderPagination(props: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  const onPageChange = vi.fn();
  render(
    <Pagination page={props.page ?? 1} totalPages={props.totalPages ?? 1} onPageChange={props.onPageChange ?? onPageChange} {...props} />,
  );
  return onPageChange;
}

describe('Pagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders page buttons and navigation arrows', () => {
    renderPagination({ page: 3, totalPages: 5 });
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 5' })).toBeInTheDocument();
  });

  it('calls onPageChange when a page number is clicked', () => {
    const onPageChange = renderPagination({ page: 3, totalPages: 5 });
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('navigates to previous and next pages', () => {
    const onPageChange = renderPagination({ page: 3, totalPages: 5 });
    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('disables the previous button on the first page', () => {
    renderPagination({ page: 1, totalPages: 3 });
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  });

  it('disables the next button on the last page', () => {
    renderPagination({ page: 3, totalPages: 3 });
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('shows ellipsis when pages are far apart', () => {
    renderPagination({ page: 5, totalPages: 10 });
    expect(screen.getAllByText('…')).toHaveLength(2);
  });

  it('shows the total record count when provided', () => {
    renderPagination({ page: 1, totalPages: 3, total: 42 });
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
