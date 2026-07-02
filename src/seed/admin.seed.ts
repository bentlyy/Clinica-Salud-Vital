import { pool } from '../shared/db.js';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger.js';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default';

export const seedDefaultTenant = async (): Promise<void> => {
  const exists = await pool.query('SELECT 1 FROM tenants WHERE id = $1', [DEFAULT_TENANT_ID]);
  if (exists.rows.length > 0) {
    logger.info('Default tenant already exists');
  } else {
    await pool.query(
      `INSERT INTO tenants (id, name, domain, locale, timezone, config, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (id) DO NOTHING`,
      [
        DEFAULT_TENANT_ID,
        'Default Clinic',
        'default',
        process.env.APP_LOCALE || 'es',
        'America/Santiago',
        JSON.stringify({ company: 'Mi Clínica', contact_email: 'admin@clinic.com' }),
      ]
    );

    await pool.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
       SELECT $1, id, 'active', NOW(), NOW() + INTERVAL '1 year'
       FROM plans WHERE code = 'enterprise'
       ON CONFLICT DO NOTHING`,
      [DEFAULT_TENANT_ID]
    );

    logger.info(`Default tenant created: ${DEFAULT_TENANT_ID}`);
  }

  /* Siempre actualizar usuarios legacy con tenant_id NULL */
  const nullTenantResult = await pool.query(
    'UPDATE users SET tenant_id = $1 WHERE tenant_id IS NULL',
    [DEFAULT_TENANT_ID]
  );
  if (nullTenantResult.rowCount && nullTenantResult.rowCount > 0) {
    logger.info(`Usuarios legacy actualizados con tenant_id: ${nullTenantResult.rowCount}`);
  }
};

export const seedSuperAdmin = async (): Promise<void> => {
  const exists = await pool.query('SELECT 1 FROM users WHERE role = $1 LIMIT 1', ['superadmin']);
  if (exists.rows.length > 0) {
    logger.info('Superadmin already exists');
    return;
  }

  const password = process.env.SUPERADMIN_PASSWORD || 'REPLACED_PASSWORD';
  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    'INSERT INTO users (email, password, name, role, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, email) DO NOTHING',
    [process.env.SUPERADMIN_EMAIL || 'superadmin@clinic.com', hash, 'Super Admin', 'superadmin', DEFAULT_TENANT_ID]
  );

  logger.info('Superadmin created');
};

const TEST_TENANTS = [
  {
    id: 'clinica-norte',
    name: 'Clínica del Norte',
    domain: 'norte',
    adminEmail: 'admin@norte.clinic.com',
    adminRut: '11111111-1',
  },
  {
    id: 'clinica-sur',
    name: 'Clínica del Sur',
    domain: 'sur',
    adminEmail: 'admin@sur.clinic.com',
    adminRut: '22222222-2',
  },
];

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

export const seedTestTenants = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    logger.info('[SEED SKIPPED] No se ejecutan tenants de prueba en producción');
    return;
  }

  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email ON users (tenant_id, email)`);
  const hash = await bcrypt.hash(process.env.SEED_PASSWORD || 'REPLACED_PASSWORD', 12);

  const today = new Date();

  for (const t of TEST_TENANTS) {
    const exists = await pool.query('SELECT 1 FROM tenants WHERE id = $1', [t.id]);
    if (exists.rows.length > 0) {
      logger.info(`Tenant ${t.id} already exists — ensuring data seed`);
    }

    await pool.query(
      `INSERT INTO tenants (id, name, domain, locale, timezone, config, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (id) DO NOTHING`,
      [
        t.id,
        t.name,
        t.domain,
        process.env.APP_LOCALE || 'es',
        'America/Santiago',
        JSON.stringify({ company: t.name, contact_email: t.adminEmail }),
      ]
    );

    await pool.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
       SELECT $1, id, 'active', NOW(), NOW() + INTERVAL '1 year'
       FROM plans WHERE code = 'pro'
       ON CONFLICT DO NOTHING`,
      [t.id]
    );

    await pool.query(
      'INSERT INTO users (email, password, name, role, rut, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name',
      [t.adminEmail, hash, t.name, 'admin', t.adminRut, t.id]
    );

    const docRuts = [
      { name: `Dr. ${t.name} Cardiología`, email: `cardio@${t.domain}.clinic.com`, rut: `${t.domain === 'norte' ? '333' : '444'}33333-3`, specialty: 'Cardiología' },
      { name: `Dr. ${t.name} Pediatría`, email: `pediatria@${t.domain}.clinic.com`, rut: `${t.domain === 'norte' ? '555' : '666'}44444-4`, specialty: 'Pediatría' },
    ];

    const doctorIds: number[] = [];

    for (const doc of docRuts) {
      const userResult = await pool.query(
        'INSERT INTO users (email, password, name, role, rut, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [doc.email, hash, doc.name, 'doctor', doc.rut, t.id]
      );
      const userId = userResult.rows[0].id;

      const doctorResult = await pool.query(
        'INSERT INTO doctors (name, specialty, email, user_id, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [doc.name, doc.specialty, doc.email, userId, t.id]
      );
      const doctorId = doctorResult.rows[0].id;
      doctorIds.push(doctorId);

      for (let day = 1; day <= 5; day++) {
        await pool.query(
          'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
          [doctorId, day, '09:00', '13:00', t.id]
        );
        await pool.query(
          'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
          [doctorId, day, '14:00', '18:00', t.id]
        );
      }
    }

    // ===== PACIENTES =====
    const patientNames = [
      'Pedro Navarro', 'Sofía Rivas', 'Mateo Delgado', 'Valentina Castro', 'Santiago Peña',
    ];
    const patientIds: number[] = [];

    for (const pName of patientNames) {
      const email = `${pName.toLowerCase().replace(/\s+/g, '.')}@${t.domain}.clinic.com`;
      const result = await pool.query(
        'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO NOTHING RETURNING id',
        [email, hash, pName, 'user', `${randomInt(10000000, 99999999)}-${pick(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'])}`, `+569${randomInt(10000000, 99999999)}`, t.id]
      );
      if (result.rows.length > 0) patientIds.push(result.rows[0].id);
    }

    // ===== USUARIO COMPARTIDO (mismo email en ambas clínicas) =====
    for (const domain of ['norte', 'sur']) {
      await pool.query(
        'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO NOTHING',
        ['compartido@clinic.com', hash, 'Usuario Compartido', 'user', `${randomInt(10000000, 99999999)}-${pick(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'])}`, `+569${randomInt(10000000, 99999999)}`, domain === 'norte' ? 'clinica-norte' : 'clinica-sur']
      );
    }

    // ===== RESERVAS (pasadas) =====
    const bookingCheck = await pool.query('SELECT COUNT(*) FROM bookings WHERE tenant_id = $1', [t.id]);
    if (parseInt(bookingCheck.rows[0].count, 10) === 0 && patientIds.length > 0 && doctorIds.length > 0) {
      await pool.query('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_future_date');
      for (let i = 0; i < 15; i++) {
        const doctorId = pick(doctorIds);
        const patientId = pick(patientIds);
        const daysAgo = randomInt(1, 90);
        const date = addDays(today, -daysAgo);
        const hour = randomInt(9, 16);
        const time = `${String(hour).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`;
        const status = daysAgo <= 1 ? pick(['pending', 'confirmed']) : pick(['completed', 'completed', 'no_show', 'cancelled']);
        try {
          await pool.query(
            `INSERT INTO bookings (doctor_id, user_id, date, time, duration, status, confirmed, tenant_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [doctorId, patientId, formatDate(date), time, 30, status, status === 'confirmed' || status === 'completed', t.id, date]
          );
        } catch {}
      }
      // Reservas futuras
      for (let i = 0; i < 5; i++) {
        const doctorId = pick(doctorIds);
        const patientId = pick(patientIds);
        const daysFromNow = randomInt(1, 30);
        const date = addDays(today, daysFromNow);
        const hour = randomInt(9, 16);
        const time = `${String(hour).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`;
        const confirmed = Math.random() > 0.3;
        try {
          await pool.query(
            `INSERT INTO bookings (doctor_id, user_id, date, time, duration, status, confirmed, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [doctorId, patientId, formatDate(date), time, 30, confirmed ? 'confirmed' : 'pending', confirmed, t.id]
          );
        } catch {}
      }
      await pool.query('ALTER TABLE bookings ADD CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE) NOT VALID');
    }

    // ===== CLINICAL RECORDS =====
    const crCheck = await pool.query('SELECT COUNT(*) FROM clinical_records WHERE tenant_id = $1', [t.id]);
    if (parseInt(crCheck.rows[0].count, 10) === 0) {
      const completedBookings = await pool.query(
        'SELECT id, doctor_id, user_id FROM bookings WHERE tenant_id = $1 AND status = \'completed\' LIMIT 8',
        [t.id]
      );
      for (const b of completedBookings.rows) {
        try {
          await pool.query(
            `INSERT INTO clinical_records (patient_id, doctor_id, booking_id, chief_complaint, anamnesis, diagnosis, treatment_plan, status, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8)`,
            [b.user_id, b.doctor_id, b.id, 'Consulta de control', 'Paciente acude a control programado', 'Control de rutina, sin hallazgos patológicos', 'Continuar tratamiento indicado. Próximo control en 3 meses.', t.id]
          );
        } catch {}
      }
    }

    // ===== FACTURAS DE SUSCRIPCIÓN (para revenue chart) =====
    const invCheck = await pool.query('SELECT COUNT(*) FROM subscription_invoices WHERE tenant_id = $1', [t.id]);
    if (parseInt(invCheck.rows[0].count, 10) === 0) {
      const subResult = await pool.query('SELECT id FROM subscriptions WHERE tenant_id = $1 LIMIT 1', [t.id]);
      if (subResult.rows.length > 0) {
        const subId = subResult.rows[0].id;
        for (let m = 1; m <= 6; m++) {
          const paidAt = addDays(today, -(m * 30));
          const periodStart = addDays(paidAt, -30);
          try {
            await pool.query(
              `INSERT INTO subscription_invoices (tenant_id, subscription_id, amount, currency, status, period_start, period_end, paid_at)
               VALUES ($1, $2, $3, 'USD', 'paid', $4, $5, $6)`,
              [t.id, subId, t.id === 'clinica-norte' ? 79 : 79, addDays(paidAt, -1), paidAt, paidAt]
            );
          } catch {}
        }
      }
    }

    logger.info(`Tenant ${t.id} (${t.name}) — pacientes: ${patientIds.length}, doctores: ${doctorIds.length}`);
  }
};

export const spreadSeedDates = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') return;
  const affected = await pool.query(`
    WITH date_spread AS (
      SELECT id, tenant_id,
        NOW() - (random() * INTERVAL '180 days') AS new_date
      FROM users
      WHERE role NOT IN ('superadmin', 'admin')
        AND created_at > NOW() - INTERVAL '1 day'
    )
    UPDATE users u
    SET created_at = ds.new_date
    FROM date_spread ds
    WHERE u.id = ds.id
  `);
  logger.info(`Seed dates spread for ${affected.rowCount} users`);

  await pool.query('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_future_date');
  const bResult = await pool.query(`
    WITH date_spread AS (
      SELECT id,
        created_at - (random() * INTERVAL '60 days') AS new_date
      FROM bookings
      WHERE created_at > NOW() - INTERVAL '1 day'
    )
    UPDATE bookings b
    SET created_at = ds.new_date
    FROM date_spread ds
    WHERE b.id = ds.id
  `);
  await pool.query('ALTER TABLE bookings ADD CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE) NOT VALID');
  logger.info(`Seed dates spread for ${bResult.rowCount} bookings`);

  const crResult = await pool.query(`
    WITH date_spread AS (
      SELECT id,
        created_at - (random() * INTERVAL '90 days') AS new_date
      FROM clinical_records
      WHERE created_at > NOW() - INTERVAL '1 day'
    )
    UPDATE clinical_records cr
    SET created_at = ds.new_date
    FROM date_spread ds
    WHERE cr.id = ds.id
  `);
  logger.info(`Seed dates spread for ${crResult.rowCount} clinical records`);
};

export const seedAdmin = async (): Promise<void> => {
  const seedPassword = process.env.ADMIN_PASSWORD || process.env.SEED_PASSWORD || 'REPLACED_PASSWORD';

  const exists = await pool.query('SELECT 1 FROM users WHERE role = $1 LIMIT 1', ['admin']);
  if (exists.rows.length > 0) {
    logger.info('Seed ya ejecutado');
    return;
  }

  const hash = await bcrypt.hash(seedPassword, 12);

  await pool.query(
    'INSERT INTO users (email, password, role, rut, tenant_id) VALUES ($1, $2, $3, $4, $5)',
    ['admin@clinic.com', hash, 'admin', '20287886-5', DEFAULT_TENANT_ID]
  );

  const doctorsData = [
    { name: 'Dr. Juan Perez',   specialty: 'Cardiologia',  email: 'juan@clinic.com',   rut: '11222333-9' },
    { name: 'Dra. Maria Lopez', specialty: 'Dermatologia', email: 'maria@clinic.com',  rut: '12333444-2' },
    { name: 'Dr. Carlos Soto',  specialty: 'Neurologia',   email: 'carlos@clinic.com', rut: '13444555-6' },
    { name: 'Dra. Ana Torres',  specialty: 'Pediatria',    email: 'ana@clinic.com',    rut: '14555666-K' },
  ];

  for (const doc of doctorsData) {
    const userResult = await pool.query(
      'INSERT INTO users (email, password, role, rut, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [doc.email, hash, 'doctor', doc.rut, DEFAULT_TENANT_ID]
    );
    const userId = userResult.rows[0].id;

    const doctorResult = await pool.query(
      'INSERT INTO doctors (name, specialty, email, user_id, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [doc.name, doc.specialty, doc.email, userId, DEFAULT_TENANT_ID]
    );
    const doctorId = doctorResult.rows[0].id;

    for (let day = 1; day <= 5; day++) {
      await pool.query(
        'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id) VALUES ($1, $2, $3, $4, $5)',
        [doctorId, day, '09:00', '17:00', DEFAULT_TENANT_ID]
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
      'INSERT INTO users (email, password, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [u.email, hash, 'patient', u.rut, u.phone, DEFAULT_TENANT_ID]
    );
  }

  logger.info('Seed completo: admin, doctores (con disponibilidad) y pacientes creados');
};
