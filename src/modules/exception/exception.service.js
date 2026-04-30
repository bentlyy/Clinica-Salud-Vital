// exception.service.js
import { pool } from '../../shared/db.js';

export const getExceptionsByDoctor = async (doctor_id) => {
  const result = await pool.query(
    `SELECT * FROM doctor_exceptions WHERE doctor_id = $1 ORDER BY date`,
    [doctor_id]
  );
  return result.rows;
};

export const createException = async ({ doctor_id, date, start_time, end_time, is_full_day = false }) => {
  if (!doctor_id || !date) throw new Error('doctor_id and date are required');

  const result = await pool.query(
    `INSERT INTO doctor_exceptions (doctor_id, date, start_time, end_time, is_full_day)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [doctor_id, date, start_time || null, end_time || null, is_full_day]
  );

  return result.rows[0];
};

export const deleteException = async (exception_id, doctor_id) => {
  const result = await pool.query(
    `DELETE FROM doctor_exceptions WHERE id = $1 AND doctor_id = $2 RETURNING *`,
    [exception_id, doctor_id]
  );

  if (result.rows.length === 0) throw new Error('Exception not found or unauthorized');

  return { message: 'Exception deleted' };
};