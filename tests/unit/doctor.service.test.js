import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: vi.fn().mockResolvedValue({}) }),
  },
}));

import * as doctorService from '../../src/modules/doctor/doctor.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
  mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'General' }] });
});

describe('doctorService.getAllDoctors', () => {
  it('returns all doctors', async () => {
    const mockDoctors = [
      { id: 1, name: 'Dr. Test', specialty: 'General', email: 'doc@test.com' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockDoctors });

    const result = await doctorService.getAllDoctors();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Dr. Test');
  });
});

describe('doctorService.registerDoctor', () => {
  it('throws if missing required fields', async () => {
    await expect(doctorService.registerDoctor({})).rejects.toThrow('Nombre, especialidad y email son obligatorios');
    await expect(doctorService.registerDoctor({ name: 'Dr. Test' })).rejects.toThrow('Nombre, especialidad y email son obligatorios');
  });

  it('throws if email invalid', async () => {
    await expect(doctorService.registerDoctor({
      name: 'Dr. Test', specialty: 'General', email: 'not-email',
    })).rejects.toThrow('Email inválido');
  });

  it('throws if RUT invalid', async () => {
    await expect(doctorService.registerDoctor({
      name: 'Dr. Test', specialty: 'General', email: 'doc@test.com', rut: 'invalid',
    })).rejects.toThrow('RUT inválido');
  });

  it('throws if RUT already registered', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [{}] });
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.registerDoctor({
      name: 'Dr. Test', specialty: 'General', email: 'doc@test.com', rut: '12.345.678-5',
    })).rejects.toThrow('RUT ya registrado');
  });

  it('throws if email already registered', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users WHERE email')) return Promise.resolve({ rows: [{}] });
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.registerDoctor({
      name: 'Dr. Test', specialty: 'General', email: 'doc@test.com',
    })).rejects.toThrow('Email ya registrado');
  });

  it('creates doctor with availability', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users WHERE email')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [{ id: 1, email: 'doc@test.com' }] });
      if (sql.includes('INSERT INTO doctors')) return Promise.resolve({ rows: [{ id: 1, name: 'Dr. Test', specialty: 'General' }] });
      if (sql.includes('INSERT INTO doctor_availability')) return Promise.resolve({ rows: [] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await doctorService.registerDoctor({
      name: 'Dr. Test', specialty: 'General', email: 'doc@test.com',
    });

    expect(result.doctor.name).toBe('Dr. Test');
    expect(result.credentials.email).toBe('doc@test.com');
    expect(result.credentials.tempPassword).toBeDefined();
  });
});

describe('doctorService.createDoctor', () => {
  it('throws if missing required fields', async () => {
    await expect(doctorService.createDoctor({})).rejects.toThrow('Missing required fields');
  });

  it('throws if user not found', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, role FROM users')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.createDoctor({
      name: 'Dr. Test', specialty: 'General', email: 'doc@test.com', user_id: 999,
    })).rejects.toThrow('User not found');
  });

  it('throws if user role is not doctor', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, role FROM users')) return Promise.resolve({ rows: [{ id: 1, role: 'user' }] });
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.createDoctor({
      name: 'Dr. Test', specialty: 'General', email: 'doc@test.com', user_id: 1,
    })).rejects.toThrow('User must have role doctor');
  });

  it('creates doctor successfully', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, role FROM users')) return Promise.resolve({ rows: [{ id: 1, role: 'doctor' }] });
      if (sql.includes('INSERT INTO doctors')) return Promise.resolve({ rows: [{ id: 1, name: 'Dr. Test' }] });
      if (sql.includes('INSERT INTO doctor_availability')) return Promise.resolve({ rows: [] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await doctorService.createDoctor({
      name: 'Dr. Test', specialty: 'General', email: 'doc@test.com', user_id: 1,
    });

    expect(result.name).toBe('Dr. Test');
  });
});

describe('doctorService.getDoctorById', () => {
  it('returns doctor by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Test' }] });

    const result = await doctorService.getDoctorById(1);

    expect(result.name).toBe('Dr. Test');
  });

  it('returns undefined if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await doctorService.getDoctorById(999);

    expect(result).toBeNull();
  });
});

describe('doctorService.getDoctorByUserId', () => {
  it('returns doctor by user_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Test', user_id: 5 }] });

    const result = await doctorService.getDoctorByUserId(5);

    expect(result.user_id).toBe(5);
  });
});
