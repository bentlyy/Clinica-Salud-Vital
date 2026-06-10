import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const mockQuery = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }));

vi.mock('../../src/shared/db.js', () => ({ pool: { query: mockQuery } }));
vi.mock('../../src/utils/logger.js', () => ({ logger: mockLogger }));

function computeHash(previousHash, action, tenantId) {
  const canonical = [previousHash || '', action, tenantId || ''].join('|');
  return crypto.createHmac('sha256', process.env.AUDIT_HMAC_SECRET).update(canonical).digest('hex');
}

const SECRET = process.env.AUDIT_HMAC_SECRET || 'test-hmac-secret-for-testing-32chars!';
if (!process.env.AUDIT_HMAC_SECRET) process.env.AUDIT_HMAC_SECRET = SECRET;

import { verifyAuditChain } from '../../src/jobs/audit-integrity.job.js';

describe('verifyAuditChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!process.env.AUDIT_HMAC_SECRET) process.env.AUDIT_HMAC_SECRET = 'test-hmac-secret-for-testing-32chars!';
  });

  it('returns valid=true when chain is intact', async () => {
    const hash1 = computeHash(null, 'user_login', 'default');
    const hash2 = computeHash(hash1, 'booking_created', 'default');
    const hash3 = computeHash(hash2, 'clinical_record_created', 'default');

    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, hash: hash1, previous_hash: null, action: 'user_login', tenant_id: 'default' },
        { id: 2, hash: hash2, previous_hash: hash1, action: 'booking_created', tenant_id: 'default' },
        { id: 3, hash: hash3, previous_hash: hash2, action: 'clinical_record_created', tenant_id: 'default' },
      ],
    });

    const result = await verifyAuditChain();
    expect(result.valid).toBe(true);
    expect(result.brokenLinks).toBe(0);
    expect(result.checked).toBe(3);
  });

  it('detects broken previous_hash chain', async () => {
    const hash1 = computeHash(null, 'user_login', 'default');
    const wrongHash = computeHash('wrongprevious', 'booking_created', 'default');

    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, hash: hash1, previous_hash: null, action: 'user_login', tenant_id: 'default' },
        { id: 2, hash: wrongHash, previous_hash: 'tampered', action: 'booking_created', tenant_id: 'default' },
      ],
    });

    const result = await verifyAuditChain();
    expect(result.valid).toBe(false);
    expect(result.brokenLinks).toBeGreaterThanOrEqual(1);
    expect(result.checked).toBe(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Audit chain integrity violation at log #2')
    );
  });

  it('detects hash mismatch (tampered action)', async () => {
    const hash1 = computeHash(null, 'user_login', 'default');
    const tamperedHash = computeHash(hash1, 'booking_created_TAMPERED', 'default');

    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, hash: hash1, previous_hash: null, action: 'user_login', tenant_id: 'default' },
        { id: 2, hash: tamperedHash, previous_hash: hash1, action: 'booking_created', tenant_id: 'default' },
      ],
    });

    const result = await verifyAuditChain();
    expect(result.valid).toBe(false);
    expect(result.brokenLinks).toBeGreaterThanOrEqual(1);
  });

  it('returns valid=true for single row chain', async () => {
    const hash1 = computeHash(null, 'user_login', 'default');

    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, hash: hash1, previous_hash: null, action: 'user_login', tenant_id: 'default' },
      ],
    });

    const result = await verifyAuditChain();
    expect(result.valid).toBe(true);
    expect(result.brokenLinks).toBe(0);
    expect(result.checked).toBe(1);
  });

  it('returns valid=true for empty chain', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await verifyAuditChain();
    expect(result.valid).toBe(true);
    expect(result.brokenLinks).toBe(0);
    expect(result.checked).toBe(0);
  });

  it('filters by tenant_id when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await verifyAuditChain('tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND tenant_id = $1'),
      ['tenant-1']
    );
  });

  it('does not filter by tenant_id when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await verifyAuditChain();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.not.stringContaining('AND tenant_id'),
      []
    );
  });

  it('handles null previous_hash correctly for first entry', async () => {
    const hash1 = computeHash(null, 'first_action', 'default');

    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, hash: hash1, previous_hash: null, action: 'first_action', tenant_id: 'default' },
      ],
    });

    const result = await verifyAuditChain();
    expect(result.valid).toBe(true);
  });

  it('detects multiple broken links', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, hash: 'hash1', previous_hash: null, action: 'action1', tenant_id: 'default' },
        { id: 2, hash: 'hash2', previous_hash: 'hash1', action: 'action2', tenant_id: 'default' },
        { id: 3, hash: 'hash3', previous_hash: 'hash2', action: 'action3', tenant_id: 'default' },
      ],
    });

    const result = await verifyAuditChain();
    expect(result.valid).toBe(false);
    expect(result.brokenLinks).toBe(3);
    expect(result.checked).toBe(3);
  });

  it('throws when AUDIT_HMAC_SECRET is missing', async () => {
    const originalSecret = process.env.AUDIT_HMAC_SECRET;
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, hash: 'abc', previous_hash: null, action: 'test', tenant_id: 'default' }],
    });
    delete process.env.AUDIT_HMAC_SECRET;

    try {
      await expect(verifyAuditChain()).rejects.toThrow('AUDIT_HMAC_SECRET');
    } finally {
      process.env.AUDIT_HMAC_SECRET = originalSecret;
    }
  });

  it('includes tenant_id in canonical hash computation', async () => {
    const hash1 = computeHash(null, 'user_login', 'tenant-A');
    const hash2 = computeHash(hash1, 'booking_created', 'tenant-A');

    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, hash: hash1, previous_hash: null, action: 'user_login', tenant_id: 'tenant-A' },
        { id: 2, hash: hash2, previous_hash: hash1, action: 'booking_created', tenant_id: 'tenant-A' },
      ],
    });

    // Different tenant should produce different hashes
    const hash1b = computeHash(null, 'user_login', 'tenant-B');
    const hash2b = computeHash(hash1b, 'booking_created', 'tenant-B');

    expect(hash1).not.toBe(hash1b);
    expect(hash2).not.toBe(hash2b);

    const result = await verifyAuditChain('tenant-A');
    expect(result.valid).toBe(true);
  });
});
