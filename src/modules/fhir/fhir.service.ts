import { pool } from '../../shared/db.js';
import { BadRequestError } from '../../utils/errors.js';

interface FHIRResource {
  resourceType: string;
  id: string;
  [key: string]: unknown;
}

interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'searchset' | 'resource';
  total: number;
  entry: { resource: FHIRResource }[];
}

function cleanFHIRId(id: string): number {
  const num = parseInt(id, 10);
  if (isNaN(num)) throw new BadRequestError(`Invalid FHIR id: ${id}`);
  return num;
}

export function buildPatientResource(user: Record<string, unknown>): FHIRResource {
  return {
    resourceType: 'Patient',
    id: String(user.id),
    identifier: [{
      system: 'https://clinic.com/rut',
      value: user.rut,
    }],
    name: [{
      use: 'official',
      text: user.name,
      given: [(user.name as string)?.split(' ')[0] || ''],
      family: (user.name as string)?.split(' ').slice(1).join(' ') || '',
    }],
    telecom: [
      { system: 'email', value: user.email, use: 'home' },
      { system: 'phone', value: user.phone, use: 'mobile' },
    ],
    gender: user.gender || 'unknown',
    birthDate: user.birth_date,
    meta: {
      lastUpdated: user.updated_at,
      versionId: String(user.token_version || 1),
    },
  };
}

export function buildAppointmentResource(booking: Record<string, unknown>): FHIRResource {
  return {
    resourceType: 'Appointment',
    id: String(booking.id),
    status: booking.status === 'cancelled' ? 'cancelled' : 'booked',
    start: `${booking.date}T${booking.time}:00`,
    participant: [
      { actor: { reference: `Practitioner/${booking.doctor_id}` }, status: 'accepted' },
      { actor: { reference: `Patient/${booking.user_id || booking.guest_rut}` }, status: 'accepted' },
    ],
    description: booking.reason || 'Consulta médica',
    created: booking.created_at,
  };
}

export async function getPatient(patientId: string, tenantId: string): Promise<FHIRResource> {
  const id = cleanFHIRId(patientId);
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE id = $1 AND tenant_id = $2 AND role = $3',
    [id, tenantId, 'user']
  );
  if (!rows[0]) throw new BadRequestError(`Patient ${patientId} not found`);
  return buildPatientResource(rows[0]);
}

export async function searchPatients(query: string, tenantId: string, page: number = 1, limit: number = 20): Promise<FHIRBundle> {
  const offset = (page - 1) * limit;
  const searchPattern = `%${query}%`;
  const { rows } = await pool.query(
    `SELECT * FROM users
     WHERE tenant_id = $1 AND role = 'user'
       AND (name ILIKE $2 OR email ILIKE $2 OR rut ILIKE $2)
     ORDER BY name
     LIMIT $3 OFFSET $4`,
    [tenantId, searchPattern, limit, offset]
  );

  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: rows.length,
    entry: rows.map(r => ({ resource: buildPatientResource(r) })),
  };
}

export async function getAppointment(appointmentId: string, tenantId: string): Promise<FHIRResource> {
  const id = cleanFHIRId(appointmentId);
  const { rows } = await pool.query(
    'SELECT * FROM bookings WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (!rows[0]) throw new BadRequestError(`Appointment ${appointmentId} not found`);
  return buildAppointmentResource(rows[0]);
}

export async function searchAppointments(
  practitionerId?: string,
  date?: string,
  tenantId: string = 'default',
  page: number = 1,
  limit: number = 20
): Promise<FHIRBundle> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (practitionerId) {
    conditions.push(`doctor_id = $${paramIdx++}`);
    params.push(cleanFHIRId(practitionerId));
  }
  if (date) {
    conditions.push(`date = $${paramIdx++}`);
    params.push(date);
  }

  const offset = (page - 1) * limit;
  const { rows } = await pool.query(
    `SELECT * FROM bookings WHERE ${conditions.join(' AND ')} ORDER BY date, time LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: rows.length,
    entry: rows.map(r => ({ resource: buildAppointmentResource(r) })),
  };
}
