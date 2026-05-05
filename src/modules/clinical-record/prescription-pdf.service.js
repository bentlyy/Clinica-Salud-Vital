import PDFDocument from 'pdfkit';
import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';

export const generatePrescriptionPDF = async (prescription_id) => {
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
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header - Logo placeholder and title
      doc.fontSize(20).font('Helvetica-Bold').text('RECETA MÉDICA', { align: 'center' });
      doc.moveDown();

      // Doctor info
      doc.fontSize(10).font('Helvetica');
      doc.text(`Dr./Dra.: ${prescription.doctor_name}`, 50, null, { width: 250 });
      doc.text(`Especialidad: ${prescription.doctor_specialty || 'General'}`, 50, null, { width: 250 });
      doc.text(`Email: ${prescription.doctor_email}`, 50, null, { width: 250 });
      doc.moveDown();

      // Divider line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Patient info
      doc.font('Helvetica-Bold').text('PACIENTE:', 50, null, { width: 100 });
      doc.font('Helvetica');
      doc.text(`Nombre: ${prescription.patient_name || 'N/A'}`, 150, null, { width: 400 });
      doc.text(`RUT: ${prescription.patient_rut || 'N/A'}`, 150, null, { width: 400 });
      doc.text(`Email: ${prescription.patient_email || 'N/A'}`, 150, null, { width: 400 });
      doc.text(`Teléfono: ${prescription.patient_phone || 'N/A'}`, 150, null, { width: 400 });
      doc.moveDown();

      // Divider line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Prescription details
      doc.font('Helvetica-Bold').text('TRATAMIENTO:', 50, null, { width: 150 });
      doc.font('Helvetica');
      doc.moveDown();

      // Medication box
      doc.rect(50, doc.y, 500, 60).fillAndStroke('#f0f0f0', '#cccccc');
      doc.fontSize(12).font('Helvetica-Bold').text(`Medicamento: ${prescription.medication}`, 60, doc.y - 50, { width: 480 });
      doc.fontSize(10).font('Helvetica').text(`Dosis: ${prescription.dosage}`, 60, null, { width: 480 });
      doc.text(`Frecuencia: ${prescription.frequency}`, 60, null, { width: 480 });
      if (prescription.duration) {
        doc.text(`Duración: ${prescription.duration}`, 60, null, { width: 480 });
      }
      doc.moveDown(8);

      if (prescription.instructions) {
        doc.font('Helvetica-Bold').text('Instrucciones:', 50, null, { width: 150 });
        doc.font('Helvetica').text(prescription.instructions, 50, null, { width: 500 });
        doc.moveDown();
      }

      // Clinical record info
      if (prescription.diagnosis) {
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        doc.font('Helvetica-Bold').text('DIAGNÓSTICO:', 50, null, { width: 150 });
        doc.font('Helvetica').text(prescription.diagnosis, 50, null, { width: 500 });
        doc.moveDown();
      }

      // Footer
      doc.moveDown(10);
      doc.fontSize(8).text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CL')}`, 50, null, { width: 250 });
      doc.text(`ID Receta: ${prescription.id}`, 50, null, { width: 250 });
      doc.moveDown();
      doc.text('Este documento es una receta médica válida.', 50, null, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};