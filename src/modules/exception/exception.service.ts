import { pool } from '../../shared/db.js';

interface ExceptionInput {
  doctor_id: number;
  date: string;
  start_time?: string;
  end_time?: string;
  is_full_day?: boolean;
}

const isValidDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d);
const isValidTime = (t: string): boolean => /^\d{2}:\d{2}$/.test(t);

export const getExceptionsByDoctor = async (doctor_id: number): Promise<unknown[]> => {
  const result = await pool.query(
    `SELECT * FROM doctor_exceptions WHERE doctor_id = $1 ORDER BY date`,
    [doctor_id]
  );
  return result.rows;
};

export const createException = async ({ doctor_id, date, start_time, end_time, is_full_day = false }: ExceptionInput): Promise<unknown> => {
  if (!doctor_id || !date) throw new Error('doctor_id and date are required');
  if (!isValidDate(date)) throw new Error('Invalid date format, use YYYY-MM-DD');

  if (!is_full_day) {
    if (!start_time || !end_time) throw new Error('start_time and end_time required for partial blocks');
    if (!isValidTime(start_time) || !isValidTime(end_time)) throw new Error('Invalid time format, use HH:MM');
    if (start_time >= end_time) throw new Error('start_time must be before end_time');
  }

  const result = await pool.query(
    `INSERT INTO doctor_exceptions (doctor_id, date, start_time, end_time, is_full_day)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [doctor_id, date, start_time || null, end_time || null, is_full_day]
  );

  return result.rows[0];
};

export const deleteException = async (exception_id: number, doctor_id: number): Promise<{ message: string }> => {
  if (!Number.isInteger(exception_id) || !Number.isInteger(doctor_id)) {
    throw new Error('Invalid id');
  }

  const result = await pool.query(
    `DELETE FROM doctor_exceptions WHERE id = $1 AND doctor_id = $2 RETURNING *`,
    [exception_id, doctor_id]
  );

  if (result.rows.length === 0) throw new Error('Exception not found or unauthorized');

  return { message: 'Exception deleted' };
};