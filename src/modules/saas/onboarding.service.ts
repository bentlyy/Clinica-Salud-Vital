import { pool, superAdminPool } from '../../shared/db.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { logger } from '../../utils/logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// ─── Storage ───────────────────────────────────────────────

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

// ─── Completeness (checklist de incorporación) ─────────────

export interface OnboardingProfileInput {
  legal_name?: string | null;
  tax_id?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  website?: string | null;
  license_number?: string | null;
  legal_entity_type?: string | null;
  legal_representative_name?: string | null;
  legal_representative_email?: string | null;
  specialties?: string[] | null;
  doctor_count?: number | null;
  operating_hours?: Record<string, unknown> | null;
  notes?: string | null;
  admin_phone?: string | null;
}

export interface OnboardingDocumentInput {
  category: 'contract' | 'license' | 'tax_id' | 'constitution' | 'logo' | 'other';
  file_name: string;
  mime_type: string;
  data_base64: string;
}

export interface OnboardingApplicationFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  tenantId?: string;
}

const PROFILE_KEYS = [
  'legal_name', 'tax_id', 'country', 'region', 'city', 'address', 'postal_code',
  'phone', 'website', 'license_number', 'legal_entity_type', 'legal_representative_name',
  'legal_representative_email', 'specialties', 'doctor_count', 'operating_hours', 'notes', 'admin_phone',
] as const;

const isFilled = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && !Array.isArray(value)) return Object.keys(value as Record<string, unknown>).length > 0;
  return value !== '';
};

export const computeCompleteness = (
  data: OnboardingProfileInput,
  hasContract = false,
): { completeness_pct: number; missing_fields: string[] } => {
  const checks: Array<{ key: string; label: string; value: unknown }> = [
    { key: 'legal_name', label: 'legal_name', value: data.legal_name },
    { key: 'tax_id', label: 'tax_id', value: data.tax_id },
    { key: 'country', label: 'country', value: data.country },
    { key: 'city', label: 'city', value: data.city },
    { key: 'address', label: 'address', value: data.address },
    { key: 'phone', label: 'phone', value: data.phone },
    { key: 'website', label: 'website', value: data.website },
    { key: 'license_number', label: 'license_number', value: data.license_number },
    { key: 'legal_entity_type', label: 'legal_entity_type', value: data.legal_entity_type },
    { key: 'legal_representative_name', label: 'legal_representative_name', value: data.legal_representative_name },
    { key: 'specialties', label: 'specialties', value: data.specialties },
    { key: 'doctor_count', label: 'doctor_count', value: data.doctor_count },
    { key: 'operating_hours', label: 'operating_hours', value: data.operating_hours },
    { key: 'contract_document', label: 'contract_document', value: hasContract },
  ];

  const missing = checks.filter((c) => !isFilled(c.value)).map((c) => c.label);
  const filled = checks.length - missing.length;
  const completeness_pct = Math.round((filled / checks.length) * 100);
  return { completeness_pct, missing_fields: missing };
};

const serializeValue = (key: string, value: unknown): string | number | string[] | null => {
  if (value === undefined || value === null) return null;
  if (key === 'operating_hours' && typeof value === 'object') return JSON.stringify(value);
  if (key === 'specialties' && Array.isArray(value)) return value;
  if (typeof value === 'number') return value;
  return String(value);
};

// ─── Insert (usado por saas.service.onboardTenant) ─────────

export const insertOnboarding = async (
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  data: {
    tenantId: string;
    companyName: string;
    adminEmail: string;
    adminName?: string | null;
    planCode?: string | null;
    profile: OnboardingProfileInput;
  },
): Promise<{ id: number; completeness_pct: number; missing_fields: string[] }> => {
  const { completeness_pct, missing_fields } = computeCompleteness(data.profile);

  const values: Record<string, string | number | string[] | null> = {
    company_name: data.companyName,
    tenant_id: data.tenantId,
    admin_email: data.adminEmail,
    admin_name: data.adminName || null,
    admin_phone: data.profile.admin_phone || null,
    plan_code: data.planCode || 'free',
    status: 'pending',
    completeness_pct,
    missing_fields,
  };

  for (const key of PROFILE_KEYS) {
    if (key === 'admin_phone') continue;
    values[key] = serializeValue(key, data.profile[key as keyof OnboardingProfileInput]);
  }

  const columns = Object.keys(values);
  const params = columns.map((c) => values[c]);
  const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');

const result = await client.query(
    `INSERT INTO tenant_onboarding (${columns.join(', ')})
     VALUES (${placeholders})
     RETURNING id, completeness_pct, missing_fields`,
    params
  );

  const row = result.rows?.[0] as { id?: number; completeness_pct?: number; missing_fields?: string[] } | undefined;
  return {
    id: row?.id ?? 0,
    completeness_pct: row?.completeness_pct ?? completeness_pct,
    missing_fields: row?.missing_fields ?? missing_fields,
  };
};

export const insertOnboardingDocuments = async (
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  input: {
    onboardingId: number;
    tenantId: string;
    uploadedBy: number | null;
    documents: OnboardingDocumentInput[];
  },
): Promise<void> => {
  for (const doc of input.documents) {
    await insertOnboardingDocumentFile(client, {
      onboardingId: input.onboardingId,
      tenantId: input.tenantId,
      uploadedBy: input.uploadedBy,
      input: doc,
    });
  }
};

const insertOnboardingDocumentFile = async (
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  data: { onboardingId: number; tenantId: string; uploadedBy: number | null; input: OnboardingDocumentInput },
): Promise<void> => {
  const { category, file_name, mime_type, data_base64 } = data.input;
  if (!ALLOWED_MIME.has(mime_type)) throw new BadRequestError(E.SAAS_DOCUMENT_TYPE_INVALID);
  let buffer: Buffer;
  try {
    buffer = Buffer.from(data_base64, 'base64');
  } catch {
    throw new BadRequestError(E.SAAS_DOCUMENT_INVALID_BASE64);
  }
  if (buffer.length === 0 || buffer.length > MAX_FILE_BYTES) {
    throw new BadRequestError(E.SAAS_DOCUMENT_TOO_LARGE);
  }

  const dir = path.join(UPLOAD_ROOT, 'onboarding', String(data.onboardingId));
  await fs.mkdir(dir, { recursive: true });
  const ext = path.extname(file_name || '').slice(0, 12);
  const storedName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  await fs.writeFile(path.join(dir, storedName), buffer);

  await client.query(
    `INSERT INTO onboarding_documents (onboarding_id, tenant_id, category, original_name, stored_name, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [data.onboardingId, data.tenantId, category, (file_name || 'file').slice(0, 255), storedName, mime_type, buffer.length, data.uploadedBy]
  );
};

// ─── Lectura (clínica autenticada) ─────────────────────────

export interface OnboardingDocument {
  id: number;
  category: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: number | null;
  created_at: string;
}

export interface OnboardingProfile extends OnboardingProfileInput {
  id: number;
  tenant_id: string;
  company_name: string;
  plan_code: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_name: string | null;
  admin_email: string;
  completeness_pct: number;
  missing_fields: string[];
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  documents: OnboardingDocument[];
}

const parseProfile = (row: Record<string, unknown>): Omit<OnboardingProfile, 'documents'> => ({
  id: row.id as number,
  tenant_id: row.tenant_id as string,
  company_name: row.company_name as string,
  plan_code: row.plan_code as string,
  status: row.status as OnboardingProfile['status'],
  admin_name: row.admin_name as string | null,
  admin_email: row.admin_email as string,
  completeness_pct: row.completeness_pct as number,
  missing_fields: Array.isArray(row.missing_fields) ? row.missing_fields as string[] : [],
  rejection_reason: row.rejection_reason as string | null,
  approved_at: row.approved_at as string | null,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
  legal_name: row.legal_name as string | null,
  tax_id: row.tax_id as string | null,
  country: row.country as string | null,
  region: row.region as string | null,
  city: row.city as string | null,
  address: row.address as string | null,
  postal_code: row.postal_code as string | null,
  phone: row.phone as string | null,
  website: row.website as string | null,
  license_number: row.license_number as string | null,
  legal_entity_type: row.legal_entity_type as string | null,
  legal_representative_name: row.legal_representative_name as string | null,
  legal_representative_email: row.legal_representative_email as string | null,
  specialties: Array.isArray(row.specialties) ? row.specialties as string[] : [],
  doctor_count: row.doctor_count as number | null,
  operating_hours: row.operating_hours as Record<string, unknown> | null,
  notes: row.notes as string | null,
  admin_phone: row.admin_phone as string | null,
});

const PROFILE_SELECT = `id, tenant_id, company_name, plan_code, status, admin_name, admin_email,
  legal_name, tax_id, country, region, city, address, postal_code, phone, website,
  license_number, legal_entity_type, legal_representative_name, legal_representative_email,
  specialties, doctor_count, operating_hours, notes, admin_phone,
  completeness_pct, missing_fields, rejection_reason, approved_at, created_at, updated_at`;

export const getOnboardingForTenant = async (tenantId: string): Promise<OnboardingProfile | null> => {
  const result = await pool.query(
    `SELECT ${PROFILE_SELECT} FROM tenant_onboarding WHERE tenant_id = $1`,
    [tenantId]
  );
  if (result.rows.length === 0) return null;
  const profile = parseProfile(result.rows[0] as Record<string, unknown>);
  return { ...profile, documents: await listOnboardingDocuments(tenantId) };
};

// ─── Actualización de perfil (clínica autenticada) ─────────

const ALLOWED_UPDATE_KEYS = new Set<string>(PROFILE_KEYS);

const getTenantAdminInfo = async (tenantId: string): Promise<{ companyName: string; adminEmail: string; adminName: string | null }> => {
  const result = await pool.query(
    `SELECT t.name AS "company_name",
            (SELECT u.email FROM users u WHERE u.tenant_id = t.id ORDER BY u.id ASC LIMIT 1) AS "admin_email",
            (SELECT u.full_name FROM users u WHERE u.tenant_id = t.id ORDER BY u.id ASC LIMIT 1) AS "admin_name"
     FROM tenants t WHERE t.id = $1`,
    [tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.SAAS_TENANT_NOT_FOUND);
  const row = result.rows[0] as { company_name: string; admin_email: string | null; admin_name: string | null };
  return {
    companyName: row.company_name,
    adminEmail: row.admin_email || '',
    adminName: row.admin_name,
  };
};

export const upsertOnboardingProfile = async (
  tenantId: string,
  data: OnboardingProfileInput,
): Promise<OnboardingProfile> => {
  const existing = await pool.query('SELECT id FROM tenant_onboarding WHERE tenant_id = $1', [tenantId]);
  const hasContract = await getContractPresence(tenantId);

  const { completeness_pct, missing_fields } = computeCompleteness(
    { ...data },
    hasContract,
  );

  if (existing.rows.length === 0) {
    // Tenant existente previo a esta feature: crea el registro base.
    const admin = await getTenantAdminInfo(tenantId);
    await insertOnboarding(pool as unknown as { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }, {
      tenantId,
      companyName: admin.companyName,
      adminEmail: admin.adminEmail,
      adminName: admin.adminName,
      planCode: 'free',
      profile: data,
    });
    return (await getOnboardingForTenant(tenantId)) as OnboardingProfile;
  }

  const sets: string[] = [];
  const params: (string | number | string[] | null)[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (!ALLOWED_UPDATE_KEYS.has(key)) continue;
    sets.push(`${key} = $${paramIdx++}`);
    params.push(serializeValue(key, value));
  }

  sets.push(`completeness_pct = $${paramIdx++}`, `missing_fields = $${paramIdx++}`, `updated_at = NOW()`);
  params.push(completeness_pct, missing_fields, tenantId);

  await pool.query(
    `UPDATE tenant_onboarding SET ${sets.join(', ')} WHERE tenant_id = $${paramIdx} RETURNING id`,
    params
  );

  return (await getOnboardingForTenant(tenantId)) as OnboardingProfile;
};

const getContractPresence = async (tenantId: string): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM onboarding_documents d
     JOIN tenant_onboarding o ON o.id = d.onboarding_id
     WHERE o.tenant_id = $1 AND d.category = 'contract' LIMIT 1`,
    [tenantId]
  );
  return result.rows.length > 0;
};

// ─── Documentos ────────────────────────────────────────────

const DOC_BASE_SELECT = 'id, category, original_name, mime_type, size_bytes, uploaded_by, created_at';

export const listOnboardingDocuments = async (tenantId: string): Promise<OnboardingDocument[]> => {
  const result = await pool.query<Record<string, unknown>>(
    `SELECT d.${DOC_BASE_SELECT}
     FROM onboarding_documents d
     JOIN tenant_onboarding o ON o.id = d.onboarding_id
     WHERE o.tenant_id = $1
     ORDER BY d.created_at ASC`,
    [tenantId]
  );
  return result.rows.map((r) => ({
    id: r.id as number,
    category: r.category as string,
    original_name: r.original_name as string,
    mime_type: r.mime_type as string,
    size_bytes: r.size_bytes as number,
    uploaded_by: r.uploaded_by as number | null,
    created_at: r.created_at as string,
  }));
};

export const uploadOnboardingDocument = async (
  tenantId: string,
  userId: number,
  input: OnboardingDocumentInput,
): Promise<OnboardingDocument> => {
  const onboarding = await pool.query('SELECT id FROM tenant_onboarding WHERE tenant_id = $1', [tenantId]);
  if (onboarding.rows.length === 0) throw new NotFoundError(E.SAAS_ONBOARDING_NOT_FOUND);

  const onboardingId = (onboarding.rows[0] as { id: number }).id;
  await insertOnboardingDocumentFile(
    { query: pool.query.bind(pool) },
    { onboardingId, tenantId, uploadedBy: userId, input },
  );

  // Recalcular completitud (documento de contrato presente)
  await refreshCompleteness(tenantId);

  const docs = await listOnboardingDocuments(tenantId);
  return docs[docs.length - 1] as OnboardingDocument;
};

export const getOnboardingDocument = async (
  id: number,
  tenantId: string,
): Promise<{ record: OnboardingDocument; filePath: string }> => {
  const result = await pool.query<Record<string, unknown>>(
    `SELECT d.id, d.stored_name, o.id AS onboarding_id, d.category, d.original_name,
            d.mime_type, d.size_bytes, d.uploaded_by, d.created_at
     FROM onboarding_documents d
     JOIN tenant_onboarding o ON o.id = d.onboarding_id
     WHERE d.id = $1 AND o.tenant_id = $2`,
    [id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.SAAS_DOCUMENT_NOT_FOUND);
  const row = result.rows[0];
  const record: OnboardingDocument = {
    id: row.id as number,
    category: row.category as string,
    original_name: row.original_name as string,
    mime_type: row.mime_type as string,
    size_bytes: row.size_bytes as number,
    uploaded_by: row.uploaded_by as number | null,
    created_at: row.created_at as string,
  };
  const filePath = path.join(UPLOAD_ROOT, 'onboarding', String(row.onboarding_id), String(row.stored_name));
  return { record, filePath };
};

export const deleteOnboardingDocument = async (
  id: number,
  tenantId: string,
  userId: number,
  role: string,
): Promise<void> => {
  const result = await pool.query<Record<string, unknown>>(
    `SELECT d.stored_name, d.uploaded_by, o.id AS onboarding_id
     FROM onboarding_documents d
     JOIN tenant_onboarding o ON o.id = d.onboarding_id
     WHERE d.id = $1 AND o.tenant_id = $2`,
    [id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.SAAS_DOCUMENT_NOT_FOUND);
  const row = result.rows[0];
  if (role !== 'admin' && role !== 'superadmin' && row.uploaded_by !== userId) {
    throw new ForbiddenError(E.SAAS_DOCUMENT_FORBIDDEN);
  }

  const filePath = path.join(UPLOAD_ROOT, 'onboarding', String(row.onboarding_id), String(row.stored_name));
  await pool.query('DELETE FROM onboarding_documents WHERE id = $1', [id]);
  try {
    await fs.unlink(filePath);
  } catch {
    /* file may already be missing */
  }

  await refreshCompleteness(tenantId);
};

const refreshCompleteness = async (tenantId: string): Promise<void> => {
  const profile = await getOnboardingForTenant(tenantId);
  if (!profile) return;
  const { completeness_pct, missing_fields } = computeCompleteness(
    profile as OnboardingProfileInput,
    profile.documents.some((d) => d.category === 'contract'),
  );
  await pool.query(
    `UPDATE tenant_onboarding SET completeness_pct = $1, missing_fields = $2, updated_at = NOW() WHERE tenant_id = $3`,
    [completeness_pct, missing_fields, tenantId]
  );
};

// ─── Panel SuperAdmin ──────────────────────────────────────

const MAX_LIMIT = 100;

export const listOnboardingApplications = async (
  filters: OnboardingApplicationFilters = {},
): Promise<{ data: Record<string, unknown>[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> => {
  const page = Math.max(1, Number.isInteger(filters.page) ? filters.page! : 1);
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number.isInteger(filters.limit) ? filters.limit! : 20));
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.tenantId) {
    conditions.push(`o.tenant_id = $${paramIdx++}`);
    params.push(filters.tenantId);
  }
  if (filters.status) {
    conditions.push(`o.status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push(`(o.company_name ILIKE $${paramIdx} OR o.legal_name ILIKE $${paramIdx} OR o.tax_id ILIKE $${paramIdx} OR o.admin_email ILIKE $${paramIdx})`);
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  const where = conditions.join(' AND ');
  const filterParams = [...params];
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const result = await superAdminPool.query<Record<string, unknown>>(
    `SELECT o.id, o.tenant_id, o.company_name, o.country, o.city, o.tax_id,
            o.plan_code, o.status, o.admin_name, o.admin_email, o.completeness_pct,
            o.created_at, o.updated_at,
            COALESCE(d.doc_count, 0)::int AS doc_count,
            COALESCE(t.active, false) AS tenant_active,
            COUNT(*) OVER() AS total
     FROM tenant_onboarding o
     LEFT JOIN tenants t ON t.id = o.tenant_id
     LEFT JOIN (SELECT onboarding_id, COUNT(*) AS doc_count FROM onboarding_documents GROUP BY onboarding_id) d ON d.onboarding_id = o.id
     WHERE ${where}
     ORDER BY o.created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    params
  );

  const total = result.rows.length > 0
    ? parseInt(String(result.rows[0].total), 10)
    : parseInt(String((await superAdminPool.query(
        `SELECT COUNT(*) AS total FROM tenant_onboarding o WHERE ${where}`,
        filterParams
      )).rows[0].total), 10);

  return {
    data: result.rows.map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      company_name: r.company_name,
      country: r.country,
      city: r.city,
      tax_id: r.tax_id,
      plan_code: r.plan_code,
      status: r.status,
      admin_name: r.admin_name,
      admin_email: r.admin_email,
      completeness_pct: r.completeness_pct,
      doc_count: r.doc_count,
      tenant_active: r.tenant_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

export const getOnboardingApplication = async (id: number): Promise<Record<string, unknown> | null> => {
  const result = await superAdminPool.query<Record<string, unknown>>(
    `SELECT o.*, t.active AS tenant_active, t.domain,
      t.created_at AS tenant_created_at,
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = o.tenant_id)::int AS total_users,
      (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = o.tenant_id)::int AS total_bookings
     FROM tenant_onboarding o
     LEFT JOIN tenants t ON t.id = o.tenant_id
     WHERE o.id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const docs = await superAdminPool.query<Record<string, unknown>>(
    `SELECT id, category, original_name, mime_type, size_bytes, uploaded_by, created_at
     FROM onboarding_documents WHERE onboarding_id = $1 ORDER BY created_at ASC`,
    [id]
  );
  return { ...row, documents: docs.rows };
};

export const approveOnboardingApplication = async (id: number, approverId: number): Promise<void> => {
  const result = await superAdminPool.query(
    `UPDATE tenant_onboarding
     SET status = 'approved', approved_by = $2, approved_at = NOW(), rejection_reason = NULL, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING id, tenant_id`,
    [id, approverId]
  );
  if (result.rows.length === 0) throw new BadRequestError(E.SAAS_ONBOARDING_ALREADY_PROCESSED);
  const tenantId = (result.rows[0] as { tenant_id: string }).tenant_id;

  await superAdminPool.query('UPDATE tenants SET active = true, updated_at = NOW() WHERE id = $1', [tenantId]);
  logger.info(`[Onboarding] Approved application ${id} for tenant ${tenantId} by user ${approverId}`);
};

export const rejectOnboardingApplication = async (
  id: number,
  approverId: number,
  reason: string,
): Promise<void> => {
  const result = await superAdminPool.query(
    `UPDATE tenant_onboarding
     SET status = 'rejected', approved_by = $2, rejection_reason = $3, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING id`,
    [id, approverId, reason]
  );
  if (result.rows.length === 0) throw new BadRequestError(E.SAAS_ONBOARDING_ALREADY_PROCESSED);
  logger.info(`[Onboarding] Rejected application ${id} by user ${approverId}: ${reason}`);
};