import { pool } from '../../shared/db.js';
import bcrypt from 'bcrypt';
import { sendEmail } from '../../shared/email.service.js';
import { doctorCredentialsEmail } from './doctor.email.js';
import { validateRut, cleanRut, formatRut } from '../../shared/rut.js';

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

export const getAllDoctors = async (): Promise<Doctor[]> => {
  const result = await pool.query(`
    SELECT
      d.id,
      d.name,
      d.specialty,
      d.email,
      d.user_id,
      u.email AS user_email,
      u.rut,
      u.phone
    FROM doctors d
    LEFT JOIN users u ON d.user_id = u.id
  `);

  return result.rows;
};

const generatePassword = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const registerDoctor = async ({ name, specialty, email, rut, phone }: DoctorInput): Promise<{ doctor: Doctor; credentials: { email: string; tempPassword: string } }> => {
  if (!name || !specialty || !email) {
    throw new Error('Nombre, especialidad y email son obligatorios');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error('Email inválido');

    let formattedRut: string | null = null;
    if (rut) {
      const cleaned = cleanRut(rut);
      if (!validateRut(cleaned)) throw new Error('RUT inválido');
      formattedRut = formatRut(cleaned);

      const rutCheck = await client.query('SELECT 1 FROM users WHERE rut = $1', [formattedRut]);
      if (rutCheck.rows.length > 0) throw new Error('RUT ya registrado');
    }

    const emailCheck = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) throw new Error('Email ya registrado');

    const tempPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const userResult = await client.query(
      `INSERT INTO users (email, password, role, rut, phone)
       VALUES ($1, $2, 'doctor', $3, $4)
       RETURNING id, email`,
      [email, hashedPassword, formattedRut, phone || null]
    );

    const userId = userResult.rows[0].id;

    const doctorResult = await client.query(
      `INSERT INTO doctors (name, specialty, email, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, specialty, email, userId]
    );

    const doctor = doctorResult.rows[0] as Doctor;

    for (let day = 1; day <= 5; day++) {
      await client.query(
        `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [doctor.id, day, '09:00', '17:00']
      );
    }

    await client.query('COMMIT');

    sendEmail({
      to: email,
      subject: 'Bienvenido a Clínica Salud Vital — Tus credenciales de acceso',
      html: doctorCredentialsEmail({
        name,
        email,
        password: tempPassword,
        loginUrl: process.env.FRONTEND_URL + '/login',
      }),
    }).catch((err: unknown) => console.error('Doctor welcome email error:', err));

    return { doctor, credentials: { email, tempPassword } };

  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') throw new Error('Doctor o usuario ya existe');
    throw error;
  } finally {
    client.release();
  }
};

export const createDoctor = async ({ name, specialty, email, user_id }: CreateDoctorInput): Promise<Doctor> => {
  if (!name || !specialty || !email || !user_id) {
    throw new Error('Missing required fields');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const user = await client.query(
      'SELECT id, role FROM users WHERE id = $1',
      [user_id]
    );

    if (user.rows.length === 0) {
      throw new Error('User not found');
    }

    if (user.rows[0].role !== 'doctor') {
      throw new Error('User must have role doctor');
    }

    const result = await client.query(
      `INSERT INTO doctors (name, specialty, email, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, specialty, email, user_id]
    );

    const doctor = result.rows[0] as Doctor;

    for (let day = 1; day <= 5; day++) {
      await client.query(
        ` INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [doctor.id, day, '09:00', '17:00']
      );
    }

    await client.query('COMMIT');

    return doctor;

  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      throw new Error('Doctor already exists for this user or email');
    }
    const errMsg = error as { message?: string };
    throw errMsg.message ? error : new Error('Database error');
  } finally {
    client.release();
  }
};

export const getDoctorById = async (id: number): Promise<Doctor | null> => {
  const result = await pool.query<Doctor>(
    'SELECT * FROM doctors WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
};

export const getDoctorByUserId = async (user_id: number): Promise<Doctor | null> => {
  const result = await pool.query<Doctor>(
    'SELECT * FROM doctors WHERE user_id = $1',
    [user_id]
  );

  return result.rows[0] || null;
};