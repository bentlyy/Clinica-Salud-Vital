import { pool } from '../../shared/db.js';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/dicom',
]);

const ALLOWED_ENTITIES = new Set([
  'clinical_record',
  'prescription',
  'lab_result',
  'booking',
  'medical_history',
  'patient',
]);

const ATTACHMENT_SELECT = `id, tenant_id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes, uploaded_by, created_at`;

export interface AttachmentInput {
  entity_type: string;
  entity_id: number;
  file_name: string;
  mime_type: string;
  data_base64: string;
}

export interface AttachmentRecord {
  id: number;
  tenant_id: string;
  entity_type: string;
  entity_id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: number;
  created_at: string;
}

const parseAttachment = (row: Record<string, unknown>): AttachmentRecord => ({
  id: row.id as number,
  tenant_id: row.tenant_id as string,
  entity_type: row.entity_type as string,
  entity_id: row.entity_id as number,
  original_name: row.original_name as string,
  stored_name: row.stored_name as string,
  mime_type: row.mime_type as string,
  size_bytes: row.size_bytes as number,
  uploaded_by: row.uploaded_by as number,
  created_at: row.created_at as string,
});

export const uploadAttachment = async (
  uploadedBy: number,
  tenantId: string,
  input: AttachmentInput,
): Promise<AttachmentRecord> => {
  const { entity_type, entity_id, file_name, mime_type, data_base64 } = input;
  if (!ALLOWED_ENTITIES.has(entity_type)) throw new BadRequestError('Invalid entity_type');
  if (!entity_id || entity_id <= 0) throw new BadRequestError('Invalid entity_id');
  if (!ALLOWED_MIME.has(mime_type)) throw new BadRequestError('Tipo de archivo no permitido');
  if (!data_base64) throw new BadRequestError('data_base64 is required');

  let buffer: Buffer;
  try {
    buffer = Buffer.from(data_base64, 'base64');
  } catch {
    throw new BadRequestError('data_base64 inválido');
  }
  if (buffer.length === 0 || buffer.length > MAX_FILE_BYTES) {
    throw new BadRequestError('El archivo excede el tamaño máximo permitido (10MB)');
  }

  const tenantDir = path.join(UPLOAD_ROOT, tenantId);
  await fs.mkdir(tenantDir, { recursive: true });

  const ext = path.extname(file_name || '').slice(0, 12);
  const storedName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  await fs.writeFile(path.join(tenantDir, storedName), buffer);

  const result = await pool.query(
    `INSERT INTO attachments (tenant_id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${ATTACHMENT_SELECT}`,
    [tenantId, entity_type, entity_id, file_name?.slice(0, 255) || 'file', storedName, mime_type, buffer.length, uploadedBy]
  );
  return parseAttachment(result.rows[0]);
};

export const listAttachments = async (
  entityType: string,
  entityId: number,
  tenantId: string,
): Promise<AttachmentRecord[]> => {
  if (!ALLOWED_ENTITIES.has(entityType)) throw new BadRequestError('Invalid entity_type');
  const result = await pool.query(
    `SELECT ${ATTACHMENT_SELECT} FROM attachments WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3 ORDER BY created_at ASC`,
    [tenantId, entityType, entityId]
  );
  return result.rows.map(parseAttachment);
};

export const getAttachment = async (
  id: number,
  tenantId: string,
): Promise<{ record: AttachmentRecord; filePath: string }> => {
  const result = await pool.query(
    `SELECT ${ATTACHMENT_SELECT} FROM attachments WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Attachment not found');
  const record = parseAttachment(result.rows[0]);
  const filePath = path.join(UPLOAD_ROOT, tenantId, record.stored_name);
  return { record, filePath };
};

export const deleteAttachment = async (
  id: number,
  tenantId: string,
  userId: number,
  role: string,
): Promise<void> => {
  const result = await pool.query(
    'SELECT id, stored_name, uploaded_by FROM attachments WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Attachment not found');
  const row = result.rows[0] as { id: number; stored_name: string; uploaded_by: number };

  if (role !== 'admin' && role !== 'superadmin' && role !== 'doctor' && row.uploaded_by !== userId) {
    throw new ForbiddenError('No tienes permiso para eliminar este archivo');
  }

  await pool.query('DELETE FROM attachments WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  try {
    await fs.unlink(path.join(UPLOAD_ROOT, tenantId, row.stored_name));
  } catch {
    /* file may already be missing */
  }
};
