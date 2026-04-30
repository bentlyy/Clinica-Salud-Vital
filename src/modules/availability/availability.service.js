import { pool } from '../../shared/db.js';

// ✅ Validate time format HH:MM
const isValidTime = (t) => /^\d{2}:\d{2}$/.test(t);

export const getAvailabilityByDoctor = async (doctor_id) => {
  const result = await pool.query(
    `SELECT * FROM doctor_availability
     WHERE doctor_id = $1
     ORDER BY day_of_week, start_time`,
    [doctor_id]
  );
  return result.rows;
};

export const createAvailability = async ({ doctor_id, day_of_week, start_time, end_time }) => {
  // ✅ Input validation
  if (!doctor_id || day_of_week === undefined || !start_time || !end_time) {
    throw new Error('Missing required fields');
  }
  if (!Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
    throw new Error('day_of_week must be an integer between 0 and 6');
  }
  if (!isValidTime(start_time) || !isValidTime(end_time)) {
    throw new Error('Invalid time format, use HH:MM');
  }
  if (start_time >= end_time) {
    throw new Error('Invalid time range: start_time must be before end_time');
  }

  const overlap = await pool.query(
    `SELECT 1 FROM doctor_availability
     WHERE doctor_id = $1 AND day_of_week = $2
     AND (start_time < $4 AND end_time > $3)`,
    [doctor_id, day_of_week, start_time, end_time]
  );

  if (overlap.rows.length > 0) {
    throw new Error('Time range overlaps with existing availability');
  }

  const result = await pool.query(
    `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [doctor_id, day_of_week, start_time, end_time]
  );

  return result.rows[0];
};

export const deleteAvailability = async (availability_id, doctor_id) => {
  // ✅ Validate IDs
  if (!Number.isInteger(availability_id) || !Number.isInteger(doctor_id)) {
    throw new Error('Invalid id');
  }

  const result = await pool.query(
    `DELETE FROM doctor_availability WHERE id = $1 AND doctor_id = $2 RETURNING *`,
    [availability_id, doctor_id]
  );

  if (result.rows.length === 0) throw new Error('Availability not found or unauthorized');

  return { message: 'Availability deleted' };
};