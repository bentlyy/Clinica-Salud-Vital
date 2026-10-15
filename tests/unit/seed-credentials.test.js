import { describe, it, expect, afterEach } from 'vitest';
import { deriveSeedPassword } from '../../src/seed/seed-credentials.js';

const SECRET_A = 'a-very-long-test-secret-1234567890';
const SECRET_B = 'another-long-test-secret-0987654321';

describe('deriveSeedPassword (FND-P1)', () => {
  const original = process.env.SEED_CREDENTIALS_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.SEED_CREDENTIALS_SECRET;
    else process.env.SEED_CREDENTIALS_SECRET = original;
  });

  it('es determinista con el secreto y depende del email', () => {
    process.env.SEED_CREDENTIALS_SECRET = SECRET_A;
    const first = deriveSeedPassword('juan@clinic.com');
    const again = deriveSeedPassword('juan@clinic.com');
    const other = deriveSeedPassword('maria@clinic.com');

    expect(first).toBe(again);
    expect(first).not.toBe(other);
    expect(first).toMatch(/^Vitaria\.juan\.[0-9a-f]{12}!$/);
  });

  it('cambia de valor si cambia el secreto', () => {
    process.env.SEED_CREDENTIALS_SECRET = SECRET_A;
    const first = deriveSeedPassword('juan@clinic.com');
    process.env.SEED_CREDENTIALS_SECRET = SECRET_B;
    const second = deriveSeedPassword('juan@clinic.com');
    expect(first).not.toBe(second);
  });

  it('no deriva de la regla pública basada en el año', () => {
    process.env.SEED_CREDENTIALS_SECRET = SECRET_A;
    const year = new Date().getFullYear().toString();
    expect(deriveSeedPassword('juan@clinic.com')).not.toContain(year);
  });

  it('ignora secretos demasiado cortos (cae al fallback, no al literal)', () => {
    process.env.SEED_CREDENTIALS_SECRET = 'short';
    const year = new Date().getFullYear().toString();
    expect(deriveSeedPassword('juan@clinic.com')).not.toContain(year);
  });
});
