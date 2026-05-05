import { pool } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

const generateRequestNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `LAB-${year}-${random}`;
};

export const getLabTests = async ({ category, active = true, limit = 50, offset = 0 } = {}) => {
  let query = 'SELECT * FROM lab_tests WHERE 1=1';
  const params = [];
  let paramCount = 1;

  if (active !== undefined) {
    query += ` AND active = $${paramCount++}`;
    params.push(active);
  }

  if (category) {
    query += ` AND category = $${paramCount++}`;
    params.push(category);
  }

  query += ` ORDER BY name LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
};

export const createLabRequest = async (data) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const requestNumber = generateRequestNumber();
    const { patient_id, doctor_id, clinical_record_id, priority, notes, test_ids } = data;

    const requestResult = await client.query(`
      INSERT INTO lab_requests 
        (request_number, patient_id, doctor_id, clinical_record_id, priority, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [requestNumber, patient_id, doctor_id || null, clinical_record_id || null, priority || 'routine', notes || null]);

    const request = requestResult.rows[0];

    if (test_ids && test_ids.length > 0) {
      for (const test_id of test_ids) {
        const testResult = await client.query('SELECT id FROM lab_tests WHERE id = $1 AND active = true', [test_id]);
        if (testResult.rows.length === 0) throw new BadRequestError(`Lab test ${test_id} not found or inactive`);

        await client.query(`
          INSERT INTO lab_request_items (lab_request_id, lab_test_id)
          VALUES ($1, $2)
        `, [request.id, test_id]);
      }
    }

    await client.query('COMMIT');
    return request;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getLabRequests = async ({ patient_id, doctor_id, status, start_date, end_date, limit = 50, offset = 0 } = {}) => {
  let query = `
    SELECT lr.*, 
           u.email AS patient_email, u.rut AS patient_rut,
           d.name AS doctor_name,
           cr.id AS clinical_record_id
    FROM lab_requests lr
    LEFT JOIN users u ON lr.patient_id = u.id
    LEFT JOIN doctors d ON lr.doctor_id = d.id
    LEFT JOIN clinical_records cr ON lr.clinical_record_id = cr.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (patient_id) {
    query += ` AND lr.patient_id = $${paramCount++}`;
    params.push(patient_id);
  }

  if (doctor_id) {
    query += ` AND lr.doctor_id = $${paramCount++}`;
    params.push(doctor_id);
  }

  if (status) {
    query += ` AND lr.status = $${paramCount++}`;
    params.push(status);
  }

  if (start_date) {
    query += ` AND lr.requested_at >= $${paramCount++}`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND lr.requested_at <= $${paramCount++}`;
    params.push(end_date);
  }

  query += ` ORDER BY lr.requested_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  for (const row of result.rows) {
    const itemsResult = await pool.query(`
      SELECT lri.*, lt.name AS test_name, lt.unit, lt.reference_min, lt.reference_max
      FROM lab_request_items lri
      JOIN lab_tests lt ON lri.lab_test_id = lt.id
      WHERE lri.lab_request_id = $1
    `, [row.id]);
    row.items = itemsResult.rows;
  }

  return result.rows;
};

export const getLabRequestById = async (id) => {
  const requestResult = await pool.query(`
    SELECT lr.*, 
           u.email AS patient_email, u.rut AS patient_rut,
           d.name AS doctor_name
    FROM lab_requests lr
    LEFT JOIN users u ON lr.patient_id = u.id
    LEFT JOIN doctors d ON lr.doctor_id = d.id
    WHERE lr.id = $1
  `, [id]);

  if (requestResult.rows.length === 0) throw new NotFoundError('Lab request not found');

  const request = requestResult.rows[0];

  const itemsResult = await pool.query(`
    SELECT lri.*, lt.name AS test_name, lt.category, lt.unit, lt.reference_min, lt.reference_max, lt.price
    FROM lab_request_items lri
    JOIN lab_tests lt ON lri.lab_test_id = lt.id
    WHERE lri.lab_request_id = $1
  `, [id]);

  request.items = itemsResult.rows;

  return request;
};

export const updateLabRequestStatus = async (id, status) => {
  const validStatuses = ['pending', 'collected', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError('Invalid status');
  }

  const timestamp = status === 'collected' ? 'NOW()' : 'collected_at';
  const completedAt = status === 'completed' ? 'NOW()' : 'completed_at';

  const result = await pool.query(`
    UPDATE lab_requests 
    SET status = $1, 
        collected_at = ${status === 'collected' || status === 'in_progress' || status === 'completed' ? 'NOW()' : 'collected_at'},
        completed_at = ${status === 'completed' ? 'NOW()' : 'completed_at'},
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [status, id]);

  if (result.rows.length === 0) throw new NotFoundError('Lab request not found');
  return result.rows[0];
};

export const updateLabRequestItemResult = async (item_id, result_value, result_notes) => {
  const result = await pool.query(`
    UPDATE lab_request_items 
    SET result_value = $1, result_notes = $2, status = 'completed', completed_at = NOW()
    WHERE id = $3
    RETURNING *
  `, [result_value, result_notes || null, item_id]);

  if (result.rows.length === 0) throw new NotFoundError('Lab request item not found');
  return result.rows[0];
};

export const cancelLabRequest = async (id, user_id, role) => {
  const request = await pool.query('SELECT * FROM lab_requests WHERE id = $1', [id]);

  if (request.rows.length === 0) throw new NotFoundError('Lab request not found');

  if (role === 'doctor' && request.rows[0].doctor_id !== user_id) {
    throw new BadRequestError('You can only cancel your own requests');
  }

  const result = await pool.query(
    `UPDATE lab_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND status IN ('pending', 'collected') RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) throw new BadRequestError('Lab request cannot be cancelled');
  return result.rows[0];
};