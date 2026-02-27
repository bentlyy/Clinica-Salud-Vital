import { pool } from '../../shared/db.js';

export const register = async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
    [email, password]
  );

  res.status(201).json(result.rows[0]);
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    'SELECT id, email FROM users WHERE email = $1 AND password = $2',
    [email, password]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ user: result.rows[0], token: 'fake-jwt-token' });
};
