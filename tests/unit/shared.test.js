import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: vi.fn().mockResolvedValue({}) }),
  },
}));

vi.mock('../../src/shared/email.service.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

import * as queryUtils from '../../src/shared/query.js';
import * as dateUtils from '../../src/shared/date.js';
import * as jwtUtils from '../../src/shared/jwt.js';

describe('queryUtils', () => {
  describe('getQuery', () => {
    it('returns string value if truthy', () => {
      const result = queryUtils.getQuery({ name: 'John' }, 'name');
      expect(result).toBe('John');
    });

    it('returns undefined if falsy', () => {
      const result = queryUtils.getQuery({ name: '' }, 'name');
      expect(result).toBeUndefined();
    });

    it('returns undefined if missing', () => {
      const result = queryUtils.getQuery({}, 'name');
      expect(result).toBeUndefined();
    });
  });

  describe('getQueryInt', () => {
    it('returns parsed int', () => {
      const result = queryUtils.getQueryInt({ page: '5' }, 'page');
      expect(result).toBe(5);
    });

    it('returns default if NaN', () => {
      const result = queryUtils.getQueryInt({ page: 'abc' }, 'page', 10);
      expect(result).toBe(10);
    });

    it('returns 0 if no default and NaN', () => {
      const result = queryUtils.getQueryInt({ page: 'abc' }, 'page');
      expect(result).toBe(0);
    });

    it('returns default if missing', () => {
      const result = queryUtils.getQueryInt({}, 'page', 1);
      expect(result).toBe(1);
    });
  });

  describe('getQueryString', () => {
    it('returns string value', () => {
      const result = queryUtils.getQueryString({ name: 'John' }, 'name');
      expect(result).toBe('John');
    });

    it('returns default if missing', () => {
      const result = queryUtils.getQueryString({}, 'name', 'default');
      expect(result).toBe('default');
    });

    it('returns empty string if no default and missing', () => {
      const result = queryUtils.getQueryString({}, 'name');
      expect(result).toBe('');
    });
  });
});

describe('dateUtils', () => {
  describe('getDayOfWeek', () => {
    it('returns 1 for Monday', () => {
      const result = dateUtils.getDayOfWeek('2026-05-18');
      expect(result).toBe(1);
    });

    it('returns 7 for Sunday', () => {
      const result = dateUtils.getDayOfWeek('2026-05-24');
      expect(result).toBe(7);
    });

    it('returns 5 for Friday', () => {
      const result = dateUtils.getDayOfWeek('2026-05-22');
      expect(result).toBe(5);
    });
  });

  describe('isValidDate', () => {
    it('returns true for valid format', () => {
      expect(dateUtils.isValidDate('2026-05-15')).toBe(true);
    });

    it('returns false for invalid format', () => {
      expect(dateUtils.isValidDate('15-05-2026')).toBe(false);
      expect(dateUtils.isValidDate('2026/05/15')).toBe(false);
      expect(dateUtils.isValidDate('not-a-date')).toBe(false);
      expect(dateUtils.isValidDate('')).toBe(false);
    });
  });

  describe('isValidTime', () => {
    it('returns true for valid format', () => {
      expect(dateUtils.isValidTime('10:00')).toBe(true);
      expect(dateUtils.isValidTime('23:59')).toBe(true);
    });

    it('returns false for invalid format', () => {
      expect(dateUtils.isValidTime('10-00')).toBe(false);
      expect(dateUtils.isValidTime('1000')).toBe(false);
      expect(dateUtils.isValidTime('')).toBe(false);
    });
  });
});

describe('jwtUtils', () => {
  const originalEnv = process.env.JWT_SECRET;

  beforeEach(() => {
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalEnv;
  });

  it('returns JWT_SECRET from env', () => {
    process.env.JWT_SECRET = 'my-secret-key';
    const result = jwtUtils.getJWTSecret();
    expect(result).toBe('my-secret-key');
  });

  it('returns default if JWT_SECRET not set', () => {
    const orig = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const result = jwtUtils.getJWTSecret();
    expect(result).toBe('dev-secret');
    process.env.JWT_SECRET = orig;
  });
});

describe('emailService', () => {
  it('sends email successfully', async () => {
    const { sendEmail } = await import('../../src/shared/email.service.js');
    const result = await sendEmail({
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.sent).toBe(true);
  });
});
