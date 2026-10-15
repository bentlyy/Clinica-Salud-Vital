import { superAdminPool } from '../shared/db.js';
import { logger } from '../utils/logger.js';
import { auditCanonical, computeAuditHash, rechainAuditLogs, type AuditChainRow } from '../modules/audit/audit.service.js';

export async function verifyAuditChain(
  tenantId?: string,
  options: { rechain?: boolean } = {}
): Promise<{ valid: boolean; brokenLinks: number; checked: number; rechained: number }> {
  // Los triggers de BD escriben filas sin hash (no pueden calcular HMAC): se
  // re-encadenan antes de verificar para no reportar huecos inexistentes.
  const rechained = options.rechain === false ? 0 : await rechainAuditLogs(tenantId);

  let sql = `SELECT id, hash, previous_hash, action, resource_type, resource_id,
                    old_values, new_values, ip_address, user_id, tenant_id
             FROM audit_logs WHERE 1=1`;
  const params: unknown[] = [];

  if (tenantId) {
    sql += ' AND tenant_id = $1';
    params.push(tenantId);
  }
  sql += ' ORDER BY tenant_id ASC, id ASC';

  // La verificación recorre TODOS los tenants: usa el pool BYPASSRLS (igual que
  // el re-encadenado), ya que RLS limitaría la lectura al tenant por defecto.
  const { rows } = await superAdminPool.query(sql, params);
  let brokenLinks = 0;
  let previousHash: string | null = null;
  let tenantCursor: string | null = null;

  for (const row of rows) {
    // La cadena es independiente por tenant: al cambiar de tenant se reinicia.
    const rowTenant = (row.tenant_id as string | null) ?? null;
    if (rowTenant !== tenantCursor) {
      tenantCursor = rowTenant;
      previousHash = null;
    }

    if (previousHash !== (row.previous_hash as string | null)) {
      brokenLinks++;
      logger.warn(`Audit chain integrity violation at log #${row.id}: expected previous_hash ${previousHash}, got ${row.previous_hash}`);
    }

    const expectedHash = computeAuditHash(row as AuditChainRow);

    if (expectedHash !== row.hash) {
      brokenLinks++;
      logger.warn(`Audit chain integrity violation at log #${row.id}: hash mismatch`);
    }

    previousHash = row.hash as string | null;
  }

  return { valid: brokenLinks === 0, brokenLinks, checked: rows.length, rechained };
}

export { auditCanonical };
