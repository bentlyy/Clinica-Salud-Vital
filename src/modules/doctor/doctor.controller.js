import { pool } from '../../shared/db.js';

export const getDoctors = async (req, res) => {
  const result = await pool.query('SELECT * FROM doctors');
  res.json(result.rows);
};

export const createDoctor = async (req, res) => {
  const { name, specialty, email } = req.body;

  const result = await pool.query(
    'INSERT INTO doctors (name, specialty, email) VALUES ($1, $2, $3) RETURNING *',
    [name, specialty, email]
  );

  res.status(201).json(result.rows[0]);
};
