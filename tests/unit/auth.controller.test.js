import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

vi.mock('../../src/modules/auth/auth.service.js', () => ({
  register: vi.fn(),
  login: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  changePassword: vi.fn(),
  enable2FA: vi.fn(),
  verifyAndEnable2FA: vi.fn(),
  disable2FA: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('../../src/shared/seed-status.js', () => ({
  waitForSeed: vi.fn().mockResolvedValue(true),
}));

import * as authService from '../../src/modules/auth/auth.service.js';
import * as authController from '../../src/modules/auth/auth.controller.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const mkRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis(), cookie: vi.fn(), clearCookie: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('register', () => {
  it('calls register service and returns 201', async () => {
    vi.mocked(authService.register).mockResolvedValue({ id: 1, email: 'test@test.com' });
    const req = { body: { email: 'test@test.com', password: 'Pass1!' }, tenant_id: 't1' };
    const res = mkRes();

    authController.register(req, res, vi.fn());
    await flush();

    expect(authService.register).toHaveBeenCalledWith({ email: 'test@test.com', password: 'Pass1!', tenant_id: 't1' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, email: 'test@test.com' });
  });
});

describe('login', () => {
  it('calls login service and returns data', async () => {
    vi.mocked(authService.login).mockResolvedValue({ token: 'abc', user: { id: 1 } });
    const req = { body: { email: 'test@test.com', password: 'Pass1!' }, ip: '::1', get: vi.fn() };
    const res = mkRes();

    authController.login(req, res, vi.fn());
    await flush();

    expect(authService.login).toHaveBeenCalledWith(
      { email: 'test@test.com', password: 'Pass1!', ip_address: '::1', user_agent: undefined },
      undefined,
    );
    expect(res.json).toHaveBeenCalledWith({ token: 'abc', user: { id: 1 } });
  });
});

describe('refresh', () => {
  it('returns 400 when refresh_token missing', async () => {
    const req = { body: {} };
    const res = mkRes();
    const next = vi.fn();

    authController.refresh(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns 401 when refresh_token invalid', async () => {
    vi.mocked(authService.refreshToken).mockResolvedValue(null);
    const req = { body: {}, cookies: { refresh_token: 'bad' } };
    const res = mkRes();
    const next = vi.fn();

    authController.refresh(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns new tokens when valid', async () => {
    vi.mocked(authService.refreshToken).mockResolvedValue({ access_token: 'new', refresh_token: 'new-r', user: { id: 1 } });
    const req = { body: {}, cookies: { refresh_token: 'valid' } };
    const res = mkRes();

    authController.refresh(req, res, vi.fn());
    await flush();

    expect(authService.refreshToken).toHaveBeenCalledWith({ refresh_token: 'valid' });
    expect(res.json).toHaveBeenCalledWith({ access_token: 'new', refresh_token: 'new-r', user: { id: 1 } });
  });
});

describe('logout', () => {
  it('logs out with refresh_token', async () => {
    const req = { body: { refresh_token: 'rt' }, user: undefined };
    const res = mkRes();

    authController.logout(req, res, vi.fn());
    await flush();

    expect(authService.logout).toHaveBeenCalledWith('rt', undefined);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });

  it('succeeds without refresh_token', async () => {
    const req = { body: {} };
    const res = mkRes();

    authController.logout(req, res, vi.fn());
    await flush();

    expect(authService.logout).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });
});

describe('logoutAll', () => {
  it('returns 401 when no user', async () => {
    const req = { body: {} };
    const res = mkRes();
    const next = vi.fn();

    authController.logoutAll(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('logs out all sessions', async () => {
    const req = { user: { id: 1 }, body: {} };
    const res = mkRes();

    authController.logoutAll(req, res, vi.fn());
    await flush();

    expect(authService.logoutAll).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out from all devices' });
  });
});

describe('changePassword', () => {
  it('returns 401 when no user', async () => {
    const req = { body: {} };
    const res = mkRes();
    const next = vi.fn();

    authController.changePassword(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('changes password successfully', async () => {
    const req = { user: { id: 1 }, body: { current_password: 'old', new_password: 'NewPass1!' } };
    const res = mkRes();

    authController.changePassword(req, res, vi.fn());
    await flush();

    expect(authService.changePassword).toHaveBeenCalledWith({
      userId: 1, currentPassword: 'old', newPassword: 'NewPass1!',
    }, undefined);
    expect(res.json).toHaveBeenCalledWith({ message: 'Password changed successfully' });
  });
});

describe('enable2FA', () => {
  it('returns 401 when no user', async () => {
    const req = { body: {} };
    const res = mkRes();
    const next = vi.fn();

    authController.enable2FA(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('enables 2FA', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ email: 'test@test.com' }] });
    vi.mocked(authService.enable2FA).mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP' });
    const req = { user: { id: 1 }, body: {} };
    const res = mkRes();

    authController.enable2FA(req, res, vi.fn());
    await flush();

    expect(authService.enable2FA).toHaveBeenCalledWith(1, 'test@test.com');
    expect(res.json).toHaveBeenCalledWith({ secret: 'JBSWY3DPEHPK3PXP' });
  });
});

describe('verifyAndEnable2FA', () => {
  it('returns 401 when no user', async () => {
    const req = { body: {} };
    const res = mkRes();
    const next = vi.fn();

    authController.verifyAndEnable2FA(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('verifies and enables 2FA', async () => {
    const req = { user: { id: 1 }, body: { token: '123456' } };
    const res = mkRes();

    authController.verifyAndEnable2FA(req, res, vi.fn());
    await flush();

    expect(authService.verifyAndEnable2FA).toHaveBeenCalledWith(1, '123456');
    expect(res.json).toHaveBeenCalledWith({ message: '2FA enabled successfully' });
  });
});

describe('disable2FA', () => {
  it('returns 401 when no user', async () => {
    const req = { body: {} };
    const res = mkRes();
    const next = vi.fn();

    authController.disable2FA(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('disables 2FA', async () => {
    const req = { user: { id: 1 }, body: { password: 'StrongPass1!' } };
    const res = mkRes();

    authController.disable2FA(req, res, vi.fn());
    await flush();

    expect(authService.disable2FA).toHaveBeenCalledWith(1, 'StrongPass1!', undefined);
    expect(res.json).toHaveBeenCalledWith({ message: '2FA disabled successfully' });
  });
});
