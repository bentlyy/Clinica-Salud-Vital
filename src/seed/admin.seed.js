import { pool } from '../shared/db.js';
import bcrypt from 'bcrypt';

export const seedAdmin = async () => {
  const exists = await pool.query(
    'SELECT * FROM users WHERE role = $1',
    ['admin']
  );

  if (exists.rows.length > 0) return;

  const hash = await bcrypt.hash('REPLACED_PASSWORD', 10);

  await pool.query(
    `INSERT INTO users (email, password, role)
     VALUES ($1, $2, $3)`,
    ['admin@clinic.com', hash, 'admin']
  );

  console.log('✅ Admin creado automáticamente');
};