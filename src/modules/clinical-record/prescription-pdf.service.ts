/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import { pool } from '../../shared/db';
import { NotFoundError } from '../../utils/errors';

export const generatePrescriptionPDF = async (prescription_id: number | string): Promise<Buffer> => {
  const prescriptionResult = await pool.query(`
    SELECT 
      p.*,
      cr.chief_complaint,
      cr.diagnosis,
      d.name AS doctor_name,
      d.specialty AS doctor_specialty,
      d.email AS doctor_email,
      d.id AS doctor_id,
      u.email AS patient_email,
      u.rut AS patient_rut,
      u.phone AS patient_phone,
      CONCAT(pn.first_name, ' ', pn.last_name) AS patient_name
    FROM prescriptions p
    JOIN clinical_records cr ON p.clinical_record_id = cr.id
    JOIN doctors d ON cr.doctor_id = d.id
    JOIN users u ON cr.patient_id = u.id
    LEFT JOIN patient_notes pn ON pn.patient_id = u.id
    WHERE p.id = $1
  `, [prescription_id]);

  if (prescriptionResult.rows.length === 0) {
    throw new NotFoundError('Prescription not found');
  }

  const prescription = prescriptionResult.rows[0];

  return new Promise((resolve, reject) => {
    try {
      const doc: any = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let y = 50;

      doc.fontSize(20).font('Helvetica-Bold').text('RECETA MÉDICA', 50, y, { align: 'center', width: 500 });
      y += 40;

      doc.fontSize(10).font('Helvetica');
      doc.text(`Dr./Dra.: ${prescription.doctor_name}`, 50, y, { width: 250 });
      y += 15;
      doc.text(`Especialidad: ${prescription.doctor_specialty || 'General'}`, 50, y, { width: 250 });
      y += 15;
      doc.text(`Email: ${prescription.doctor_email}`, 50, y, { width: 250 });
      y += 25;

      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 15;

      doc.font('Helvetica-Bold').text('PACIENTE:', 50, y, { width: 100 });
      doc.font('Helvetica');
      doc.text(`Nombre: ${prescription.patient_name || 'N/A'}`, 150, y, { width: 400 });
      y += 15;
      doc.text(`RUT: ${prescription.patient_rut || 'N/A'}`, 150, y, { width: 400 });
      y += 15;
      doc.text(`Email: ${prescription.patient_email || 'N/A'}`, 150, y, { width: 400 });
      y += 15;
      doc.text(`Teléfono: ${prescription.patient_phone || 'N/A'}`, 150, y, { width: 400 });
      y += 25;

      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 15;

      doc.font('Helvetica-Bold').text('TRATAMIENTO:', 50, y, { width: 150 });
      y += 20;
      doc.font('Helvetica');

      const boxY = y;
      doc.rect(50, boxY, 500, 60).fillAndStroke('#f0f0f0', '#cccccc');
      doc.fontSize(12).font('Helvetica-Bold').text(`Medicamento: ${prescription.medication}`, 60, boxY + 5, { width: 480 });
      doc.fontSize(10).font('Helvetica').text(`Dosis: ${prescription.dosage}`, 60, boxY + 22, { width: 480 });
      doc.text(`Frecuencia: ${prescription.frequency}`, 60, boxY + 35, { width: 480 });
      if (prescription.duration) {
        doc.text(`Duración: ${prescription.duration}`, 60, boxY + 48, { width: 480 });
      }
      y += 75;

      if (prescription.instructions) {
        doc.font('Helvetica-Bold').text('Instrucciones:', 50, y, { width: 150 });
        y += 15;
        doc.font('Helvetica').text(prescription.instructions, 50, y, { width: 500 });
        y += 25;
      }

      if (prescription.diagnosis) {
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 15;
        doc.font('Helvetica-Bold').text('DIAGNÓSTICO:', 50, y, { width: 150 });
        y += 15;
        doc.font('Helvetica').text(prescription.diagnosis, 50, y, { width: 500 });
        y += 25;
      }

      y += 50;
      doc.fontSize(8).text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CL')}`, 50, y, { width: 250 });
      y += 12;
      doc.text(`ID Receta: ${prescription.id}`, 50, y, { width: 250 });
      y += 12;
      doc.text('Este documento es una receta médica válida.', 50, y, { align: 'center', width: 500 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};