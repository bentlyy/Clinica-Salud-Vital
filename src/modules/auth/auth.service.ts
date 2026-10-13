import { pool } from '../../shared/db.js';
import bcrypt from 'bcrypt';
import { validateRut, cleanRut, formatRut } from '../../shared/rut.js';
import { verifyInviteToken } from '../doctor/doctor.service.js';
import { BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { isValidEmail } from '../../shared/validation.js';

// SSO: este servicio solo cubre el alta de cuentas locales por invitación
// (doctores, laboratorio). El login, refresh, 2FA, cambio/reset de contraseña y
// la gestión de sesiones se retiraron: el Core es la única identidad.

interface RegisterParams {
  email: string;
  password: string;
  name?: string;
  rut?: string;
  phone?: string;
  tenant_id?: string;
  invite_token?: string;
}

interface RegisteredUser {
  id: number;
  email: string;
  name: string | null;
  rut: string | null;
  phone: string | null;
  role: string;
}

const validatePassword = (password: string): void => {
  if (password.length < 8) throw new BadRequestError(E.AUTH_PASSWORD_TOO_SHORT);
  if (!/[A-Z]/.test(password)) throw new BadRequestError(E.AUTH_PASSWORD_NO_UPPERCASE);
  if (!/[a-z]/.test(password)) throw new BadRequestError(E.AUTH_PASSWORD_NO_LOWERCASE);
  if (!/[0-9]/.test(password)) throw new BadRequestError(E.AUTH_PASSWORD_NO_NUMBER);
  if (!/[^A-Za-z0-9]/.test(password)) throw new BadRequestError(E.AUTH_PASSWORD_NO_SPECIAL);
};

export const register = async ({ email, password, name, rut, phone, tenant_id, invite_token }: RegisterParams): Promise<RegisteredUser> => {
  if (!email || !password) throw new BadRequestError(E.AUTH_EMAIL_REQUIRED);
  if (!isValidEmail(email)) throw new BadRequestError(E.AUTH_INVALID_EMAIL_FORMAT);
  validatePassword(password);

  let role: string = 'patient';
  let specialty: string | null = null;
  let tid = tenant_id || process.env.DEFAULT_TENANT_ID || 'default';

  if (invite_token) {
    const invite = verifyInviteToken(invite_token);
    email = invite.email;
    name = invite.name;
    role = invite.role;
    specialty = invite.specialty;
    tid = invite.tenant_id || tid;
  }

  let formattedRut: string | null = null;
  if (rut) {
    const cleaned = cleanRut(rut);
    if (!validateRut(cleaned)) throw new BadRequestError(E.AUTH_INVALID_RUT);
    formattedRut = formatRut(cleaned);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  if (invite_token && role === 'doctor' && specialty) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO users (email, password, name, rut, phone, role, password_changed, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         RETURNING id, email, name, rut, phone, role`,
        [email, hashedPassword, name || null, formattedRut, phone || null, role, tid]
      );
      const user = result.rows[0];
      await client.query(
        `INSERT INTO doctors (name, specialty, email, user_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [name || email, specialty, email, user.id, tid]
      );
      const availValues = [1, 2, 3, 4, 5].map((day, idx) => {
        const base = idx * 5;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
      }).join(', ');
      const availFlat = [1, 2, 3, 4, 5].flatMap(day => [user.id, day, '09:00', '17:00', tid]);
      await client.query(
        `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id)
         VALUES ${availValues}`,
        availFlat
      );
      await client.query('COMMIT');
      return user;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      const pgError = error as { code?: string };
      if (pgError.code === '23505') throw new BadRequestError(E.AUTH_EMAIL_ALREADY_EXISTS);
      throw new BadRequestError(E.AUTH_USER_CREATION_FAILED);
    } finally {
      client.release();
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password, name, rut, phone, role, password_changed, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING id, email, name, rut, phone, role`,
      [email, hashedPassword, name || null, formattedRut, phone || null, role, tid]
    );
    return result.rows[0];
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') throw new BadRequestError(E.AUTH_EMAIL_ALREADY_EXISTS);
    throw new BadRequestError(E.AUTH_USER_CREATION_FAILED);
  }
};
