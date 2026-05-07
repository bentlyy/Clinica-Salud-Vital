import { pool } from '../../shared/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateRut, cleanRut, formatRut } from '../../shared/rut.js';
import { getJWTSecret } from '../../shared/jwt.js';
import { UserRole } from '../../types/index.js';
import { BadRequestError } from '../../utils/errors.js';

interface RegisterParams {
  email: string;
  password: string;
  rut?: string;
  phone?: string;
}

interface LoginParams {
  email: string;
  password: string;
}

interface User {
  id: number;
  email: string;
  rut: string | null;
  phone: string | null;
  role: UserRole;
  password: string;
}

export const register = async ({ email, password, rut, phone }: RegisterParams): Promise<Pick<User, 'id' | 'email' | 'rut' | 'phone'>> => {
  if (!email || !password) throw new BadRequestError('Email and password required');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new BadRequestError('Invalid email format');

  if (password.length < 8) throw new BadRequestError('Password must be at least 8 characters');

  let formattedRut: string | null = null;
  if (rut) {
    const cleaned = cleanRut(rut);
    if (!validateRut(cleaned)) throw new BadRequestError('RUT inválido');
    formattedRut = formatRut(cleaned);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password, rut, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, rut, phone`,
      [email, hashedPassword, formattedRut, phone || null]
    );
    return result.rows[0];
  } catch (error: unknown) {
    const pgError = error as { code?: string; detail?: string };
    if (pgError.code === '23505') {
      if (pgError.detail?.includes('email')) throw new BadRequestError('Email already exists');
      if (pgError.detail?.includes('rut')) throw new BadRequestError('RUT ya registrado');
      throw new BadRequestError('Email or RUT already exists');
    }
    throw new BadRequestError('Error creating user');
  }
};

export const login = async ({ email, password }: LoginParams): Promise<{ token: string; user: { id: number; email: string; role: UserRole; rut: string | null; phone: string | null } }> => {
  if (!email || !password) throw new Error('Email and password required');

  const result = await pool.query<User>('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  const dummyHash = '$2b$12$LJ3m4ys3Lg3YOCwFfj5NOWJX0GqBiN3H0w5Cqx3z5Gq5X5z5P5Q5S';
  const isValid = await bcrypt.compare(password, user ? user.password : dummyHash);

  if (!user || !isValid) throw new BadRequestError('Invalid credentials');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user' },
    getJWTSecret(),
    { expiresIn: '1d' }
  );

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role || 'user', rut: user.rut || null, phone: user.phone || null },
  };
};