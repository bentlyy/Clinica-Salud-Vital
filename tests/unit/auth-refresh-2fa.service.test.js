import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

const mockCompare = vi.fn();
const mockHash = vi.fn().mockResolvedValue('$2b$12$hashedpassword123');

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
  hash: mockHash,
  compare: mockCompare,
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock-access-token'),
  },
  sign: vi.fn(() => 'mock-access-token'),
}));

vi.mock('../../src/shared/base32.js', () => ({
  base32Encode: vi.fn((buf) => 'MOCKSECRET12345678'),
  base32Decode: vi.fn(() => Buffer.from('valid-secret-key-here')),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

describe('authService.refreshToken', () => {
  it('returns new tokens for valid refresh token', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('FOR UPDATE')) return Promise.resolve({ rows: [{ id: 10, user_id: 1 }] });
      if (sql.includes('SELECT * FROM users')) return Promise.resolve({ rows: [{ id: 1, email: 'user@test.com', role: 'user', tenant_id: 'default' }] });
      if (sql.includes('UPDATE refresh_tokens SET revoked')) return Promise.resolve({});
      if (sql.includes('INSERT INTO refresh_tokens')) return Promise.resolve({});
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const { refreshToken } = await import('../../src/modules/auth/auth.service.js');
    const result = await refreshToken({ refresh_token: 'valid-token' });
    expect(result.access_token).toBe('mock-access-token');
    expect(result.refresh_token).toBeDefined();
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('returns null for invalid token', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('FOR UPDATE')) return Promise.resolve({ rows: [] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const { refreshToken } = await import('../../src/modules/auth/auth.service.js');
    const result = await refreshToken({ refresh_token: 'invalid-token' });
    expect(result).toBeNull();
  });

  it('returns null if user not found', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('FOR UPDATE')) return Promise.resolve({ rows: [{ id: 10, user_id: 999 }] });
      if (sql.includes('SELECT * FROM users')) return Promise.resolve({ rows: [] });
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const { refreshToken } = await import('../../src/modules/auth/auth.service.js');
    const result = await refreshToken({ refresh_token: 'valid-but-user-gone' });
    expect(result).toBeNull();
  });

  it('rolls back on error', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('FOR UPDATE')) return Promise.reject(new Error('DB error'));
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const { refreshToken } = await import('../../src/modules/auth/auth.service.js');
    await expect(refreshToken({ refresh_token: 'error' })).rejects.toThrow('DB error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('authService.logout', () => {
  it('revokes refresh token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { logout } = await import('../../src/modules/auth/auth.service.js');
    await logout('token-to-revoke');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE refresh_tokens SET revoked = true'), ['token-to-revoke']);
  });
});

describe('authService.logoutAll', () => {
  it('revokes all user tokens', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { logoutAll } = await import('../../src/modules/auth/auth.service.js');
    await logoutAll(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1'), [1]);
  });
});

describe('authService.changePassword', () => {
  it('changes password successfully', async () => {
    mockCompare.mockResolvedValueOnce(true);
    mockQuery.mockResolvedValueOnce({ rows: [{ password: '$2b$12$oldhash' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const { changePassword } = await import('../../src/modules/auth/auth.service.js');
    await changePassword({ userId: 1, currentPassword: 'OldPass1!', newPassword: 'NewPass1!' });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET password = $1'), expect.any(Array));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1'), [1]);
  });

  it('throws if new password fails validation', async () => {
    const { changePassword } = await import('../../src/modules/auth/auth.service.js');
    await expect(changePassword({ userId: 1, currentPassword: 'OldPass1!', newPassword: 'short' })).rejects.toThrow('at least 8 characters');
  });

  it('throws if current password is incorrect', async () => {
    mockCompare.mockResolvedValueOnce(false);
    mockQuery.mockResolvedValueOnce({ rows: [{ password: '$2b$12$oldhash' }] });

    const { changePassword } = await import('../../src/modules/auth/auth.service.js');
    await expect(changePassword({ userId: 1, currentPassword: 'WrongPass1!', newPassword: 'NewPass1!' })).rejects.toThrow('Current password is incorrect');
  });

  it('throws if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const { changePassword } = await import('../../src/modules/auth/auth.service.js');
    await expect(changePassword({ userId: 999, currentPassword: 'OldPass1!', newPassword: 'NewPass1!' })).rejects.toThrow('User not found');
  });
});

describe('auth2faService', () => {
  it('generateSecret creates valid secret and URL', async () => {
    const { generateSecret } = await import('../../src/modules/auth/auth-2fa.service.js');
    const result = generateSecret('user@test.com');
    expect(result.secret).toBeDefined();
    expect(result.secret.length).toBeGreaterThan(10);
    expect(result.qrCodeUrl).toContain('otpauth://totp/');
    expect(result.qrCodeUrl).toContain('user%40test.com');
  });

  it('verifyToken returns false for invalid token', async () => {
    const { verifyToken } = await import('../../src/modules/auth/auth-2fa.service.js');
    const result = verifyToken('JBSWY3DPEHPK3PXP', '000000');
    expect(result).toBe(false);
  });

  it('verifyToken returns false for empty inputs', async () => {
    const { verifyToken } = await import('../../src/modules/auth/auth-2fa.service.js');
    expect(verifyToken('', '123456')).toBe(false);
    expect(verifyToken('SECRET', '')).toBe(false);
  });

  it('verifyToken returns false for non-numeric token', async () => {
    const { verifyToken } = await import('../../src/modules/auth/auth-2fa.service.js');
    expect(verifyToken('SECRET', 'abcdef')).toBe(false);
  });

  it('verifyToken returns false for wrong-length token', async () => {
    const { verifyToken } = await import('../../src/modules/auth/auth-2fa.service.js');
    expect(verifyToken('SECRET', '12345')).toBe(false);
    expect(verifyToken('SECRET', '1234567')).toBe(false);
  });

  it('enable2FA stores secret', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { enable2FA } = await import('../../src/modules/auth/auth-2fa.service.js');
    const result = await enable2FA(1, 'user@test.com');
    expect(result.secret).toBeDefined();
    expect(result.qrCodeUrl).toContain('otpauth://totp/');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET totp_secret'), expect.any(Array));
  });

  it('verifyAndEnable2FA throws if not initialized', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });
    const { verifyAndEnable2FA } = await import('../../src/modules/auth/auth-2fa.service.js');
    await expect(verifyAndEnable2FA(1, '123456')).rejects.toThrow('2FA not initialized');
  });

  it('disable2FA clears secret', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { disable2FA } = await import('../../src/modules/auth/auth-2fa.service.js');
    await disable2FA(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET totp_secret = NULL'), [1]);
  });

  it('is2FARequired checks user status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ totp_enabled: true }] });
    const { is2FARequired } = await import('../../src/modules/auth/auth-2fa.service.js');
    const result = await is2FARequired(1);
    expect(result).toBe(true);
  });

  it('is2FARequired returns false when not enabled', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ totp_enabled: false }] });
    const { is2FARequired } = await import('../../src/modules/auth/auth-2fa.service.js');
    const result = await is2FARequired(1);
    expect(result).toBe(false);
  });

  it('verifyAndEnable2FA throws if token invalid', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ totp_secret: 'JBSWY3DPEHPK3PXP' }] });

    const { verifyAndEnable2FA } = await import('../../src/modules/auth/auth-2fa.service.js');
    await expect(verifyAndEnable2FA(1, '000000')).rejects.toThrow('Invalid 2FA token');
  });

  it('verifyAndEnable2FA succeeds with valid token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ totp_secret: 'JBSWY3DPEHPK3PXP' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const crypto = await import('crypto');
    const key = Buffer.from('valid-secret-key-here');
    const currentStep = Math.floor(Date.now() / 1000 / 30);

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(currentStep));
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const hmacResult = hmac.digest();
    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const code = ((hmacResult[offset] & 0x7f) << 24) | ((hmacResult[offset + 1] & 0xff) << 16) | ((hmacResult[offset + 2] & 0xff) << 8) | (hmacResult[offset + 3] & 0xff);
    const validToken = String(code % 1000000).padStart(6, '0');

    const { verifyAndEnable2FA } = await import('../../src/modules/auth/auth-2fa.service.js');
    const result = await verifyAndEnable2FA(1, validToken);
    expect(result).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET totp_enabled = true'), [1]);
  });
});
