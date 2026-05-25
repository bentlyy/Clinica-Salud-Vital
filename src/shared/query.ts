import { pool, query as rawQuery } from './db.js';

type QueryParams = (string | number | boolean | null | Date | undefined)[];

export const getQuery = (query: Record<string, unknown>, key: string): string | undefined => {
  const val = query[key];
  return val ? String(val) : undefined;
};

export const getQueryInt = (query: Record<string, unknown>, key: string, def?: number): number => {
  const val = query[key];
  if (!val) return def ?? 0;
  const parsed = parseInt(String(val), 10);
  return isNaN(parsed) ? (def ?? 0) : parsed;
};

export const getQueryString = (query: Record<string, unknown>, key: string, def?: string): string => {
  const val = query[key];
  return val ? String(val) : (def ?? '');
};

const TAG_TENANT = '__tenant_id__';

export const tenantQuery = {
  tag(value: string): string {
    return `${TAG_TENANT}${value}${TAG_TENANT}`;
  },

  build(text: string, tenantId: string): string {
    const placeholder = this.tag('');
    const searchRegex = new RegExp(placeholder, 'g');
    return text.replace(searchRegex, `'${tenantId.replace(/'/g, "''")}'`);
  },

  where(tenantId: string, tableAlias?: string): string {
    const alias = tableAlias ? `${tableAlias}.` : '';
    return `${alias}tenant_id = '${tenantId.replace(/'/g, "''")}'`;
  },

  insert(text: string, params: QueryParams = []): string {
    const idx = text.indexOf('RETURNING');
    const insertPart = idx >= 0 ? text.slice(0, idx) : text;
    const returningPart = idx >= 0 ? text.slice(idx) : '';

    if (!insertPart.toLowerCase().includes('tenant_id')) {
      const lastParen = insertPart.lastIndexOf(')');
      if (lastParen >= 0) {
        return insertPart.slice(0, lastParen) + ', tenant_id' + insertPart.slice(lastParen) + returningPart;
      }
    }
    return text;
  },

  insertParams(params: QueryParams, tenantId: string): QueryParams {
    const tenantIdx = params.findIndex((p) => typeof p === 'string' && p.startsWith(TAG_TENANT));
    if (tenantIdx >= 0) {
      const result = [...params];
      result[tenantIdx] = tenantId;
      return result.filter((p) => p !== undefined);
    }
    return [...params, tenantId].filter((p) => p !== undefined);
  },
};

export const buildTenantInsert = (text: string, tenantId: string): string => {
  const lower = text.toLowerCase();
  const insertIdx = lower.indexOf('insert into');
  if (insertIdx === -1) return text;

  const valuesIdx = lower.indexOf('values', insertIdx);
  if (valuesIdx === -1) return text;

  const colsEnd = text.indexOf(')', valuesIdx);
  const colsStart = text.lastIndexOf('(', valuesIdx);

  if (colsStart >= 0 && colsEnd >= 0) {
    const before = text.slice(0, colsEnd);
    const after = text.slice(colsEnd);
    return before + ', tenant_id' + after.replace('VALUES', `VALUES ('${tenantId.replace(/'/g, "''")}', `);
  }

  if (text.includes('RETURNING')) {
    const retIdx = text.indexOf('RETURNING');
    const beforeReturn = text.slice(0, retIdx);
    const afterReturn = text.slice(retIdx);
    return beforeReturn.trimEnd() + ', tenant_id ' + afterReturn.replace('VALUES (', `VALUES ('${tenantId.replace(/'/g, "''")}', `);
  }

  return text.trimEnd() + ', tenant_id ' + text.replace('VALUES (', `VALUES ('${tenantId.replace(/'/g, "''")}', `);
};

export const getTenantIdsFromRaw = (params: QueryParams, idx: number, tenantId: string): QueryParams => {
  const result = [...params];
  if (idx >= result.length) {
    result.push(tenantId);
  } else {
    result.splice(idx, 0, tenantId);
  }
  return result.filter((p) => p !== undefined);
};
