import { pool } from '../../shared/db.js';
import { NotFoundError, BadRequestError, toError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { logger } from '../../utils/logger.js';

export interface ReportConfig {
  type: string;
  date_from: string;
  date_to: string;
  filters?: Record<string, unknown>;
}

export interface Report {
  id: number;
  tenant_id: string;
  user_id: number | null;
  type: string;
  status: string;
  config: ReportConfig;
  result_url: string | null;
  created_at: string;
}

export interface AvailableReportType {
  type: string;
  label: string;
  description: string;
  icon: string;
}

const AVAILABLE_REPORTS: AvailableReportType[] = [
  { type: 'appointments', label: 'Citas', description: 'Reporte de citas medicas del periodo seleccionado', icon: 'EventNote' },
  { type: 'revenue', label: 'Ingresos', description: 'Reporte financiero detallado de ingresos y gastos', icon: 'AttachMoney' },
  { type: 'patients', label: 'Pacientes', description: 'Estadisticas y listado de pacientes atendidos', icon: 'People' },
  { type: 'laboratory', label: 'Laboratorio', description: 'Resultados de examenes de laboratorio del periodo', icon: 'Science' },
  { type: 'custom', label: 'Personalizado', description: 'Genera un reporte con filtros personalizados', icon: 'Description' },
];

export const getAvailable = async () => {
  return AVAILABLE_REPORTS;
};

const generateAppointments = async (config: ReportConfig, tenantId: string) => {
  const { rows } = await pool.query(
    `SELECT
       b.id, b.date, b.time, b.status,
       p.name AS patient_name, p.email AS patient_email,
       d.name AS doctor_name, s.name AS specialty_name
     FROM bookings b
     LEFT JOIN users p ON b.user_id = p.id
     LEFT JOIN doctors d ON b.doctor_id = d.user_id
     LEFT JOIN specialties s ON d.specialty = s.name
     WHERE b.date >= $1::date AND b.date <= $2::date
       AND b.tenant_id = $3
     ORDER BY b.date DESC, b.time DESC`,
    [config.date_from, config.date_to, tenantId]
  );
  return { total: rows.length, appointments: rows };
};

const generateRevenue = async (config: ReportConfig, tenantId: string) => {
  const { rows } = await pool.query(
    `SELECT
       i.id, i.total_amount, i.status AS payment_status, i.created_at,
       p.name AS patient_name,
       json_agg(json_build_object('description', ii.description, 'amount', ii.amount)) AS items
     FROM invoices i
     LEFT JOIN users p ON i.patient_id = p.id
     LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
     WHERE i.created_at >= $1::date AND i.created_at < ($2::date + INTERVAL '1 day')
       AND i.tenant_id = $3
     GROUP BY i.id, i.total_amount, i.status, i.created_at, p.name
     ORDER BY i.created_at DESC`,
    [config.date_from, config.date_to, tenantId]
  );
  const totalRevenue = rows.reduce((sum: number, r: { total_amount: number }) => sum + Number(r.total_amount || 0), 0);
  return { total: rows.length, totalRevenue, invoices: rows };
};

const generatePatients = async (config: ReportConfig, tenantId: string) => {
  const { rows } = await pool.query(
    `SELECT
       p.id, p.name, p.email, p.phone,
       COUNT(b.id) AS total_appointments,
       MAX(b.date) AS last_appointment
     FROM users p
     LEFT JOIN bookings b ON b.user_id = p.id
       AND b.date >= $1::date AND b.date <= $2::date
       AND b.tenant_id = $3
     WHERE p.tenant_id = $3 AND p.role IN ('user', 'patient')
     GROUP BY p.id, p.name, p.email, p.phone
     ORDER BY total_appointments DESC`,
    [config.date_from, config.date_to, tenantId]
  );
  return { total: rows.length, patients: rows };
};

const generateLaboratory = async (config: ReportConfig, tenantId: string) => {
  const { rows } = await pool.query(
    `SELECT
       lr.id, lr.status, lr.created_at, lr.updated_at,
       lr.notes, lr.request_number,
       p.name AS patient_name,
       u.name AS doctor_name
     FROM lab_requests lr
     LEFT JOIN users p ON lr.patient_id = p.id
     LEFT JOIN users u ON lr.doctor_id = u.id
     WHERE lr.created_at >= $1::date AND lr.created_at < ($2::date + INTERVAL '1 day')
       AND lr.tenant_id = $3
     ORDER BY lr.created_at DESC`,
    [config.date_from, config.date_to, tenantId]
  );
  const completed = rows.filter((r: { status: string }) => r.status === 'completed').length;
  return { total: rows.length, completed, results: rows };
};

const generators: Record<string, (config: ReportConfig, tenantId: string) => any> = {
  appointments: generateAppointments,
  revenue: generateRevenue,
  patients: generatePatients,
  laboratory: generateLaboratory,
};

export const generateReport = async (type: string, config: ReportConfig, userId: number, tenantId: string) => {
  const validTypes = ['appointments', 'revenue', 'patients', 'laboratory', 'custom'];
  if (!validTypes.includes(type)) throw new BadRequestError(E.REPORT_INVALID_TYPE, 'Invalid report type: ' + type);

  const { rows } = await pool.query(
    `INSERT INTO reports (tenant_id, user_id, type, status, config)
     VALUES ($1, $2, $3, 'generating', $4)
     RETURNING *`,
    [tenantId, userId, type, JSON.stringify(config)]
  );

  const report = rows[0];

  try {
    const generator = generators[type];
    let result: unknown;
    if (generator) {
      result = await generator(config, tenantId);
    } else {
      result = { message: 'Report generated', type };
    }

    await pool.query(
      `UPDATE reports SET status = 'completed', result_url = $1 WHERE id = $2`,
      [JSON.stringify(result), report.id]
    );

    return { ...report, status: 'completed', result_url: JSON.stringify(result) };
  } catch (err) {
    logger.error('Report generation failed', { error: toError(err).message, type, reportId: report.id });
    await pool.query(
      `UPDATE reports SET status = 'failed' WHERE id = $1`,
      [report.id]
    );
    return { ...report, status: 'failed' };
  }
};

export const getById = async (id: number, tenantId: string): Promise<Report> => {
  const { rows } = await pool.query(
    `SELECT * FROM reports WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  if (!rows[0]) throw new NotFoundError(E.REPORT_NOT_FOUND);
  return rows[0];
};
