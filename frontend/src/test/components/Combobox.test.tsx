import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
vi.mock('../../api/axios', () => ({
  default: { get: (...args) => mockGet(...args) },
}));

import Combobox from '../../components/Combobox';

const SPECIALTIES = ['Cardiología', 'Pediatría', 'Dermatología', 'Neurología'];

function renderCombobox(props = {}) {
  const onChange = props.onChange || vi.fn();
  return {
    onChange,
    ...render(
      <Combobox
        value={props.value || ''}
        onChange={onChange}
        placeholder={props.placeholder}
        required={props.required}
        className={props.className}
      />
    ),
    onChange,
  };
}

function resolveSpecialties() {
  return SPECIALTIES.map(name => ({ name }));
}

describe('Combobox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(SPECIALTIES.map(name => ({ name })));
  });

  describe('rendering', () => {
    beforeEach(() => {
      mockGet.mockImplementation(() => new Promise(() => {}));
    });

    it('renders input with placeholder', () => {
      renderCombobox({ placeholder: 'Select...' });
      expect(screen.getByPlaceholderText('Select...')).toBeInTheDocument();
    });

    it('renders with default placeholder', () => {
      renderCombobox();
      expect(screen.getByPlaceholderText('Escribe o selecciona...')).toBeInTheDocument();
    });

    it('renders toggle button', () => {
      renderCombobox();
      expect(screen.getByLabelText('Toggle dropdown')).toBeInTheDocument();
    });

    it('shows value when provided', () => {
      renderCombobox({ value: 'Cardiología' });
      const input = screen.getByDisplayValue('Cardiología');
      expect(input).toBeInTheDocument();
    });

    it('applies className to wrapper', () => {
      const { container } = renderCombobox({ className: 'my-class' });
      expect(container.querySelector('.combobox-wrapper.my-class')).toBeInTheDocument();
    });
  });

  describe('dropdown', () => {
    it('opens dropdown on focus', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await waitFor(() => {
        expect(screen.getByText('Cardiología')).toBeInTheDocument();
      });
    });

    it('opens dropdown on ArrowDown key', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      await waitFor(() => {
        expect(screen.getByText('Cardiología')).toBeInTheDocument();
      });
    });

    it('opens dropdown on ArrowUp key', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      await waitFor(() => {
        expect(screen.getByText('Cardiología')).toBeInTheDocument();
      });
    });

    it('closes dropdown on Escape', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await screen.findByText('Cardiología');
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByText('Cardiología')).not.toBeInTheDocument();
    });

    it('toggles dropdown on toggle button click', async () => {
      renderCombobox();
      const toggle = screen.getByLabelText('Toggle dropdown');
      fireEvent.click(toggle);
      await waitFor(() => {
        expect(screen.getByText('Cardiología')).toBeInTheDocument();
      });
      fireEvent.click(toggle);
      expect(screen.queryByText('Cardiología')).not.toBeInTheDocument();
    });

    it('shows empty message when options list is empty', async () => {
      mockGet.mockResolvedValue([]);
      renderCombobox({ value: '' });
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await waitFor(() => {
        expect(screen.getByText('Sin resultados')).toBeInTheDocument();
      });
    });


  });

  describe('fetching specialties', () => {
    it('fetches specialties on mount', () => {
      renderCombobox();
      expect(mockGet).toHaveBeenCalledWith('/specialties');
    });

    it('shows fetched options in dropdown', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await screen.findByText('Cardiología');
      expect(screen.getByText('Pediatría')).toBeInTheDocument();
      expect(screen.getByText('Dermatología')).toBeInTheDocument();
    });

    it('handles fetch error gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await waitFor(() => {
        expect(screen.getByText('Sin resultados')).toBeInTheDocument();
      });
    });

    it('handles cancel on unmount', () => {
      mockGet.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(SPECIALTIES.map(n => ({ name: n }))), 100)));
      const { unmount } = renderCombobox();
      unmount();
      expect(mockGet).toHaveBeenCalledWith('/specialties');
    });
  });

  describe('keyboard navigation', () => {
    it('highlights first option on ArrowDown', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await screen.findByText('Cardiología');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      await waitFor(() => {
        const options = document.querySelectorAll('.combobox-option');
        expect(options[0].classList.contains('highlighted')).toBe(true);
      });
    });

    it('highlights next option on repeated ArrowDown', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await screen.findByText('Cardiología');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      const options = document.querySelectorAll('.combobox-option');
      expect(options[1].classList.contains('highlighted')).toBe(true);
    });

    it('highlights previous option on ArrowUp', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await screen.findByText('Cardiología');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      const options = document.querySelectorAll('.combobox-option');
      expect(options[0].classList.contains('highlighted')).toBe(true);
    });

    it('selects highlighted option on Enter', async () => {
      const { onChange } = renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await screen.findByText('Cardiología');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith('Cardiología');
    });

    it('closes dropdown after selecting on Enter', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await screen.findByText('Cardiología');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => {
        expect(screen.queryByText('Cardiología')).not.toBeInTheDocument();
      });
    });

    it('highlights on mouse enter', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      const option = await screen.findByText('Cardiología');
      fireEvent.mouseEnter(option);
      expect(option.classList.contains('highlighted')).toBe(true);
    });
  });

  describe('filtering', () => {
    it('filters options by typed value', async () => {
      renderCombobox({ value: 'der' });
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await waitFor(() => {
        expect(screen.queryByText('Cardiología')).not.toBeInTheDocument();
        expect(screen.getByText('Dermatología')).toBeInTheDocument();
      });
    });

    it('shows add-new option when typed value is new', async () => {
      renderCombobox({ value: 'NuevaEspecialidad' });
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await screen.findByText('Agregar "NuevaEspecialidad"');
    });

    it('selects new value via add-new option', async () => {
      const { onChange } = renderCombobox({ value: 'NuevaEspecialidad' });
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      const addNew = await screen.findByText('Agregar "NuevaEspecialidad"');
      fireEvent.mouseDown(addNew);
      expect(onChange).toHaveBeenCalledWith('NuevaEspecialidad');
    });

    it('does not show add-new when value matches existing', async () => {
      renderCombobox({ value: 'Cardiología' });
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await waitFor(() => {
        expect(screen.queryByText(/Agregar/)).not.toBeInTheDocument();
      });
    });
  });

  describe('mouse selection', () => {
    it('selects option on mouse down', async () => {
      const { onChange } = renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      const option = await screen.findByText('Cardiología');
      fireEvent.mouseDown(option);
      expect(onChange).toHaveBeenCalledWith('Cardiología');
    });

    it('closes dropdown after mouse selection', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      const option = await screen.findByText('Cardiología');
      fireEvent.mouseDown(option);
      expect(screen.queryByText('Cardiología')).not.toBeInTheDocument();
    });
  });

  describe('blur handling', () => {
    it('closes dropdown on blur', async () => {
      renderCombobox();
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await screen.findByText('Cardiología');
      fireEvent.blur(input);
      expect(screen.queryByText('Cardiología')).not.toBeInTheDocument();
    });
  });

  describe('onChange updates', () => {
    it('calls onChange when typing', () => {
      const onChange = vi.fn();
      renderCombobox({ onChange });
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Car' } });
      expect(onChange).toHaveBeenCalledWith('Car');
    });
  });
});
