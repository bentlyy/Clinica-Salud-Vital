import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import BillingPage from '@/modules/billing/pages/BillingPage';
import type { Invoice, BillingStats } from '@/modules/billing/types/billing.types';

const mockHookReturn = vi.hoisted(() => ({
  data: undefined as { data: Invoice[]; total: number } | undefined,
  isLoading: true,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const mockStatsReturn = vi.hoisted(() => ({
  data: undefined as BillingStats | undefined,
  isLoading: true,
}));

const mockMutations = vi.hoisted(() => ({
  createInvoice: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  payInvoice: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  deleteInvoice: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      title: 'Facturación',
      subtitle: 'Gestiona las facturas de la clínica',
      newInvoice: 'Nueva Factura',
      loading_invoices: 'Cargando facturas...',
      noInvoices: 'Sin facturas',
      create_first_invoice: 'Crea la primera factura',
      confirm_delete: '¿Eliminar factura?',
      invoiceNumber: 'N° Factura',
      patient: 'Paciente',
      amount: 'Monto',
      status: 'Estado',
      dueDate: 'Vencimiento',
      view_detail: 'Ver detalle',
      markAsPaid: 'Marcar como pagada',
      patient_id: 'Paciente #{{id}}',
      'statusLabels.pending': 'Pendiente',
      'statusLabels.paid': 'Pagada',
      'statusLabels.overdue': 'Vencida',
      'statusLabels.cancelled': 'Cancelada',
      all: 'Todos',
      actions: 'Acciones',
      delete: 'Eliminar',
      rowsPerPage: 'Filas por página',
      of: 'de',
      moreThan: 'más de',
    };
    return {
      t: (key: string, opts?: string | Record<string, unknown>) => {
        let value = translations[key] ?? (typeof opts === 'string' ? opts : key);
        if (opts && typeof opts === 'object') {
          return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts[name]));
        }
        return value;
      },
      i18n: { language: 'es' },
    };
  },
}));

vi.mock('@/shared/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@clinic.com', role: 'admin', name: 'Admin', tenant_id: 1 },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: vi.fn(() => true),
  }),
}));

vi.mock('@/modules/billing/hooks/useBilling', () => ({
  useInvoiceList: () => mockHookReturn,
  useBillingStats: () => mockStatsReturn,
  useCreateInvoice: () => mockMutations.createInvoice(),
  usePayInvoice: () => mockMutations.payInvoice(),
  useDeleteInvoice: () => mockMutations.deleteInvoice(),
}));

vi.mock('@/modules/billing/components/InvoiceFormDialog', () => ({
  InvoiceFormDialog: () => null,
}));

const invoice: Invoice = {
  id: 1,
  tenant_id: 1,
  patient_id: 10,
  invoice_number: 'INV-001',
  amount: 100,
  tax_amount: 19,
  discount_amount: 0,
  total_amount: 119,
  status: 'pending',
  due_date: '2026-08-15',
  items: [],
  created_at: '2026-08-01T10:00:00Z',
  patient_name: 'Maria Garcia',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <BillingPage />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('BillingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn.isLoading = true;
    mockHookReturn.data = undefined;
    mockHookReturn.error = null;
    mockHookReturn.refetch = vi.fn();
    mockStatsReturn.isLoading = true;
    mockStatsReturn.data = undefined;
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('shows the page title and loading state', () => {
    renderPage();
    expect(screen.getByText('Facturación')).toBeInTheDocument();
    expect(screen.getByText('Cargando facturas...')).toBeInTheDocument();
  });

  it('renders summary cards with formatted values', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    mockStatsReturn.isLoading = false;
    mockStatsReturn.data = {
      total_outstanding: 200,
      total_paid: 300,
      overdue_invoices: 1,
    };
    renderPage();
    expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    expect(screen.getByText('Pendientes de Pago')).toBeInTheDocument();
    expect(screen.getByText('Facturas Vencidas')).toBeInTheDocument();
    expect(screen.getByText('Total Pagado')).toBeInTheDocument();
  });

  it('renders status filter chips', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Pagada')).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });

  it('shows empty state when there are no invoices', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Sin facturas')).toBeInTheDocument();
    expect(screen.getByText('Crea la primera factura')).toBeInTheDocument();
  });

  it('renders invoice rows with formatted data', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [invoice], total: 1 };
    renderPage();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
  });

  it('calls payInvoice when clicking the mark-as-paid action', () => {
    const mutate = vi.fn();
    mockMutations.payInvoice.mockReturnValue({ mutate, isPending: false });
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [invoice], total: 1 };
    renderPage();

    const payButton = screen.getByRole('button', { name: /Marcar como pagada/i });
    fireEvent.click(payButton);
    expect(mutate).toHaveBeenCalledWith(1);
  });

  it('calls deleteInvoice after confirming the delete dialog', () => {
    const mutate = vi.fn();
    mockMutations.deleteInvoice.mockReturnValue({ mutate, isPending: false });
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [invoice], total: 1 };
    renderPage();

    const deleteButton = screen.getByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteButton);
    expect(mutate).toHaveBeenCalledWith(1);
  });

  it('does not delete when the user cancels the confirm dialog', () => {
    const mutate = vi.fn();
    mockMutations.deleteInvoice.mockReturnValue({ mutate, isPending: false });
    vi.stubGlobal('confirm', vi.fn(() => false));
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [invoice], total: 1 };
    renderPage();

    const deleteButton = screen.getByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteButton);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('opens the create invoice dialog when clicking the new invoice button', async () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.data = { data: [], total: 0 };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Nueva Factura/i }));
    await waitFor(() => {
      expect(mockMutations.createInvoice).toHaveBeenCalled();
    });
  });

  it('shows the error state when the list fails to load', () => {
    mockHookReturn.isLoading = false;
    mockHookReturn.error = new Error('Network error');
    renderPage();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });
});
