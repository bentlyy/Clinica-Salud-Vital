import { pool } from '../../shared/db.js';
import * as doctorService from '../doctor/doctor.service.js';
import { sendEmail } from '../../shared/email.service.js';
import { bookingConfirmationTemplate } from './booking.email.js';

export const getAllBookings = async () => {
  const result = await pool.query(`
    SELECT 
      b.id,
      b.date,
      b.time,
      b.duration,
      d.id AS doctor_id,
      d.name AS doctor_name,
      d.specialty,
      u.id AS user_id,
      u.email AS user_email
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    JOIN users u ON b.user_id = u.id
    ORDER BY b.date, b.time
  `);

  return result.rows;
};

// 🔥 Fix: parse date parts directly to avoid timezone shift
const getDayOfWeek = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
};

export const createBooking = async ({ doctor_id, user_id, date, time, duration = 30 }) => {
  try {
    if (!doctor_id || !user_id || !date || !time) {
      throw new Error('Missing required fields');
    }

    const doctor = await doctorService.getDoctorById(doctor_id);
    if (!doctor) throw new Error('Doctor not found');

    // ✅ Fixed: use local date parsing to avoid UTC timezone shift
    const day = getDayOfWeek(date);

    const availability = await pool.query(
      `SELECT start_time, end_time 
       FROM doctor_availability
       WHERE doctor_id = $1 AND day_of_week = $2`,
      [doctor_id, day]
    );

    if (availability.rows.length === 0) {
      throw new Error('Doctor not available on this day');
    }

    const start = new Date(`1970-01-01T${time}`);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);

    const isInsideAnyBlock = availability.rows.some(a => {
      const startLimit = new Date(`1970-01-01T${a.start_time}`);
      const endLimit = new Date(`1970-01-01T${a.end_time}`);
      return start >= startLimit && end <= endLimit;
    });

    if (!isInsideAnyBlock) {
      throw new Error('Outside doctor availability');
    }

    const exceptions = await pool.query(
      `SELECT * FROM doctor_exceptions
       WHERE doctor_id = $1 AND date = $2`,
      [doctor_id, date]
    );

    for (const ex of exceptions.rows) {
      if (ex.is_full_day) {
        throw new Error('Doctor not available (full day blocked)');
      }

      if (ex.start_time && ex.end_time) {
        const exStart = new Date(`1970-01-01T${ex.start_time}`);
        const exEnd = new Date(`1970-01-01T${ex.end_time}`);

        if (start < exEnd && end > exStart) {
          throw new Error('Time blocked by doctor');
        }
      }
    }

    const overlap = await pool.query(
      `SELECT 1 FROM bookings
       WHERE doctor_id = $1
       AND date = $2
       AND (
         (time <= $3 AND (time + (duration || ' minutes')::interval) > $3)
         OR
         ($3 <= time AND ($3::time + ($4 || ' minutes')::interval) > time)
       )`,
      [doctor_id, date, time, duration]
    );

    if (overlap.rows.length > 0) {
      throw new Error('Time slot overlaps with another booking');
    }

    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const userEmail = userResult.rows[0].email;

    const result = await pool.query(
      `INSERT INTO bookings (doctor_id, user_id, date, time, duration)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [doctor_id, user_id, date, time, duration]
    );

    const booking = result.rows[0];

    sendEmail({
      to: userEmail,
      subject: 'Confirmación de reserva',
      html: bookingConfirmationTemplate({
        doctor: doctor.name,
        date,
        time
      })
    }).catch(err => console.error('Email error:', err));

    return booking;

  } catch (error) {
    if (error.code === '23505') {
      throw new Error('This time slot is already booked');
    }
    if (error.code === '23503') {
      throw new Error('Invalid doctor or user');
    }
    throw error.message ? error : new Error('Database error');
  }
};

export const getBookingsByUser = async (user_id) => {
  const result = await pool.query(`
    SELECT 
      b.id,
      b.date,
      b.time,
      b.duration,
      d.name AS doctor_name,
      d.specialty
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    WHERE b.user_id = $1
    ORDER BY b.date, b.time
  `, [user_id]);

  return result.rows;
};

export const deleteBooking = async (booking_id, user_id) => {
  const result = await pool.query(
    `DELETE FROM bookings 
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [booking_id, user_id]
  );

  if (result.rows.length === 0) {
    throw new Error('Booking not found or unauthorized');
  }

  return { message: 'Booking cancelled successfully' };
};

export const getAvailableSlots = async (doctor_id, date) => {
  if (!doctor_id || !date) {
    throw new Error('doctor_id and date are required');
  }

  // ✅ Fixed: use local date parsing to avoid UTC timezone shift
  const day = getDayOfWeek(date);

  const availabilityResult = await pool.query(
    `SELECT start_time, end_time
     FROM doctor_availability
     WHERE doctor_id = $1 AND day_of_week = $2
     ORDER BY start_time`,
    [doctor_id, day]
  );

  if (availabilityResult.rows.length === 0) return [];

  const doctorResult = await pool.query(
    `SELECT slot_duration FROM doctors WHERE id = $1`,
    [doctor_id]
  );

  const duration = doctorResult.rows[0]?.slot_duration || 30;

  const addMinutes = (time, mins) => {
    const d = new Date(`1970-01-01T${time}`);
    d.setMinutes(d.getMinutes() + mins);
    return d.toTimeString().slice(0, 5);
  };

  let slots = [];

  for (const block of availabilityResult.rows) {
    let current = block.start_time.slice(0, 5); // normalize HH:MM

    while (true) {
      const next = addMinutes(current, duration);
      if (next > block.end_time.slice(0, 5)) break;

      slots.push(current);
      current = next;
    }
  }

  const booked = await pool.query(
    `SELECT time, duration FROM bookings
     WHERE doctor_id = $1 AND date = $2`,
    [doctor_id, date]
  );

  const exceptions = await pool.query(
    `SELECT * FROM doctor_exceptions
     WHERE doctor_id = $1 AND date = $2`,
    [doctor_id, date]
  );

  return slots.filter(slot => {
    const slotStart = new Date(`1970-01-01T${slot}`);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + duration);

    for (const ex of exceptions.rows) {
      if (ex.is_full_day) return false;

      if (ex.start_time && ex.end_time) {
        const exStart = new Date(`1970-01-01T${ex.start_time}`);
        const exEnd = new Date(`1970-01-01T${ex.end_time}`);

        if (slotStart < exEnd && slotEnd > exStart) {
          return false;
        }
      }
    }

    for (const b of booked.rows) {
      const bStart = new Date(`1970-01-01T${b.time}`);
      const bEnd = new Date(bStart);
      bEnd.setMinutes(bEnd.getMinutes() + b.duration);

      if (slotStart < bEnd && slotEnd > bStart) {
        return false;
      }
    }

    return true;
  });
};

export const getBookingsByDoctor = async (doctor_id) => {
  const result = await pool.query(`
    SELECT 
      b.id,
      b.date,
      b.time,
      b.duration,
      u.email AS patient_email
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    WHERE b.doctor_id = $1
    ORDER BY b.date, b.time
  `, [doctor_id]);

  return result.rows;
};