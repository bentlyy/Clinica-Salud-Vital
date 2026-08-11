import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { InvoiceFormDialog } from '@/modules/billing/components/InvoiceFormDialog';

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children ?? null,
  };
});

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      newInvoice: 'Crear Nueva Factura',
      patient: 'Paciente',
      select_patient: 'Seleccionar paciente...',
      dueDate: 'Fecha de vencimiento',
      taxPercent: 'Impuesto (%)',
      items: 'Servicios',
      addItem: 'Agregar',
      description: 'Descripción',
      itemQuantity: 'Cantidad',
      itemPrice: 'Precio Unit.',
      total: 'Total',
      notes_optional: 'Notas (opcional)',
      cancel: 'Cancelar',
      createInvoice: 'Crear Factura',
      creating: 'Creando...',
    };
    return {
      t: (key: string, fallback?: string) => translations[key] ?? fallback ?? key,
      i18n: { language: 'es' },
    };
  },
}));

const props = {
  open: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  isLoading: false,
};

function renderDialog(overrides: Partial<typeof props> = {}) {
  return render(
    <AppThemeProvider>
      <InvoiceFormDialog {...props} {...overrides} />
    </AppThemeProvider>,
  );
}

describe('InvoiceFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dialog with the expected fields', () => {
    renderDialog();
    expect(screen.getByText('Crear Nueva Factura')).toBeInTheDocument();
    expect(screen.getByLabelText(/Paciente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha de vencimiento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Impuesto/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear Factura' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('shows validation errors when submitting an empty form', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Crear Factura' }));
    expect(await screen.findByText('Selecciona un paciente')).toBeInTheDocument();
    expect(await screen.findByText('La fecha de vencimiento es requerida')).toBeInTheDocument();
    expect(await screen.findByText('La descripción es requerida')).toBeInTheDocument();
  });

  it('adds a new item row when clicking the add button', () => {
    renderDialog();
    const descriptionInputs = screen.getAllByLabelText(/Descripción/i);
    expect(descriptionInputs).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getAllByLabelText(/Descripción/i)).toHaveLength(2);
  });

  it('disables the remove button when there is only one item', () => {
    renderDialog();
    const removeButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg[data-testid="DeleteIcon"]'));
    expect(removeButton).toBeDefined();
    expect(removeButton).toBeDisabled();
  });

  it('calls onClose when clicking cancel', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the creating label while loading', () => {
    renderDialog({ isLoading: true });
    expect(screen.getByRole('button', { name: 'Creando...' })).toBeDisabled();
  });

  it('updates subtotal and total when item values change', () => {
    renderDialog();
    const quantityInput = screen.getByLabelText(/Cantidad/i);
    const priceInput = screen.getByLabelText(/Precio Unit/i);

    fireEvent.change(quantityInput, { target: { value: '2' } });
    fireEvent.change(priceInput, { target: { value: '5000' } });

    expect(screen.getByText(/Subtotal:/)).toHaveTextContent('10.000');
    expect(screen.getByText(/Total:/)).toHaveTextContent('11.900');
  });
});
