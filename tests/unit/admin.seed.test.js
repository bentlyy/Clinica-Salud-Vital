import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(),
    on: vi.fn(),
  },
  readPool: { query: mockQuery },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
  },
}));

const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }));
vi.mock('../../src/utils/logger.js', () => ({ logger: mockLogger }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEFAULT_TENANT_ID = 'default';
  delete process.env.SEED_PASSWORD;
  delete process.env.ADMIN_PASSWORD;
});

import {
  seedDefaultTenant,
  seedSuperAdmin,
  seedTestTenants,
  spreadSeedDates,
  seedAdmin,
} from '../../src/seed/admin.seed.js';

describe('seedDefaultTenant', () => {
  it('skips creation if tenant already exists', async () => {
    mockQuery.mockResolvedValue({ rows: [{}], rowCount: 0 });

    await seedDefaultTenant();

    expect(mockLogger.info).toHaveBeenCalledWith('Default tenant already exists');
    expect(mockQuery.mock.calls[1][0]).toContain('UPDATE users');
  });

  it('creates tenant if not exists', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rowCount: 0 });

    await seedDefaultTenant();

    expect(mockLogger.info).toHaveBeenCalledWith('Default tenant created: default');
  });

  it('updates legacy users with null tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });
    mockQuery.mockResolvedValueOnce({ rowCount: 5 });

    await seedDefaultTenant();

    expect(mockLogger.info).toHaveBeenCalledWith('Usuarios legacy actualizados con tenant_id: 5');
  });
});

describe('seedSuperAdmin', () => {
  it('skips if superadmin already exists', async () => {
    mockQuery.mockResolvedValue({ rows: [{}] });

    await seedSuperAdmin();

    expect(mockLogger.info).toHaveBeenCalledWith('Superadmin already exists — ensured cross-clinic tenant_id=NULL');
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('creates superadmin when none exists', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await seedSuperAdmin();

    expect(mockLogger.info).toHaveBeenCalledWith('Superadmin created with tenant_id=NULL (cross-clinic)', { email: 'superadmin@clinic.com' });
    const insertCall = mockQuery.mock.calls.find(c => c[0].includes('INSERT INTO users'));
    expect(insertCall).toBeDefined();
    expect(insertCall[1]).toContain('superadmin');
  });

  it('uses env variables for credentials', async () => {
    process.env.SUPERADMIN_EMAIL = 'custom@admin.com';
    process.env.SUPERADMIN_PASSWORD = 'custompass';
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await seedSuperAdmin();

    const insertCall = mockQuery.mock.calls.find(c => c[0].includes('INSERT INTO users'));
    expect(insertCall[1]).toContain('custom@admin.com');
  });
});

describe('seedTestTenants', () => {
  it('skips in production', async () => {
    process.env.NODE_ENV = 'production';

    await seedTestTenants();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('producción'));
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('creates test tenants with data', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SEED_PASSWORD = 'StrongSeedPass1!';
    const rowWithId = (id) => ({ rows: [{ id }] });
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('CREATE UNIQUE INDEX')) return Promise.resolve({});
      if (sql.includes('SELECT COUNT(*)')) return Promise.resolve({ rows: [{ count: '0' }] });
      if (sql.includes('SELECT 1 FROM tenants')) return Promise.resolve({ rows: [], rowCount: 0 });
      if (sql.includes('ALTER TABLE')) return Promise.resolve({});
      if (sql.includes('INSERT INTO users') && sql.includes('RETURNING id')) return Promise.resolve(rowWithId(Math.floor(Math.random() * 100)));
      if (sql.includes('INSERT INTO doctors') && sql.includes('RETURNING id')) return Promise.resolve(rowWithId(Math.floor(Math.random() * 100)));
      if (sql.includes('SELECT id FROM subscriptions')) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await seedTestTenants();

    expect(mockQuery).toHaveBeenCalled();
  });
});

describe('spreadSeedDates', () => {
  it('skips in production', async () => {
    process.env.NODE_ENV = 'production';
    await spreadSeedDates();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('updates dates for users, bookings, and clinical records', async () => {
    process.env.NODE_ENV = 'development';
    mockQuery
      .mockResolvedValueOnce({ rowCount: 10 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 5 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 3 });

    await spreadSeedDates();

    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE users');
    expect(mockQuery.mock.calls[2][0]).toContain('UPDATE bookings');
    expect(mockQuery.mock.calls[4][0]).toContain('UPDATE clinical_records');
  });

  it('handles zero affected rows', async () => {
    process.env.NODE_ENV = 'development';
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 0 });

    await spreadSeedDates();
    expect(mockQuery).toHaveBeenCalledTimes(5);
  });
});

describe('seedAdmin', () => {
  it('skips if admin already exists', async () => {
    mockQuery.mockResolvedValue({ rows: [{}] });

    await seedAdmin();

    expect(mockLogger.info).toHaveBeenCalledWith('Seed ya ejecutado');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('creates admin, doctors, and patients', async () => {
    const defaultRow = { rows: [], rowCount: 0 };
    const rowWithId = (id) => ({ rows: [{ id }] });
    let callCount = 0;
    mockQuery.mockImplementation(() => {
      callCount++;
      // Check admin exists
      if (callCount === 1) return Promise.resolve({ rows: [], rowCount: 0 });
      // INSERT admin
      if (callCount === 2) return Promise.resolve(rowWithId(1));
      // 4 doctors: each has 1 user insert + 1 doctor insert + 5 availability
      // Doctor 1
      if (callCount === 3) return Promise.resolve(rowWithId(2));
      if (callCount === 4) return Promise.resolve(rowWithId(1));
      if (callCount <= 9) return Promise.resolve(defaultRow);
      // Doctor 2
      if (callCount === 10) return Promise.resolve(rowWithId(3));
      if (callCount === 11) return Promise.resolve(rowWithId(2));
      if (callCount <= 16) return Promise.resolve(defaultRow);
      // Doctor 3
      if (callCount === 17) return Promise.resolve(rowWithId(4));
      if (callCount === 18) return Promise.resolve(rowWithId(3));
      if (callCount <= 23) return Promise.resolve(defaultRow);
      // Doctor 4
      if (callCount === 24) return Promise.resolve(rowWithId(5));
      if (callCount === 25) return Promise.resolve(rowWithId(4));
      if (callCount <= 30) return Promise.resolve(defaultRow);
      // 3 patients
      return Promise.resolve(defaultRow);
    });

    await seedAdmin();

    expect(mockLogger.info).toHaveBeenCalledWith('Seed completo: admin, doctores (con disponibilidad), pacientes y laboratorio creados');
  });

  it('uses env variable for password', async () => {
    process.env.ADMIN_PASSWORD = 'custom123';
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('RETURNING id')) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await seedAdmin();
    expect(mockQuery).toHaveBeenCalled();
  });
});
