import { describe, it, expect } from 'vitest';
import { registerSchema } from '../../src/modules/auth/auth.schema.js';

const validPassword = 'Test1234!';
const validEmail = 'test@example.com';

// NOTA SSO: registerSchema es el único schema que queda (alta por invitación).
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
