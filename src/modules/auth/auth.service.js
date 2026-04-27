// src/modules/auth/auth.service.js
import { pool } from '../../shared/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

export const register = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error('Email and password required');
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password)
       VALUES ($1, $2)
       RETURNING id, email`,
      [email, hashedPassword]
    );

    return result.rows[0];

  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Email already exists');
    }
    throw new Error('Error creating user');
  }
};

export const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error('Email and password required');
  }

  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // 🔥 generar token
 const token = jwt.sign(
  { 
    id: user.id, 
    email: user.email,
    role: user.role   // 🔥 importante
  },
  JWT_SECRET,
  { expiresIn: '1d' }
);

  return { token };
};