import { pool, superAdminPool } from '../../shared/db.js';
import type { PoolClient } from 'pg';
import { computeHmac } from '../../shared/crypto.service.js';

// Fila tal como vive en la tabla audit_logs (o como se va a insertar). La cadena
// HMAC se calcula SOLO con estos campos: nada de Date.now() ni aleatoriedad, para
// que el hash sea reproducible y el verificador pueda recomputarlo.
export interface AuditChainRow {
  previous_hash: string | null;
  action: string;
  resource_type: string | null;
  resource_id: number | null;
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  user_id: number | null;
  tenant_id: string | null;
}

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  const record = value as Record<string, unknown>;
  return JSON.stringify(record, Object.keys(record).sort());
};

export const auditCanonical = (row: AuditChainRow): string => [
  row.previous_hash || '',
  row.action,
  row.resource_type || '',
  row.resource_id === null || row.resource_id === undefined ? '' : String(row.resource_id),
  stableStringify(row.old_values),
  stableStringify(row.new_values),
  row.ip_address || '',
  row.user_id === null || row.user_id === undefined ? '' : String(row.user_id),
  row.tenant_id || '',
].join('|');

export const computeAuditHash = (row: AuditChainRow): string => computeHmac(auditCanonical(row));

// Re-encadena la cola de filas sin hash de un tenant (las escritas por los
// triggers de BD, que no pueden calcular HMAC). Devuelve el hash de la última fila
// de la cadena, listo para usarse como previous_hash de la siguiente inserción.
// Cada entrada se actualiza a un hash calculado sobre el contenido real de la fila
// anterior, así el eslabón es verificable y no queda ningún hueco en la cadena.
const chainPendingRows = async (client: PoolClient, tenantId: string): Promise<string | null> => {
  const tail = await client.query(
    'SELECT id, hash FROM audit_logs WHERE tenant_id = $1 ORDER BY id DESC LIMIT 1',
    [tenantId]
  );
  if (tail.rows.length === 0) return null;
  if (tail.rows[0].hash) return tail.rows[0].hash as string;

  const lastChained = await client.query(
    'SELECT hash FROM audit_logs WHERE tenant_id = $1 AND hash IS NOT NULL ORDER BY id DESC LIMIT 1',
    [tenantId]
  );
  let previousHash: string | null = (lastChained.rows[0]?.hash as string) ?? null;

  const pending = await client.query(
    `SELECT id, action, resource_type, resource_id, old_values, new_values, ip_address, user_id, tenant_id
     FROM audit_logs WHERE tenant_id = $1 AND hash IS NULL ORDER BY id ASC`,
    [tenantId]
  );

  for (const row of pending.rows) {
    const hash = computeAuditHash({ ...row, previous_hash: previousHash });
    await client.query('UPDATE audit_logs SET hash = $1, previous_hash = $2 WHERE id = $3', [
      hash, previousHash, row.id,
    ]);
    previousHash = hash;
  }

  return previousHash;
};

// Reparación masiva de la cadena: útil antes de verificar y para backfill de
// filas históricas escritas por triggers. Usa el pool BYPASSRLS porque recorre
// todos los tenants.
export const rechainAuditLogs = async (tenantId?: string): Promise<number> => {
  const tenants = tenantId
    ? [tenantId]
    : (await superAdminPool.query<{ tenant_id: string | null }>(
        'SELECT DISTINCT tenant_id FROM audit_logs'
      )).rows.map((r) => r.tenant_id || 'system');

  let rechained = 0;
  for (const t of tenants) {
    const client = await superAdminPool.connect();
    try {
      await client.query('BEGIN');
      const before = await client.query(
        'SELECT COUNT(*)::int AS n FROM audit_logs WHERE tenant_id = $1 AND hash IS NULL',
        [t]
      );
      await chainPendingRows(client, t);
      const after = await client.query(
        'SELECT COUNT(*)::int AS n FROM audit_logs WHERE tenant_id = $1 AND hash IS NULL',
        [t]
      );
      await client.query('COMMIT');
      rechained += (before.rows[0]?.n ?? 0) - (after.rows[0]?.n ?? 0);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  return rechained;
};

export interface AuditLogInput {
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: number;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  tenant_id?: string;
}

export interface AuditLogQuery {
  user_id?: number;
  action?: string;
  resource_type?: string;
  resource_id?: number;
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  tenant_id?: string;
}

export const logAction = async (input: AuditLogInput): Promise<void> => {
  // El chain se mantiene por tenant (los triggers de BD escriben con tenant_id
  // real o 'system'), por lo que el eslabón anterior se busca dentro del mismo.
  const tenantId = input.tenant_id || 'system';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Repara cualquier fila encolada sin hash (escrita por triggers) antes de
    // añadir la nueva, para que la cadena quede contigua.
    const previousHash = await chainPendingRows(client, tenantId);
    const hash = computeAuditHash({
      previous_hash: previousHash,
      action: input.action,
      resource_type: input.resource_type,
      resource_id: input.resource_id ?? null,
      old_values: input.old_values ?? null,
      new_values: input.new_values ?? null,
      ip_address: input.ip_address ?? null,
      user_id: input.user_id ?? null,
      tenant_id: tenantId,
    });

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, hash, previous_hash, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        input.user_id || null,
        input.action,
        input.resource_type,
        input.resource_id || null,
        input.old_values ? JSON.stringify(input.old_values) : null,
        input.new_values ? JSON.stringify(input.new_values) : null,
        input.ip_address || null,
        input.user_agent || null,
        hash,
        previousHash,
        tenantId,
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getAuditLogs = async (query: AuditLogQuery = {}): Promise<unknown[]> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const safePage = Math.max(1, Number.isInteger(page) ? page : 1);
  const safeLimit = Math.max(1, Math.min(100, Number.isInteger(limit) ? limit : 20));
  const offset = (safePage - 1) * safeLimit;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramCount = 1;

  if (query.tenant_id) { conditions.push(`al.tenant_id = $${paramCount++}`); params.push(query.tenant_id); }
  if (query.user_id) { conditions.push(`al.user_id = $${paramCount++}`); params.push(query.user_id); }
  if (query.action) { conditions.push(`al.action = $${paramCount++}`); params.push(query.action); }
  if (query.resource_type) { conditions.push(`al.resource_type = $${paramCount++}`); params.push(query.resource_type); }
  if (query.start_date) { conditions.push(`al.created_at >= $${paramCount++}`); params.push(query.start_date); }
  if (query.end_date) { conditions.push(`al.created_at <= $${paramCount++}`); params.push(query.end_date); }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const sql = `SELECT
      al.id, al.tenant_id, al.user_id,
      COALESCE(u.name, u.email) AS user_name,
      al.action,
      al.resource_type AS entity_type,
      al.resource_id AS entity_id,
      CASE WHEN al.old_values IS NOT NULL OR al.new_values IS NOT NULL
        THEN jsonb_build_object('old_values', al.old_values, 'new_values', al.new_values)
        ELSE NULL END AS details,
      al.ip_address, al.user_agent, al.hash, al.previous_hash, al.created_at
    FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause} ORDER BY al.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(safeLimit, offset);

  const result = await pool.query(sql, params);
  return result.rows;
};