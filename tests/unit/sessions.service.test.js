import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

vi.mock('../../src/shared/crypto.service.js', () => ({
  hashToken: vi.fn((t) => `hash(${t})`),
}));

import {
  createUserSession,
  touchUserSession,
  listUserSessions,
  revokeUserSession,
  revokeAllUserSessions,
} from '../../src/shared/sessions.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createUserSession', () => {
  it('inserts a session and returns id + token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 7 }] });

    const result = await createUserSession(3, 'tenant-1', '1.2.3.4', 'Agent/1.0');

    expect(result.sessionId).toBe(7);
    expect(result.sessionToken).toBeTruthy();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_sessions'),
      [3, 'tenant-1', expect.any(String), '1.2.3.4', 'Agent/1.0', expect.any(Date)]
    );
  });

  it('stores null ip/user agent when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await createUserSession(3, 'tenant-1', null, undefined);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [3, 'tenant-1', expect.any(String), null, null, expect.any(Date)]
    );
  });
});

describe('touchUserSession', () => {
  it('skips when no session id', async () => {
    await touchUserSession(null);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('updates last_seen_at', async () => {
    await touchUserSession(5);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user_sessions'),
      [5]
    );
  });
});

describe('listUserSessions', () => {
  it('maps rows to session objects', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, user_id: 3, tenant_id: 't', ip_address: null, user_agent: null,
        created_at: '2026-01-01', last_seen_at: '2026-01-01', expires_at: null, revoked_at: null,
      }],
    });

    const sessions = await listUserSessions(3, 't');

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1'),
      [3, 't']
    );
  });
});

describe('revokeUserSession', () => {
  it('returns false when session not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(revokeUserSession(1, 3, 't')).resolves.toBe(false);
  });

  it('revokes session and its refresh tokens', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const ok = await revokeUserSession(1, 3, 't');

    expect(ok).toBe(true);
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE refresh_tokens'),
      [1]
    );
  });
});

describe('revokeAllUserSessions', () => {
  it('revokes every active session for the user', async () => {
    await revokeAllUserSessions(3);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user_sessions'),
      [3]
    );
  });
});
