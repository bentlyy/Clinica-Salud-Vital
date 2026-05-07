import { pool } from '../shared/db.js';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger.js';

export const seedAdmin = async (): Promise<void> => {
  const exists = await pool.query('SELECT 1 FROM users WHERE role = $1 LIMIT 1', ['admin']);
  if (exists.rows.length > 0) {
    logger.info('Seed ya ejecutado');
    return;
  }

  const hash = await bcrypt.hash('REPLACED_PASSWORD', 12);

  await pool.query(
    'INSERT INTO users (email, password, role, rut) VALUES ($1, $2, $3, $4)',
    ['admin@clinic.com', hash, 'admin', '20287886-5']
  );

  const doctorsData = [
    { name: 'Dr. Juan Perez',   specialty: 'Cardiologia',  email: 'juan@clinic.com',   rut: '11222333-9' },
    { name: 'Dra. Maria Lopez', specialty: 'Dermatologia', email: 'maria@clinic.com',  rut: '12333444-2' },
    { name: 'Dr. Carlos Soto',  specialty: 'Neurologia',   email: 'carlos@clinic.com', rut: '13444555-6' },
    { name: 'Dra. Ana Torres',  specialty: 'Pediatria',    email: 'ana@clinic.com',    rut: '14555666-K' },
  ];

  for (const doc of doctorsData) {
    const userResult = await pool.query(
      'INSERT INTO users (email, password, role, rut) VALUES ($1, $2, $3, $4) RETURNING id',
      [doc.email, hash, 'doctor', doc.rut]
    );
    const userId = userResult.rows[0].id;

    const doctorResult = await pool.query(
      'INSERT INTO doctors (name, specialty, email, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [doc.name, doc.specialty, doc.email, userId]
    );
    const doctorId = doctorResult.rows[0].id;

    for (let day = 1; day <= 5; day++) {
      await pool.query(
        'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [doctorId, day, '09:00', '17:00']
      );
    }
  }

  const usersData = [
    { email: 'user1@clinic.com', rut: '15666777-3', phone: '+56911111111' },
    { email: 'user2@clinic.com', rut: '16777888-7', phone: '+56922222222' },
    { email: 'user3@clinic.com', rut: '17888999-0', phone: '+56933333333' },
  ];

  for (const u of usersData) {
    await pool.query(
      'INSERT INTO users (email, password, role, rut, phone) VALUES ($1, $2, $3, $4, $5)',
      [u.email, hash, 'user', u.rut, u.phone]
    );
  }

  logger.info('Seed completo: admin, doctores (con disponibilidad) y pacientes creados');
};
