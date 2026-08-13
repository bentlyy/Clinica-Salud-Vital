import { pool } from '../../shared/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { isValidDate, isValidTime } from '../../shared/date.js';

interface AvailabilityInput {
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ExceptionInput {
  doctor_id: number;
  date: string;
  start_time?: string;
  end_time?: string;
  is_full_day?: boolean;
}

interface BulkDayInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface BulkAvailabilityInput {
  doctor_id: number;
  days: BulkDayInput[];
}

export const getAvailabilityByDoctor = async (doctor_id: number, tenantId: string): Promise<unknown[]> => {
  const result = await pool.query(
    `SELECT * FROM doctor_availability
     WHERE doctor_id = $1 AND tenant_id = $2
     ORDER BY day_of_week, start_time`,
    [doctor_id, tenantId]
  );
  return result.rows;
};

export const createAvailability = async ({ doctor_id, day_of_week, start_time, end_time }: AvailabilityInput, tenantId: string): Promise<unknown> => {
  if (!doctor_id || day_of_week === undefined || !start_time || !end_time) {
    throw new BadRequestError(E.AVAILABILITY_MISSING_FIELDS);
  }
  if (!Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
    throw new BadRequestError(E.AVAILABILITY_INVALID_DAY);
  }
  if (!isValidTime(start_time) || !isValidTime(end_time)) {
    throw new BadRequestError(E.AVAILABILITY_INVALID_TIME);
  }
  if (start_time >= end_time) {
    throw new BadRequestError(E.AVAILABILITY_TIME_BEFORE_END);
  }

  const overlap = await pool.query(
    `SELECT 1 FROM doctor_availability
     WHERE doctor_id = $1 AND day_of_week = $2 AND tenant_id = $5
     AND (start_time < $4 AND end_time > $3)`,
    [doctor_id, day_of_week, start_time, end_time, tenantId]
  );

  if (overlap.rows.length > 0) {
    throw new BadRequestError(E.AVAILABILITY_OVERLAP);
  }

  const result = await pool.query(
    `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [doctor_id, day_of_week, start_time, end_time, tenantId]
  );

  return result.rows[0];
};

export const bulkCreateAvailability = async ({ doctor_id, days }: BulkAvailabilityInput, tenantId: string): Promise<{ inserted: number; skipped: number }> => {
  if (!doctor_id || !Array.isArray(days) || days.length === 0) {
    throw new BadRequestError(E.AVAILABILITY_MISSING_FIELDS);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const doctor = await client.query(
      'SELECT id FROM doctors WHERE id = $1 AND tenant_id = $2',
      [doctor_id, tenantId]
    );
    if (doctor.rows.length === 0) throw new NotFoundError(E.AVAILABILITY_DOCTOR_NOT_FOUND);

    let inserted = 0;
    let skipped = 0;

    for (const day of days) {
      if (!Number.isInteger(day.day_of_week) || day.day_of_week < 0 || day.day_of_week > 6) {
        throw new BadRequestError(E.AVAILABILITY_INVALID_DAY);
      }
      if (!isValidTime(day.start_time) || !isValidTime(day.end_time)) {
        throw new BadRequestError(E.AVAILABILITY_INVALID_TIME);
      }
      if (day.start_time >= day.end_time) {
        throw new BadRequestError(E.AVAILABILITY_TIME_BEFORE_END);
      }

      const overlap = await client.query(
        `SELECT 1 FROM doctor_availability
         WHERE doctor_id = $1 AND day_of_week = $2 AND tenant_id = $5
         AND (start_time < $4 AND end_time > $3)`,
        [doctor_id, day.day_of_week, day.start_time, day.end_time, tenantId]
      );

      if (overlap.rows.length > 0) {
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [doctor_id, day.day_of_week, day.start_time, day.end_time, tenantId]
      );
      inserted++;
    }

    await client.query('COMMIT');
    return { inserted, skipped };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteAvailability = async (availability_id: number, doctor_id: number, tenantId: string): Promise<{ message: string }> => {
  if (!Number.isInteger(availability_id) || !Number.isInteger(doctor_id)) {
    throw new BadRequestError(E.AVAILABILITY_INVALID_ID);
  }

  const result = await pool.query(
    `DELETE FROM doctor_availability WHERE id = $1 AND doctor_id = $2 AND tenant_id = $3 RETURNING *`,
    [availability_id, doctor_id, tenantId]
  );

  if (result.rows.length === 0) throw new NotFoundError(E.AVAILABILITY_NOT_FOUND);

  return { message: 'Availability deleted' };
};

export const getExceptionsByDoctor = async (doctor_id: number, tenantId: string): Promise<unknown[]> => {
  const result = await pool.query(
    `SELECT * FROM doctor_exceptions WHERE doctor_id = $1 AND tenant_id = $2 ORDER BY date`,
    [doctor_id, tenantId]
  );
  return result.rows;
};

export const createException = async ({ doctor_id, date, start_time, end_time, is_full_day = false }: ExceptionInput, tenantId: string): Promise<unknown> => {
  if (!doctor_id || !date) throw new BadRequestError(E.AVAILABILITY_MISSING_FIELDS);
  if (!isValidDate(date)) throw new BadRequestError(E.AVAILABILITY_INVALID_TIME);

  if (!is_full_day) {
    if (!start_time || !end_time) throw new BadRequestError(E.AVAILABILITY_MISSING_FIELDS);
    if (!isValidTime(start_time) || !isValidTime(end_time)) throw new BadRequestError(E.AVAILABILITY_INVALID_TIME);
    if (start_time >= end_time) throw new BadRequestError(E.AVAILABILITY_TIME_BEFORE_END);
  }

  const result = await pool.query(
    `INSERT INTO doctor_exceptions (doctor_id, date, start_time, end_time, is_full_day, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [doctor_id, date, start_time || null, end_time || null, is_full_day, tenantId]
  );

  return result.rows[0];
};

export const deleteException = async (exception_id: number, doctor_id: number, tenantId: string): Promise<{ message: string }> => {
  if (!Number.isInteger(exception_id) || !Number.isInteger(doctor_id)) {
    throw new BadRequestError(E.AVAILABILITY_INVALID_ID);
  }

  const result = await pool.query(
    `DELETE FROM doctor_exceptions WHERE id = $1 AND doctor_id = $2 AND tenant_id = $3 RETURNING *`,
    [exception_id, doctor_id, tenantId]
  );

  if (result.rows.length === 0) throw new NotFoundError(E.AVAILABILITY_NOT_FOUND);

  return { message: 'Exception deleted' };
};
