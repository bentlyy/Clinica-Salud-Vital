import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Combobox } from '@/shared/components/ui/Combobox';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('@/shared/services/api-client', () => ({
  apiClient: { get: mockGet },
}));

function renderCombobox(props: Partial<React.ComponentProps<typeof Combobox>> = {}) {
  const onChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState(props.value ?? '');
    return (
      <Combobox
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        {...props}
      />
    );
  }
  const utils = render(<Harness />);
  return { onChange, ...utils };
}

describe('Combobox', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('renders the input with the current value', () => {
    renderCombobox({ value: 'Casa' });
    expect(screen.getByRole('textbox')).toHaveValue('Casa');
  });

  it('renders the placeholder', () => {
    renderCombobox();
    expect(screen.getByPlaceholderText('Escribe o selecciona...')).toBeInTheDocument();
  });

  it('shows static options on focus', () => {
    renderCombobox({ options: ['Casa', 'Clinica'] });
    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.getByText('Casa')).toBeInTheDocument();
    expect(screen.getByText('Clinica')).toBeInTheDocument();
  });

  it('selects an option on mousedown', () => {
    const { onChange } = renderCombobox({ options: ['Casa', 'Clinica'] });
    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.mouseDown(screen.getByText('Clinica'));
    expect(onChange).toHaveBeenCalledWith('Clinica');
  });

  it('filters options while typing', async () => {
    const user = userEvent.setup();
    const { onChange } = renderCombobox({ options: ['Casa', 'Hospital'] });
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, 'ca');
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('ca');
      expect(screen.queryByText('Hospital')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Casa')).toBeInTheDocument();
  });

  it('offers to add a new value not present in the options', () => {
    const { onChange } = renderCombobox({ options: ['Casa'] });
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Nuevo Valor' } });
    const addOption = screen.getByText(/Agregar/);
    expect(addOption).toBeInTheDocument();
    fireEvent.mouseDown(addOption);
    expect(onChange).toHaveBeenCalledWith('Nuevo Valor');
  });

  it('shows "Sin resultados" when the list is empty', () => {
    renderCombobox({ options: [] });
    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('loads options from the API when fetchUrl is provided', async () => {
    mockGet.mockResolvedValue({ data: ['Remote A', 'Remote B'] });
    renderCombobox({ fetchUrl: '/api/options' });
    fireEvent.focus(screen.getByRole('textbox'));
    await waitFor(() => {
      expect(screen.getByText('Remote A')).toBeInTheDocument();
      expect(screen.getByText('Remote B')).toBeInTheDocument();
    });
    expect(mockGet).toHaveBeenCalledWith('/api/options');
  });

  it('maps API items with name/label fields', async () => {
    mockGet.mockResolvedValue({ data: { items: [{ name: 'X' }, { label: 'Y' }] } });
    renderCombobox({ fetchUrl: '/api/options' });
    fireEvent.focus(screen.getByRole('textbox'));
    await waitFor(() => {
      expect(screen.getByText('X')).toBeInTheDocument();
      expect(screen.getByText('Y')).toBeInTheDocument();
    });
  });

  it('clears options when the API call fails', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    renderCombobox({ fetchUrl: '/api/options' });
    fireEvent.focus(screen.getByRole('textbox'));
    await waitFor(() => {
      expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    });
  });

  it('selects the highlighted option with the Enter key', () => {
    const { onChange } = renderCombobox({ options: ['Casa', 'Clinica'] });
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // opens
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // highlight first
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('Casa');
  });

  it('closes the dropdown with the Escape key', () => {
    renderCombobox({ options: ['Casa'] });
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(screen.getByText('Casa')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('Casa')).not.toBeInTheDocument();
  });

  it('respects the disabled prop', () => {
    renderCombobox({ disabled: true });
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders the helper text and error state', () => {
    renderCombobox({ helperText: 'Campo requerido', error: true });
    expect(screen.getByText('Campo requerido')).toBeInTheDocument();
  });
});
