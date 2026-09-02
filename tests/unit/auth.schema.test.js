import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, refreshSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from '../../src/modules/auth/auth.schema.js';

const validPassword = 'Test1234!';
const validEmail = 'test@example.com';

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      email: validEmail,
      password: validPassword,
      name: 'John Doe',
      rut: '12345678-9',
      phone: '+56912345678',
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal valid data (no optional fields)', () => {
    const result = registerSchema.safeParse({
      email: validEmail,
      password: validPassword,
      name: 'John',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = registerSchema.safeParse({ password: validPassword, name: 'John' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = registerSchema.safeParse({ email: 'not-an-email', password: validPassword, name: 'John' });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = registerSchema.safeParse({ email: '', password: validPassword, name: 'John' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = registerSchema.safeParse({ email: validEmail, password: 'Ab1!', name: 'John' });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = registerSchema.safeParse({ email: validEmail, password: 'lowercase1@', name: 'John' });
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = registerSchema.safeParse({ email: validEmail, password: 'UPPERCASE1@', name: 'John' });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = registerSchema.safeParse({ email: validEmail, password: 'Abcdefgh@', name: 'John' });
    expect(result.success).toBe(false);
  });

  it('rejects password without special character', () => {
    const result = registerSchema.safeParse({ email: validEmail, password: 'Abcdefg1', name: 'John' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields due to .strict()', () => {
    const result = registerSchema.safeParse({
      email: validEmail,
      password: validPassword,
      name: 'John',
      extra_field: 'should not exist',
    });
    expect(result.success).toBe(false);
  });

  it('rejects email exceeding 255 chars', () => {
    const longEmail = 'a'.repeat(250) + '@test.com';
    const result = registerSchema.safeParse({ email: longEmail, password: validPassword, name: 'John' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = registerSchema.safeParse({ email: validEmail, password: validPassword, name: '' });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({ email: validEmail, password: validPassword });
    expect(result.success).toBe(true);
  });

  it('accepts login with totp_token', () => {
    const result = loginSchema.safeParse({ email: validEmail, password: validPassword, totp_token: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({ password: validPassword });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'bad', password: validPassword });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: validEmail, password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields due to .strict()', () => {
    const result = loginSchema.safeParse({ email: validEmail, password: validPassword, extra: true });
    expect(result.success).toBe(false);
  });
});

describe('refreshSchema', () => {
  it('rejects refresh_token in body (cookie-based refresh only)', () => {
    const result = refreshSchema.safeParse({ refresh_token: 'some-refresh-token-value' });
    expect(result.success).toBe(false);
  });

  it('accepts empty body (cookie-based refresh)', () => {
    const result = refreshSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects extra fields due to .strict()', () => {
    const result = refreshSchema.safeParse({ refresh_token: '' });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('accepts valid change password request', () => {
    const result = changePasswordSchema.safeParse({ current_password: 'OldPass1!', new_password: validPassword });
    expect(result.success).toBe(true);
  });

  it('rejects empty current_password', () => {
    const result = changePasswordSchema.safeParse({ current_password: '', new_password: validPassword });
    expect(result.success).toBe(false);
  });

  it('rejects weak new_password', () => {
    const result = changePasswordSchema.safeParse({ current_password: 'OldPass1!', new_password: 'weak' });
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: validEmail });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid reset password data', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'reset-token-123',
      email: validEmail,
      password: validPassword,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = resetPasswordSchema.safeParse({ token: '', email: validEmail, password: validPassword });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = resetPasswordSchema.safeParse({ token: 'token', email: 'bad', password: validPassword });
    expect(result.success).toBe(false);
  });

  it('rejects weak password', () => {
    const result = resetPasswordSchema.safeParse({ token: 'token', email: validEmail, password: 'weak' });
    expect(result.success).toBe(false);
  });
});
