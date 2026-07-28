import type { ReportType } from '../types/report.types';

interface ReportMeta {
  title: string;
  generatedAt: string;
  period: string;
}

function meta(type: ReportType, dateFrom: string, dateTo: string): ReportMeta {
  const labels: Record<ReportType, string> = {
    appointments: 'Reporte de Citas Médicas',
    revenue: 'Reporte de Ingresos',
    patients: 'Reporte de Pacientes',
    laboratory: 'Reporte de Laboratorio',
    custom: 'Reporte Personalizado',
  };
  return {
    title: labels[type] || 'Reporte',
    generatedAt: new Date().toLocaleString('es-CL'),
    period: `${formatDate(dateFrom)} – ${formatDate(dateTo)}`,
  };
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(v);
}

function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','));
  }
  return lines.join('\n');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Appointments ──────────────────────────────────────────────

interface AppointmentRow {
  id: number;
  date: string;
  time: string;
  status: string;
  patient_name: string;
  patient_email: string;
  doctor_name: string;
  specialty_name: string;
}

function generateAppointmentsReport(data: AppointmentRow[], dateFrom: string, dateTo: string) {
  const m = meta('appointments', dateFrom, dateTo);

  const statusLabels: Record<string, string> = {
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    pending: 'Pendiente',
    no_show: 'No asistió',
  };

  const headers = ['#', 'Fecha', 'Hora', 'Paciente', 'Email Paciente', 'Doctor', 'Especialidad', 'Estado'];
  const rows = data.map((r, i) => [
    i + 1,
    formatDate(r.date),
    r.time?.slice(0, 5) || r.time,
    r.patient_name || 'Sin paciente',
    r.patient_email || '—',
    r.doctor_name || 'Sin asignar',
    r.specialty_name || '—',
    statusLabels[r.status] || r.status,
  ]);

  const summary = `
RESUMEN DEL REPORTE
====================
Periodo:            ${m.period}
Fecha de generación: ${m.generatedAt}
Total de citas:     ${data.length}

Distribución por estado:
${Object.entries(
    data.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([s, c]) => `  ${(statusLabels[s] || s).padEnd(16)} ${c}`)
    .join('\n')}
`;

  const csv = toCsv(headers, rows);
  const full = summary + '\nDETALLE\n=======\n' + csv;

  downloadBlob(full, `citas_${dateFrom}_${dateTo}.csv`, 'text/csv;charset=utf-8');
}

// ─── Revenue ───────────────────────────────────────────────────

interface InvoiceRow {
  id: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
  patient_name: string;
  items: Array<{ description: string; amount: number }> | string;
}

function generateRevenueReport(data: InvoiceRow[], dateFrom: string, dateTo: string) {
  const m = meta('revenue', dateFrom, dateTo);

  const totalRevenue = data.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  const paymentLabels: Record<string, string> = {
    paid: 'Pagada',
    pending: 'Pendiente',
    partial: 'Parcial',
    cancelled: 'Anulada',
  };

  const headers = ['#', 'Fecha', 'Paciente', 'Monto Total', 'Estado de Pago', 'Ítems'];
  const rows = data.map((r, i) => {
    let items: Array<{ description: string; amount: number }> = [];
    if (Array.isArray(r.items)) {
      items = r.items;
    } else if (typeof r.items === 'string') {
      try { items = JSON.parse(r.items); } catch { items = []; }
    }
    const itemSummary = items.map((it) => it.description).join('; ') || '—';
    return [
      i + 1,
      formatDate(r.created_at?.slice(0, 10) || ''),
      r.patient_name || 'Sin paciente',
      formatCurrency(Number(r.total_amount || 0)),
      paymentLabels[r.payment_status] || r.payment_status || '—',
      itemSummary,
    ];
  });

  const byStatus = data.reduce<Record<string, { count: number; total: number }>>((acc, r) => {
    const s = r.payment_status || 'unknown';
    if (!acc[s]) acc[s] = { count: 0, total: 0 };
    acc[s].count += 1;
    acc[s].total += Number(r.total_amount || 0);
    return acc;
  }, {});

  const summary = `
RESUMEN DEL REPORTE
====================
Periodo:              ${m.period}
Fecha de generación:  ${m.generatedAt}
Total de facturas:    ${data.length}
Ingresos totales:     ${formatCurrency(totalRevenue)}

Desglose por estado de pago:
${Object.entries(byStatus)
    .map(([s, v]) => `  ${(paymentLabels[s] || s).padEnd(16)} ${String(v.count).padStart(4)} facturas  ${formatCurrency(v.total)}`)
    .join('\n')}
`;

  const csv = toCsv(headers, rows);
  const full = summary + '\nDETALLE\n=======\n' + csv;

  downloadBlob(full, `ingresos_${dateFrom}_${dateTo}.csv`, 'text/csv;charset=utf-8');
}

// ─── Patients ──────────────────────────────────────────────────

interface PatientRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  total_appointments: number;
  last_appointment: string;
}

function generatePatientsReport(data: PatientRow[], dateFrom: string, dateTo: string) {
  const m = meta('patients', dateFrom, dateTo);

  const headers = ['#', 'Nombre', 'Email', 'Teléfono', 'Citas Totales', 'Última Cita'];
  const rows = data.map((r, i) => [
    i + 1,
    r.name || 'Sin nombre',
    r.email || '—',
    r.phone || '—',
    r.total_appointments || 0,
    r.last_appointment ? formatDate(r.last_appointment.slice(0, 10)) : 'Sin citas',
  ]);

  const totalAppointments = data.reduce((sum, r) => sum + Number(r.total_appointments || 0), 0);
  const withAppointments = data.filter((r) => Number(r.total_appointments || 0) > 0).length;

  const summary = `
RESUMEN DEL REPORTE
====================
Periodo:                ${m.period}
Fecha de generación:    ${m.generatedAt}
Total de pacientes:     ${data.length}
Pacientes con citas:    ${withAppointments}
Citas totales:          ${totalAppointments}
Promedio citas/paciente: ${data.length > 0 ? (totalAppointments / data.length).toFixed(1) : 0}
`;

  const csv = toCsv(headers, rows);
  const full = summary + '\nDETALLE\n=======\n' + csv;

  downloadBlob(full, `pacientes_${dateFrom}_${dateTo}.csv`, 'text/csv;charset=utf-8');
}

// ─── Laboratory ────────────────────────────────────────────────

interface LabRow {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  notes: string;
  request_number: string;
  patient_name: string;
  doctor_name: string;
}

function generateLaboratoryReport(data: LabRow[], dateFrom: string, dateTo: string) {
  const m = meta('laboratory', dateFrom, dateTo);

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    collected: 'Muestra recolectada',
    in_progress: 'En proceso',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };

  const headers = ['#', 'N° Solicitud', 'Fecha', 'Paciente', 'Doctor', 'Notas', 'Estado'];
  const rows = data.map((r, i) => [
    i + 1,
    r.request_number || `#${r.id}`,
    formatDate(r.created_at?.slice(0, 10) || ''),
    r.patient_name || 'Sin paciente',
    r.doctor_name || 'Sin asignar',
    r.notes || '—',
    statusLabels[r.status] || r.status,
  ]);

  const completed = data.filter((r) => r.status === 'completed').length;

  const summary = `
RESUMEN DEL REPORTE
====================
Periodo:              ${m.period}
Fecha de generación:  ${m.generatedAt}
Total de solicitudes: ${data.length}
Completadas:          ${completed}
Pendientes:           ${data.filter((r) => r.status === 'pending').length}
En proceso:           ${data.filter((r) => r.status === 'in_progress').length}

Distribución por estado:
${Object.entries(
    data.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([s, c]) => `  ${(statusLabels[s] || s).padEnd(24)} ${c}`)
    .join('\n')}
`;

  const csv = toCsv(headers, rows);
  const full = summary + '\nDETALLE\n=======\n' + csv;

  downloadBlob(full, `laboratorio_${dateFrom}_${dateTo}.csv`, 'text/csv;charset=utf-8');
}

// ─── Dispatcher ────────────────────────────────────────────────

export function downloadReport(type: ReportType, resultUrl: string, dateFrom: string, dateTo: string) {
  let data: unknown;
  try {
    data = JSON.parse(resultUrl);
  } catch {
    data = resultUrl;
  }

  if (typeof data === 'string') {
    downloadBlob(data, `reporte_${type}_${dateFrom}_${dateTo}.txt`, 'text/plain;charset=utf-8');
    return;
  }

  switch (type) {
    case 'appointments': {
      const record = data as Record<string, unknown>;
      const rows = Array.isArray(data) ? data : (Array.isArray(record.appointments) ? record.appointments : []) as AppointmentRow[];
      generateAppointmentsReport(rows, dateFrom, dateTo);
      break;
    }
    case 'revenue': {
      const record = data as Record<string, unknown>;
      const rows = (Array.isArray(record.invoices) ? record.invoices : (Array.isArray(data) ? data : [])) as InvoiceRow[];
      generateRevenueReport(rows, dateFrom, dateTo);
      break;
    }
    case 'patients': {
      const record = data as Record<string, unknown>;
      const rows = (Array.isArray(record.patients) ? record.patients : (Array.isArray(data) ? data : [])) as PatientRow[];
      generatePatientsReport(rows, dateFrom, dateTo);
      break;
    }
    case 'laboratory': {
      const record = data as Record<string, unknown>;
      const rows = (Array.isArray(record.results) ? record.results : (Array.isArray(data) ? data : [])) as LabRow[];
      generateLaboratoryReport(rows, dateFrom, dateTo);
      break;
    }
    default: {
      const json = JSON.stringify(data, null, 2);
      downloadBlob(json, `reporte_${type}_${dateFrom}_${dateTo}.json`, 'application/json;charset=utf-8');
      break;
    }
  }
}
