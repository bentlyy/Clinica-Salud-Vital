import { pool } from '../../shared/db.js';

export const getDashboardStats = async () => {
  const [totalPatients, totalDoctors, totalBookings, todayBookings, confirmedBookings, cancelledBookings] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']),
    pool.query('SELECT COUNT(*) FROM doctors'),
    pool.query('SELECT COUNT(*) FROM bookings WHERE status != $1', ['cancelled']),
    pool.query('SELECT COUNT(*) FROM bookings WHERE date = CURRENT_DATE AND status != $1', ['cancelled']),
    pool.query('SELECT COUNT(*) FROM bookings WHERE confirmed = true AND status != $1', ['cancelled']),
    pool.query('SELECT COUNT(*) FROM bookings WHERE status = $1', ['cancelled']),
  ]);

  return {
    total_patients: parseInt(totalPatients.rows[0].count),
    total_doctors: parseInt(totalDoctors.rows[0].count),
    total_bookings: parseInt(totalBookings.rows[0].count),
    today_bookings: parseInt(todayBookings.rows[0].count),
    confirmed_bookings: parseInt(confirmedBookings.rows[0].count),
    cancelled_bookings: parseInt(cancelledBookings.rows[0].count),
  };
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

export const getDoctorStats = async (doctor_id) => {
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
