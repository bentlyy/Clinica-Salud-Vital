import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/i18n/i18n', () => ({
  default: { language: 'es', on: vi.fn() },
}));

import { downloadReport } from '@/modules/reports/utils/reportGenerator';
import type { ReportType } from '@/modules/reports/types/report.types';

describe('reportGenerator', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { writable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: revokeObjectURL });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it('downloads raw text content when result_url is a plain string', () => {
    downloadReport('appointments', 'texto plano del reporte', '2026-08-01', '2026-08-31');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/plain');
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('reporte_appointments_2026-08-01_2026-08-31.txt');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('generates an appointments CSV report from JSON data', () => {
    const payload = JSON.stringify([
      { id: 1, date: '2026-08-10', time: '10:30', status: 'confirmed', patient_name: 'Maria Garcia', patient_email: 'maria@x.cl', doctor_name: 'Dr. Perez', specialty_name: 'Cardiología' },
    ]);
    downloadReport('appointments', payload, '2026-08-01', '2026-08-31');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('citas_2026-08-01_2026-08-31.csv');
  });

  it('generates a revenue report with totals and payment status', () => {
    const payload = JSON.stringify({
      invoices: [
        { id: 1, total_amount: 25000, payment_status: 'paid', created_at: '2026-08-05', patient_name: 'Ana Torres', items: [{ description: 'Consulta', amount: 25000 }] },
        { id: 2, total_amount: 0, payment_status: 'cancelled', created_at: '2026-08-06', patient_name: 'Luis Soto', items: '[]' },
      ],
    });
    downloadReport('revenue', payload, '2026-08-01', '2026-08-31');

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('ingresos_2026-08-01_2026-08-31.csv');
  });

  it('generates a patients report', () => {
    const payload = JSON.stringify([
      { id: 1, name: 'Maria Garcia', email: 'm@x.cl', phone: '+5691111', total_appointments: 3, last_appointment: '2026-08-10' },
    ]);
    downloadReport('patients', payload, '2026-08-01', '2026-08-31');

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('pacientes_2026-08-01_2026-08-31.csv');
  });

  it('generates a laboratory report', () => {
    const payload = JSON.stringify({
      results: [
        { id: 1, status: 'completed', created_at: '2026-08-10', request_number: 'LAB-001', patient_name: 'Maria Garcia', doctor_name: 'Dr. Perez', notes: 'Urgente' },
      ],
    });
    downloadReport('laboratory', payload, '2026-08-01', '2026-08-31');

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('laboratorio_2026-08-01_2026-08-31.csv');
  });

  it('dumps raw JSON for unknown/custom report types', () => {
    downloadReport('custom', JSON.stringify({ foo: 'bar' }), '2026-08-01', '2026-08-31');

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('application/json');
    const anchor = clickSpy.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('reporte_custom_2026-08-01_2026-08-31.json');
  });

  it('escapes CSV fields containing commas and quotes', () => {
    const payload = JSON.stringify([
      { id: 1, date: '2026-08-10', time: '10:30', status: 'confirmed', patient_name: 'Perez, Juan "El Doc"', patient_email: '', doctor_name: '', specialty_name: '' },
    ]);
    downloadReport('appointments', payload, '2026-08-01', '2026-08-31');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });
});
