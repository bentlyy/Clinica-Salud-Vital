import { pool } from '../../shared/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateRut, cleanRut, formatRut } from '../../shared/rut.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export const register = async ({ email, password, rut, phone }) => {
  if (!email || !password) throw new Error('Email and password required');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new Error('Invalid email format');

  if (password.length < 8) throw new Error('Password must be at least 8 characters');

  let formattedRut = null;
  if (rut) {
    const cleaned = cleanRut(rut);
    if (!validateRut(cleaned)) throw new Error('RUT inválido');
    formattedRut = formatRut(cleaned);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password, rut, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, rut, phone`,
      [email, hashedPassword, formattedRut, phone || null]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      if (error.detail?.includes('email')) throw new Error('Email already exists');
      if (error.detail?.includes('rut')) throw new Error('RUT ya registrado');
      throw new Error('Email or RUT already exists');
    }
    throw new Error('Error creating user');
  }
};

export const login = async ({ email, password }) => {
  if (!email || !password) throw new Error('Email and password required');

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  // ✅ Always run bcrypt compare to prevent timing attacks (even if user not found)
  const dummyHash = '$2b$12$invalidhashfortimingprotection000000000000000000000000';
  const isValid = await bcrypt.compare(password, user ? user.password : dummyHash);

  if (!user || !isValid) throw new Error('Invalid credentials');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role || 'user' },
  };
};