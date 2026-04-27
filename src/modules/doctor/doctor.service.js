import { pool } from '../../shared/db.js';

export const getAllDoctors = async () => {
  const result = await pool.query('SELECT * FROM doctors');
  return result.rows;
};

export const createDoctor = async ({ name, specialty, email }) => {
  // Validación simple (importante para evitar errores de DB)
  if (!name || !specialty || !email) {
    throw new Error('Missing required fields');
  }

  const result = await pool.query(
    'INSERT INTO doctors (name, specialty, email) VALUES ($1, $2, $3) RETURNING *',
    [name, specialty, email]
  );

  return result.rows[0];
};

export const getDoctorById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM doctors WHERE id = $1',
    [id]
  );

  return result.rows[0];
};