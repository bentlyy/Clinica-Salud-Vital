import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockMkdir, mockWriteFile, mockUnlink } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockMkdir: vi.fn().mockResolvedValue(undefined),
  mockWriteFile: vi.fn().mockResolvedValue(undefined),
  mockUnlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('fs', () => ({
  promises: { mkdir: mockMkdir, writeFile: mockWriteFile, unlink: mockUnlink },
}));

import {
  uploadAttachment,
  listAttachments,
  getAttachment,
  deleteAttachment,
} from '../../src/modules/attachments/attachments.service.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../src/utils/errors.js';

const recordRow = {
  id: 1,
  tenant_id: 't',
  entity_type: 'clinical_record',
  entity_id: 4,
  original_name: 'report.pdf',
  stored_name: 'abc123.pdf',
  mime_type: 'application/pdf',
  size_bytes: 10,
  uploaded_by: 3,
  created_at: '2026-01-01',
};

const validInput = {
  entity_type: 'clinical_record',
  entity_id: 4,
  file_name: 'report.pdf',
  mime_type: 'application/pdf',
  data_base64: Buffer.from('hello').toString('base64'),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uploadAttachment', () => {
  it('throws for invalid entity type', async () => {
    await expect(uploadAttachment(3, 't', { ...validInput, entity_type: 'nope' })).rejects.toThrow(BadRequestError);
  });

  it('throws for disallowed mime type', async () => {
    await expect(uploadAttachment(3, 't', { ...validInput, mime_type: 'application/x-msdownload' })).rejects.toThrow(BadRequestError);
  });

  it('throws when base64 is missing', async () => {
    await expect(uploadAttachment(3, 't', { ...validInput, data_base64: '' })).rejects.toThrow(BadRequestError);
  });

  it('writes the file to disk and returns the record', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [recordRow] });

    const record = await uploadAttachment(3, 't', validInput);

    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
    expect(record.id).toBe(1);
    expect(record.original_name).toBe('report.pdf');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO attachments'),
      ['t', 'clinical_record', 4, 'report.pdf', expect.any(String), 'application/pdf', 5, 3]
    );
  });

  it('defaults missing file name to "file"', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [recordRow] });
    await uploadAttachment(3, 't', { ...validInput, file_name: '' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['t', 'clinical_record', 4, 'file', expect.any(String), 'application/pdf', 5, 3]
    );
  });
});

describe('listAttachments', () => {
  it('throws for invalid entity type', async () => {
    await expect(listAttachments('bad', 4, 't')).rejects.toThrow(BadRequestError);
  });

  it('maps rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [recordRow] });
    const rows = await listAttachments('clinical_record', 4, 't');
    expect(rows).toHaveLength(1);
    expect(rows[0].stored_name).toBe('abc123.pdf');
  });
});

describe('getAttachment', () => {
  it('throws when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getAttachment(1, 't')).rejects.toThrow(NotFoundError);
  });

  it('returns the record and file path', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [recordRow] });
    const { record, filePath } = await getAttachment(1, 't');
    expect(record.id).toBe(1);
    expect(filePath).toContain('abc123.pdf');
  });
});

describe('deleteAttachment', () => {
  it('throws when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(deleteAttachment(1, 't', 3, 'user')).rejects.toThrow(NotFoundError);
  });

  it('forbids a non-owner patient', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, stored_name: 'abc123.pdf', uploaded_by: 9 }] });
    await expect(deleteAttachment(1, 't', 3, 'user')).rejects.toThrow(ForbiddenError);
  });

  it('allows the owner to delete', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, stored_name: 'abc123.pdf', uploaded_by: 3 }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    await expect(deleteAttachment(1, 't', 3, 'user')).resolves.toBeUndefined();
    expect(mockUnlink).toHaveBeenCalled();
  });

  it('allows admins to delete', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, stored_name: 'abc123.pdf', uploaded_by: 9 }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    await expect(deleteAttachment(1, 't', 3, 'admin')).resolves.toBeUndefined();
    expect(mockUnlink).toHaveBeenCalled();
  });
});
