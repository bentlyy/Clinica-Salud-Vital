import { pool } from '../shared/db.js';
import bcrypt from 'bcrypt';

export const seedAdmin = async () => {
  const exists = await pool.query('SELECT 1 FROM users WHERE role = $1 LIMIT 1', ['admin']);
  if (exists.rows.length > 0) {
    console.log('⚠️ Seed ya ejecutado');
    return;
  }

  // ✅ Rounds bumped to 12 to match auth.service.js
  // WARNING: these are dev-only passwords — never use in production
  const hash = await bcrypt.hash('REPLACED_PASSWORD', 12);

  // 1. ADMIN
  await pool.query(
    `INSERT INTO users (email, password, role) VALUES ($1, $2, $3)`,
    ['admin@clinic.com', hash, 'admin']
  );

  // 2. DOCTORES con disponibilidad (Lunes–Viernes 09:00–17:00)
  const doctorsData = [
    { name: 'Dr. Juan Pérez',   specialty: 'Cardiología',  email: 'juan@clinic.com'   },
    { name: 'Dra. María López', specialty: 'Dermatología', email: 'maria@clinic.com'  },
    { name: 'Dr. Carlos Soto',  specialty: 'Neurología',   email: 'carlos@clinic.com' },
    { name: 'Dra. Ana Torres',  specialty: 'Pediatría',    email: 'ana@clinic.com'    },
  ];

  for (const doc of doctorsData) {
    const userResult = await pool.query(
      `INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id`,
      [doc.email, hash, 'doctor']
    );
    const userId = userResult.rows[0].id;

    const doctorResult = await pool.query(
      `INSERT INTO doctors (name, specialty, email, user_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [doc.name, doc.specialty, doc.email, userId]
    );
    const doctorId = doctorResult.rows[0].id;

    // ✅ Create availability — this was missing in the original seed
    for (let day = 1; day <= 5; day++) {
      await pool.query(
        `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [doctorId, day, '09:00', '17:00']
      );
    }
  }

  // 3. PACIENTES
  for (const email of ['user1@clinic.com', 'user2@clinic.com', 'user3@clinic.com']) {
    await pool.query(
      `INSERT INTO users (email, password, role) VALUES ($1, $2, $3)`,
      [email, hash, 'user']
    );
  }

  console.log('✅ Seed completo: admin, doctores (con disponibilidad) y pacientes creados');
};