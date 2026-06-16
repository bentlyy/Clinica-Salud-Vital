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

export const seedTestTenants = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    logger.info('[SEED SKIPPED] No se ejecutan tenants de prueba en producción');
    return;
  }

  const hash = await bcrypt.hash(process.env.SEED_PASSWORD || 'REPLACED_PASSWORD', 12);

  for (const t of TEST_TENANTS) {
    const exists = await pool.query('SELECT 1 FROM tenants WHERE id = $1', [t.id]);
    if (exists.rows.length > 0) {
      logger.info(`Tenant ${t.id} already exists`);
      continue;
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

    for (const doc of docRuts) {
      const userResult = await pool.query(
        'INSERT INTO users (email, password, name, role, rut, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [doc.email, hash, doc.name, 'doctor', doc.rut, t.id]
      );
      const userId = userResult.rows[0].id;

      const doctorResult = await pool.query(
        'INSERT INTO doctors (name, specialty, email, user_id, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [doc.name, doc.specialty, doc.email, userId, t.id]
      );
      const doctorId = doctorResult.rows[0].id;

      for (let day = 1; day <= 5; day++) {
        await pool.query(
          'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id) VALUES ($1, $2, $3, $4, $5)',
          [doctorId, day, '09:00', '13:00', t.id]
        );
        await pool.query(
          'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id) VALUES ($1, $2, $3, $4, $5)',
          [doctorId, day, '14:00', '18:00', t.id]
        );
      }
    }

    logger.info(`Test tenant created: ${t.id} (${t.name})`);
  }
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
      [u.email, hash, 'user', u.rut, u.phone, DEFAULT_TENANT_ID]
    );
  }

  logger.info('Seed completo: admin, doctores (con disponibilidad) y pacientes creados');
};
