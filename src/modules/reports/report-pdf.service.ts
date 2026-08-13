/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';

const TITLES: Record<string, string> = {
  appointments: 'REPORTE DE CITAS',
  revenue: 'REPORTE DE INGRESOS',
  patients: 'REPORTE DE PACIENTES',
  laboratory: 'REPORTE DE LABORATORIO',
};

const formatDate = (value: any): string => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-CL');
};

const getColumns = (type: string): string[] => {
  switch (type) {
    case 'appointments':
      return ['Paciente', 'Doctor', 'Especialidad', 'Fecha', 'Hora', 'Estado'];
    case 'revenue':
      return ['Paciente', 'Monto', 'Estado', 'Fecha'];
    case 'patients':
      return ['Nombre', 'Email', 'Teléfono', 'Citas', 'Última cita'];
    case 'laboratory':
      return ['N° Solicitud', 'Paciente', 'Doctor', 'Estado', 'Fecha'];
    default:
      return ['Campo', 'Valor'];
  }
};

const getRows = (type: string, data: any): any[][] => {
  switch (type) {
    case 'appointments': {
      const rows = Array.isArray(data?.appointments) ? data.appointments : [];
      return rows.map((r: any) => [
        r.patient_name || '',
        r.doctor_name || '',
        r.specialty_name || '',
        formatDate(r.date),
        r.time || '',
        r.status || '',
      ]);
    }
    case 'revenue': {
      const rows = Array.isArray(data?.invoices) ? data.invoices : [];
      return rows.map((r: any) => [
        r.patient_name || '',
        `$${Number(r.total_amount || 0).toLocaleString('es-CL')}`,
        r.payment_status || '',
        formatDate(r.created_at),
      ]);
    }
    case 'patients': {
      const rows = Array.isArray(data?.patients) ? data.patients : [];
      return rows.map((r: any) => [
        r.name || '',
        r.email || '',
        r.phone || '',
        r.total_appointments != null ? String(r.total_appointments) : '0',
        formatDate(r.last_appointment),
      ]);
    }
    case 'laboratory': {
      const rows = Array.isArray(data?.results) ? data.results : [];
      return rows.map((r: any) => [
        r.request_number || r.id || '',
        r.patient_name || '',
        r.doctor_name || '',
        r.status || '',
        formatDate(r.created_at),
      ]);
    }
    default: {
      const entries = Object.entries(data || {}).filter(([key]) => key !== 'total');
      return entries.length > 0 ? entries.map(([key, value]) => [key, String(value ?? '')]) : [['type', 'custom']];
    }
  }
};

const drawTable = (doc: any, headers: string[], rows: any[][], startY: number): number => {
  const left = 50;
  const tableWidth = 500;
  const colWidth = tableWidth / headers.length;
  const rowHeight = 20;
  let y = startY;

  doc.font('Helvetica-Bold').fontSize(9);
  doc.rect(left, y, tableWidth, rowHeight).fill('#eeeeee');
  doc.fillColor('#000000');
  headers.forEach((header, i) => {
    doc.text(header, left + i * colWidth + 4, y + 6, { width: colWidth - 8 });
  });
  y += rowHeight;

  doc.font('Helvetica').fontSize(8);
  for (const row of rows) {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    doc.rect(left, y, tableWidth, rowHeight).stroke('#cccccc');
    row.forEach((cell, i) => {
      doc.text(String(cell ?? ''), left + i * colWidth + 4, y + 6, { width: colWidth - 8 });
    });
    y += rowHeight;
  }

  return y;
};

export const generateReportPDF = async (report: any, _tenantId?: string): Promise<Buffer> => {
  const type = report?.type || 'custom';
  const data = report?.data || {};
  const config = report?.config || {};
  const title = TITLES[type] || 'REPORTE';

  return new Promise((resolve, reject) => {
    try {
      const doc: any = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let y = 50;

      doc.fontSize(18).font('Helvetica-Bold').text(title, 50, y, { align: 'center', width: 500 });
      y += 28;

      doc.fontSize(10).font('Helvetica');
      if (config.date_from && config.date_to) {
        doc.text(`Periodo: ${config.date_from} a ${config.date_to}`, 50, y, { align: 'center', width: 500 });
        y += 20;
      }

      y += 5;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 15;

      if (type === 'revenue') {
        const total = Number(data.totalRevenue || 0);
        doc.font('Helvetica-Bold').fontSize(11)
          .text(`Ingresos totales: $${total.toLocaleString('es-CL')}`, 50, y, { width: 500 });
        y += 22;
      }

      y = drawTable(doc, getColumns(type), getRows(type, data), y) + 10;

      y += 10;
      doc.fontSize(8).font('Helvetica')
        .text(`Reporte generado: ${new Date().toLocaleString('es-CL')}`, 50, y, { width: 500 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
