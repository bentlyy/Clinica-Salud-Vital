import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { SearchInput } from '@/modules/laboratory/components/shared/SearchInput';

function renderSearch(props: Partial<React.ComponentProps<typeof SearchInput>> = {}) {
  return render(
    <AppThemeProvider>
      <SearchInput value="" onChange={vi.fn()} {...props} />
    </AppThemeProvider>,
  );
}

describe('SearchInput', () => {
  it('renders the placeholder text', () => {
    renderSearch({ placeholder: 'Buscar pacientes...' });
    expect(screen.getByPlaceholderText('Buscar pacientes...')).toBeInTheDocument();
  });

  it('debounces onChange calls', async () => {
    const onChange = vi.fn();
    renderSearch({ onChange, debounceMs: 50 });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ana' } });

    // immediately after typing nothing should fire yet
    expect(onChange).not.toHaveBeenCalled();

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('ana'));
  });

  it('clears the input when the clear button is clicked', () => {
    const onChange = vi.fn();
    renderSearch({ onChange, debounceMs: 0 });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'texto' } });
    expect(input).toHaveValue('texto');

    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(input).toHaveValue('');
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('does not render the clear button when empty', () => {
    renderSearch();
    expect(screen.queryByRole('button', { name: 'clear' })).not.toBeInTheDocument();
  });

  it('syncs local state when the external value changes', () => {
    const { rerender } = render(
      <AppThemeProvider>
        <SearchInput value="ext" onChange={vi.fn()} />
      </AppThemeProvider>,
    );
    expect(screen.getByRole('textbox')).toHaveValue('ext');

    rerender(
      <AppThemeProvider>
        <SearchInput value="reset" onChange={vi.fn()} />
      </AppThemeProvider>,
    );
    expect(screen.getByRole('textbox')).toHaveValue('reset');
  });

  it('cleans up the pending debounce timer on unmount', async () => {
    const onChange = vi.fn();
    const { unmount } = renderSearch({ onChange, debounceMs: 5000 });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });
    unmount();

    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).not.toHaveBeenCalled();
  });
});
