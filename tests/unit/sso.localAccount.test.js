import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockRun } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRun: vi.fn((_tenantId, fn) => fn()),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery, connect: vi.fn(), on: vi.fn() },
  readPool: { query: mockQuery },
  superAdminPool: { query: mockQuery, connect: vi.fn() },
  tenantContext: { run: mockRun },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import {
  resolveLocalAccount,
  TenantNoVinculadoError,
} from '../../src/sso/localAccount.js';

const identity = (over = {}) => ({
  userId: 'core-user-1',
  organizationId: 'org-1',
  organizationSlug: 'clinica-demo',
  organizationName: 'Clínica Demo',
  tools: [],
  role: 'owner',
  email: 'doc@test.com',
  name: 'Dr. Test',
  product: 'vitaria',
  sessionId: 'sess-1',
  ...over,
});

beforeEach(() => {
  mockQuery.mockReset();
  mockRun.mockClear();
});

describe('resolveLocalAccount', () => {
  it('lanza TenantNoVinculadoError si la organización no tiene tenant', async () => {
    mockQuery.mockResolvedValue({ rows: [] }); // tenants lookup -> sin tenant

    await expect(resolveLocalAccount(identity())).rejects.toBeInstanceOf(TenantNoVinculadoError);
    await expect(resolveLocalAccount(identity())).rejects.toMatchObject({
      organizationId: 'org-1',
      name: 'TenantNoVinculadoError',
    });
  });

  it('resuelve el tenant y corre el usuario dentro de su tenantContext', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'tenant-a' }] }) // tenants
      .mockResolvedValueOnce({
        rows: [{ id: 7, email: 'doc@test.com', name: 'Doc', role: 'admin', tenant_id: 'tenant-a' }],
      });

    const cuenta = await resolveLocalAccount(identity());

    expect(mockRun).toHaveBeenCalledWith('tenant-a', expect.any(Function));
    expect(cuenta).toEqual({
      id: 7,
      email: 'doc@test.com',
      name: 'Doc',
      role: 'admin',
      tenantId: 'tenant-a',
    });
  });

  it('usa la cuenta existente por sso_sub y no inserta', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'tenant-a' }] })
      .mockResolvedValueOnce({
        rows: [{ id: 9, email: 'u@test.com', name: null, role: 'user', tenant_id: 'tenant-a' }],
      });

    const cuenta = await resolveLocalAccount(identity());
    expect(cuenta.id).toBe(9);
    expect(cuenta.name).toBe('u@test.com'); // name cae al email
    // tenants + users(sso_sub): sin INSERT ni UPDATE
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('enlaza por email una cuenta sembrada (UPDATE sso_sub) cuando no hay sso_sub', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'tenant-a' }] }) // tenants
      .mockResolvedValueOnce({ rows: [] }) // por sso_sub: nada
      .mockResolvedValueOnce({
        rows: [{ id: 3, email: 'doc@test.com', name: 'Doc', role: 'admin', tenant_id: 'tenant-a' }],
      }) // por email
      .mockResolvedValueOnce({ rows: [] }); // UPDATE

    const cuenta = await resolveLocalAccount(identity());
    expect(cuenta.id).toBe(3);
    const updateCall = mockQuery.mock.calls.find((c) => String(c[0]).includes('UPDATE users SET sso_sub'));
    expect(updateCall).toBeTruthy();
    expect(updateCall[1]).toEqual(['core-user-1', 3]);
  });

  it('crea la cuenta local cuando no existe (rol owner -> admin)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'tenant-a' }] })
      .mockResolvedValueOnce({ rows: [] }) // sso_sub
      .mockResolvedValueOnce({ rows: [] }) // email
      .mockResolvedValueOnce({
        rows: [{ id: 11, email: 'doc@test.com', name: 'Dr. Test', role: 'admin', tenant_id: 'tenant-a' }],
      }); // INSERT ... RETURNING

    const cuenta = await resolveLocalAccount(identity());
    expect(cuenta.id).toBe(11);
    const insertCall = mockQuery.mock.calls.find((c) => String(c[0]).includes('INSERT INTO users'));
    expect(insertCall).toBeTruthy();
    // email, placeholder password, name, role, tenant_id, sso_sub
    expect(insertCall[1][0]).toBe('doc@test.com');
    expect(insertCall[1][3]).toBe('admin');
    expect(insertCall[1][4]).toBe('tenant-a');
    expect(insertCall[1][5]).toBe('core-user-1');
  });

  it('rol member -> user y email/name por defecto cuando faltan', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'tenant-a' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 12, email: 'sso-x@vitaria.local', name: 'Usuario', role: 'user', tenant_id: 'tenant-a' }],
      });

    await resolveLocalAccount(identity({ role: 'member', email: '', name: '' }));

    const insertCall = mockQuery.mock.calls.find((c) => String(c[0]).includes('INSERT INTO users'));
    expect(insertCall[1][0]).toBe('sso-core-user-1@vitaria.local');
    expect(insertCall[1][2]).toBe('Usuario');
    expect(insertCall[1][3]).toBe('user');
  });
});
