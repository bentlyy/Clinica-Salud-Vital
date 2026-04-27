import { pool } from '../../shared/db.js';

export const createAvailability = async ({ doctor_id, day_of_week, start_time, end_time }) => {
  if (!doctor_id || day_of_week === undefined || !start_time || !end_time) {
    throw new Error('Missing required fields');
  }

  const result = await pool.query(
    `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [doctor_id, day_of_week, start_time, end_time]
  );

  return result.rows[0];
};

export const getAvailabilityByDoctor = async (doctor_id) => {
  const result = await pool.query(
    `SELECT * FROM doctor_availability WHERE doctor_id = $1`,
    [doctor_id]
  );

  return result.rows;
};