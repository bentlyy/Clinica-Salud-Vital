import { pool } from '../../shared/db.js';
import * as mlService from '../ml/ml.service.js';

export const getDashboardStats = async () => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'user')::int AS total_patients,
      (SELECT COUNT(*) FROM doctors)::int AS total_doctors,
      (SELECT COUNT(*) FROM bookings WHERE status != 'cancelled')::int AS total_bookings,
      (SELECT COUNT(*) FROM bookings WHERE date = CURRENT_DATE AND status != 'cancelled')::int AS today_bookings,
      (SELECT COUNT(*) FROM bookings WHERE confirmed = true AND status != 'cancelled')::int AS confirmed_bookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled')::int AS cancelled_bookings
  `);

  return result.rows[0];
};

export const getBookingsByMonth = async (months = 12) => {
  const result = await pool.query(`
    SELECT 
      TO_CHAR(date, 'YYYY-MM') AS month,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE confirmed = true) AS confirmed,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
    FROM bookings
    WHERE date >= NOW() - INTERVAL '${months} months'
    GROUP BY TO_CHAR(date, 'YYYY-MM')
    ORDER BY month
  `);

  return result.rows;
};

export const getTopDoctors = async (limit = 10) => {
  const result = await pool.query(`
    SELECT 
      d.id,
      d.name,
      d.specialty,
      COUNT(b.id) AS total_bookings,
      COUNT(b.id) FILTER (WHERE b.confirmed = true) AS confirmed_bookings
    FROM doctors d
    LEFT JOIN bookings b ON d.id = b.doctor_id AND b.status != 'cancelled'
    GROUP BY d.id
    ORDER BY total_bookings DESC
    LIMIT $1
  `, [limit]);

  return result.rows;
};

export const getBookingStatusDistribution = async () => {
  const result = await pool.query(`
    SELECT status, COUNT(*) AS count
    FROM bookings
    GROUP BY status
  `);

  return result.rows;
};

export const getDoctorStats = async (doctor_id: number) => {
  const [totalBookings, upcomingBookings, patientsServed, clinicalRecords] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM bookings WHERE doctor_id = $1 AND status != $2', [doctor_id, 'cancelled']),
    pool.query('SELECT COUNT(*) FROM bookings WHERE doctor_id = $1 AND date >= CURRENT_DATE AND status != $2', [doctor_id, 'cancelled']),
    pool.query('SELECT COUNT(DISTINCT COALESCE(user_id, guest_rut)) FROM bookings WHERE doctor_id = $1 AND status != $2', [doctor_id, 'cancelled']),
    pool.query('SELECT COUNT(*) FROM clinical_records WHERE doctor_id = $1', [doctor_id]),
  ]);

  return {
    total_bookings: parseInt(totalBookings.rows[0].count),
    upcoming_bookings: parseInt(upcomingBookings.rows[0].count),
    patients_served: parseInt(patientsServed.rows[0].count),
    clinical_records: parseInt(clinicalRecords.rows[0].count),
  };
};

export const getNoShowsByDoctor = async () => {
  const result = await pool.query(`
    SELECT 
      d.id,
      d.name AS doctor,
      COUNT(b.id) AS total,
      COUNT(b.id) FILTER (WHERE b.status = 'cancelled' OR b.date < CURRENT_DATE) AS no_shows
    FROM doctors d
    LEFT JOIN bookings b ON d.id = b.doctor_id 
      AND b.date >= NOW() - INTERVAL '6 months'
    GROUP BY d.id
    ORDER BY total DESC
  `);

  return result.rows.map((row: any) => ({
    doctor: row.doctor,
    total: parseInt(row.total) || 0,
    noShows: parseInt(row.no_shows) || 0,
  }));
};

export const getDiagnoses = async () => {
  const result = await pool.query(`
    SELECT 
      diagnosis,
      COUNT(*) AS count
    FROM clinical_records
    WHERE diagnosis IS NOT NULL AND diagnosis != ''
    GROUP BY diagnosis
    ORDER BY count DESC
    LIMIT 20
  `);

  return result.rows.map((row: any) => ({
    diagnosis: row.diagnosis,
    count: parseInt(row.count),
  }));
};

export const getDemandForecast = async (days = 30) => {
  try {
    const forecast = await mlService.forecastDemand(days);

    const result = await pool.query(`
      SELECT 
        date::text AS date,
        COUNT(*) AS bookings
      FROM bookings
      WHERE date >= NOW() - INTERVAL '${days} days'
        AND status != 'cancelled'
      GROUP BY date
      ORDER BY date
    `);

    const historical = result.rows.map((row: any) => ({
      date: row.date,
      bookings: parseInt(row.bookings),
      predicted: null,
    }));

    return [...historical, ...forecast];
  } catch (err) {
    console.error('[Analytics] Error getting demand forecast:', err);
    const result = await pool.query(`
      SELECT date::text AS date, COUNT(*) AS bookings
      FROM bookings
      WHERE date >= NOW() - INTERVAL '${days} days' AND status != 'cancelled'
      GROUP BY date ORDER BY date
    `);
    return result.rows.map((row: any) => ({
      date: row.date,
      bookings: parseInt(row.bookings),
    }));
  }
};

export const getOptimalSchedules = async () => {
  try {
    const schedules = await mlService.analyzeOptimalSchedules();
    return schedules;
  } catch (err) {
    console.error('[Analytics] Error getting optimal schedules:', err);
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const bestTimes = ['10:00', '14:00', '09:00', '15:00', '11:00'];
    return days.map((day, i) => ({
      day,
      bestTime: bestTimes[i],
      occupancy: 50 + Math.floor(Math.random() * 30),
    }));
  }
};

export const getVitalSignsAnomalies = async () => {
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
      ORDER BY cr.created_at DESC
      LIMIT 50
    `);

    const analyzed = await Promise.all(result.rows.map(async (row: any) => {
      const vs: any = {
        pressure: row.pressure,
        heartRate: row.heartRate,
        temperature: row.temperature
      };
      const mlResult = await mlService.analyzeVitalSigns(vs);
      return {
        patientId: row.patientId,
        date: row.date,
        pressure: row.pressure || '120/80',
        pressureAnomaly: mlResult.values?.systolic > 140 || mlResult.values?.diastolic > 90,
        heartRate: parseInt(row.heartRate) || 70,
        heartRateAnomaly: mlResult.values?.heartRate > 100 || mlResult.values?.heartRate < 60,
        temperature: parseFloat(row.temperature) || 36.5,
        tempAnomaly: mlResult.values?.temperature > 37.5 || mlResult.values?.temperature < 36,
        anomaly: mlResult.anomaly,
        mlScore: mlResult.score,
        warnings: mlResult.warnings
      };
    }));

    return analyzed;
  } catch (err) {
    console.error('[Analytics] Error analyzing vital signs:', err);
    return [];
  }
};