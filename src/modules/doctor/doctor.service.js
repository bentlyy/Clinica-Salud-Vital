import { pool } from '../../shared/db.js';

export const getAllDoctors = async () => {
  const result = await pool.query(`
    SELECT 
      d.id,
      d.name,
      d.specialty,
      d.email,
      d.user_id,
      u.email AS user_email
    FROM doctors d
    LEFT JOIN users u ON d.user_id = u.id
  `);

  return result.rows;
};

export const createDoctor = async ({ name, specialty, email, user_id }) => {
  if (!name || !specialty || !email || !user_id) {
    throw new Error('Missing required fields');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 🔥 validar usuario
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

    // 🔥 crear doctor
    const result = await client.query(
      `INSERT INTO doctors (name, specialty, email, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, specialty, email, user_id]
    );

    const doctor = result.rows[0];

    // 🔥 crear disponibilidad automática (Lunes a Viernes)
    for (let day = 1; day <= 5; day++) {
      await client.query(
        ` INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [doctor.id, day, '09:00', '17:00']
      );
    }

    await client.query('COMMIT');

    return doctor;

  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      throw new Error('Doctor already exists for this user or email');
    }

    throw error.message ? error : new Error('Database error');

  } finally {
    client.release();
  }
};

export const getDoctorById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM doctors WHERE id = $1',
    [id]
  );

  return result.rows[0];
};

export const getDoctorByUserId = async (user_id) => {
  const result = await pool.query(
    'SELECT * FROM doctors WHERE user_id = $1',
    [user_id]
  );

  return result.rows[0];
};