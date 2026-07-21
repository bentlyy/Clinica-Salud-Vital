export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: number;
  tenant_id: number;
  patient_id: number;
  booking_id?: number;
  invoice_number: string;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  due_date: string;
  paid_at?: string;
  notes?: string;
  patient_name?: string;
  items: InvoiceItem[];
  created_at: string;
}

export interface CreateInvoiceInput {
  patient_id: number;
  booking_id?: number;
  items: InvoiceItem[];
  tax?: number;
  due_date: string;
  notes?: string;
}

export interface UpdateInvoiceInput {
  items?: InvoiceItem[];
  tax?: number;
  due_date?: string;
  notes?: string;
  status?: InvoiceStatus;
}

export interface BillingStats {
  total_invoices: number;
  pending_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  total_revenue: number;
  pending_amount: number;
  paid_amount: number;
  overdue_amount: number;
  invoices_last_30_days: number;
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
}
