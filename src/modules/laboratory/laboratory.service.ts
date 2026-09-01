import { pool, readPool } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { createNotification } from '../notifications/notification.service.js';
import crypto from 'crypto';

const generateRequestNumber = () => {
  const year = new Date().getFullYear();
  const random = crypto.randomInt(100000, 999999).toString();
  return 'LAB-' + year + '-' + random;
};

export interface LabTestFilters {
  category?: string;
  active?: boolean;
  areaId?: number;
  limit?: number;
  offset?: number;
}

export interface LabRequestFilters {
  patient_id?: number;
  doctor_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export type ReferenceRange = { min?: number; max?: number; text?: string };

export interface LabTestInput {
  name: string;
  description?: string;
  code?: string;
  category?: string;
  unit?: string;
  reference_min?: number;
  reference_max?: number;
  price?: number;
  reference_ranges?: ReferenceRange[];
  active?: boolean;
}

export const getLabTests = async ({ category, active = true, areaId, limit = 50, offset = 0 }: LabTestFilters = {}, tenantId?: string) => {
  let query = 'SELECT id, name, description, code, category, unit, reference_min, reference_max, price, reference_ranges, lab_area_id, result_type, result_options, decimals, unit_alt, conversion_factor, critical_min, critical_max, delta_check_pct, turnaround_time_min, preparation_instructions, sample_type, container_type, volume_ml, active, created_at, updated_at, tenant_id FROM lab_tests WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (active !== undefined) {
    query += ' AND active = $' + paramCount++;
    params.push(active);
  }

  if (category) {
    query += ' AND category = $' + paramCount++;
    params.push(category);
  }

  if (areaId !== undefined) {
    query += ' AND lab_area_id = $' + paramCount++;
    params.push(areaId);
  }

  if (tenantId !== undefined) {
    query += ' AND tenant_id = $' + paramCount++;
    params.push(tenantId);
  }

  query += ' ORDER BY name LIMIT $' + paramCount++ + ' OFFSET $' + paramCount++;
  params.push(limit, offset);

  const result = await readPool.query(query, params);
  return result.rows;
};

export const createLabTest = async (data: LabTestInput, tenantId: string) => {
  const { name, description, code, category, unit, reference_min, reference_max, price, reference_ranges } = data;
  if (!name) throw new BadRequestError(E.LAB_TEST_NAME_REQUIRED);

  const result = await pool.query(
    `INSERT INTO lab_tests (name, description, code, category, unit, reference_min, reference_max, price, reference_ranges, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [name, description || null, code || null, category || null, unit || null, reference_min || null, reference_max || null, price || 0, reference_ranges ? JSON.stringify(reference_ranges) : null, tenantId]
  );
  return result.rows[0];
};

export const updateLabTest = async (id: number, data: Partial<LabTestInput>, tenantId: string) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  const scalarKeys = ['name', 'description', 'code', 'category', 'unit', 'reference_min', 'reference_max', 'price', 'active'] as const;
  for (const key of scalarKeys) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${paramCount++}`);
      values.push(data[key]);
    }
  }

  if (data.reference_ranges !== undefined) {
    fields.push(`reference_ranges = $${paramCount++}`);
    values.push(JSON.stringify(data.reference_ranges));
  }

  if (fields.length === 0) throw new BadRequestError(E.LAB_TEST_NO_FIELDS);

  values.push(id, tenantId);
  const result = await pool.query(
    `UPDATE lab_tests SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount++} AND tenant_id = $${paramCount} RETURNING *`,
    values
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_TEST_NOT_FOUND);
  return result.rows[0];
};

export const deleteLabTest = async (id: number, tenantId: string) => {
  const result = await pool.query(
    `DELETE FROM lab_tests WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  if (result.rowCount === 0) throw new NotFoundError(E.LAB_TEST_NOT_FOUND);
};

export const createLabRequest = async (data: { patient_id: number; doctor_id?: number; clinical_record_id?: number; priority?: string; notes?: string; test_ids?: number[] }, tenantId: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { patient_id, doctor_id, clinical_record_id, priority, notes, test_ids } = data;

    const columns = ['request_number', 'patient_id', 'doctor_id', 'clinical_record_id', 'priority', 'notes'];
    const baseValues: (string | number | null)[] = [null, patient_id, doctor_id || null, clinical_record_id || null, priority || 'routine', notes || null];

    columns.push('tenant_id');
    baseValues.push(tenantId);

    let request: Record<string, unknown> = {};
    let inserted = false;
    let retries = 0;

    while (!inserted && retries < 3) {
      const requestNumber = generateRequestNumber();
      baseValues[0] = requestNumber;

      try {
        const requestResult = await client.query(
          `INSERT INTO lab_requests (${columns.join(', ')}) VALUES (${baseValues.map((_, i) => '$' + (i + 1)).join(', ')}) RETURNING *`,
          baseValues
        );
        inserted = true;
        request = requestResult.rows[0];
      } catch (err: unknown) {
        const pgErr = err as { code?: string };
        if (pgErr.code === '23505' && retries < 2) {
          retries++;
          continue;
        }
        throw err;
      }
    }

    if (!inserted) throw new BadRequestError(E.LAB_REQUEST_NUMBER_FAILED);

    if (test_ids && test_ids.length > 0) {
      const testResult = await client.query(
        'SELECT id FROM lab_tests WHERE id = ANY($1) AND active = true AND tenant_id = $2',
        [test_ids, tenantId]
      );
      if (testResult.rows.length !== test_ids.length) {
        const found = new Set(testResult.rows.map(r => r.id));
        const missing = test_ids.filter(id => !found.has(id));
        throw new BadRequestError(E.LAB_TESTS_NOT_FOUND, 'Lab tests not found or inactive: ' + missing.join(', '));
      }

      const itemsColumns = ['lab_request_id', 'lab_test_id', 'tenant_id'];
      const valueRows = test_ids.map((test_id, idx) => {
        const base = idx * (itemsColumns.length);
        return `(${itemsColumns.map((_, colIdx) => '$' + (base + colIdx + 1)).join(', ')})`;
      });
      const flatValues = test_ids.flatMap(test_id => [request.id, test_id, tenantId]);
      await client.query(
        `INSERT INTO lab_request_items (${itemsColumns.join(', ')}) VALUES ${valueRows.join(', ')}`,
        flatValues
      );
    }

    await client.query('COMMIT');
    return request;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getLabRequests = async ({ patient_id, doctor_id, status, start_date, end_date, limit = 20, offset = 0 }: LabRequestFilters = {}, tenantId?: string) => {
  let query = `
    SELECT lr.*,
           d.name AS doctor_name, d.specialty AS doctor_specialty,
           u.name AS patient_name,
           COALESCE(
             json_agg(
               json_build_object('id', lri.id, 'lab_test_id', lri.lab_test_id, 'test_name', lt.name, 'status', lri.status, 'result_value', lri.result_value, 'result_notes', lri.result_notes, 'reference_ranges', lt.reference_ranges, 'unit', lt.unit)
               ORDER BY lt.name
             ) FILTER (WHERE lri.id IS NOT NULL),
             '[]'::json
           ) AS items
    FROM lab_requests lr
    LEFT JOIN doctors d ON lr.doctor_id = d.id
    LEFT JOIN users u ON lr.patient_id = u.id
    LEFT JOIN lab_request_items lri ON lri.lab_request_id = lr.id
    LEFT JOIN lab_tests lt ON lt.id = lri.lab_test_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (patient_id) {
    params.push(patient_id);
    query += ' AND lr.patient_id = $' + params.length;
  }

  if (doctor_id) {
    params.push(doctor_id);
    query += ' AND lr.doctor_id = $' + params.length;
  }

  if (status) {
    params.push(status);
    query += ' AND lr.status = $' + params.length;
  }

  if (start_date) {
    params.push(start_date);
    query += ' AND lr.created_at >= $' + params.length;
  }

  if (end_date) {
    params.push(end_date);
    query += ' AND lr.created_at <= $' + params.length;
  }

  if (tenantId !== undefined) {
    params.push(tenantId);
    query += ' AND lr.tenant_id = $' + params.length;
  }

  query += ' GROUP BY lr.id, d.id, u.id ORDER BY lr.created_at DESC';
  params.push(limit);
  query += ' LIMIT $' + params.length;
  params.push(offset);
  query += ' OFFSET $' + params.length;

  const result = await readPool.query(query, params);
  return result.rows;
};

export const updateLabRequestStatus = async (requestId: number | string, status: string, tenantId: string) => {
  const result = await pool.query(
    `UPDATE lab_requests SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [status, requestId, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_REQUEST_NOT_FOUND);
  return result.rows[0];
};

export const getLabRequestById = async (requestId: number | string, tenantId: string) => {
  const result = await readPool.query(`
    SELECT lr.*,
           d.name AS doctor_name, d.specialty AS doctor_specialty,
           u.name AS patient_name,
           COALESCE(
             json_agg(
               json_build_object('id', lri.id, 'lab_test_id', lri.lab_test_id, 'test_name', lt.name, 'status', lri.status, 'result_value', lri.result_value, 'result_notes', lri.result_notes, 'reference_ranges', lt.reference_ranges, 'unit', lt.unit)
               ORDER BY lt.name
             ) FILTER (WHERE lri.id IS NOT NULL),
             '[]'::json
           ) AS items
    FROM lab_requests lr
    LEFT JOIN doctors d ON lr.doctor_id = d.id
    LEFT JOIN users u ON lr.patient_id = u.id
    LEFT JOIN lab_request_items lri ON lri.lab_request_id = lr.id
    LEFT JOIN lab_tests lt ON lt.id = lri.lab_test_id
    WHERE lr.id = $1 AND lr.tenant_id = $2
    GROUP BY lr.id, d.id, u.id
  `, [requestId, tenantId]);
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_REQUEST_NOT_FOUND);
  return result.rows[0];
};

export const updateLabRequestItemResult = async (itemId: number | string, result_value: string, tenantId: string, result_notes?: string) => {
  const result = await pool.query(
    `UPDATE lab_request_items SET result_value = $1, result_notes = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4 RETURNING *`,
    [result_value, result_notes || null, itemId, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_REQUEST_ITEM_NOT_FOUND);
  return result.rows[0];
};

export const getAllLabRequestsForLab = async (statusFilter: string | undefined, tenantId: string) => {
  let query = `
    SELECT lr.*,
           d.name AS doctor_name, d.specialty AS doctor_specialty,
           u.name AS patient_name, u.rut AS patient_rut,
           COALESCE(
             json_agg(
               json_build_object('id', lri.id, 'test_name', lt.name, 'status', lri.status, 'result_value', lri.result_value, 'result_notes', lri.result_notes)
               ORDER BY lt.name
             ) FILTER (WHERE lri.id IS NOT NULL),
             '[]'::json
           ) AS items
    FROM lab_requests lr
    LEFT JOIN doctors d ON lr.doctor_id = d.id
    LEFT JOIN users u ON lr.patient_id = u.id
    LEFT JOIN lab_request_items lri ON lri.lab_request_id = lr.id
    LEFT JOIN lab_tests lt ON lt.id = lri.lab_test_id
    WHERE lr.tenant_id = $1
  `;
  const params: any[] = [tenantId];

  if (statusFilter) {
    params.push(statusFilter);
    query += ' AND lr.status = $' + params.length;
  }

  query += ' GROUP BY lr.id, d.id, u.id ORDER BY lr.created_at DESC';

  const result = await readPool.query(query, params);
  return result.rows;
};

export const updateLabRequestItemStatus = async (itemId: number | string, status: string, tenantId: string) => {
  const result = await pool.query(
    `UPDATE lab_request_items SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [status, itemId, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_REQUEST_ITEM_NOT_FOUND);
  return result.rows[0];
};

export const setLabType = async (requestId: number | string, labType: string, tenantId: string) => {
  if (!['internal', 'external'].includes(labType)) {
    throw new BadRequestError(E.LAB_INVALID_TYPE);
  }
  const result = await pool.query(
    `UPDATE lab_requests SET lab_type = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [labType, requestId, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_REQUEST_NOT_FOUND);
  return result.rows[0];
};

export const cancelLabRequest = async (requestId: number | string, userId: number, userRole: string, tenantId: string) => {
  const request = await getLabRequestById(requestId, tenantId);
  
  if (userRole !== 'admin' && request.patient_id !== userId) {
    throw new BadRequestError(E.LAB_ACCESS_DENIED);
  }
  
  return updateLabRequestStatus(requestId, 'cancelled', tenantId);
};

// ============================================================
// DASHBOARD
// ============================================================
export const getDashboardMetrics = async (tenantId: string, areaId?: number | null) => {
  const areaFilter = areaId ? ' AND lr.lab_area_id = $2' : '';
  const areaParam = areaId ? [tenantId, areaId] : [tenantId];

  const [statusCounts, avgTime, today, productivity, slaBreached, slaAtRisk] = await Promise.all([
    readPool.query(`
      SELECT
        COUNT(*) FILTER (WHERE lr.status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE lr.status = 'received') AS received,
        COUNT(*) FILTER (WHERE lr.status IN ('verified', 'assigned', 'processing', 'qc_review', 'result_entered')) AS in_progress,
        COUNT(*) FILTER (WHERE lr.status IN ('validated_tech', 'validated_doctor')) AS pending_validation,
        COUNT(*) FILTER (WHERE lr.status = 'signed') AS validated,
        COUNT(*) FILTER (WHERE lr.status = 'delivered') AS delivered,
        COUNT(*) FILTER (WHERE lr.status IN ('cancelled', 'rejected')) AS rejected,
        COUNT(*) FILTER (WHERE lr.status = 'repeated') AS repeated,
        COUNT(*) FILTER (WHERE lr.priority IN ('urgent', 'emergency') AND lr.status NOT IN ('delivered', 'cancelled')) AS urgent,
        COUNT(*) FILTER (WHERE lri.is_critical = true AND lri.status NOT IN ('validated_tech', 'validated_doctor', 'signed', 'delivered')) AS critical_unvalidated
      FROM lab_requests lr
      LEFT JOIN lab_request_items lri ON lri.lab_request_id = lr.id
      WHERE lr.tenant_id = $1${areaFilter}
    `, areaParam),
    readPool.query(`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (lri.completed_at - lr.created_at)) / 60), 0) AS avg_minutes
      FROM lab_request_items lri
      JOIN lab_requests lr ON lr.id = lri.lab_request_id
      WHERE lr.tenant_id = $1
        AND lri.completed_at IS NOT NULL
        AND lr.created_at >= NOW() - INTERVAL '30 days'
        ${areaId ? 'AND lr.lab_area_id = $2' : ''}
    `, areaParam),
    readPool.query(`
      SELECT COUNT(*) AS count
      FROM lab_samples
      WHERE tenant_id = $1 AND reception_time >= NOW() - INTERVAL '24 hours'
        ${areaId ? 'AND lab_request_id IN (SELECT id FROM lab_requests WHERE lab_area_id = $2)' : ''}
    `, areaParam),
    readPool.query(`
      SELECT
        COUNT(*) FILTER (WHERE reception_time >= NOW() - INTERVAL '1 hour') AS per_hour
      FROM lab_samples
      WHERE tenant_id = $1 AND reception_time >= NOW() - INTERVAL '24 hours'
    `, [tenantId]),
    readPool.query(`
      SELECT COUNT(*) AS count
      FROM lab_request_items lri
      JOIN lab_requests lr ON lr.id = lri.lab_request_id
      JOIN lab_tests lt ON lt.id = lri.lab_test_id
      WHERE lr.tenant_id = $1
        AND lt.turnaround_time_min IS NOT NULL
        AND lri.completed_at IS NOT NULL
        AND EXTRACT(EPOCH FROM (lri.completed_at - lr.created_at)) / 60 > lt.turnaround_time_min
        ${areaId ? 'AND lr.lab_area_id = $2' : ''}
    `, areaParam),
    readPool.query(`
      SELECT COUNT(*) AS count
      FROM lab_request_items lri
      JOIN lab_requests lr ON lr.id = lri.lab_request_id
      JOIN lab_tests lt ON lt.id = lri.lab_test_id
      WHERE lr.tenant_id = $1
        AND lt.turnaround_time_min IS NOT NULL
        AND lri.completed_at IS NULL
        AND lr.status NOT IN ('delivered', 'cancelled', 'rejected')
        AND EXTRACT(EPOCH FROM (NOW() - lr.created_at)) / 60 > lt.turnaround_time_min * 0.8
        ${areaId ? 'AND lr.lab_area_id = $2' : ''}
    `, areaParam),
  ]);

  const s = statusCounts.rows[0];
  const avg = avgTime.rows[0];
  return {
    pending: Number(s?.pending || 0),
    received: Number(s?.received || 0),
    in_progress: Number(s?.in_progress || 0),
    pending_validation: Number(s?.pending_validation || 0),
    validated: Number(s?.validated || 0),
    delivered: Number(s?.delivered || 0),
    rejected: Number(s?.rejected || 0),
    repeated: Number(s?.repeated || 0),
    urgent: Number(s?.urgent || 0),
    critical_unvalidated: Number(s?.critical_unvalidated || 0),
    average_processing_time_min: Math.round(Number(avg?.avg_minutes || 0)),
    samples_processed_today: Number(today.rows[0]?.count || 0),
    productivity_per_hour: Number(productivity.rows[0]?.per_hour || 0),
    sla_breached: Number(slaBreached.rows[0]?.count || 0),
    sla_at_risk: Number(slaAtRisk.rows[0]?.count || 0),
  };
};

export const getAreaDashboard = async (tenantId: string, areaId: number) => {
  const [metrics, area] = await Promise.all([
    getDashboardMetrics(tenantId, areaId),
    readPool.query('SELECT id, tenant_id, name, code, description, icon, color, sort_order, active, created_at FROM lab_areas WHERE id = $1 AND tenant_id = $2', [areaId, tenantId]),
  ]);

  if (area.rows.length === 0) throw new NotFoundError(E.LAB_AREA_NOT_FOUND);

  const recentItems = await readPool.query(`
    SELECT lri.*, lt.name AS test_name
    FROM lab_request_items lri
    JOIN lab_tests lt ON lt.id = lri.lab_test_id
    JOIN lab_requests lr ON lr.id = lri.lab_request_id
    WHERE lr.tenant_id = $1 AND (lri.lab_area_id = $2 OR lr.lab_area_id = $2)
    ORDER BY lri.created_at DESC LIMIT 20
  `, [tenantId, areaId]);

  return {
    area: area.rows[0],
    metrics,
    recent_items: recentItems.rows,
  };
};

export const getAnalyticsData = async (tenantId: string) => {
  const [daily, monthly, byDoctor, byArea, topTests, revenue, repeatRate, slaData] = await Promise.all([
    readPool.query(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count,
             COUNT(*) FILTER (WHERE status = 'delivered') AS completed
      FROM lab_requests
      WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `, [tenantId]),
    readPool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS count,
             COUNT(*) FILTER (WHERE status = 'delivered') AS completed
      FROM lab_requests
      WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month
    `, [tenantId]),
    readPool.query(`
      SELECT d.name AS doctor_name, COUNT(*) AS count
      FROM lab_requests lr
      JOIN doctors d ON d.id = lr.doctor_id
      WHERE lr.tenant_id = $1 AND lr.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY d.name ORDER BY count DESC
    `, [tenantId]),
    readPool.query(`
      SELECT la.name AS area_name, COUNT(*) AS count,
             COALESCE(AVG(EXTRACT(EPOCH FROM (lri.completed_at - lr.created_at)) / 60), 0) AS avg_time_min
      FROM lab_requests lr
      JOIN lab_areas la ON la.id = lr.lab_area_id
      LEFT JOIN lab_request_items lri ON lri.lab_request_id = lr.id AND lri.completed_at IS NOT NULL
      WHERE lr.tenant_id = $1 AND lr.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY la.name ORDER BY count DESC
    `, [tenantId]),
    readPool.query(`
      SELECT lt.name AS test_name, COUNT(*) AS count
      FROM lab_request_items lri
      JOIN lab_tests lt ON lt.id = lri.lab_test_id
      JOIN lab_requests lr ON lr.id = lri.lab_request_id
      WHERE lr.tenant_id = $1 AND lr.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY lt.name ORDER BY count DESC LIMIT 20
    `, [tenantId]),
    readPool.query(`
      SELECT COALESCE(SUM(lt.price), 0) AS total
      FROM lab_request_items lri
      JOIN lab_tests lt ON lt.id = lri.lab_test_id
      JOIN lab_requests lr ON lr.id = lri.lab_request_id
      WHERE lr.tenant_id = $1 AND lr.created_at >= NOW() - INTERVAL '6 months'
    `, [tenantId]),
    readPool.query(`
      SELECT COUNT(*) FILTER (WHERE is_repeated = true) AS repeats, COUNT(*) AS total
      FROM lab_request_items lri
      JOIN lab_requests lr ON lr.id = lri.lab_request_id
      WHERE lr.tenant_id = $1 AND lr.created_at >= NOW() - INTERVAL '6 months'
    `, [tenantId]),
    readPool.query(`
      SELECT
        COUNT(*) FILTER (WHERE lt.turnaround_time_min IS NOT NULL AND EXTRACT(EPOCH FROM (lri.completed_at - lr.created_at)) / 60 <= lt.turnaround_time_min) AS met,
        COUNT(*) FILTER (WHERE lt.turnaround_time_min IS NOT NULL) AS total
      FROM lab_request_items lri
      JOIN lab_requests lr ON lr.id = lri.lab_request_id
      JOIN lab_tests lt ON lt.id = lri.lab_test_id
      WHERE lr.tenant_id = $1 AND lri.completed_at IS NOT NULL AND lr.created_at >= NOW() - INTERVAL '6 months'
    `, [tenantId]),
  ]);

  const rr = repeatRate.rows[0];
  const sla = slaData.rows[0];

  const weeklyData = daily.rows.reduce((acc: any[], d: any) => {
    const date = new Date(d.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    const existing = acc.find(w => w.week === weekKey);
    if (existing) {
      existing.count += Number(d.count);
      existing.completed += Number(d.completed);
    } else {
      acc.push({ week: weekKey, count: Number(d.count), completed: Number(d.completed) });
    }
    return acc;
  }, []);

  return {
    daily: daily.rows.map((d: any) => ({ date: d.date, count: Number(d.count), completed: Number(d.completed) })),
    weekly: weeklyData,
    monthly: monthly.rows.map((m: any) => ({ month: m.month, count: Number(m.count), completed: Number(m.completed) })),
    by_doctor: byDoctor.rows,
    by_area: byArea.rows.map((a: any) => ({ area_name: a.area_name, count: Number(a.count), avg_time_min: Number(a.avg_time_min) })),
    by_priority: [],
    top_tests: topTests.rows.slice(0, 10),
    bottom_tests: topTests.rows.slice(-5).reverse(),
    avg_processing_time: 0,
    repeat_rate: rr?.total > 0 ? Number(rr.repeats) / Number(rr.total) : 0,
    error_rate: 0,
    sla_compliance: sla?.total > 0 ? Number(sla.met) / Number(sla.total) : 1,
    total_revenue: Number(revenue.rows[0]?.total || 0),
  };
};

// ============================================================
// SAMPLES
// ============================================================
const generateSampleCode = (tenantId: string) => {
  const random = crypto.randomInt(100000, 999999).toString();
  return 'SMP-' + random;
};

export const getSamples = async (tenantId: string, query: any = {}) => {
  let sql = 'SELECT id, lab_request_item_id, lab_request_id, sample_type, sample_code, container_type, volume, received_by, reception_time, status, notes, created_at, updated_at, tenant_id FROM lab_samples WHERE tenant_id = $1';
  const params: any[] = [tenantId];
  let count = 2;

  if (query.status) { sql += ` AND status = $${count++}`; params.push(query.status); }
  if (query.lab_request_id) { sql += ` AND lab_request_id = $${count++}`; params.push(Number(query.lab_request_id)); }

  sql += ' ORDER BY created_at DESC LIMIT 100';
  const result = await readPool.query(sql, params);
  return result.rows;
};

export const getSampleById = async (id: number, tenantId: string) => {
  const result = await readPool.query('SELECT id, lab_request_item_id, lab_request_id, sample_type, sample_code, container_type, volume, received_by, reception_time, status, notes, created_at, updated_at, tenant_id FROM lab_samples WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_SAMPLE_NOT_FOUND);
  return result.rows[0];
};

export const createSample = async (data: any, tenantId: string) => {
  const sampleCode = generateSampleCode(tenantId);
  const result = await pool.query(
    `INSERT INTO lab_samples (lab_request_item_id, lab_request_id, sample_type, sample_code, container_type, volume, received_by, reception_time, notes, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9) RETURNING *`,
    [data.lab_request_item_id || null, data.lab_request_id, data.sample_type, sampleCode,
     data.container_type || null, data.volume || null, data.received_by, data.notes || null, tenantId]
  );

  // Create notification for sample reception
  await pool.query(
    `INSERT INTO lab_notifications (type, title, message, severity, lab_request_id, tenant_id)
     VALUES ('info', 'Muestra recibida', $1, 'info', $2, $3)`,
    [`Muestra ${sampleCode} registrada - ${data.sample_type}`, data.lab_request_id, tenantId]
  );

  return result.rows[0];
};

export const receiveSample = async (id: number, userId: number, tenantId: string, data?: any) => {
  const result = await pool.query(
    `UPDATE lab_samples SET status = 'received', reception_time = COALESCE($1, NOW()), received_by = $2, updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4 RETURNING *`,
    [data?.reception_time || new Date().toISOString(), userId, id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_SAMPLE_NOT_FOUND);
  return result.rows[0];
};

export const verifySample = async (id: number, userId: number, tenantId: string) => {
  const result = await pool.query(
    `UPDATE lab_samples SET status = 'verified', verification_time = NOW(), verified_by = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [userId, id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_SAMPLE_NOT_FOUND);
  return result.rows[0];
};

export const assignSample = async (id: number, data: any, tenantId: string) => {
  const result = await pool.query(
    `UPDATE lab_samples SET status = 'assigned', assigned_tech_id = $1, assigned_equipment_id = $2, updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4 RETURNING *`,
    [data.assigned_tech_id, data.assigned_equipment_id || null, id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_SAMPLE_NOT_FOUND);
  return result.rows[0];
};

export const recordSampleQC = async (id: number, data: any, tenantId: string) => {
  const result = await pool.query(
    `UPDATE lab_samples SET qc_status = $1, qc_notes = $2, updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4 RETURNING *`,
    [data.qc_status, data.qc_notes || null, id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_SAMPLE_NOT_FOUND);

  // Create QC notification if failed
  if (data.qc_status === 'failed') {
    await pool.query(
      `INSERT INTO lab_notifications (type, title, message, severity, lab_request_id, tenant_id)
       VALUES ('qc_failure', 'QC Fallido', $1, 'critical', (SELECT lab_request_id FROM lab_samples WHERE id = $2), $3)`,
      [`Control de calidad fallido para muestra #${id}`, id, tenantId]
    );
  }

  return result.rows[0];
};

export const rejectSample = async (id: number, reason: string, tenantId: string) => {
  const result = await pool.query(
    `UPDATE lab_samples SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [reason, id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_SAMPLE_NOT_FOUND);
  return result.rows[0];
};

// ============================================================
// RESULTS & VALIDATION
// ============================================================
export const validateItemByTech = async (itemId: number, userId: number, tenantId: string) => {
  const item = await pool.query(
    `UPDATE lab_request_items SET status = 'validated_tech', validated_by_tech = $1, validated_at_tech = NOW(), updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND status IN ('result_entered', 'processing') RETURNING *`,
    [userId, itemId, tenantId]
  );
  if (item.rows.length === 0) throw new BadRequestError(E.LAB_ITEM_INVALID_STATUS);
  return item.rows[0];
};

export const validateItemByDoctor = async (itemId: number, userId: number, tenantId: string) => {
  const item = await pool.query(
    `UPDATE lab_request_items SET status = 'validated_doctor', validated_by_doctor = $1, validated_at_doctor = NOW(), updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND status = 'validated_tech' RETURNING *`,
    [userId, itemId, tenantId]
  );
  if (item.rows.length === 0) throw new BadRequestError(E.LAB_ITEM_MUST_TECH_FIRST);
  return item.rows[0];
};

export const signItem = async (itemId: number, userId: number, tenantId: string) => {
  const item = await pool.query(
    `UPDATE lab_request_items SET status = 'signed', signed_by = $1, signed_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND status = 'validated_doctor' RETURNING *`,
    [userId, itemId, tenantId]
  );
  if (item.rows.length === 0) throw new BadRequestError(E.LAB_ITEM_MUST_DOCTOR_FIRST);
  return item.rows[0];
};

export const deliverItem = async (itemId: number, tenantId: string, method?: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const item = await client.query(
      `UPDATE lab_request_items SET status = 'delivered', delivered_at = NOW(), delivery_method = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [method || null, itemId, tenantId]
    );
    if (item.rows.length === 0) throw new NotFoundError(E.LAB_ITEM_NOT_FOUND);

    const requestId = item.rows[0].lab_request_id;
    const remaining = await client.query(
      `SELECT COUNT(*) AS count FROM lab_request_items
       WHERE lab_request_id = $1 AND tenant_id = $2 AND status != 'delivered' AND status != 'cancelled'`,
      [requestId, tenantId]
    );

    let notificationPayload: { tenant_id: string; user_id: number; type: 'success'; title: string; message: string; link: string } | null = null;

    if (Number(remaining.rows[0]?.count || 0) === 0) {
      const updated = await client.query(
        `UPDATE lab_requests SET status = 'delivered', completed_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING patient_id, id`,
        [requestId, tenantId]
      );
      if (updated.rows.length > 0 && updated.rows[0].patient_id) {
        notificationPayload = {
          tenant_id: tenantId,
          user_id: Number(updated.rows[0].patient_id),
          type: 'success',
          title: 'Resultados publicados',
          message: 'Tu informe de laboratorio ya está disponible. Revisa tus resultados en el portal.',
          link: `/my-laboratory/${updated.rows[0].id}`,
        };
      }
    }

    await client.query('COMMIT');

    if (notificationPayload) {
      void createNotification(notificationPayload).catch(() => undefined);
    }

    return item.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getItemHistory = async (itemId: number, tenantId: string) => {
  // Get the test and patient from the current item
  const item = await readPool.query(
    `SELECT lri.lab_test_id, lr.patient_id FROM lab_request_items lri
     JOIN lab_requests lr ON lr.id = lri.lab_request_id
     WHERE lri.id = $1 AND lr.tenant_id = $2`,
    [itemId, tenantId]
  );
  if (item.rows.length === 0) throw new NotFoundError(E.LAB_ITEM_NOT_FOUND);

  const { lab_test_id, patient_id } = item.rows[0];

  const history = await readPool.query(
    `SELECT lri.id, lri.result_value, lr.created_at AS checked_at,
            LAG(lri.result_value) OVER (ORDER BY lr.created_at) AS previous_result_value
     FROM lab_request_items lri
     JOIN lab_requests lr ON lr.id = lri.lab_request_id
     WHERE lri.lab_test_id = $1 AND lr.patient_id = $2 AND lri.result_value IS NOT NULL
       AND lr.tenant_id = $3
     ORDER BY lr.created_at DESC LIMIT 10`,
    [lab_test_id, patient_id, tenantId]
  );

  return history.rows.map((row: any, idx: number) => {
    const prev = row.previous_result_value;
    const curr = row.result_value;
    let delta = 0;
    let deltaStatus = 'normal';
    if (prev && curr && !isNaN(Number(prev)) && !isNaN(Number(curr))) {
      const p = Number(prev);
      const c = Number(curr);
      delta = p !== 0 ? ((c - p) / p) * 100 : 0;
      deltaStatus = Math.abs(delta) > 50 ? 'critical' : Math.abs(delta) > 20 ? 'warning' : 'normal';
    }
    return {
      id: row.id,
      lab_request_item_id: row.id,
      patient_id,
      lab_test_id,
      result_value: curr,
      previous_result_value: prev,
      delta_percentage: Math.round(delta * 10) / 10,
      delta_check_status: deltaStatus,
      checked_at: row.checked_at,
    };
  });
};

// ============================================================
// AREAS
// ============================================================
export const getLabAreas = async (tenantId: string) => {
  const result = await readPool.query(
    'SELECT id, tenant_id, name, code, description, icon, color, sort_order, active, created_at FROM lab_areas WHERE tenant_id = $1 AND active = true ORDER BY sort_order',
    [tenantId]
  );
  return result.rows;
};

export const createLabArea = async (data: any, tenantId: string) => {
  const result = await pool.query(
    `INSERT INTO lab_areas (name, code, description, icon, color, sort_order, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.name, data.code, data.description || null, data.icon || null, data.color || null, data.sort_order || 0, tenantId]
  );
  return result.rows[0];
};

// ============================================================
// QC RECORDS
// ============================================================
export const getQCRecords = async (tenantId: string, query: any = {}) => {
  let sql = 'SELECT id, lab_test_id, lab_area_id, sample_id, equipment_id, reagent_id, qc_type, control_name, lot_number, expiration_date, measured_value, expected_min, expected_max, status, performed_by, notes, created_at, updated_at, tenant_id FROM lab_qc_records WHERE tenant_id = $1';
  const params: any[] = [tenantId];
  let count = 2;

  if (query.area_id) { sql += ` AND lab_area_id = $${count++}`; params.push(Number(query.area_id)); }
  if (query.status) { sql += ` AND status = $${count++}`; params.push(query.status); }

  sql += ' ORDER BY performed_at DESC LIMIT 50';
  const result = await readPool.query(sql, params);
  return result.rows;
};

export const createQCRecord = async (data: any, tenantId: string) => {
  const result = await pool.query(
    `INSERT INTO lab_qc_records (lab_test_id, lab_area_id, sample_id, equipment_id, reagent_id, qc_type,
      control_name, lot_number, expiration_date, measured_value, expected_min, expected_max, status,
      performed_by, notes, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
    [data.lab_test_id, data.lab_area_id, data.sample_id || null, data.equipment_id || null,
     data.reagent_id || null, data.qc_type, data.control_name, data.lot_number,
     data.expiration_date || null, data.measured_value, data.expected_min, data.expected_max,
     data.status, data.performed_by, data.notes || null, tenantId]
  );

  // Alert if QC failed
  if (data.status === 'failed') {
    await pool.query(
      `INSERT INTO lab_notifications (type, title, message, severity, tenant_id)
       VALUES ('qc_failure', 'QC Fallido', $1, 'critical', $2)`,
      [`Control ${data.control_name} (lote ${data.lot_number}) fuera de rango`, tenantId]
    );
  }

  return result.rows[0];
};

export const getQCStatistics = async (tenantId: string, areaId?: number | null) => {
  let sql = `SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'passed') AS passed,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed,
    COUNT(*) FILTER (WHERE status = 'warning') AS warning
    FROM lab_qc_records WHERE tenant_id = $1`;
  const params: any[] = [tenantId];

  if (areaId) { sql += ' AND lab_area_id = $2'; params.push(areaId); }

  const result = await readPool.query(sql, params);
  return result.rows[0] || { total: 0, passed: 0, failed: 0, warning: 0 };
};

// ============================================================
// EQUIPMENT
// ============================================================
export const getEquipment = async (tenantId: string, query: any = {}) => {
  let sql = 'SELECT le.*, la.name AS area_name FROM lab_equipment le LEFT JOIN lab_areas la ON la.id = le.lab_area_id WHERE le.tenant_id = $1';
  const params: any[] = [tenantId];
  let count = 2;

  if (query.area_id) { sql += ` AND le.lab_area_id = $${count++}`; params.push(Number(query.area_id)); }
  if (query.active !== undefined) { sql += ` AND le.active = $${count++}`; params.push(query.active === 'true'); }

  sql += ' ORDER BY le.name';
  const result = await readPool.query(sql, params);
  return result.rows;
};

export const createEquipment = async (data: any, tenantId: string) => {
  const result = await pool.query(
    `INSERT INTO lab_equipment (name, model, serial_number, lab_area_id, connection_type, ip_address, port, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.name, data.model || null, data.serial_number || null, data.lab_area_id || null,
     data.connection_type || 'manual', data.ip_address || null, data.port || null, tenantId]
  );
  return result.rows[0];
};

export const updateEquipment = async (id: number, data: any, tenantId: string) => {
  const fields: string[] = [];
  const values: any[] = [];
  let count = 1;

  for (const key of ['name', 'model', 'serial_number', 'lab_area_id', 'connection_type', 'ip_address', 'port', 'active', 'status']) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${count++}`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) throw new BadRequestError(E.LAB_TEST_NO_FIELDS);
  values.push(id, tenantId);

  const result = await pool.query(
    `UPDATE lab_equipment SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${count++} AND tenant_id = $${count} RETURNING *`,
    values
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_EQUIPMENT_NOT_FOUND);
  return result.rows[0];
};

// ============================================================
// REAGENTS
// ============================================================
export const getReagents = async (tenantId: string, query: any = {}) => {
  let sql = 'SELECT id, name, catalog_number, lot_number, supplier, stock_quantity, unit, min_stock, current_stock, expiration_date, storage_conditions, lab_test_id, lab_area_id, active, created_at, updated_at, tenant_id FROM lab_reagents WHERE tenant_id = $1';
  const params: any[] = [tenantId];
  let count = 2;

  if (query.area_id) { sql += ` AND lab_area_id = $${count++}`; params.push(Number(query.area_id)); }
  if (query.active !== undefined) { sql += ` AND active = $${count++}`; params.push(query.active === 'true'); }

  sql += ' ORDER BY name';
  const result = await readPool.query(sql, params);
  return result.rows;
};

export const createReagent = async (data: any, tenantId: string) => {
  const result = await pool.query(
    `INSERT INTO lab_reagents (name, catalog_number, lot_number, supplier, stock_quantity, unit, min_stock,
      current_stock, expiration_date, storage_conditions, lab_test_id, lab_area_id, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [data.name, data.catalog_number || null, data.lot_number || null, data.supplier || null,
     data.stock_quantity || 0, data.unit || 'u', data.min_stock || 0,
     data.current_stock || data.stock_quantity || 0, data.expiration_date || null,
     data.storage_conditions || null, data.lab_test_id || null, data.lab_area_id || null, tenantId]
  );
  return result.rows[0];
};

export const updateReagentStock = async (id: number, quantity: number, tenantId: string) => {
  const result = await pool.query(
    `UPDATE lab_reagents SET current_stock = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [quantity, id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_REAGENT_NOT_FOUND);

  // Alert if stock is low
  const reagent = result.rows[0];
  if (reagent.current_stock <= reagent.min_stock) {
    await pool.query(
      `INSERT INTO lab_notifications (type, title, message, severity, tenant_id)
       VALUES ('stock_alert', 'Stock bajo', $1, 'warning', $2)`,
      [`Reactivo ${reagent.name} al ${reagent.current_stock}/${reagent.min_stock}`, tenantId]
    );
  }

  return result.rows[0];
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const getNotifications = async (tenantId: string, query: any = {}) => {
  const limit = Number(query.limit) || 50;
  let sql = 'SELECT id, type, title, message, severity, lab_request_id, acknowledged, acknowledged_by, acknowledged_at, created_at, tenant_id FROM lab_notifications WHERE tenant_id = $1';
  const params: any[] = [tenantId];
  let count = 2;

  if (query.acknowledged === 'false') { sql += ` AND acknowledged = false`; }
  if (query.severity) { sql += ` AND severity = $${count++}`; params.push(query.severity); }

  sql += ' ORDER BY created_at DESC LIMIT $' + count++;
  params.push(limit);

  const result = await readPool.query(sql, params);
  return result.rows;
};

export const acknowledgeNotification = async (id: number, userId: number, tenantId: string) => {
  const result = await pool.query(
    `UPDATE lab_notifications SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW()
     WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [userId, id, tenantId]
  );
  if (result.rows.length === 0) throw new NotFoundError(E.LAB_NOTIFICATION_NOT_FOUND);
  return result.rows[0];
};
