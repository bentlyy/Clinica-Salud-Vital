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
  readPool: { query: mockQuery },
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: vi.fn().mockResolvedValue({}) }),
  },
}));

const mockSendEmail = vi.hoisted(() => vi.fn());
vi.mock('../../src/shared/email.service.js', () => ({
  sendEmail: mockSendEmail,
}));

const mockJwtManager = vi.hoisted(() => ({
  signInvite: vi.fn(() => 'mock-invite-token'),
  verify: vi.fn(),
}));
vi.mock('../../src/shared/jwt.service.js', () => ({
  jwtManager: mockJwtManager,
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import * as doctorService from '../../src/modules/doctor/doctor.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
  mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Medicina General' }] });
  mockSendEmail.mockResolvedValue({ sent: true });
});

describe('doctorService.getAllDoctors', () => {
  it('returns all doctors', async () => {
    const mockDoctors = [
      { id: 1, name: 'Dr. Test', specialty: 'Medicina General', email: 'doc@test.com' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockDoctors });

    const result = await doctorService.getAllDoctors('test-tenant');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Dr. Test');
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await doctorService.getAllDoctors('tenant-1');

    expect(mockQuery.mock.calls[0][0]).toContain('tenant_id');
    expect(mockQuery.mock.calls[0][1]).toContain('tenant-1');
  });

  it('returns empty array when no doctors', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await doctorService.getAllDoctors('tenant-1');

    expect(result).toEqual([]);
  });
});

describe('doctorService.registerDoctor', () => {
  it('throws if missing required fields', async () => {
    await expect(doctorService.registerDoctor({}, 'test-tenant')).rejects.toThrow('Name, specialty, and email are required');
    await expect(doctorService.registerDoctor({ name: 'Dr. Test' }, 'test-tenant')).rejects.toThrow('Name, specialty, and email are required');
  });

  it('throws if email invalid', async () => {
    await expect(doctorService.registerDoctor({
      name: 'Dr. Test', specialty: 'Medicina General', email: 'not-email',
    }, 'test-tenant'))      .rejects.toThrow('Invalid email');
  });

  it('throws if RUT invalid', async () => {
    await expect(doctorService.registerDoctor({
      name: 'Dr. Test', specialty: 'Medicina General', email: 'doc@test.com', rut: 'invalid',
    }, 'test-tenant'))      .rejects.toThrow('Invalid RUT');
  });

  it('throws if RUT already registered', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [{}] });
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.registerDoctor({
      name: 'Dr. Test', specialty: 'Medicina General', email: 'doc@test.com', rut: '12.345.678-5',
    }, 'test-tenant'))      .rejects.toThrow('RUT already registered');
  });

  it('throws if email already registered', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users WHERE email')) return Promise.resolve({ rows: [{}] });
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.registerDoctor({
      name: 'Dr. Test', specialty: 'Medicina General', email: 'doc@test.com',
    }, 'test-tenant'))      .rejects.toThrow('Email already registered');
  });

  it('creates doctor with availability', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users WHERE email')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [{ id: 1, email: 'doc@test.com' }] });
      if (sql.includes('INSERT INTO doctors')) return Promise.resolve({ rows: [{ id: 1, name: 'Dr. Test', specialty: 'Medicina General' }] });
      if (sql.includes('INSERT INTO doctor_availability')) return Promise.resolve({ rows: [] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await doctorService.registerDoctor({
      name: 'Dr. Test', specialty: 'Medicina General', email: 'doc@test.com',
    }, 'test-tenant');

    expect(result.doctor.name).toBe('Dr. Test');
    expect(result.credentials.email).toBe('doc@test.com');
  });

  it('handles sendEmail returning {sent:false} in registerDoctor', async () => {
    mockSendEmail.mockResolvedValue({ sent: false, error: 'SMTP error' });
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users WHERE email')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [{ id: 5, email: 'emailfail@test.com' }] });
      if (sql.includes('INSERT INTO doctors')) return Promise.resolve({ rows: [{ id: 5, name: 'Dr. EmailFail', specialty: 'Medicina General' }] });
      if (sql.includes('INSERT INTO doctor_availability')) return Promise.resolve({ rows: [] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await doctorService.registerDoctor({
      name: 'Dr. EmailFail', specialty: 'Medicina General', email: 'emailfail@test.com',
    }, 'test-tenant');

    expect(result.doctor.name).toBe('Dr. EmailFail');
  });

  it('still returns doctor when sendEmail rejects', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('smtp down'));
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users WHERE email')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [{ id: 6, email: 'reject@test.com' }] });
      if (sql.includes('INSERT INTO doctors')) return Promise.resolve({ rows: [{ id: 6, name: 'Dr. Reject', specialty: 'Medicina General' }] });
      if (sql.includes('INSERT INTO doctor_availability')) return Promise.resolve({ rows: [] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await doctorService.registerDoctor({
      name: 'Dr. Reject', specialty: 'Medicina General', email: 'reject@test.com',
    }, 'test-tenant');

    expect(result.doctor.name).toBe('Dr. Reject');
  });

  it('registers doctor with RUT (no duplicate)', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users WHERE email')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [{ id: 2, email: 'rutdoc@test.com' }] });
      if (sql.includes('INSERT INTO doctors')) return Promise.resolve({ rows: [{ id: 2, name: 'Dr. RUT', specialty: 'Medicina General' }] });
      if (sql.includes('INSERT INTO doctor_availability')) return Promise.resolve({ rows: [] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await doctorService.registerDoctor({
      name: 'Dr. RUT', specialty: 'Medicina General', email: 'rutdoc@test.com', rut: '12.345.678-5',
    }, 'test-tenant');

    expect(result.doctor.name).toBe('Dr. RUT');
  });

  it('handles unique constraint error in catch block', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users WHERE email')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO users')) {
        const err = new Error('Unique violation');
        err.code = '23505';
        return Promise.reject(err);
      }
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.registerDoctor({
      name: 'Dr. Dup', specialty: 'Medicina General', email: 'dup@test.com',
    }, 'test-tenant'))      .rejects.toThrow('Doctor or user already exists');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('registers doctor with tenantId', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users WHERE email')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [{ id: 3, email: 'tenantdoc@test.com' }] });
      if (sql.includes('INSERT INTO doctors')) return Promise.resolve({ rows: [{ id: 3, name: 'Dr. Tenant', specialty: 'Medicina General' }] });
      if (sql.includes('INSERT INTO doctor_availability')) return Promise.resolve({ rows: [] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await doctorService.registerDoctor({
      name: 'Dr. Tenant', specialty: 'Medicina General', email: 'tenantdoc@test.com',
    }, 'tenant-1');

    expect(result.doctor.name).toBe('Dr. Tenant');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      expect.arrayContaining(['tenant-1'])
    );
  });
});

describe('doctorService.createDoctor', () => {
  it('throws if missing required fields', async () => {
    await expect(doctorService.createDoctor({}, 'test-tenant')).rejects.toThrow('Name, specialty, and email are required');
  });

  it('throws if user not found', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, role, tenant_id FROM users')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.createDoctor({
      name: 'Dr. Test', specialty: 'Medicina General', email: 'doc@test.com', user_id: 999,
    }, 'test-tenant')).rejects.toThrow('User not found');
  });

  it('throws if user belongs to another tenant', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, role, tenant_id FROM users')) return Promise.resolve({ rows: [{ id: 1, role: 'doctor', tenant_id: 'other-tenant' }] });
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.createDoctor({
      name: 'Dr. Test', specialty: 'Medicina General', email: 'doc@test.com', user_id: 1,
    }, 'test-tenant')).rejects.toThrow('User not found');
  });

  it('throws if user role is not doctor', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, role, tenant_id FROM users')) return Promise.resolve({ rows: [{ id: 1, role: 'user', tenant_id: 'test-tenant' }] });
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.createDoctor({
      name: 'Dr. Test', specialty: 'Medicina General', email: 'doc@test.com', user_id: 1,
    }, 'test-tenant')).rejects.toThrow('User must have role doctor');
  });

  it('creates doctor successfully', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, role, tenant_id FROM users')) return Promise.resolve({ rows: [{ id: 1, role: 'doctor', tenant_id: 'test-tenant' }] });
      if (sql.includes('INSERT INTO doctors')) return Promise.resolve({ rows: [{ id: 1, name: 'Dr. Test' }] });
      if (sql.includes('INSERT INTO doctor_availability')) return Promise.resolve({ rows: [] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const result = await doctorService.createDoctor({
      name: 'Dr. Test', specialty: 'Medicina General', email: 'doc@test.com', user_id: 1,
    }, 'test-tenant');

    expect(result.name).toBe('Dr. Test');
  });

  it('throws on duplicate doctor (unique constraint)', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT id, role, tenant_id FROM users')) return Promise.resolve({ rows: [{ id: 1, role: 'doctor', tenant_id: 'test-tenant' }] });
      if (sql.includes('INSERT INTO doctors')) {
        const err = new Error('Duplicate');
        err.code = '23505';
        return Promise.reject(err);
      }
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    await expect(doctorService.createDoctor({
      name: 'Dr. Test', specialty: 'Medicina General', email: 'doc@test.com', user_id: 1,
    }, 'test-tenant')).rejects.toThrow('Doctor already exists for this user or email');
  });
});

describe('doctorService.getDoctorById', () => {
  it('returns doctor by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Test' }] });

    const result = await doctorService.getDoctorById(1, 'test-tenant');

    expect(result.name).toBe('Dr. Test');
  });

  it('returns null if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await doctorService.getDoctorById(999, 'test-tenant');

    expect(result).toBeNull();
  });
});

describe('doctorService.getDoctorByUserId', () => {
  it('returns doctor by user_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Test', user_id: 5 }] });

    const result = await doctorService.getDoctorByUserId(5, 'test-tenant');

    expect(result.user_id).toBe(5);
  });

  it('returns null when no doctor for user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await doctorService.getDoctorByUserId(999, 'test-tenant');

    expect(result).toBeNull();
  });
});

describe('doctorService.invitePerson', () => {
  it('throws if email is missing', async () => {
    await expect(doctorService.invitePerson({ role: 'patient' }, 't1')).rejects.toThrow('Email is required');
  });

  it('throws if email is invalid', async () => {
    await expect(doctorService.invitePerson({ email: 'not-email', role: 'patient' }, 't1')).rejects.toThrow('Invalid email');
  });

  it('throws if doctor role has no specialty', async () => {
    await expect(doctorService.invitePerson({ email: 'doc@test.com', role: 'doctor' }, 't1')).rejects.toThrow('Specialty is required for doctors');
  });

  it('throws if email already registered in tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });

    await expect(doctorService.invitePerson({ email: 'taken@test.com', role: 'patient' }, 't1')).rejects.toThrow('Email already registered');
  });

  it('sends invitation for patient and signs invite token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await doctorService.invitePerson({ email: 'patient@test.com', name: 'Ana', role: 'patient' }, 't1');

    expect(mockJwtManager.signInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'patient@test.com',
        name: 'Ana',
        role: 'patient',
        specialty: null,
        tenant_id: 't1',
        purpose: 'invite',
      }),
      '7d'
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'patient@test.com',
        tenantId: 't1',
        html: expect.stringContaining('mock-invite-token'),
      })
    );
  });

  it('clears specialty for lab_technician role', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await doctorService.invitePerson({ email: 'tech@test.com', role: 'lab_technician', specialty: 'should-be-cleared' }, 't1');

    expect(mockJwtManager.signInvite).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'lab_technician', specialty: null }),
      expect.any(String)
    );
    expect(mockSendEmail).toHaveBeenCalled();
  });
});

describe('doctorService.verifyInviteToken', () => {
  it('returns payload for valid invite token', () => {
    const payload = { email: 'a@test.com', name: 'Ana', role: 'patient', specialty: null, tenant_id: 't1', purpose: 'invite' };
    mockJwtManager.verify.mockReturnValue(payload);

    const result = doctorService.verifyInviteToken('token');

    expect(result).toEqual(payload);
    expect(mockJwtManager.verify).toHaveBeenCalledWith('token');
  });

  it('throws if payload has wrong purpose', () => {
    mockJwtManager.verify.mockReturnValue({ email: 'a@test.com', purpose: 'setup-password' });

    expect(() => doctorService.verifyInviteToken('token')).toThrow('Invalid or expired invitation token');
  });

  it('throws if verify returns null', () => {
    mockJwtManager.verify.mockReturnValue(null);

    expect(() => doctorService.verifyInviteToken('bad-token')).toThrow('Invalid or expired invitation token');
  });
});

describe('doctorService.listTenantUsers', () => {
  it('returns paginated users with totalPages', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, total: 25 }, { id: 2, total: 25 }] });

    const result = await doctorService.listTenantUsers('t1', 3, 10);

    expect(result.data).toHaveLength(2);
    expect(result.pagination).toEqual({ page: 3, limit: 10, total: 25, totalPages: 3 });
    // params: [tenantId, limit, offset]
    expect(mockQuery.mock.calls[0][1]).toEqual(['t1', 10, 20]);
  });

  it('filters by role', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, role: 'doctor', total: 1 }] });

    await doctorService.listTenantUsers('t1', 1, 20, { role: 'doctor' });

    expect(mockQuery.mock.calls[0][0]).toContain('u.role = $2');
    expect(mockQuery.mock.calls[0][1].slice(0, 2)).toEqual(['t1', 'doctor']);
  });

  it('filters by search term', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Ana', total: 1 }] });

    await doctorService.listTenantUsers('t1', 1, 20, { search: 'ana' });

    expect(mockQuery.mock.calls[0][0]).toContain('ILIKE');
    expect(mockQuery.mock.calls[0][1].slice(0, 2)).toEqual(['t1', '%ana%']);
  });

  it('combines role and search filters with correct param indices', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '5' }] });

    await doctorService.listTenantUsers('t1', 1, 20, { role: 'doctor', search: 'ana' });

    expect(mockQuery.mock.calls[0][0]).toContain('u.role = $2');
    expect(mockQuery.mock.calls[0][0]).toContain('ILIKE $3');
    expect(mockQuery.mock.calls[0][1].slice(0, 3)).toEqual(['t1', 'doctor', '%ana%']);
    expect(mockQuery.mock.calls[0][1].slice(3)).toEqual([20, 0]);
    expect(mockQuery.mock.calls[1][0]).toContain('COUNT(*)');
    expect(mockQuery.mock.calls[1][1].slice(0, 3)).toEqual(['t1', 'doctor', '%ana%']);
    expect(mockQuery.mock.calls[1][1]).toHaveLength(3);
  });
});

describe('doctorService.toggleUserActive', () => {
  it('deactivates user and revokes refresh tokens', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, email: 'u@test.com', name: 'U', role: 'user', active: false }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await doctorService.toggleUserActive(1, 't1');

    expect(result.active).toBe(false);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][0]).toContain('UPDATE refresh_tokens SET revoked = true');
    expect(mockQuery.mock.calls[1][1]).toEqual([1]);
  });

  it('reactivates user without touching refresh tokens', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, email: 'u@test.com', name: 'U', role: 'user', active: true }] });

    const result = await doctorService.toggleUserActive(1, 't1');

    expect(result.active).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('throws if user not found in tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(doctorService.toggleUserActive(999, 't1')).rejects.toThrow('User not found in this tenant');
  });
});
