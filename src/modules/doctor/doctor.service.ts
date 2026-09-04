import { pool, readPool } from '../../shared/db.js';
import bcrypt from 'bcrypt';
import { sendEmail } from '../../shared/email.service.js';
import { doctorCredentialsEmail, invitationEmail } from './doctor.email.js';
import { jwtManager } from '../../shared/jwt.service.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import { cleanRut, validateRut, formatRut } from '../../shared/rut.js';
import { ensureSpecialty } from '../specialties/specialties.service.js';

const MAX_PAGE_LIMIT = 100;

interface DoctorInput {
  name: string;
  specialty: string;
  email: string;
  rut?: string;
  phone?: string;
}

interface CreateDoctorInput {
  name: string;
  specialty: string;
  email: string;
  user_id: number;
}

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  email: string;
  user_id: number;
  slot_duration: number | null;
}

export const getAllDoctors = async (tenantId: string): Promise<Doctor[]> => {
  const result = await readPool.query(`
    SELECT d.id, d.name, d.specialty, d.email, d.user_id
    FROM doctors d
    WHERE d.tenant_id = $1
  `, [tenantId]);
  return result.rows;
};

const generatePassword = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return password;
};

export const registerDoctor = async ({ name, specialty, email, rut, phone }: DoctorInput, tenantId: string): Promise<{ doctor: Doctor; credentials: { email: string } }> => {
  if (!name || !specialty || !email) {
    throw new BadRequestError(E.DOCTOR_MISSING_FIELDS);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureSpecialty(specialty);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new BadRequestError(E.DOCTOR_INVALID_EMAIL);

    let formattedRut: string | null = null;
    if (rut) {
      const cleaned = cleanRut(rut);
      if (!validateRut(cleaned)) throw new BadRequestError(E.DOCTOR_INVALID_RUT);
      formattedRut = formatRut(cleaned);

      const rutCheck = await client.query('SELECT 1 FROM users WHERE rut = $1 FOR UPDATE', [formattedRut]);
      if (rutCheck.rows.length > 0) throw new BadRequestError(E.DOCTOR_RUT_EXISTS);
    }

    const emailCheck = await client.query('SELECT 1 FROM users WHERE email = $1 FOR UPDATE', [email]);
    if (emailCheck.rows.length > 0) throw new BadRequestError(E.DOCTOR_EMAIL_EXISTS);

    const tempPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const userResult = await client.query(
      `INSERT INTO users (email, password, role, rut, phone, tenant_id)
       VALUES ($1, $2, 'doctor', $3, $4, $5)
       RETURNING id, email`,
      [email, hashedPassword, formattedRut, phone || null, tenantId]
    );

    const userId = userResult.rows[0].id;

    const doctorResult = await client.query(
      `INSERT INTO doctors (name, specialty, email, user_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, specialty, email, userId, tenantId]
    );

    const doctor = doctorResult.rows[0] as Doctor;

    const availValues = [1, 2, 3, 4, 5].map((day, idx) => {
      const base = idx * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(', ');
    const availFlat = [1, 2, 3, 4, 5].flatMap(day => [doctor.id, day, '09:00', '17:00', tenantId]);
    await client.query(
      `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id)
       VALUES ${availValues}`,
      availFlat
    );

    await client.query('COMMIT');

    const setupToken = jwtManager.signInvite(
      { id: userId, purpose: 'setup-password' },
      '24h'
    );

    sendEmail({
      to: email,
      subject: 'Bienvenido a Vitaria — Establece tu contraseña',
      html: doctorCredentialsEmail({
        name,
        email,
        setupToken,
        loginUrl: (process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173') + '/login',
      }),
      tenantId,
    }).then(r => { if (!r.sent) logger.error('Doctor welcome email error:', r.error); }).catch(err => logger.error('Doctor welcome email send failed:', err));

    return { doctor, credentials: { email } };

  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505')     throw new BadRequestError(E.DOCTOR_USER_EXISTS);
    throw error;
  } finally {
    client.release();
  }
};

export const createDoctor = async ({ name, specialty, email, user_id }: CreateDoctorInput, tenantId: string): Promise<Doctor> => {
  if (!name || !specialty || !email || !user_id) {
    throw new BadRequestError(E.DOCTOR_MISSING_FIELDS);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureSpecialty(specialty);

    const user = await client.query(
      'SELECT id, role, tenant_id FROM users WHERE id = $1 FOR UPDATE',
      [user_id]
    );

    if (user.rows.length === 0) {
      throw new BadRequestError(E.DOCTOR_USER_NOT_FOUND);
    }

    if (user.rows[0].tenant_id !== tenantId) {
      throw new BadRequestError(E.DOCTOR_USER_NOT_FOUND);
    }

    if (user.rows[0].role !== 'doctor') {
      throw new BadRequestError(E.DOCTOR_USER_MUST_BE_DOCTOR);
    }

    const result = await client.query(
      `INSERT INTO doctors (name, specialty, email, user_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, specialty, email, user_id, tenantId]
    );

    const doctor = result.rows[0] as Doctor;

    const availValues = [1, 2, 3, 4, 5].map((day, idx) => {
      const base = idx * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(', ');
    const availFlat = [1, 2, 3, 4, 5].flatMap(day => [doctor.id, day, '09:00', '17:00', tenantId]);
    await client.query(
      `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id)
       VALUES ${availValues}`,
      availFlat
    );

    await client.query('COMMIT');

    return doctor;

  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      throw new BadRequestError(E.DOCTOR_ALREADY_EXISTS);
    }
    throw error;
  } finally {
    client.release();
  }
};

export const getDoctorById = async (id: number, tenantId: string): Promise<Doctor | null> => {
  const result = await readPool.query<Doctor>(
    'SELECT * FROM doctors WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  return result.rows[0] || null;
};

export const getDoctorByUserId = async (user_id: number, tenantId: string): Promise<Doctor | null> => {
  const result = await readPool.query<Doctor>(
    'SELECT * FROM doctors WHERE user_id = $1 AND tenant_id = $2',
    [user_id, tenantId]
  );

  return result.rows[0] || null;
};

interface InvitePersonInput {
  email: string;
  name?: string;
  role: 'patient' | 'doctor' | 'lab_technician';
  specialty?: string;
}

export const invitePerson = async (input: InvitePersonInput, tenantId: string): Promise<void> => {
  let { email, name, role, specialty } = input;

  if (!email) throw new BadRequestError(E.DOCTOR_EMAIL_REQUIRED);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new BadRequestError(E.DOCTOR_INVALID_EMAIL);

  if (role === 'doctor' && !specialty) throw new BadRequestError(E.DOCTOR_SPECIALTY_REQUIRED);
  if (role === 'lab_technician') specialty = undefined;

  const existing = await readPool.query('SELECT 1 FROM users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
  if (existing.rows.length > 0) throw new BadRequestError(E.DOCTOR_EMAIL_EXISTS);

  const inviteToken = jwtManager.signInvite(
    { email, name: name || email, role, specialty: specialty || null, tenant_id: tenantId, purpose: 'invite' },
    '7d'
  );

  const frontendUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';

  sendEmail({
    to: email,
    subject: `Invitación a registrarse como ${role === 'doctor' ? 'médico' : role === 'lab_technician' ? 'técnico de laboratorio' : 'paciente'}`,
    html: invitationEmail({
      name: name || email,
      email,
      inviteToken,
      frontendUrl,
      role,
    }),
    tenantId,
  }).then(r => { if (!r.sent) logger.error('Invitation email error:', r.error); }).catch(err => logger.error('Invitation email send failed:', err));
};

export const verifyInviteToken = (token: string): { email: string; name: string; role: string; specialty: string | null; tenant_id: string | null } => {
  const payload = jwtManager.verify<{ email: string; name: string; role: string; specialty: string | null; tenant_id: string | null; purpose: string }>(token);
  if (!payload || payload.purpose !== 'invite') {
    throw new BadRequestError(E.DOCTOR_INVITE_INVALID);
  }
  return payload;
};

export const listTenantUsers = async (
  tenantId: string,
  page: number = 1,
  limit: number = 20,
  filters?: { role?: string; search?: string }
): Promise<{ data: Record<string, unknown>[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const safePage = Math.max(1, Number.isInteger(page) ? page : 1);
  const safeLimit = Math.max(1, Math.min(MAX_PAGE_LIMIT, Number.isInteger(limit) ? limit : 20));
  const conditions: string[] = ['u.tenant_id = $1'];
  const params: (string | number)[] = [tenantId];
  let paramIdx = 2;

  if (filters?.role) {
    conditions.push(`u.role = $${paramIdx++}`);
    params.push(filters.role);
  }

  if (filters?.search) {
    conditions.push(`(u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');
  const filterParams = [...params];

  const offset = (safePage - 1) * safeLimit;
  params.push(safeLimit, offset);

  const result = await readPool.query(
    `SELECT u.id, u.email, u.name, u.role, u.rut, u.phone, u.active, u.created_at,
            COUNT(*) OVER() AS total
     FROM users u WHERE ${whereClause}
     ORDER BY u.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    params
  );

  const total = result.rows.length > 0
    ? parseInt(result.rows[0].total as string, 10)
    : parseInt((await readPool.query(
        `SELECT COUNT(*) AS total FROM users u WHERE ${whereClause}`,
        filterParams
      )).rows[0].total, 10);

  return {
    data: result.rows,
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
  };
};

export const toggleUserActive = async (userId: number, tenantId: string): Promise<Record<string, unknown>> => {
  const result = await pool.query(
    `UPDATE users SET active = NOT active WHERE id = $1 AND tenant_id = $2 RETURNING id, email, name, role, active`,
    [userId, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.DOCTOR_NOT_FOUND_TENANT);

  const isNowActive = result.rows[0].active;
  if (!isNowActive) {
    await pool.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
  }

  return result.rows[0];
};