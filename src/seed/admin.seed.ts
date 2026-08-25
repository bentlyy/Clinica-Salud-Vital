import { pool } from '../shared/db.js';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger.js';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Test data constants ────────────────────────────────────────────────────

const TEST_TENANTS = [
  {
    id: 'clinica-norte',
    name: 'Vitaria Norte',
    domain: 'norte',
    adminEmail: 'admin@norte.clinic.com',
    adminRut: '11111111-1',
    planCode: 'pro',
    labTechnicianEmail: 'lab@norte.clinic.com',
  },
  {
    id: 'clinica-sur',
    name: 'Vitaria Sur',
    domain: 'sur',
    adminEmail: 'admin@sur.clinic.com',
    adminRut: '22222222-2',
    planCode: 'basic',
    labTechnicianEmail: null as string | null,
  },
];

const vitalPresets: Record<string, () => Record<string, unknown>> = {
  hypertension: () => ({ blood_pressure: '148/94', heart_rate: 76, temperature: 36.5, respiratory_rate: 16, oxygen_saturation: 97, weight: 80, height: 170, bmi: 27.7 }),
  diabetes: () => ({ blood_pressure: '135/85', heart_rate: 82, temperature: 36.4, respiratory_rate: 17, oxygen_saturation: 98, weight: 75, height: 168, bmi: 26.5 }),
  normal: () => ({ blood_pressure: '120/80', heart_rate: 72, temperature: 36.6, respiratory_rate: 16, oxygen_saturation: 98, weight: 70, height: 170, bmi: 24.2 }),
  asthma: () => ({ blood_pressure: '125/80', heart_rate: 88, temperature: 36.8, respiratory_rate: 22, oxygen_saturation: 95, weight: 70, height: 175, bmi: 22.9 }),
  anxiety: () => ({ blood_pressure: '120/75', heart_rate: 95, temperature: 36.6, respiratory_rate: 20, oxygen_saturation: 99, weight: 65, height: 170, bmi: 22.5 }),
};

const diagnoses = [
  { diagnosis: 'Hipertensión arterial esencial', cie10: 'I10', vitalKey: 'hypertension' },
  { diagnosis: 'Diabetes mellitus tipo 2', cie10: 'E11', vitalKey: 'diabetes' },
  { diagnosis: 'Asma bronquial', cie10: 'J45', vitalKey: 'asthma' },
  { diagnosis: 'Gastritis crónica', cie10: 'K29', vitalKey: 'normal' },
  { diagnosis: 'Lumbago crónico', cie10: 'M54.5', vitalKey: 'normal' },
  { diagnosis: 'Trastorno de ansiedad generalizada', cie10: 'F41', vitalKey: 'anxiety' },
  { diagnosis: 'Migraña con aura', cie10: 'G43', vitalKey: 'normal' },
  { diagnosis: 'Infección del tracto urinario', cie10: 'N39.0', vitalKey: 'normal' },
];

const chiefComplaintsByDiag: Record<string, string[]> = {
  'Hipertensión arterial esencial': ['Control de presión arterial', 'Cefalea occipital', 'Mareos frecuentes'],
  'Diabetes mellitus tipo 2': ['Control de glicemia', 'Visión borrosa', 'Polidipsia'],
  'Asma bronquial': ['Dificultad para respirar', 'Sibilancias nocturnas', 'Crisis de tos'],
  'Gastritis crónica': ['Dolor epigástrico', 'Ardor estomacal', 'Náuseas'],
  'Lumbago crónico': ['Dolor lumbar persistente', 'Lumbago agudo'],
  'Trastorno de ansiedad generalizada': ['Nerviosismo constante', 'Dificultad para dormir', 'Palpitaciones'],
  'Migraña con aura': ['Dolor de cabeza intenso', 'Migraña con visión borrosa'],
  'Infección del tracto urinario': ['Ardor al orinar', 'Orina frecuente', 'Dolor lumbar bajo'],
};

const medications = [
  { medication: 'Enalapril 10mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '30 días', instructions: 'Tomar con alimentos' },
  { medication: 'Metformina 850mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '30 días', instructions: 'Tomar con alimentos' },
  { medication: 'Salbutamol 100mcg', dosage: '2 inhalaciones', frequency: 'cada 8 horas si es necesario', duration: '10 días', instructions: 'Inhalar cuando presente síntomas' },
  { medication: 'Omeprazol 20mg', dosage: '1 cápsula', frequency: 'cada 24 horas', duration: '14 días', instructions: 'Tomar en ayunas' },
  { medication: 'Ibuprofeno 400mg', dosage: '1 comprimido', frequency: 'cada 8 horas', duration: '7 días', instructions: 'Tomar con alimentos' },
  { medication: 'Sertralina 50mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '30 días', instructions: 'Tomar en la mañana con desayuno' },
  { medication: 'Sumatriptán 50mg', dosage: '1 comprimido', frequency: 'cada 12 horas si es necesario', duration: '5 días', instructions: 'Tomar al inicio de la cefalea' },
  { medication: 'Ciprofloxacino 500mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '7 días', instructions: 'Tomar con abundante agua' },
];

const auditActions = [
  { action: 'user.login', resource_type: 'user', resource_id: 1 },
  { action: 'user.logout', resource_type: 'user', resource_id: 1 },
  { action: 'booking.created', resource_type: 'booking', resource_id: 1 },
  { action: 'booking.confirmed', resource_type: 'booking', resource_id: 1 },
  { action: 'booking.cancelled', resource_type: 'booking', resource_id: 1 },
  { action: 'clinical_record.created', resource_type: 'clinical_record', resource_id: 1 },
  { action: 'clinical_record.updated', resource_type: 'clinical_record', resource_id: 1 },
  { action: 'invoice.created', resource_type: 'invoice', resource_id: 1 },
  { action: 'invoice.paid', resource_type: 'invoice', resource_id: 1 },
  { action: 'lab_request.created', resource_type: 'lab_request', resource_id: 1 },
  { action: 'lab_request.completed', resource_type: 'lab_request', resource_id: 1 },
  { action: 'patient.created', resource_type: 'user', resource_id: 1 },
  { action: 'doctor.updated', resource_type: 'doctor', resource_id: 1 },
  { action: 'subscription.renewed', resource_type: 'subscription', resource_id: 1 },
  { action: 'settings.updated', resource_type: 'tenant', resource_id: 1 },
];

const medicalConditions = [
  { condition: 'Hipertensión arterial', status: 'chronic', notes: 'Diagnosticada en 2018, controlada con medicación' },
  { condition: 'Diabetes mellitus tipo 2', status: 'chronic', notes: 'En tratamiento con Metformina desde 2020' },
  { condition: 'Asma bronquial leve', status: 'chronic', notes: 'Control con Salbutamol a demanda' },
  { condition: 'Gastritis por H. pylori', status: 'resolved', notes: 'Eradicación completada en 2023' },
  { condition: 'Hipercolesterolemia', status: 'chronic', notes: 'Tratamiento con estatinas' },
  { condition: 'Ansiedad generalizada', status: 'active', notes: 'En tratamiento psiquiátrico' },
  { condition: 'Migraña crónica', status: 'chronic', notes: 'Profilaxis con sumatriptán' },
  { condition: 'ITU recurrente', status: 'chronic', notes: '3 episodios en el último año' },
  { condition: 'Lumbago degenerativo', status: 'chronic', notes: 'Fisioterapia y analgesia' },
  { condition: 'Reflujo gastroesofágico', status: 'active', notes: 'Tratamiento con Omeprazol' },
  { condition: 'Alergia a penicilina', status: 'family', notes: 'Antecedente familiar relevante' },
  { condition: 'Obesidad grado I', status: 'active', notes: 'IMC 30.2, plan de alimentación' },
];

// ─── Seed: Default tenant ───────────────────────────────────────────────────

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
        'Default Vitaria',
        'default',
        process.env.APP_LOCALE || 'es',
        'America/Santiago',
        JSON.stringify({ company: 'Vitaria', contact_email: 'admin@clinic.com' }),
      ]
    );

    await pool.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
       SELECT $1, id, 'active', NOW(), NOW() + INTERVAL '1 year'
       FROM plans WHERE code = 'pro'
       ON CONFLICT DO NOTHING`,
      [DEFAULT_TENANT_ID]
    );

    logger.info(`Default tenant created: ${DEFAULT_TENANT_ID}`);
  }

  const nullTenantResult = await pool.query(
    'UPDATE users SET tenant_id = $1 WHERE tenant_id IS NULL',
    [DEFAULT_TENANT_ID]
  );
  if (nullTenantResult.rowCount && nullTenantResult.rowCount > 0) {
    logger.info(`Usuarios legacy actualizados con tenant_id: ${nullTenantResult.rowCount}`);
  }
};

// ─── Seed: Super admin ──────────────────────────────────────────────────────

export const seedSuperAdmin = async (): Promise<void> => {
  const exists = await pool.query('SELECT 1 FROM users WHERE role = $1 LIMIT 1', ['superadmin']);
  if (exists.rows.length > 0) {
    await pool.query("UPDATE users SET tenant_id = NULL WHERE role = 'superadmin' AND tenant_id IS NOT NULL");
    logger.info('Superadmin already exists — ensured cross-clinic tenant_id=NULL');
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const password = process.env.SUPERADMIN_PASSWORD;
  const email = process.env.SUPERADMIN_EMAIL || 'superadmin@clinic.com';

  if (!password) {
    if (isProd) {
      logger.error('SUPERADMIN_PASSWORD is required in production. Aborting superadmin seed.');
      return;
    }
    logger.warn('SUPERADMIN_PASSWORD not set — using dev fallback. Set it in env for production.');
  }
  const effectivePassword = password || 'REPLACED_PASSWORD';
  if (isProd && !process.env.SUPERADMIN_EMAIL) {
    logger.warn('SUPERADMIN_EMAIL not set — using superadmin@clinic.com. Set it in env for production.');
  }

  const hash = await bcrypt.hash(effectivePassword, 12);

  await pool.query(
    'INSERT INTO users (email, password, name, role, tenant_id) VALUES ($1, $2, $3, $4, NULL) ON CONFLICT DO NOTHING',
    [email, hash, 'Super Admin', 'superadmin']
  );

  logger.info('Superadmin created with tenant_id=NULL (cross-clinic)', { email });
};

// ─── Seed: Admin (single clinic) ───────────────────────────────────

export const seedAdmin = async (): Promise<void> => {
  const exists = await pool.query('SELECT 1 FROM users WHERE role = $1 LIMIT 1', ['admin']);
  if (exists.rows.length > 0) {
    logger.info('Seed ya ejecutado');
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    if (isProd) {
      logger.error('ADMIN_PASSWORD is required in production. Aborting admin seed.');
      return;
    }
    logger.warn('ADMIN_PASSWORD not set — using dev fallback. Set it in env for production.');
  }
  const effectiveAdminPassword = adminPassword || 'REPLACED_PASSWORD';
  const hash = await bcrypt.hash(effectiveAdminPassword, 12);

  await pool.query(
    'INSERT INTO users (email, password, name, role, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, email) DO NOTHING RETURNING id',
    ['admin@clinic.com', hash, 'Admin Principal', 'admin', DEFAULT_TENANT_ID]
  );

  const TEST_DOCTORS = [
    { name: 'Dr. Andrés Medina', email: 'medina', rut: '33333333-3', specialty: 'Cardiología', gender: 'M' },
    { name: 'Dra. Carla Fuentes', email: 'fuentes', rut: '33344444-4', specialty: 'Dermatología', gender: 'F' },
    { name: 'Dr. Fernando Reyes', email: 'reyes', rut: '33355555-5', specialty: 'Medicina General', gender: 'M' },
    { name: 'Dra. Patricia Luna', email: 'luna', rut: '33366666-6', specialty: 'Pediatría', gender: 'F' },
  ];

  const doctorIds: number[] = [];
  for (const doc of TEST_DOCTORS) {
    const fullEmail = `${doc.email}@clinic.com`;
    const userResult = await pool.query(
      'INSERT INTO users (email, password, name, role, rut, gender, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [fullEmail, hash, doc.name, 'doctor', doc.rut, doc.gender, DEFAULT_TENANT_ID]
    );
    const userId: number = userResult.rows[0].id;

    const doctorResult = await pool.query(
      'INSERT INTO doctors (name, specialty, email, user_id, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [doc.name, doc.specialty, fullEmail, userId, DEFAULT_TENANT_ID]
    );
    const doctorId: number = doctorResult.rows[0].id;
    doctorIds.push(doctorId);

    for (let day = 1; day <= 5; day++) {
      await pool.query(
        'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [doctorId, day, '09:00', '13:00', DEFAULT_TENANT_ID]
      );
    }
  }

  const TEST_PATIENTS = [
    'Pedro Navarro', 'Sofía Rivas', 'Mateo Delgado', 'Valentina Castro', 'Santiago Peña',
    'Camila Herrera', 'Nicolás Bravo', 'Isidora Muñoz', 'Joaquín Vargas', 'Fernanda Cortés',
  ];
  for (const pName of TEST_PATIENTS) {
    const email = `${pName.toLowerCase().replace(/\s+/g, '.')}@clinic.com`;
    await pool.query(
      'INSERT INTO users (email, password, name, role, rut, phone, gender, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (tenant_id, email) DO NOTHING',
      [
        email, hash, pName, 'user',
        `${randomInt(10000000, 99999999)}-${pick(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'])}`,
        `+569${randomInt(10000000, 99999999)}`, pick(['M', 'F']), DEFAULT_TENANT_ID,
      ]
    );
  }

  if (process.env.DEFAULT_TENANT_ID === 'default') {
    const labTechResult = await pool.query(
      'INSERT INTO users (email, password, name, role, rut, gender, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name',
      ['lab@clinic.com', hash, 'Encargado de Laboratorio', 'lab_technician', `${randomInt(10000000, 99999999)}-K`, 'M', DEFAULT_TENANT_ID]
    );
    const labTechId = labTechResult.rows[0]?.id;

    const labAreaData = [
      { name: 'Hematología', code: 'HEM', description: 'Estudio de la sangre', icon: 'blood', color: '#ef4444', sort_order: 1 },
      { name: 'Bioquímica', code: 'BIO', description: 'Análisis químicos en sangre', icon: 'flask', color: '#f59e0b', sort_order: 2 },
    ];
    const labAreaIds: Record<string, number> = {};
    for (const area of labAreaData) {
      const areaResult = await pool.query(
        'INSERT INTO lab_areas (name, code, description, icon, color, sort_order, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING RETURNING id',
        [area.name, area.code, area.description, area.icon, area.color, area.sort_order, DEFAULT_TENANT_ID]
      );
      if (areaResult.rows.length > 0) labAreaIds[area.code] = areaResult.rows[0].id;
    }

    const labTestData = [
      { name: 'Hemograma completo', code: 'HEM001', areaCode: 'HEM', price: 25 },
      { name: 'Glucosa en ayunas', code: 'GLU001', areaCode: 'BIO', price: 15 },
    ];
    for (const test of labTestData) {
      const areaId = labAreaIds[test.areaCode];
      await pool.query(
        'INSERT INTO lab_tests (name, code, price, lab_area_id, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, code) DO NOTHING',
        [test.name, test.code, test.price, areaId, DEFAULT_TENANT_ID]
      );
    }

    if (labTechId) {
      await pool.query(
        'INSERT INTO lab_reagents (name, catalog_number, lab_area_id, tenant_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        ['Reactivo Hemoglobina', 'HEM-R001', labAreaIds['HEM'], DEFAULT_TENANT_ID]
      );
    }
  }

  logger.info('Seed completo: admin, doctores (con disponibilidad), pacientes y laboratorio creados');
};

// ─── Seed: Test tenants (comprehensive) ─────────────────────────────────────

export const seedTestTenants = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    logger.info('[SEED SKIPPED] No se ejecutan tenants de prueba en producción');
    return;
  }

  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email ON users (tenant_id, email)`);
  const hash = await bcrypt.hash(process.env.SEED_PASSWORD || 'REPLACED_PASSWORD', 12);
  const today = new Date();

  for (const t of TEST_TENANTS) {
    logger.info(`\n━━━ Seeding tenant: ${t.id} (${t.name}) ━━━`);

    const exists = await pool.query('SELECT 1 FROM tenants WHERE id = $1', [t.id]);
    if (exists.rows.length > 0) {
      logger.info(`Tenant ${t.id} already exists — ensuring data seed`);
    }

    // ── Tenant + Subscription ──────────────────────────────────────────────

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
       FROM plans WHERE code = $2
       ON CONFLICT DO NOTHING`,
      [t.id, t.planCode]
    );

    // ── Admin user ─────────────────────────────────────────────────────────

    await pool.query(
      'INSERT INTO users (email, password, name, role, rut, gender, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name',
      [t.adminEmail, hash, t.name, 'admin', t.adminRut, 'M', t.id]
    );

    // ── Doctors (5-6 per tenant, unique specialties) ───────────────────────

    const tenantSpecialties =
      t.id === 'clinica-norte'
        ? [
            { name: 'Dr. Andrés Medina', email: 'medina', rut: '33333333-3', specialty: 'Cardiología', gender: 'M' },
            { name: 'Dra. Carla Fuentes', email: 'fuentes', rut: '33344444-4', specialty: 'Dermatología', gender: 'F' },
            { name: 'Dr. Fernando Reyes', email: 'reyes', rut: '33355555-5', specialty: 'Medicina General', gender: 'M' },
            { name: 'Dra. Patricia Luna', email: 'luna', rut: '33366666-6', specialty: 'Pediatría', gender: 'F' },
            { name: 'Dr. Roberto Sáez', email: 'saez', rut: '33377777-7', specialty: 'Neurología', gender: 'M' },
          ]
        : [
            { name: 'Dra. Isabel Toro', email: 'toro', rut: '44433333-3', specialty: 'Ginecología', gender: 'F' },
            { name: 'Dr. Miguel Ortiz', email: 'ortiz', rut: '44444444-4', specialty: 'Traumatología', gender: 'M' },
            { name: 'Dra. Laura Campos', email: 'campos', rut: '44455555-5', specialty: 'Psiquiatría', gender: 'F' },
            { name: 'Dr. Diego Fuentes', email: 'fuentes', rut: '44466666-6', specialty: 'Medicina General', gender: 'M' },
            { name: 'Dra. Valeria Rojas', email: 'rojas', rut: '44477777-7', specialty: 'Endocrinología', gender: 'F' },
          ];

    const doctorIds: number[] = [];

    for (const doc of tenantSpecialties) {
      const fullEmail = `${doc.email}@${t.domain}.clinic.com`;
      const userResult = await pool.query(
        'INSERT INTO users (email, password, name, role, rut, gender, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [fullEmail, hash, doc.name, 'doctor', doc.rut, doc.gender, t.id]
      );
      const userId: number = userResult.rows[0].id;

      const doctorResult = await pool.query(
        'INSERT INTO doctors (name, specialty, email, user_id, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [doc.name, doc.specialty, fullEmail, userId, t.id]
      );
      const doctorId: number = doctorResult.rows[0].id;
      doctorIds.push(doctorId);

      // Mon-Fri availability: morning + afternoon
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

    // ── Doctor exceptions ──────────────────────────────────────────────────

    for (const doctorId of doctorIds) {
      const vacationDate = addDays(today, -randomInt(10, 60));
      await pool.query(
        'INSERT INTO doctor_exceptions (doctor_id, date, is_full_day, tenant_id) VALUES ($1, $2, true, $3) ON CONFLICT DO NOTHING',
        [doctorId, formatDate(vacationDate), t.id]
      );
      const futureDate = addDays(today, randomInt(5, 30));
      await pool.query(
        "INSERT INTO doctor_exceptions (doctor_id, date, start_time, end_time, is_full_day, tenant_id) VALUES ($1, $2, '09:00', '12:00', false, $3) ON CONFLICT DO NOTHING",
        [doctorId, formatDate(futureDate), t.id]
      );
    }

    logger.info(`  Doctores: ${doctorIds.length}`);

    // ── Patients (8-10 per tenant) ─────────────────────────────────────────

    const patientNames =
      t.id === 'clinica-norte'
        ? [
            'Pedro Navarro', 'Sofía Rivas', 'Mateo Delgado', 'Valentina Castro', 'Santiago Peña',
            'Camila Herrera', 'Nicolás Bravo', 'Isidora Muñoz', 'Joaquín Vargas', 'Fernanda Cortés',
          ]
        : [
            'Gabriela Soto', 'Rodrigo Pinto', 'Constanza Díaz', 'Martín Contreras', 'Paula González',
            'Sebastián Torres', 'Macarena Fernández', 'Felipe Álvarez', 'Daniela Reyes', 'Tomás Rojas',
          ];

    const patientIds: number[] = [];

    for (const pName of patientNames) {
      const email = `${pName.toLowerCase().replace(/\s+/g, '.')}@${t.domain}.clinic.com`;
      const rutSuffix = pick(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K']);
      const result = await pool.query(
        'INSERT INTO users (email, password, name, role, rut, phone, gender, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (tenant_id, email) DO NOTHING RETURNING id',
        [
          email, hash, pName, 'user',
          `${randomInt(10000000, 99999999)}-${rutSuffix}`,
          `+569${randomInt(10000000, 99999999)}`,
          pick(['M', 'F']),
          t.id,
        ]
      );
      if (result.rows.length > 0) patientIds.push(result.rows[0].id);
    }
    logger.info(`  Pacientes: ${patientIds.length}`);

    // ── Shared patient (same email in both clinics) ─────────────────────────

    for (const domain of ['norte', 'sur']) {
      const tenantId = domain === 'norte' ? 'clinica-norte' : 'clinica-sur';
      await pool.query(
        'INSERT INTO users (email, password, name, role, rut, phone, gender, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (tenant_id, email) DO NOTHING',
        [
          'compartido@clinic.com', hash, 'Usuario Compartido', 'user',
          `${randomInt(10000000, 99999999)}-${pick(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'])}`,
          `+569${randomInt(10000000, 99999999)}`,
          pick(['M', 'F']),
          tenantId,
        ]
      );
    }

    // ── Lab technician (pro plan only) ─────────────────────────────────────

    if (t.labTechnicianEmail) {
      await pool.query(
        'INSERT INTO users (email, password, name, role, rut, gender, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name',
        [t.labTechnicianEmail, hash, 'Encargado de Laboratorio', 'lab_technician', `${randomInt(10000000, 99999999)}-K`, 'M', t.id]
      );
      logger.info(`  Lab technician: ${t.labTechnicianEmail}`);
    }

    // ── Specialties ────────────────────────────────────────────────────────

    const specialtyData = [
      { name: 'Cardiología', icon: '❤️', description: 'Enfermedades del corazón', department: 'Cardiología', color: '#ef4444' },
      { name: 'Dermatología', icon: '🧴', description: 'Enfermedades de la piel', department: 'Dermatología', color: '#f59e0b' },
      { name: 'Neurología', icon: '🧠', description: 'Trastornos del sistema nervioso', department: 'Neurología', color: '#8b5cf6' },
      { name: 'Pediatría', icon: '👶', description: 'Atención integral para niños', department: 'Pediatría', color: '#06b6d4' },
      { name: 'Medicina General', icon: '🩺', description: 'Atención primaria', department: 'Medicina General', color: '#10b981' },
      { name: 'Ginecología', icon: '🌸', description: 'Salud femenina', department: 'Ginecología', color: '#ec4899' },
      { name: 'Traumatología', icon: '🦴', description: 'Lesiones musculoesqueléticas', department: 'Traumatología', color: '#f97316' },
      { name: 'Oftalmología', icon: '👁️', description: 'Enfermedades visuales', department: 'Oftalmología', color: '#3b82f6' },
      { name: 'Psiquiatría', icon: '💭', description: 'Salud mental', department: 'Psiquiatría', color: '#a855f7' },
      { name: 'Endocrinología', icon: '⚖️', description: 'Trastornos hormonales', department: 'Endocrinología', color: '#14b8a6' },
      { name: 'Urología', icon: '🫀', description: 'Sistema urinario', department: 'Urología', color: '#0ea5e9' },
      { name: 'Reumatología', icon: '🦋', description: 'Enfermedades autoinmunes', department: 'Reumatología', color: '#e11d48' },
    ];

    for (const s of specialtyData) {
      await pool.query(
        `INSERT INTO specialties (name, icon, description, department, procedures, color, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, name) DO NOTHING`,
        [s.name, s.icon, s.description, s.department, '[]', s.color, t.id]
      );
    }
    logger.info(`  Specialties: ${specialtyData.length}`);

    // ── Lab areas (pro plan only) ──────────────────────────────────────────

    const labAreaData = [
      { name: 'Hematología', code: 'HEM', description: 'Estudio de la sangre', icon: 'blood', color: '#ef4444', sort_order: 1 },
      { name: 'Bioquímica', code: 'BIO', description: 'Análisis químicos en sangre', icon: 'flask', color: '#f59e0b', sort_order: 2 },
      { name: 'Hormonas', code: 'HOR', description: 'Marcadores endocrinos', icon: 'activity', color: '#8b5cf6', sort_order: 3 },
      { name: 'Inmunología', code: 'INM', description: 'Sistema inmune y anticuerpos', icon: 'shield', color: '#06b6d4', sort_order: 4 },
      { name: 'Microbiología', code: 'MIC', description: 'Microorganismos y cultivos', icon: 'bacteria', color: '#10b981', sort_order: 5 },
      { name: 'Parasitología', code: 'PAR', description: 'Estudio de parásitos', icon: 'worm', color: '#84cc16', sort_order: 6 },
      { name: 'Uroanálisis', code: 'URO', description: 'Análisis de orina', icon: 'droplet', color: '#3b82f6', sort_order: 7 },
      { name: 'Coagulación', code: 'COA', description: 'Coagulación sanguínea', icon: 'droplets', color: '#ec4899', sort_order: 8 },
      { name: 'Serología', code: 'SER', description: 'Suero y anticuerpos', icon: 'test-tube', color: '#14b8a6', sort_order: 9 },
    ];

    const labAreaIds: Record<string, number> = {};

    if (t.planCode === 'pro') {
      for (const area of labAreaData) {
        const areaResult = await pool.query(
          `INSERT INTO lab_areas (name, code, description, icon, color, sort_order, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING RETURNING id`,
          [area.name, area.code, area.description, area.icon, area.color, area.sort_order, t.id]
        );
        if (areaResult.rows.length > 0) {
          labAreaIds[area.code] = areaResult.rows[0].id;
        } else {
          const existing = await pool.query('SELECT id FROM lab_areas WHERE code = $1 AND tenant_id = $2', [area.code, t.id]);
          if (existing.rows.length > 0) labAreaIds[area.code] = existing.rows[0].id;
        }
      }
      logger.info(`  Lab areas: ${Object.keys(labAreaIds).length}`);
    }

    // ── Lab tests (pro plan only) ──────────────────────────────────────────

    const labTestData = [
      { name: 'Hemograma completo', code: 'HEM001', areaCode: 'HEM', price: 25, reference_ranges: '{"hemoglobin": {"min": 12, "max": 16}, "hematocrit": {"min": 36, "max": 48}}', unit: 'g/dL', category: 'Hematología', sample_type: 'Sangre total', container_type: 'Tubo EDTA', turnaround_time_min: 120 },
      { name: 'Glucosa en ayunas', code: 'GLU001', areaCode: 'BIO', price: 15, reference_ranges: '{"glucose": {"min": 70, "max": 100}}', unit: 'mg/dL', category: 'Bioquímica', sample_type: 'Suero', container_type: 'Tubo seco', turnaround_time_min: 60 },
      { name: 'Perfil lipídico', code: 'LIP001', areaCode: 'BIO', price: 35, reference_ranges: '{"cholesterol": {"min": 0, "max": 200}, "triglycerides": {"min": 0, "max": 150}}', unit: 'mg/dL', category: 'Bioquímica', sample_type: 'Suero', container_type: 'Tubo seco', turnaround_time_min: 120 },
      { name: 'Creatinina', code: 'CRE001', areaCode: 'BIO', price: 20, reference_ranges: '{"creatinine": {"min": 0.6, "max": 1.2}}', unit: 'mg/dL', category: 'Bioquímica', sample_type: 'Suero', container_type: 'Tubo seco', turnaround_time_min: 60 },
      { name: 'TSH', code: 'TSH001', areaCode: 'HOR', price: 30, reference_ranges: '{"tsh": {"min": 0.4, "max": 4.0}}', unit: 'mIU/L', category: 'Hormonas', sample_type: 'Suero', container_type: 'Tubo seco', turnaround_time_min: 240 },
      { name: 'Urocultivo', code: 'URO001', areaCode: 'MIC', price: 25, reference_ranges: '{"bacteria": {"max": 10000}}', unit: 'UFC/mL', category: 'Microbiología', sample_type: 'Orina', container_type: 'Tubo estéril', turnaround_time_min: 2880 },
      { name: 'Hemoglobina glicosilada', code: 'HBA001', areaCode: 'HEM', price: 35, reference_ranges: '{"hba1c": {"min": 4, "max": 5.6}}', unit: '%', category: 'Hematología', sample_type: 'Sangre total', container_type: 'Tubo EDTA', turnaround_time_min: 240 },
      { name: 'PCR', code: 'PCR001', areaCode: 'BIO', price: 20, reference_ranges: '{"pcr": {"min": 0, "max": 10}}', unit: 'mg/L', category: 'Bioquímica', sample_type: 'Suero', container_type: 'Tubo seco', turnaround_time_min: 120 },
      { name: 'Transaminasas', code: 'ALT001', areaCode: 'BIO', price: 25, reference_ranges: '{"alt": {"min": 7, "max": 56}, "ast": {"min": 10, "max": 40}}', unit: 'U/L', category: 'Bioquímica', sample_type: 'Suero', container_type: 'Tubo seco', turnaround_time_min: 120 },
    ];

    const labTestIds: Record<string, number> = {};

    if (t.planCode === 'pro') {
      for (const test of labTestData) {
        const areaId = labAreaIds[test.areaCode];
        const testResult = await pool.query(
          `INSERT INTO lab_tests (name, code, price, lab_area_id, reference_ranges, unit, category, sample_type, container_type, turnaround_time_min, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (tenant_id, code) DO NOTHING RETURNING id`,
          [test.name, test.code, test.price, areaId, test.reference_ranges, test.unit, test.category, test.sample_type, test.container_type, test.turnaround_time_min, t.id]
        );
        if (testResult.rows.length > 0) {
          labTestIds[test.code] = testResult.rows[0].id;
        } else {
          const existing = await pool.query('SELECT id FROM lab_tests WHERE code = $1 AND tenant_id = $2', [test.code, t.id]);
          if (existing.rows.length > 0) labTestIds[test.code] = existing.rows[0].id;
        }
      }
      logger.info(`  Lab tests: ${Object.keys(labTestIds).length}`);
    }

    // ── Lab equipment (pro plan only) ──────────────────────────────────────

    const equipmentData = [
      { name: 'Analizador Hematológico', model: 'Sysmex XN-1000', serial_number: 'SYS-XN-001', areaCode: 'HEM', connection_type: 'hl7', status: 'online' },
      { name: 'Analizador Bioquímico', model: 'Beckman Coulter AU5800', serial_number: 'BC-AU-001', areaCode: 'BIO', connection_type: 'hl7', status: 'online' },
      { name: 'Analizador de Hormonas', model: 'Roche Cobas e411', serial_number: 'RC-E411-001', areaCode: 'HOR', connection_type: 'astm', status: 'online' },
      { name: 'Microscopio Digital', model: 'Olympus BX53', serial_number: 'OLY-BX53-001', areaCode: 'MIC', connection_type: 'manual', status: 'online' },
      { name: 'Analizador de Orina', model: 'Sysmex UF-5000', serial_number: 'SYS-UF-001', areaCode: 'URO', connection_type: 'hl7', status: 'maintenance' },
    ];

    const equipmentIds: number[] = [];

    if (t.planCode === 'pro') {
      for (const eq of equipmentData) {
        const eqResult = await pool.query(
          `INSERT INTO lab_equipment (name, model, serial_number, lab_area_id, connection_type, status, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING RETURNING id`,
          [eq.name, eq.model, eq.serial_number, labAreaIds[eq.areaCode], eq.connection_type, eq.status, t.id]
        );
        if (eqResult.rows.length > 0) equipmentIds.push(eqResult.rows[0].id);
      }
      logger.info(`  Lab equipment: ${equipmentIds.length}`);
    }

    // ── Lab reagents (pro plan only) ───────────────────────────────────────

    const reagentData = [
      { name: 'Hemoglobina Reagent Kit', catalog_number: 'HK-5000', lot_number: 'LOT-2025-001', supplier: 'Sysmex', stock_quantity: 50, unit: 'tests', min_stock: 10, current_stock: 45, storage_conditions: '2-8°C', areaCode: 'HEM' },
      { name: 'Glucosa GOD-POD', catalog_number: 'GLU-100', lot_number: 'LOT-2025-002', supplier: 'Beckman', stock_quantity: 100, unit: 'tests', min_stock: 20, current_stock: 85, storage_conditions: '15-25°C', areaCode: 'BIO' },
      { name: 'Colesterol Total', catalog_number: 'CHOL-200', lot_number: 'LOT-2025-003', supplier: 'Beckman', stock_quantity: 80, unit: 'tests', min_stock: 15, current_stock: 70, storage_conditions: '2-8°C', areaCode: 'BIO' },
      { name: 'TSH Calibrator', catalog_number: 'TSH-CAL', lot_number: 'LOT-2025-004', supplier: 'Roche', stock_quantity: 30, unit: 'tests', min_stock: 5, current_stock: 25, storage_conditions: '2-8°C', areaCode: 'HOR' },
      { name: 'Medio de Cultivo CLED', catalog_number: 'CLED-050', lot_number: 'LOT-2025-005', supplier: 'Oxoid', stock_quantity: 40, unit: 'units', min_stock: 10, current_stock: 35, storage_conditions: '15-25°C', areaCode: 'MIC' },
      { name: 'Reactivo PCR Quantitative', catalog_number: 'PCR-500', lot_number: 'LOT-2025-006', supplier: 'Bio-Rad', stock_quantity: 25, unit: 'tests', min_stock: 5, current_stock: 20, storage_conditions: '-20°C', areaCode: 'BIO' },
    ];

    const reagentIds: number[] = [];

    if (t.planCode === 'pro') {
      for (const re of reagentData) {
        const reResult = await pool.query(
          `INSERT INTO lab_reagents (name, catalog_number, lot_number, supplier, stock_quantity, unit, min_stock, current_stock, storage_conditions, lab_area_id, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT DO NOTHING RETURNING id`,
          [re.name, re.catalog_number, re.lot_number, re.supplier, re.stock_quantity, re.unit, re.min_stock, re.current_stock, re.storage_conditions, labAreaIds[re.areaCode], t.id]
        );
        if (reResult.rows.length > 0) reagentIds.push(reResult.rows[0].id);
      }
      logger.info(`  Lab reagents: ${reagentIds.length}`);
    }

    // ── Lab QC records (pro plan only) ─────────────────────────────────────

    if (t.planCode === 'pro') {
      const qcTypes = ['internal', 'internal', 'internal', 'external', 'calibration', 'proficiency', 'internal', 'external'];
      const qcStatuses = ['passed', 'passed', 'passed', 'failed', 'passed', 'passed', 'warning', 'passed'];

      const labTechResult = await pool.query(
        "SELECT id FROM users WHERE tenant_id = $1 AND role = 'lab_technician' LIMIT 1",
        [t.id]
      );
      let qcUserId: number = labTechResult.rows.length > 0 ? labTechResult.rows[0].id : 1;
      if (labTechResult.rows.length === 0) {
        const adminForQc = await pool.query('SELECT id FROM users WHERE tenant_id = $1 AND role = $2 LIMIT 1', [t.id, 'admin']);
        if (adminForQc.rows.length > 0) qcUserId = adminForQc.rows[0].id;
      }

      const allLabTestIds = Object.values(labTestIds);
      const allLabAreaIds = Object.values(labAreaIds);

      let qcCount = 0;
      for (let i = 0; i < 8; i++) {
        if (allLabTestIds.length === 0 || allLabAreaIds.length === 0) break;
        try {
          await pool.query(
            `INSERT INTO lab_qc_records (lab_test_id, lab_area_id, equipment_id, reagent_id, qc_type, status, performed_by, performed_at, results, notes, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              pick(allLabTestIds),
              pick(allLabAreaIds),
              equipmentIds.length > 0 ? pick(equipmentIds) : null,
              reagentIds.length > 0 ? pick(reagentIds) : null,
              qcTypes[i],
              qcStatuses[i],
              qcUserId,
              addDays(today, -randomInt(0, 30)),
              JSON.stringify({ value: randomInt(90, 110), unit: 'control' }),
              `QC ${qcTypes[i]} - ${qcStatuses[i]}`,
              t.id,
            ]
          );
          qcCount++;
        } catch { /* skip */ }
      }
      logger.info(`  Lab QC records: ${qcCount}`);
    }

    // ── Bookings (past + future) ───────────────────────────────────────────

    const bookingCheck = await pool.query('SELECT COUNT(*) FROM bookings WHERE tenant_id = $1', [t.id]);
    const bookingCount = parseInt(bookingCheck.rows[0].count, 10);

    if (bookingCount === 0 && patientIds.length > 0 && doctorIds.length > 0) {
      await pool.query('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_future_date');

      // Past bookings (15+ completed)
      const pastBookingIds: number[] = [];
      for (let i = 0; i < 18; i++) {
        const doctorId = pick(doctorIds);
        const patientId = pick(patientIds);
        const daysAgo = randomInt(3, 120);
        const date = addDays(today, -daysAgo);
        const hour = randomInt(9, 16);
        const time = `${String(hour).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`;
        const status = pick(['completed', 'completed', 'completed', 'no_show', 'cancelled']);
        try {
          const result = await pool.query(
            `INSERT INTO bookings (doctor_id, user_id, date, time, duration, status, confirmed, tenant_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
             ON CONFLICT (doctor_id, date, time) DO NOTHING
             RETURNING id`,
            [doctorId, patientId, formatDate(date), time, 30, status, t.id, date]
          );
          if (result.rows.length > 0) pastBookingIds.push(result.rows[0].id);
        } catch { /* skip on constraint violation */ }
      }

      // Future bookings (5+)
      for (let i = 0; i < 7; i++) {
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
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (doctor_id, date, time) DO NOTHING`,
            [doctorId, patientId, formatDate(date), time, 30, confirmed ? 'confirmed' : 'pending', confirmed, t.id]
          );
        } catch { /* skip on constraint violation */ }
      }

      await pool.query('ALTER TABLE bookings ADD CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE - INTERVAL \'1 day\') NOT VALID');
      logger.info(`  Bookings: ${pastBookingIds.length} pasadas + 7 futuras`);

      // ── Clinical records (from ~65% of completed bookings) ───────────────

      const completedBookings = await pool.query(
        'SELECT id, doctor_id, user_id FROM bookings WHERE tenant_id = $1 AND status = $2',
        [t.id, 'completed']
      );
      const crIds: number[] = [];
      const targetCRs = Math.ceil(completedBookings.rows.length * 0.65);

      for (let i = 0; i < targetCRs && i < completedBookings.rows.length; i++) {
        const b = completedBookings.rows[i];
        const diag = pick(diagnoses);
        const complaints = chiefComplaintsByDiag[diag.diagnosis];
        const chiefComplaint = pick(complaints);
        const vitals = vitalPresets[diag.vitalKey]();

        const anamnesis = `Paciente de 45 años acude a consulta por ${chiefComplaint.toLowerCase()}. Antecedentes familiares de ${diag.diagnosis.toLowerCase()}. Sin alergias medicamentosas conocidas.`;
        const physicalExam = `PA: ${vitals.blood_pressure} lpm. FC: ${vitals.heart_rate}. Temp: ${vitals.temperature}°C. FR: ${vitals.respiratory_rate} rpm. SatO2: ${vitals.oxygen_saturation}%. Peso: ${vitals.weight}kg. Talla: ${vitals.height}cm. IMC: ${vitals.bmi}.`;
        const treatmentPlan = `Se indica control de ${diag.diagnosis.toLowerCase()}. Se entrega receta médica. Próximo control en ${pick(['1', '2', '3'])} meses.`;

        try {
          const result = await pool.query(
            `INSERT INTO clinical_records (patient_id, doctor_id, booking_id, chief_complaint, anamnesis, vital_signs, physical_exam, diagnosis, cie10_codes, treatment_plan, notes, status, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed', $12)
             ON CONFLICT DO NOTHING RETURNING id`,
            [
              b.user_id, b.doctor_id, b.id,
              chiefComplaint, anamnesis,
              JSON.stringify(vitals),
              physicalExam,
              diag.diagnosis,
              `{${diag.cie10}}`,
              treatmentPlan,
              `Consulta de control. Evolución favorable.`,
              t.id,
            ]
          );
          if (result.rows.length > 0) crIds.push(result.rows[0].id);
        } catch { /* skip */ }
      }
      logger.info(`  Clinical records: ${crIds.length}`);

      // ── Prescriptions (from ~50% of clinical records) ────────────────────

      let prescriptionCount = 0;
      for (const crId of crIds) {
        if (Math.random() > 0.5) continue;
        const numMeds = randomInt(1, 3);
        const pickedMeds = new Set<number>();
        for (let m = 0; m < numMeds; m++) {
          let medIdx: number;
          do { medIdx = randomInt(0, medications.length - 1); } while (pickedMeds.has(medIdx) && pickedMeds.size < medications.length);
          pickedMeds.add(medIdx);
          const med = medications[medIdx];
          try {
            await pool.query(
              `INSERT INTO prescriptions (clinical_record_id, medication, dosage, frequency, duration, instructions, route, tenant_id)
               VALUES ($1, $2, $3, $4, $5, $6, 'oral', $7)`,
              [crId, med.medication, med.dosage, med.frequency, med.duration, med.instructions, t.id]
            );
            prescriptionCount++;
          } catch { /* skip */ }
        }
      }
      logger.info(`  Prescriptions: ${prescriptionCount}`);

      // ── Lab requests (pro plan only, from ~40% of clinical records) ──────

      if (t.planCode === 'pro' && crIds.length > 0) {
        const labTestIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const labResultSets: Record<number, Record<string, unknown>> = {
          1: { hemoglobin: 14.2, hematocrit: 42, leukocytes: 7500, platelets: 250000, neutrophils: 65, lymphocytes: 28 },
          2: { glucose_fasting: 95, unit: 'mg/dL' },
          3: { total_cholesterol: 195, ldl: 120, hdl: 55, triglycerides: 130 },
          4: { creatinine: 0.9, bun: 15, unit: 'mg/dL' },
          5: { tsh: 2.5, ft4: 1.2, unit: 'mIU/L' },
          6: { colony_count: 50000, organism: 'E. coli', sensitivity: 'Ciprofloxacino, Nitrofurantoin' },
          7: { hba1c: 6.2, estimated_avg_glucose: 130, unit: '%' },
          8: { pcr: 3.5, unit: 'mg/L' },
          9: { alt: 28, ast: 22, alp: 65, ggt: 35, unit: 'U/L' },
        };

        let labRequestCount = 0;
        for (let i = 0; i < crIds.length; i++) {
          if (Math.random() > 0.4) continue;
          const crId = crIds[i];
          const crResult = await pool.query(
            'SELECT patient_id, doctor_id FROM clinical_records WHERE id = $1',
            [crId]
          );
          if (crResult.rows.length === 0) continue;
          const cr = crResult.rows[0];

          const requestNumber = `LAB-${t.domain.toUpperCase()}-${String(i + 1).padStart(4, '0')}`;
          const priority = pick(['routine', 'routine', 'urgent']);
          const labStatus = pick(['delivered', 'result_entered', 'validated_tech']);

          const requestResult = await pool.query(
            `INSERT INTO lab_requests (request_number, patient_id, doctor_id, clinical_record_id, priority, status, notes, requested_at, tenant_id, lab_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'internal')
             ON CONFLICT (request_number) DO NOTHING RETURNING id`,
            [
              requestNumber, cr.patient_id, cr.doctor_id, crId,
              priority, labStatus,
              'Solicitud generada desde consulta clínica',
              addDays(today, -randomInt(1, 30)),
              t.id,
            ]
          );

          if (requestResult.rows.length > 0) {
            const requestId: number = requestResult.rows[0].id;
            // 1-3 lab items per request
            const numItems = randomInt(1, 3);
            const usedTests = new Set<number>();
            for (let item = 0; item < numItems; item++) {
              let testId: number;
              do { testId = pick(labTestIds); } while (usedTests.has(testId) && usedTests.size < labTestIds.length);
              usedTests.add(testId);

              const itemStatus = pick(['delivered', 'validated_tech', 'signed']);
              const resultsJson = labResultSets[testId] || {};

              try {
                await pool.query(
                  `INSERT INTO lab_request_items (lab_request_id, lab_test_id, priority, status, results, result_notes, notes, completed_at, tenant_id)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                  [
                    requestId, testId, 'normal', itemStatus,
                    JSON.stringify(resultsJson),
                    `Resultado dentro de parámetros normales`,
                    'Procesado automáticamente',
                    addDays(today, -randomInt(0, 5)),
                    t.id,
                  ]
                );
              } catch { /* skip */ }
            }
            labRequestCount++;
          }
        }
        logger.info(`  Lab requests: ${labRequestCount}`);

        // ── Lab notifications (critical, SLA, QC) ──────────────────────────

        const labNotifTypes = [
          { type: 'critical_result', title: 'Resultado crítico: Glucosa', message: 'Paciente con glucosa en ayunas > 200 mg/dL. Requiere revisión inmediata.', severity: 'critical' },
          { type: 'critical_result', title: 'Resultado crítico: PCR elevada', message: 'PCR > 50 mg/L detectado. Sugerir evaluación de proceso infeccioso.', severity: 'critical' },
          { type: 'sla_breach', title: 'SLA vencido: Hemograma completo', message: 'El análisis de hemograma completo excedió el tiempo máximo de entrega (48h).', severity: 'warning' },
          { type: 'sla_breach', title: 'SLA vencido: Perfil lipídico', message: 'El perfil lipídico no ha sido completado dentro del tiempo establecido.', severity: 'warning' },
          { type: 'qc_failure', title: 'Control de calidad fallido', message: 'Nivel bajo del control interno de Bioquímica. Verificar reactivos.', severity: 'critical' },
          { type: 'equipment_alert', title: 'Equipo en mantenimiento', message: 'Analizador Bioquímico requiere calibración programada.', severity: 'info' },
        ];

        let notifCount = 0;
        for (const notif of labNotifTypes) {
          try {
            await pool.query(
              `INSERT INTO lab_notifications (type, title, message, severity, tenant_id)
               VALUES ($1, $2, $3, $4, $5)`,
              [notif.type, notif.title, notif.message, notif.severity, t.id]
            );
            notifCount++;
          } catch { /* skip */ }
        }
        logger.info(`  Lab notifications: ${notifCount}`);
      }

      // ── Invoices (from ~50% of past bookings) ────────────────────────────

      const pastBookingsForInvoice = await pool.query(
        'SELECT id, doctor_id, user_id, date FROM bookings WHERE tenant_id = $1 AND status = $2',
        [t.id, 'completed']
      );

      let invoiceCount = 0;
      const invoiceConcepts = ['Consulta médica general', 'Control de especialidad', 'Consulta de urgencia', 'Control preventivo'];
      for (let i = 0; i < pastBookingsForInvoice.rows.length; i++) {
        if (Math.random() > 0.5) continue;
        const b = pastBookingsForInvoice.rows[i];
        const amount = randomInt(35000, 95000);
        const taxAmount = Math.round(amount * 0.19);
        const totalAmount = amount + taxAmount;
        const invoiceStatus = pick(['paid', 'paid', 'paid', 'pending', 'overdue']);
        const invoiceNumber = `INV-${t.domain.toUpperCase()}-${String(i + 1).padStart(4, '0')}`;
        const dueDate = addDays(b.date, 15);

        try {
          const invResult = await pool.query(
            `INSERT INTO invoices (invoice_number, patient_id, doctor_id, booking_id, concept, description, amount, currency, tax_amount, total_amount, status, due_date, issued_at, paid_at, payment_method, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'CLP', $8, $9, $10, $11, $12, $13, $14, $15)
             ON CONFLICT (invoice_number) DO NOTHING RETURNING id`,
            [
              invoiceNumber, b.user_id, b.doctor_id, b.id,
              pick(invoiceConcepts),
              `Factura por consulta médica del ${formatDate(b.date)}`,
              amount, taxAmount, totalAmount, invoiceStatus,
              formatDate(dueDate), b.date,
              invoiceStatus === 'paid' ? addDays(b.date, randomInt(1, 10)) : null,
              invoiceStatus === 'paid' ? pick(['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia']) : null,
              t.id,
            ]
          );
          if (invResult.rows.length > 0) invoiceCount++;
        } catch { /* skip */ }
      }
      logger.info(`  Invoices: ${invoiceCount}`);

      // ── Subscription invoices (6 months) ─────────────────────────────────

      const invCheck = await pool.query('SELECT COUNT(*) FROM subscription_invoices WHERE tenant_id = $1', [t.id]);
      if (parseInt(invCheck.rows[0].count, 10) === 0) {
        const subResult = await pool.query('SELECT id FROM subscriptions WHERE tenant_id = $1 LIMIT 1', [t.id]);
        if (subResult.rows.length > 0) {
          const subId = subResult.rows[0].id;
          const planAmount = t.planCode === 'pro' ? 79 : 29;
          for (let m = 1; m <= 6; m++) {
            const paidAt = addDays(today, -(m * 30));
            try {
              await pool.query(
                `INSERT INTO subscription_invoices (tenant_id, subscription_id, amount, currency, status, period_start, period_end, paid_at)
                 VALUES ($1, $2, $3, 'USD', 'paid', $4, $5, $6)
                 ON CONFLICT DO NOTHING`,
                [t.id, subId, planAmount, addDays(paidAt, -1), paidAt, paidAt]
              );
            } catch { /* skip */ }
          }
        }
      }

      // ── Audit logs (30+) ─────────────────────────────────────────────────

      const adminResult = await pool.query(
        'SELECT id FROM users WHERE tenant_id = $1 AND role = $2 LIMIT 1',
        [t.id, 'admin']
      );
      const adminUserId = adminResult.rows.length > 0 ? adminResult.rows[0].id : null;

      let auditCount = 0;
      for (let i = 0; i < 35; i++) {
        const entry = pick(auditActions);
        const daysAgo = randomInt(0, 60);
        const ipOctet1 = randomInt(10, 192);
        const ipOctet2 = randomInt(0, 255);
        const ipOctet3 = randomInt(0, 255);
        const ipOctet4 = randomInt(1, 254);

        try {
          await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, tenant_id, created_at)
             VALUES ($1, $2, $3, $4, $5::inet, $6, $7, $8)`,
            [
              adminUserId || 1,
              entry.action,
              entry.resource_type,
              entry.resource_id,
              `${ipOctet1}.${ipOctet2}.${ipOctet3}.${ipOctet4}`,
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              t.id,
              addDays(today, -daysAgo),
            ]
          );
          auditCount++;
        } catch { /* skip */ }
      }
      logger.info(`  Audit logs: ${auditCount}`);

      // ── Medical history (10+ per tenant) ─────────────────────────────────

      let medHistCount = 0;
      for (let i = 0; i < Math.min(10, patientIds.length); i++) {
        const patientId = patientIds[i];
        const cond = medicalConditions[i % medicalConditions.length];
        const onsetYear = randomInt(2015, 2024);
        const onsetMonth = randomInt(1, 12);
        const onsetDay = randomInt(1, 28);

        try {
          await pool.query(
            `INSERT INTO medical_history (patient_id, condition, onset_date, status, notes, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              patientId,
              cond.condition,
              `${onsetYear}-${String(onsetMonth).padStart(2, '0')}-${String(onsetDay).padStart(2, '0')}`,
              cond.status,
              cond.notes,
              t.id,
            ]
          );
          medHistCount++;
        } catch { /* skip */ }
      }
      logger.info(`  Medical history: ${medHistCount}`);

      // ── Summary ──────────────────────────────────────────────────────────

      logger.info(`  ✓ Tenant ${t.id} completado`);
    } else {
      logger.info(`  Tenant ${t.id} ya tiene datos de bookings — saltando seed detallado`);
    }
  }
};

// ─── Spread seed dates ──────────────────────────────────────────────────────

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
  await pool.query('ALTER TABLE bookings ADD CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE - INTERVAL \'1 day\') NOT VALID');
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
