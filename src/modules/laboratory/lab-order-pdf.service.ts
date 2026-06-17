/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';

export const generateLabOrderPDF = async (labRequestId: number | string, tenantId: string): Promise<Buffer> => {
  const result = await pool.query(`
    SELECT
      lr.id, lr.request_number, lr.created_at, lr.priority, lr.notes,
      d.name AS doctor_name, d.specialty AS doctor_specialty, d.email AS doctor_email,
      u.name AS patient_name, u.rut AS patient_rut, u.email AS patient_email, u.phone AS patient_phone,
      COALESCE(
        json_agg(
          json_build_object('name', lt.name, 'code', lt.code, 'unit', lt.unit, 'category', lt.category)
          ORDER BY lt.name
        ) FILTER (WHERE lt.id IS NOT NULL),
        '[]'::json
      ) AS tests
    FROM lab_requests lr
    JOIN doctors d ON lr.doctor_id = d.id
    JOIN users u ON lr.patient_id = u.id
    LEFT JOIN lab_request_items lri ON lri.lab_request_id = lr.id
    LEFT JOIN lab_tests lt ON lt.id = lri.lab_test_id
    WHERE lr.id = $1 AND lr.tenant_id = $2
    GROUP BY lr.id, d.id, u.id
  `, [labRequestId, tenantId]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Lab request not found');
  }

  const order = result.rows[0];

  return new Promise((resolve, reject) => {
    try {
      const doc: any = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let y = 50;

      doc.fontSize(20).font('Helvetica-Bold').text('ORDEN DE EXÁMENES', 50, y, { align: 'center', width: 500 });
      y += 40;

      doc.fontSize(10).font('Helvetica');
      doc.text(`Dr./Dra.: ${order.doctor_name}`, 50, y, { width: 250 });
      y += 15;
      doc.text(`Especialidad: ${order.doctor_specialty || 'General'}`, 50, y, { width: 250 });
      y += 15;
      doc.text(`Email: ${order.doctor_email}`, 50, y, { width: 250 });
      y += 25;

      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 15;

      doc.font('Helvetica-Bold').text('PACIENTE:', 50, y, { width: 100 });
      doc.font('Helvetica');
      doc.text(`Nombre: ${order.patient_name || 'N/A'}`, 150, y, { width: 400 });
      y += 15;
      doc.text(`RUT: ${order.patient_rut || 'N/A'}`, 150, y, { width: 400 });
      y += 15;
      doc.text(`Email: ${order.patient_email || 'N/A'}`, 150, y, { width: 400 });
      y += 15;
      doc.text(`Teléfono: ${order.patient_phone || 'N/A'}`, 150, y, { width: 400 });
      y += 25;

      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 15;

      doc.font('Helvetica-Bold').text('EXÁMENES SOLICITADOS:', 50, y, { width: 300 });
      y += 20;

      const tests = order.tests || [];
      if (tests.length > 0) {
        doc.rect(50, y, 500, tests.length * 22 + 10).fillAndStroke('#f9f9f9', '#cccccc');
        y += 5;
        doc.fontSize(10).font('Helvetica');
        for (const test of tests) {
          doc.text(`• ${test.name}${test.category ? ` (${test.category})` : ''}${test.unit ? ` — ${test.unit}` : ''}`, 60, y, { width: 480 });
          y += 22;
        }
        y += 10;
      } else {
        doc.fontSize(10).font('Helvetica').text('(Sin exámenes específicos)', 60, y, { width: 480 });
        y += 25;
      }

      if (order.notes) {
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 15;
        doc.font('Helvetica-Bold').text('Notas:', 50, y, { width: 100 });
        doc.font('Helvetica').text(order.notes, 150, y, { width: 400 });
        y += 25;
      }

      y += 30;
      doc.fontSize(10).font('Helvetica-Bold').text('FIRMA DEL DOCTOR', 50, y, { width: 250 });
      y += 30;
      doc.moveTo(50, y).lineTo(250, y).stroke();
      doc.fontSize(8).font('Helvetica').text(order.doctor_name, 50, y + 5, { width: 200, align: 'center' });

      y += 40;
      doc.fontSize(8).text(`Fecha de emisión: ${new Date(order.created_at).toLocaleDateString('es-CL')}`, 50, y, { width: 250 });
      y += 12;
      doc.text(`N° Orden: ${order.request_number || order.id}`, 50, y, { width: 250 });
      y += 12;
      doc.text(`Prioridad: ${order.priority || 'routine'}`, 50, y, { width: 250 });
      y += 20;
      doc.text('Este documento es una orden médica válida para exámenes de laboratorio.', 50, y, { align: 'center', width: 500 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
