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
  doctor_id?: number;
  booking_id?: number;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  concept?: string;
  description?: string;
  currency?: string;
  status: InvoiceStatus;
  due_date: string;
  issued_at?: string;
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_data?: Record<string, unknown>;
  notes?: string;
  patient_name?: string;
  items: InvoiceItem[];
  created_at: string;
  updated_at?: string;
}

export interface CreateInvoiceInput {
  patient_id: number;
  doctor_id?: number;
  booking_id?: number;
  concept?: string;
  description?: string;
  amount?: number;
  tax_amount?: number;
  discount_amount?: number;
  items: InvoiceItem[];
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
  total_outstanding: number;
  total_paid: number;
  overdue_invoices: number;
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
}
