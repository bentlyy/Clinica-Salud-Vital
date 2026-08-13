import { pool } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { jwtManager } from '../../shared/jwt.service.js';
import { enqueueJob } from '../../shared/queue.service.js';

export interface LabResultPayload {
  scope?: string;
  labRequestId?: number | string;
  tenantId?: string;
  email?: string;
}

export const getLabResultsByRequest = async (labRequestId: number | string, tenantId: string) => {
  const result = await pool.query(`
    SELECT
      lr.id, lr.request_number, lr.created_at, lr.status, lr.priority, lr.notes,
      d.name AS doctor_name, d.specialty AS doctor_specialty,
      u.name AS patient_name, u.rut AS patient_rut, u.email AS patient_email, u.phone AS patient_phone,
      COALESCE(
        json_agg(
          json_build_object(
            'id', lri.id,
            'name', lt.name,
            'code', lt.code,
            'unit', lt.unit,
            'result_value', lri.result_value,
            'reference_range', lt.reference_ranges,
            'status', lri.status,
            'result_notes', lri.result_notes,
            'validated_by_tech', lri.validated_by_tech,
            'validated_at_tech', lri.validated_at_tech,
            'validated_by_doctor', lri.validated_by_doctor,
            'validated_at_doctor', lri.validated_at_doctor,
            'signed_by', lri.signed_by,
            'signed_at', lri.signed_at
          )
          ORDER BY lt.name
        ) FILTER (WHERE lri.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM lab_requests lr
    LEFT JOIN doctors d ON lr.doctor_id = d.id
    LEFT JOIN users u ON lr.patient_id = u.id
    LEFT JOIN lab_request_items lri ON lri.lab_request_id = lr.id
    LEFT JOIN lab_tests lt ON lt.id = lri.lab_test_id
    WHERE lr.id = $1 AND lr.tenant_id = $2
    GROUP BY lr.id, d.id, u.id
  `, [labRequestId, tenantId]);

  if (result.rows.length === 0) throw new NotFoundError(E.LAB_REQUEST_NOT_FOUND);
  return result.rows[0];
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatReferenceRange = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const sendLabResultsByEmail = async (labRequestId: number | string, patientEmail: string, tenantId: string) => {
  const results = await getLabResultsByRequest(labRequestId, tenantId);
  const items: Record<string, unknown>[] = Array.isArray(results.items) ? results.items : [];
  if (items.length === 0) {
    throw new BadRequestError('No lab results available for this request');
  }

  const token = jwtManager.signInvite(
    { scope: 'lab-result', labRequestId, tenantId, email: patientEmail },
    '7d'
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/lab-results?token=${token}`;

  const rowsHtml = items.map((item) => {
    return `<tr>
      <td>${escapeHtml(String(item.name ?? ''))}</td>
      <td>${escapeHtml(String(item.result_value ?? ''))}</td>
      <td>${escapeHtml(String(item.unit ?? ''))}</td>
      <td>${escapeHtml(formatReferenceRange(item.reference_range))}</td>
      <td>${escapeHtml(String(item.status ?? ''))}</td>
    </tr>`;
  }).join('');

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Tus resultados de laboratorio</h2>
        <p>Hola ${escapeHtml(String(results.patient_name ?? ''))}, tus resultados de laboratorio para la solicitud <strong>${escapeHtml(String(results.request_number ?? ''))}</strong> están disponibles.</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th align="left">Examen</th>
              <th align="left">Resultado</th>
              <th align="left">Unidad</th>
              <th align="left">Rango de referencia</th>
              <th align="left">Estado</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <p><a href="${link}">Ver resultados en línea</a></p>
        <p>Este enlace es válido por 7 días.</p>
      </body>
    </html>
  `;

  await enqueueJob('email:send', {
    type: 'lab-results',
    to: patientEmail,
    subject: 'Tus resultados de laboratorio',
    html,
    tenantId,
  });

  return { sent: true, message: 'Lab results sent to email' };
};

export const getLabResultsByToken = async (token: string) => {
  const payload = jwtManager.verify<LabResultPayload>(token);
  if (!payload || payload.scope !== 'lab-result' || !payload.labRequestId || !payload.tenantId) {
    throw new NotFoundError('Invalid or expired lab results link');
  }
  return getLabResultsByRequest(payload.labRequestId, payload.tenantId);
};
