import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

const { mockSignInvite, mockVerify } = vi.hoisted(() => ({
  mockSignInvite: vi.fn(),
  mockVerify: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../src/shared/jwt.service.js', () => ({
  jwtManager: {
    signInvite: mockSignInvite,
    verify: mockVerify,
    sign: vi.fn(),
    destroy: vi.fn(),
  },
}));

vi.mock('../../src/shared/queue.service.js', () => ({
  enqueueJob: vi.fn(),
}));

import { enqueueJob } from '../../src/shared/queue.service.js';
import {
  getLabResultsByRequest,
  sendLabResultsByEmail,
  getLabResultsByToken,
} from '../../src/modules/laboratory/lab-result-email.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getLabResultsByRequest', () => {
  it('returns request with items', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        request_number: 'LAB-2026-1',
        patient_name: 'Ana',
        items: [{ name: 'Glucosa', result_value: '95', status: 'signed' }],
      }],
    });

    const result = await getLabResultsByRequest(1, 'tenant-1');

    expect(result.request_number).toBe('LAB-2026-1');
    expect(result.items).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM lab_requests'), [1, 'tenant-1']);
  });

  it('throws NotFoundError when request not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(getLabResultsByRequest(999, 'tenant-1')).rejects.toThrow('Lab request not found');
  });
});

describe('sendLabResultsByEmail', () => {
  const resultsRow = {
    id: 1,
    request_number: 'LAB-2026-1',
    patient_name: 'Ana Pérez',
    items: [
      { name: 'Glucosa', code: 'GLU', unit: 'mg/dL', result_value: '95', reference_range: { min: 70, max: 110 }, status: 'signed', signed_at: '2026-07-01T10:00:00Z', signed_by: 3 },
      { name: 'Hemoglobina', code: 'HGB', unit: 'g/dL', result_value: '14.2', reference_range: { min: 12, max: 16 }, status: 'validated_doctor' },
    ],
  };

  it('signs a 7d token and enqueues email with link', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [resultsRow] });
    mockSignInvite.mockReturnValue('signed-token-123');

    const result = await sendLabResultsByEmail(1, 'patient@test.com', 'tenant-1');

    expect(mockSignInvite).toHaveBeenCalledWith(
      { scope: 'lab-result', labRequestId: 1, tenantId: 'tenant-1', email: 'patient@test.com' },
      '7d'
    );

    const link = `${process.env.FRONTEND_URL}/lab-results?token=signed-token-123`;
    expect(enqueueJob).toHaveBeenCalledWith(
      'email:send',
      expect.objectContaining({
        type: 'lab-results',
        to: 'patient@test.com',
        subject: 'Tus resultados de laboratorio',
        tenantId: 'tenant-1',
      })
    );

    const job = enqueueJob.mock.calls[0][1];
    expect(job.html).toContain(link);
    expect(job.html).toContain('Glucosa');
    expect(job.html).toContain('95');
    expect(result).toEqual(expect.objectContaining({ sent: true }));
  });

  it('throws BadRequestError when there are no results', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, request_number: 'LAB-2026-1', items: [] }] });

    await expect(sendLabResultsByEmail(1, 'patient@test.com', 'tenant-1'))
      .rejects.toThrow('No lab results available for this request');

    expect(enqueueJob).not.toHaveBeenCalled();
  });
});

describe('getLabResultsByToken', () => {
  it('returns results for a valid lab-result token', async () => {
    mockVerify.mockReturnValue({ scope: 'lab-result', labRequestId: 5, tenantId: 'tenant-1', email: 'patient@test.com' });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 5, request_number: 'LAB-2026-5', items: [{ name: 'Colesterol', result_value: '180' }] }],
    });

    const result = await getLabResultsByToken('valid.token.here');

    expect(mockVerify).toHaveBeenCalledWith('valid.token.here');
    expect(result.id).toBe(5);
    expect(result.items).toHaveLength(1);
  });

  it('throws NotFoundError for invalid token', async () => {
    mockVerify.mockReturnValue(null);

    await expect(getLabResultsByToken('invalid.token.here'))
      .rejects.toThrow('Invalid or expired lab results link');
  });

  it('throws NotFoundError when scope is not lab-result', async () => {
    mockVerify.mockReturnValue({ scope: 'other', labRequestId: 5, tenantId: 'tenant-1' });

    await expect(getLabResultsByToken('wrong.scope.token'))
      .rejects.toThrow('Invalid or expired lab results link');
  });
});
