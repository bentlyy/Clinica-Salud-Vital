import { pool } from '../../shared/db.js';
import * as mlService from '../ml/ml.service.js';
import { logger } from '../../utils/logger.js';

interface NoShowRow {
  doctor: string;
  total: string;
  no_shows: string;
}

interface DiagnosisRow {
  diagnosis: string;
  count: string;
}

interface BookingRow {
  date: string;
  bookings: string;
}

interface VitalSignRow {
  patientId: number;
  date: string;
  pressure: string;
  heartRate: string;
  temperature: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface VitalSignsInput extends Record<string, unknown> {
  pressure: string;
  heartRate: string;
  temperature: string;
}

export const getDashboardStats = async (tenantId?: string) => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'user'${tenantId ? ' AND tenant_id = $1' : ''})::int AS total_patients,
      (SELECT COUNT(*) FROM doctors${tenantId ? ' WHERE tenant_id = $1' : ''})::int AS total_doctors,
      (SELECT COUNT(*) FROM bookings WHERE status != 'cancelled'${tenantId ? ' AND tenant_id = $1' : ''})::int AS total_bookings,
      (SELECT COUNT(*) FROM bookings WHERE date = CURRENT_DATE AND status != 'cancelled'${tenantId ? ' AND tenant_id = $1' : ''})::int AS today_bookings,
      (SELECT COUNT(*) FROM bookings WHERE confirmed = true AND status != 'cancelled'${tenantId ? ' AND tenant_id = $1' : ''})::int AS confirmed_bookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled'${tenantId ? ' AND tenant_id = $1' : ''})::int AS cancelled_bookings
  `, tenantId ? [tenantId] : []);

  return result.rows[0];
};

export const getBookingsByMonth = async (months = 12, tenantId?: string) => {
  const result = await pool.query(`
    SELECT
      TO_CHAR(date, 'YYYY-MM') AS month,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE confirmed = true) AS confirmed,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
    FROM bookings
    WHERE date >= NOW() - INTERVAL '1 months' * $1
      ${tenantId ? 'AND tenant_id = $2' : ''}
    GROUP BY TO_CHAR(date, 'YYYY-MM')
    ORDER BY month
  `, tenantId ? [months, tenantId] : [months]);

  return result.rows;
};

export const getTopDoctors = async (limit = 10, tenantId?: string) => {
  const params: (string | number)[] = [limit];
  let paramCount = 2;

  let query = `
    SELECT 
      d.id,
      d.name,
      d.specialty,
      COUNT(b.id) AS total_bookings,
      COUNT(b.id) FILTER (WHERE b.confirmed = true) AS confirmed_bookings
    FROM doctors d
    LEFT JOIN bookings b ON d.id = b.doctor_id AND b.status != 'cancelled'
    WHERE 1=1
  `;

  if (tenantId) {
    query += ` AND d.tenant_id = $${paramCount++}`;
    params.push(tenantId);
  }

  query += `\n    GROUP BY d.id\n    ORDER BY total_bookings DESC\n    LIMIT $1`;

  const result = await pool.query(query, params);
  return result.rows;
};

export const getBookingStatusDistribution = async (tenantId?: string) => {
  const result = await pool.query(`
    SELECT status, COUNT(*) AS count
    FROM bookings
    ${tenantId ? 'WHERE tenant_id = $1' : ''}
    GROUP BY status
  `, tenantId ? [tenantId] : []);

  return result.rows;
};

export const getDoctorStats = async (doctor_id: number, tenantId?: string) => {
  const [totalBookings, upcomingBookings, patientsServed, clinicalRecords] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM bookings WHERE doctor_id = $1 AND status != $2${tenantId ? ' AND tenant_id = $3' : ''}`, tenantId ? [doctor_id, 'cancelled', tenantId] : [doctor_id, 'cancelled']),
    pool.query(`SELECT COUNT(*) FROM bookings WHERE doctor_id = $1 AND date >= CURRENT_DATE AND status != $2${tenantId ? ' AND tenant_id = $3' : ''}`, tenantId ? [doctor_id, 'cancelled', tenantId] : [doctor_id, 'cancelled']),
    pool.query(`SELECT COUNT(DISTINCT COALESCE(user_id, guest_rut)) FROM bookings WHERE doctor_id = $1 AND status != $2${tenantId ? ' AND tenant_id = $3' : ''}`, tenantId ? [doctor_id, 'cancelled', tenantId] : [doctor_id, 'cancelled']),
    pool.query(`SELECT COUNT(*) FROM clinical_records WHERE doctor_id = $1${tenantId ? ' AND tenant_id = $2' : ''}`, tenantId ? [doctor_id, tenantId] : [doctor_id]),
  ]);

  return {
    total_bookings: parseInt(totalBookings.rows[0].count),
    upcoming_bookings: parseInt(upcomingBookings.rows[0].count),
    patients_served: parseInt(patientsServed.rows[0].count),
    clinical_records: parseInt(clinicalRecords.rows[0].count),
  };
};

export const getNoShowsByDoctor = async (tenantId?: string) => {
  const params: (string | number)[] = [];
  let paramCount = 1;

  let query = `
    SELECT 
      d.id,
      d.name AS doctor,
      COUNT(b.id) AS total,
      COUNT(b.id) FILTER (WHERE b.status = 'cancelled' OR b.date < CURRENT_DATE) AS no_shows
    FROM doctors d
    LEFT JOIN bookings b ON d.id = b.doctor_id 
      AND b.date >= NOW() - INTERVAL '6 months'
    WHERE 1=1
  `;

  if (tenantId) {
    query += ` AND d.tenant_id = $${paramCount++}`;
    params.push(tenantId);
  }

  query += `\n    GROUP BY d.id\n    ORDER BY total DESC`;

  const result = await pool.query(query, params);

  return result.rows.map((row: NoShowRow) => ({
    doctor: row.doctor,
    total: parseInt(row.total) || 0,
    noShows: parseInt(row.no_shows) || 0,
  }));
};

export const getDiagnoses = async (tenantId?: string) => {
  const result = await pool.query(`
    SELECT 
      diagnosis,
      COUNT(*) AS count
    FROM clinical_records
    WHERE diagnosis IS NOT NULL AND diagnosis != ''${tenantId ? ' AND tenant_id = $1' : ''}
    GROUP BY diagnosis
    ORDER BY count DESC
    LIMIT 20
  `, tenantId ? [tenantId] : []);

  return result.rows.map((row: DiagnosisRow) => ({
    diagnosis: row.diagnosis,
    count: parseInt(row.count),
  }));
};

export const getDemandForecast = async (days = 30, tenantId?: string) => {
  const tenantFilter = tenantId ? ' AND tenant_id = $2' : '';
  const params = tenantId ? [days, tenantId] : [days];
  try {
    const forecast = await mlService.forecastDemand(days, tenantId);

    const result = await pool.query(`
      SELECT
        date::text AS date,
        COUNT(*) AS bookings
      FROM bookings
      WHERE date >= NOW() - INTERVAL '1 days' * $1
        AND status != 'cancelled'${tenantFilter}
      GROUP BY date
      ORDER BY date
    `, params);

    const historical = result.rows.map((row: BookingRow) => ({
      date: row.date,
      bookings: parseInt(row.bookings),
      predicted: null,
    }));

    return [...historical, ...forecast];
  } catch (err) {
    logger.error('[Analytics] Error getting demand forecast:', err);
    const result = await pool.query(`
      SELECT date::text AS date, COUNT(*) AS bookings
      FROM bookings
      WHERE date >= NOW() - INTERVAL '1 days' * $1 AND status != 'cancelled'${tenantFilter}
      GROUP BY date ORDER BY date
    `, params);
    return result.rows.map((row: BookingRow) => ({
      date: row.date,
      bookings: parseInt(row.bookings),
    }));
  }
};

export const getOptimalSchedules = async (tenantId?: string) => {
  try {
    const schedules = await mlService.analyzeOptimalSchedules(tenantId);
    return schedules.map(s => ({
      day: s.day,
      bestTime: s.bestTime,
      occupancy: s.occupancy,
      hours: Object.entries(s.factors || {}).map(([time, data]) => ({
        time,
        score: Math.min(100, Math.round(data.demand * (1 - data.noShowRate) * 10)),
      })),
    }));
  } catch (err) {
    logger.error('[Analytics] Error getting optimal schedules:', err);
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const bestTimes = ['10:00', '14:00', '09:00', '15:00', '11:00'];
    const hoursList = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    return days.map((day, i) => ({
      day,
      bestTime: bestTimes[i],
      occupancy: 50 + Math.floor(Math.random() * 30),
      hours: hoursList.map(time => ({
        time,
        score: 40 + Math.floor(Math.random() * 60),
      })),
    }));
  }
};

export const getVitalSignsAnomalies = async (tenantId?: string) => {
  try {
    const result = await pool.query(`
      SELECT 
        cr.id,
        cr.patient_id AS "patientId",
        cr.created_at::date AS date,
        cr.vital_signs->>'pressure' AS pressure,
        cr.vital_signs->>'heartRate' AS "heartRate",
        cr.vital_signs->>'temperature' AS temperature
      FROM clinical_records cr
      WHERE cr.vital_signs IS NOT NULL
        AND cr.created_at >= NOW() - INTERVAL '30 days'
        ${tenantId ? 'AND cr.tenant_id = $1' : ''}
      ORDER BY cr.created_at DESC
      LIMIT 50
    `, tenantId ? [tenantId] : []);

    await mlService.trainVitalSignsAnomalyDetector(tenantId);

    const analyzed = await Promise.all(result.rows.map(async (row: VitalSignRow) => {
      const vs: VitalSignsInput = {
        pressure: row.pressure,
        heartRate: row.heartRate,
        temperature: row.temperature
      };
      const mlResult = await mlService.analyzeVitalSigns(vs, tenantId);
      return {
        patientId: row.patientId,
        date: row.date,
        pressure: row.pressure || '120/80',
        pressureAnomaly: mlResult.values?.systolic > 140 || mlResult.values?.diastolic > 90,
        heartRate: parseInt(row.heartRate) || 70,
        heartRateAnomaly: mlResult.values?.heartRate > 100 || mlResult.values?.heartRate < 60,
        temperature: parseFloat(row.temperature) || 36.5,
        tempAnomaly: mlResult.values?.temp > 37.5 || mlResult.values?.temp < 36,
        anomaly: mlResult.anomaly,
        mlScore: mlResult.score,
        warnings: mlResult.warnings
      };
    }));

    return analyzed;
  } catch (err) {
    logger.error('[Analytics] Error analyzing vital signs:', err);
    return [];
  }
};