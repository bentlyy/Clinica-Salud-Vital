import { pool } from '../shared/db.js';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger.js';
import { toError } from '../utils/errors.js';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default';

const getSeedPasswordOrFail = (): string => {
  const password = process.env.SEED_PASSWORD;
  if (!password) {
    throw new Error(
      'SEED_PASSWORD is not set. Refusing to seed users with a weak default password. ' +
      'Define SEED_PASSWORD in your environment (e.g. a strong random value) before running the seed.',
    );
  }
  return password;
};

let _HASH: string | null = null;
const getHash = async (): Promise<string> => {
  if (!_HASH) _HASH = await bcrypt.hash(getSeedPasswordOrFail(), 12);
  return _HASH!;
};

const generateRut = (): string => {
  const body = Math.floor(1000000 + Math.random() * 9000000).toString();
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = sum % 11;
  const expected = 11 - remainder;
  const dv = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
  return body + '-' + dv;
};

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

const today = new Date();

const ensureDoctorsExist = async (HASH: string): Promise<void> => {
  const doctorsData = [
    { name: 'Juan Pérez', specialty: 'Cardiología', email: 'juan@clinic.com' },
    { name: 'María López', specialty: 'Dermatología', email: 'maria@clinic.com' },
    { name: 'Carlos Soto', specialty: 'Neurología', email: 'carlos@clinic.com' },
    { name: 'Ana Torres', specialty: 'Pediatría', email: 'ana@clinic.com' },
    { name: 'Pedro González', specialty: 'Medicina General', email: 'pedro@clinic.com' },
    { name: 'Claudia Muñoz', specialty: 'Ginecología', email: 'claudia@clinic.com' },
    { name: 'Ricardo Díaz', specialty: 'Traumatología', email: 'ricardo@clinic.com' },
    { name: 'Patricia Vega', specialty: 'Oftalmología', email: 'patricia@clinic.com' },
    { name: 'Mauricio Rojas', specialty: 'Psiquiatría', email: 'mauricio@clinic.com' },
    { name: 'Carmen Flores', specialty: 'Endocrinología', email: 'carmen@clinic.com' },
    { name: 'Francisco Mora', specialty: 'Urología', email: 'francisco@clinic.com' },
    { name: 'Verónica Pizarro', specialty: 'Reumatología', email: 'veronica@clinic.com' },
  ];
  for (const doc of doctorsData) {
    const userResult = await pool.query(
      'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password RETURNING id',
      [doc.email, HASH, doc.name, 'doctor', generateRut(), '+56987654321', DEFAULT_TENANT_ID]
    );
    const userId = userResult.rows[0].id;
    await pool.query(
      'INSERT INTO doctors (name, specialty, email, user_id, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [doc.name, doc.specialty, doc.email, userId, DEFAULT_TENANT_ID]
    );
  }
  const patientNames = [
    'Luis Ramírez', 'Marta Sepúlveda', 'Jorge Castillo', 'Rosa Herrera',
    'Alberto Contreras', 'Silvia Medina', 'Raúl Valenzuela', 'Nancy Campos',
    'Héctor Vega', 'Diana Paredes', 'Oscar Fuentes', 'Paola Figueroa',
    'Fernando Rivas', 'Gabriela Acosta', 'Cristián Guzmán', 'Teresa Delgado',
    'Pablo Navarro', 'Angélica Silva', 'Rodrigo Peña', 'Elena Soto',
    'Manuel Cruz', 'Juana Ortiz', 'Sergio Vargas', 'Lorena Reyes',
    'Andrés Morales', 'Carolina Espinoza', 'Tomás Castillo', 'Bárbara Molina',
    'Felipe Campos', 'Verónica Sandoval',
  ];
  for (const pName of patientNames) {
    const email = pName.toLowerCase().replace(/\s+/g, '.') + '@clinic.com';
    await pool.query(
      'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password RETURNING id',
      [email, HASH, pName, 'user', generateRut(), '+56987654321', DEFAULT_TENANT_ID]
    );
  }
  logger.info('Seed data ensured: doctors + patients created');
};

export const seed = async (): Promise<void> => {
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email ON users (tenant_id, email)`);
  await pool.query(`ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_tenant_email ON doctors (tenant_id, email)`);

  // Seed data / password refreshes only run in non-production (dev/test).
  // In production we never generate users with a weak default password and we
  // never overwrite the admin password already configured by the operator.
  const seedOnStartup = process.env.SEED_ON_STARTUP !== 'false' && process.env.NODE_ENV !== 'production';

  if (!seedOnStartup) {
    logger.info('[SEED SKIPPED] SEED_ON_STARTUP is disabled in production — not overwriting credentials');
    return;
  }

  const HASH = await getHash();
  const exists = await pool.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', ['admin@clinic.com']);
  logger.info('Seed: admin exists check', { exists: exists.rows.length > 0, tenantId: DEFAULT_TENANT_ID });

  const beforeCount = await pool.query('SELECT COUNT(*) FROM users WHERE email = $1', ['admin@clinic.com']);
  logger.info('Seed: admin count BEFORE insert', { count: beforeCount.rows[0].count });

  // ==================== USERS ====================
  const adminResult = await pool.query(
    'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password RETURNING id',
    ['admin@clinic.com', HASH, 'Admin', 'admin', generateRut(), '+56987654321', DEFAULT_TENANT_ID]
  );
  const adminId = adminResult.rows[0].id;
  logger.info('Seed: admin inserted/updated', { adminId, tenantId: DEFAULT_TENANT_ID });

  const afterCount = await pool.query('SELECT COUNT(*) FROM users WHERE email = $1', ['admin@clinic.com']);
  logger.info('Seed: admin count AFTER insert', { count: afterCount.rows[0].count });

  const adminInTenant = await pool.query('SELECT id, email, tenant_id FROM users WHERE email = $1 AND tenant_id = $2', ['admin@clinic.com', DEFAULT_TENANT_ID]);
  logger.info('Seed: admin in default tenant', { found: adminInTenant.rows.length > 0, id: adminInTenant.rows[0]?.id });

  // Reset passwords on every deploy so the seed credentials always work
  // Only when SEED_ON_STARTUP=true (default: true in dev, false in prod)
  if (seedOnStartup) {
    const seedEmails = [
      'admin@clinic.com',
      'juan@clinic.com', 'maria@clinic.com', 'carlos@clinic.com', 'ana@clinic.com',
      'pedro@clinic.com', 'claudia@clinic.com', 'ricardo@clinic.com', 'patricia@clinic.com',
      'mauricio@clinic.com', 'carmen@clinic.com', 'francisco@clinic.com', 'veronica@clinic.com',
      'user1@clinic.com', 'user2@clinic.com', 'user3@clinic.com',
      'lab@clinic.com',
    ];
    const updateResult = await pool.query('UPDATE users SET password = $1 WHERE tenant_id = $2 AND email = ANY($3::text[])',
      [HASH, DEFAULT_TENANT_ID, seedEmails]);
    logger.info('Seed: password update result', { rowsAffected: updateResult.rowCount });
    await pool.query('UPDATE users SET password = $1 WHERE role = $2', [HASH, 'superadmin']);
  }

  // Asegurar pacientes simples incluso si el seed ya se ejecutó
  const simplePatients = [
    { email: 'user1@clinic.com', rut: '15666777-3', phone: '+56911111111' },
    { email: 'user2@clinic.com', rut: '16777888-7', phone: '+56922222222' },
    { email: 'user3@clinic.com', rut: '17888999-0', phone: '+56933333333' },
  ];
  for (const p of simplePatients) {
    await pool.query(
      'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password',
      [p.email, HASH, p.email.split('@')[0], 'user', p.rut, p.phone, DEFAULT_TENANT_ID]
    );
  }

  // ==================== LAB TECHNICIAN ====================
  await pool.query(
    'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password',
    ['lab@clinic.com', HASH, 'Técnico de Laboratorio', 'lab_technician', generateRut(), '+56944444444', DEFAULT_TENANT_ID]
  );

  // Si ya existe admin, solo resetea passwords y asegura doctores (sin duplicar bookings/records)
  if (exists.rows.length > 0) {
    logger.info('Seed passwords refreshed');
    await ensureDoctorsExist(HASH);
    return;
  }

  // ==================== DOCTORS + AVAILABILITY (first run) ====================

  const doctorsData = [
    { name: 'Juan Pérez', specialty: 'Cardiología', email: 'juan@clinic.com' },
    { name: 'María López', specialty: 'Dermatología', email: 'maria@clinic.com' },
    { name: 'Carlos Soto', specialty: 'Neurología', email: 'carlos@clinic.com' },
    { name: 'Ana Torres', specialty: 'Pediatría', email: 'ana@clinic.com' },
    { name: 'Pedro González', specialty: 'Medicina General', email: 'pedro@clinic.com' },
    { name: 'Claudia Muñoz', specialty: 'Ginecología', email: 'claudia@clinic.com' },
    { name: 'Ricardo Díaz', specialty: 'Traumatología', email: 'ricardo@clinic.com' },
    { name: 'Patricia Vega', specialty: 'Oftalmología', email: 'patricia@clinic.com' },
    { name: 'Mauricio Rojas', specialty: 'Psiquiatría', email: 'mauricio@clinic.com' },
    { name: 'Carmen Flores', specialty: 'Endocrinología', email: 'carmen@clinic.com' },
    { name: 'Francisco Mora', specialty: 'Urología', email: 'francisco@clinic.com' },
    { name: 'Verónica Pizarro', specialty: 'Reumatología', email: 'veronica@clinic.com' },
  ];

  interface DoctorSeed {
    id: number;
    userId: number;
    name: string;
    specialty: string;
  }

  const doctors: DoctorSeed[] = [];

  for (const doc of doctorsData) {
    const userResult = await pool.query(
      'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password RETURNING id',
      [doc.email, HASH, doc.name, 'doctor', generateRut(), '+569' + String(randomInt(10000000, 99999999)), DEFAULT_TENANT_ID]
    );
    const userId = userResult.rows[0].id;

    const doctorResult = await pool.query(
      'INSERT INTO doctors (name, specialty, email, user_id, tenant_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [doc.name, doc.specialty, doc.email, userId, DEFAULT_TENANT_ID]
    );
    const doctorId = doctorResult.rows[0].id;

    doctors.push({ id: doctorId, userId, name: doc.name, specialty: doc.specialty });


    for (let day = 1; day <= 5; day++) {
      await pool.query(
        'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id) VALUES ($1, $2, $3, $4, $5)',
        [doctorId, day, '09:00', '13:00', DEFAULT_TENANT_ID]
      );
      await pool.query(
        'INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, tenant_id) VALUES ($1, $2, $3, $4, $5)',
        [doctorId, day, '14:00', '18:00', DEFAULT_TENANT_ID]
      );
    }
  }

  const patientNames = [
    'Luis Ramírez', 'Marta Sepúlveda', 'Jorge Castillo', 'Rosa Herrera',
    'Alberto Contreras', 'Silvia Medina', 'Raúl Valenzuela', 'Nancy Campos',
    'Héctor Vega', 'Diana Paredes', 'Oscar Fuentes', 'Paola Figueroa',
    'Fernando Rivas', 'Gabriela Acosta', 'Cristián Guzmán', 'Teresa Delgado',
    'Pablo Navarro', 'Angélica Silva', 'Rodrigo Peña', 'Elena Soto',
    'Manuel Cruz', 'Juana Ortiz', 'Sergio Vargas', 'Lorena Reyes',
    'Andrés Morales', 'Carolina Espinoza', 'Tomás Castillo', 'Bárbara Molina',
    'Felipe Campos', 'Verónica Sandoval',
  ];

  interface PatientSeed {
    id: number;
    name: string;
    email: string;
  }

  const patients: PatientSeed[] = [];

  for (const pName of patientNames) {
    const email = pName.toLowerCase().replace(/\s+/g, '.') + '@clinic.com';
    const userResult = await pool.query(
      'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password RETURNING id',
      [email, HASH, pName, 'user', generateRut(), '+569' + String(randomInt(10000000, 99999999)), DEFAULT_TENANT_ID]
    );
    patients.push({ id: userResult.rows[0].id, name: pName, email });
  }

  logger.info(`Usuarios creados: 1 admin, ${doctors.length} doctores, ${patients.length} pacientes`);

  // ==================== DOCTOR EXCEPTIONS ====================
  const exceptionData = [
    { doctorIdx: 0, daysAgo: 30, fullDay: true },
    { doctorIdx: 2, daysAgo: 45, fullDay: true },
    { doctorIdx: 4, daysAgo: 15, fullDay: false, start: '09:00', end: '12:00' },
    { doctorIdx: 1, daysAgo: 60, fullDay: true },
    { doctorIdx: 3, daysFromNow: 7, fullDay: true },
    { doctorIdx: 5, daysFromNow: 14, fullDay: false, start: '14:00', end: '18:00' },
  ];

  for (const ex of exceptionData) {
    const date = ex.daysAgo
      ? addDays(today, -ex.daysAgo)
      : addDays(today, ex.daysFromNow ?? 0);
    await pool.query(
      `INSERT INTO doctor_exceptions (doctor_id, date, start_time, end_time, is_full_day, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        doctors[ex.doctorIdx].id,
        formatDate(date),
        ex.start || null,
        ex.end || null,
        ex.fullDay,
        DEFAULT_TENANT_ID,
      ]
    );
  }

  // ==================== BOOKINGS ====================
  await pool.query('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_future_date');

  interface PatientCondition {
    diagnosis: string;
    doctorIdx: number;
    vitalKey: string;
  }
  const chronicPatientConditions: [number, PatientCondition][] = [
    [0,  { diagnosis: 'Hipertensión arterial esencial', doctorIdx: 0, vitalKey: 'hypertension' }],
    [1,  { diagnosis: 'Hipotiroidismo', doctorIdx: 9, vitalKey: 'hypothyroid' }],
    [1,  { diagnosis: 'Artritis reumatoide', doctorIdx: 11, vitalKey: 'arthritis' }],
    [2,  { diagnosis: 'Asma bronquial', doctorIdx: 4, vitalKey: 'asthma' }],
    [3,  { diagnosis: 'Colecistitis crónica', doctorIdx: 4, vitalKey: 'cholecystitis' }],
    [4,  { diagnosis: 'Lumbago crónico', doctorIdx: 6, vitalKey: 'lumbago' }],
    [5,  { diagnosis: 'Trastorno de ansiedad generalizada', doctorIdx: 8, vitalKey: 'anxiety' }],
    [6,  { diagnosis: 'Diabetes mellitus tipo 2 con hiperlipidemia', doctorIdx: 0, vitalKey: 'diabetes' }],
    [7,  { diagnosis: 'Migraña con aura', doctorIdx: 2, vitalKey: 'migraine' }],
    [8,  { diagnosis: 'EPOC estable', doctorIdx: 4, vitalKey: 'copd' }],
    [9,  { diagnosis: 'Infección del tracto urinario', doctorIdx: 10, vitalKey: 'infection' }],
    [10, { diagnosis: 'Insuficiencia cardíaca crónica', doctorIdx: 0, vitalKey: 'cardiac' }],
    [11, { diagnosis: 'Dermatitis atópica', doctorIdx: 1, vitalKey: 'dermatitis' }],
    [12, { diagnosis: 'Colelitiasis', doctorIdx: 4, vitalKey: 'cholecystitis' }],
    [13, { diagnosis: 'Control ginecológico de rutina', doctorIdx: 5, vitalKey: 'normal' }],
    [14, { diagnosis: 'Hernia inguinal', doctorIdx: 10, vitalKey: 'normal' }],
  ];

  const bookingIds: number[] = [];
  const usedSlots = new Set<string>();

  // Targeted bookings for chronic patients with their specific doctors
  for (const [pIdx, cond] of chronicPatientConditions) {
    const patient = patients[pIdx];
    const doctor = doctors[cond.doctorIdx];
    const visits = 3;
    for (let v = 0; v < visits; v++) {
      const daysAgo = randomInt(5, 120);
      const date = addDays(today, -daysAgo);
      const hour = randomInt(9, 17);
      const minute = pick(['00', '15', '30', '45']);
      const slotKey = `${doctor.id}-${formatDate(date)}-${hour}:${minute}`;
      if (usedSlots.has(slotKey)) continue;
      usedSlots.add(slotKey);
      try {
        const result = await pool.query(
          `INSERT INTO bookings (doctor_id, user_id, date, time, duration, status, confirmed, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [doctor.id, patient.id, formatDate(date), `${String(hour).padStart(2, '0')}:${minute}`, 30, 'completed', true, DEFAULT_TENANT_ID]
        );
        bookingIds.push(result.rows[0].id);
      } catch {}
    }
  }

  // ==================== RANDOM PAST BOOKINGS ====================
  for (let i = 0; i < 50; i++) {
    const doctor = pick(doctors);
    const patient = pick(patients);
    const daysAgo = randomInt(1, 60);
    const date = addDays(today, -daysAgo);
    const hour = randomInt(9, 16);
    const time = `${String(hour).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`;
    const slotKey = `${doctor.id}-${formatDate(date)}-${time}`;
    if (usedSlots.has(slotKey)) continue;
    usedSlots.add(slotKey);

    const status = daysAgo <= 1
      ? pick(['pending', 'confirmed'])
      : pick(['completed', 'completed', 'completed', 'no_show', 'cancelled']);

    try {
      const result = await pool.query(
        `INSERT INTO bookings (doctor_id, user_id, date, time, duration, status, confirmed, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [doctor.id, patient.id, formatDate(date), time, 30, status, status === 'confirmed' || status === 'completed', DEFAULT_TENANT_ID]
      );
      bookingIds.push(result.rows[0].id);
    } catch {}
  }

  // ==================== FUTURE BOOKINGS ====================
  for (let i = 0; i < 40; i++) {
    const doctor = pick(doctors);
    const patient = pick(patients);
    const daysFromNow = randomInt(1, 30);
    const date = addDays(today, daysFromNow);
    const hour = randomInt(9, 16);
    const time = `${String(hour).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`;
    const slotKey = `${doctor.id}-${formatDate(date)}-${time}`;
    if (usedSlots.has(slotKey)) continue;
    usedSlots.add(slotKey);
    const confirmed = Math.random() > 0.3;

    try {
      const result = await pool.query(
        `INSERT INTO bookings (doctor_id, user_id, date, time, duration, status, confirmed, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [doctor.id, patient.id, formatDate(date), time, 30, confirmed ? 'confirmed' : 'pending', confirmed, DEFAULT_TENANT_ID]
      );
      bookingIds.push(result.rows[0].id);
    } catch {}
  }

  await pool.query('ALTER TABLE bookings ADD CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE) NOT VALID');
  logger.info(`Reservas creadas: ${bookingIds.length}`);

  // ==================== DIAGNOSIS PROFILES ====================
  const chiefComplaintsByDiag: Record<string, string[]> = {
    'Hipertensión arterial esencial': ['Control de presión arterial', 'Cefalea occipital', 'Mareos frecuentes', 'Chequeo cardiológico de rutina'],
    'Diabetes mellitus tipo 2': ['Control de glicemia', 'Visión borrosa', 'Polidipsia y poliuria', 'Revisión de diabetes'],
    'Asma bronquial': ['Dificultad para respirar', 'Sibilancias nocturnas', 'Crisis de tos', 'Opresión en el pecho'],
    'Gastritis crónica': ['Dolor epigástrico', 'Ardor estomacal', 'Náuseas matinales', 'Digestión lenta'],
    'Lumbago crónico': ['Dolor lumbar persistente', 'Lumbago agudo', 'Dolor de espalda al moverse'],
    'Trastorno de ansiedad generalizada': ['Nerviosismo constante', 'Dificultad para dormir', 'Palpitaciones', 'Preocupación excesiva'],
    'Hipotiroidismo': ['Cansancio extremo', 'Aumento de peso', 'Piel seca', 'Intolerancia al frío'],
    'Diabetes mellitus tipo 2 con hiperlipidemia': ['Control metabólico', 'Revisión de exámenes', 'Colesterol elevado'],
    'Migraña con aura': ['Dolor de cabeza intenso', 'Migraña con visión borrosa', 'Cefalea pulsátil unilateral'],
    'Infección del tracto urinario': ['Ardor al orinar', 'Orina frecuente', 'Dolor lumbar bajo', 'Fiebre y escalofríos'],
    'Insuficiencia cardíaca crónica': ['Falta de aire al caminar', 'Edema en piernas', 'Ortopnea', 'Fatiga al esfuerzo mínimo'],
    'Dermatitis atópica': ['Picazón intensa', 'Erupción cutánea', 'Piel seca y roja', 'Lesiones en pliegues'],
    'Colecistitis crónica': ['Dolor abdominal derecho', 'Dolor después de comer', 'Náuseas y vómitos'],
    'Colelitiasis': ['Dolor abdominal cólico', 'Intolerancia a comidas grasas', 'Náuseas postprandiales'],
    'Hernia inguinal': ['Protrucción en ingle', 'Dolor inguinal al esfuerzo', 'Molestia en zona inguinal'],
    'Artritis reumatoide': ['Dolor articular', 'Rigidez matinal', 'Inflamación en manos y muñecas'],
    'EPOC estable': ['Dificultad respiratoria crónica', 'Tos con expectoración', 'Control de EPOC'],
    'Neumonía adquirida en la comunidad': ['Fiebre alta', 'Tos productiva', 'Dolor torácico', 'Dificultad respiratoria'],
    'Control ginecológico de rutina': ['Control ginecológico anual', 'Papanicolaou de rutina', 'Consulta de salud femenina'],
  };

  const anamnesisByDiag: Record<string, string[]> = {
    'Hipertensión arterial esencial': [
      'Paciente con HTA diagnosticada hace 3 años. Refiere cefalea occipital matinal de intensidad 5/10. No sigue tratamiento regularmente. Dieta alta en sodio. Sedentarismo. Antecedente de padre con HTA e IAM.',
      'Paciente hipertenso conocido en control. TA elevada en últimos controles. Refiere buena adherencia al Enalapril. Sin otros síntomas cardiovasculares. IMC 28.5. Niega tabaquismo.',
    ],
    'Diabetes mellitus tipo 2': [
      'Paciente con DM2 desde hace 5 años. Refiere aumento de sed y frecuencia urinaria en últimas semanas. No realiza control de glicemia en casa. Alimentación irregular. Sin neuropatía evidente. Antecedente de madre con diabetes.',
    ],
    'Asma bronquial': [
      'Paciente con asma diagnosticada en la infancia. Refiere crisis nocturnas 2-3 veces por semana. Uso frecuente de Salbutamol de rescate. Tos con esputo claro. Limitación para actividades físicas. Niega hospitalizaciones recientes.',
    ],
    'Gastritis crónica': [
      'Paciente refiere dolor epigástrico urente desde hace 2 meses. Relacionado con alimentación. Ha usado antiácidos sin mejoría significativa. Niega melena o hematemesis. Antecedente de gastritis crónica por H. pylori.',
    ],
    'Lumbago crónico': [
      'Paciente con dolor lumbar crónico reagudizado desde hace 3 días. Dolor 7/10 que se irradia a glúteo derecho. No irradiación a extremidades. Niega parestesias. Empeora con movimientos de flexión. Trabaja cargando peso.',
    ],
    'Trastorno de ansiedad generalizada': [
      'Paciente refiere ansiedad constante desde hace varios meses. Preocupación excesiva por temas cotidianos. Dificultad para conciliar el sueño. Palpitaciones recurrentes. Irritabilidad. Ha probado terapias de relajación sin éxito.',
    ],
    'Hipotiroidismo': [
      'Paciente refiere fatiga progresiva, aumento de peso (8 kg en 6 meses), piel seca, estreñimiento y sensibilidad al frío. Ronquera ocasional. Antecedente de tiroiditis de Hashimoto en estudio.',
    ],
    'Diabetes mellitus tipo 2 con hiperlipidemia': [
      'Paciente con DM2 e hiperlipidemia conocidas. Última HbA1c de 8.2%. Refiere mala adherencia a metformina por molestias gastrointestinales. Colesterol total elevado en último control. Dieta alta en carbohidratos y grasas.',
    ],
    'Migraña con aura': [
      'Paciente refiere episodios de cefalea pulsátil unilateral 2-3 veces al mes. Precedida de escotomas visuales. Duración de 12-24 horas. Fotofobia y sonofobia asociadas. Náuseas. Antecedente de migraña en madre y hermana.',
    ],
    'Infección del tracto urinario': [
      'Paciente refiere disuria, polaquiuria y tenesmo vesical desde hace 4 días. Dolor suprapúbico. Fiebre de 38.2°C. Niega dolor lumbar. No antecedentes de ITU recurrente. Ha tomado antibiótico sin receta previa.',
    ],
    'Insuficiencia cardíaca crónica': [
      'Paciente con ICC NYHA II-III. Refiere disnea de esfuerzo progresiva. Ortopnea de 2 almohadas. Edema bimaleolar. Ganancia de peso de 3 kg en última semana. Antecedente de cardiopatía hipertensiva e IAM anterior.',
    ],
    'Dermatitis atópica': [
      'Paciente refiere lesiones eccematosas pruriginosas en flexuras desde hace 2 semanas. Brotes recurrentes desde la niñez. Ha usado corticoide tópico irregularmente. Prurito intenso que interfiere con el sueño.',
    ],
    'Colecistitis crónica': [
      'Paciente refiere dolor en hipocondrio derecho postprandial de 2 meses de evolución. Náuseas ocasionales. Intolerancia a comidas grasas. Episodio agudo hace 2 días con dolor intenso y fiebre 37.8°C.',
    ],
    'Colelitiasis': [
      'Paciente refiere episodios de dolor abdominal cólico después de comidas grasas. Ecografía abdominal muestra litiasis vesicular múltiple. Sin signos de colecistitis aguda. Programada para colecistectomía electiva.',
    ],
    'Hernia inguinal': [
      'Paciente refiere bulto en región inguinal derecha desde hace 6 meses. Aumenta con esfuerzo y bipedestación. Molestia ocasional. No dolor intenso. Refiere deseo de resolución quirúrgica.',
    ],
    'Artritis reumatoide': [
      'Paciente con diagnóstico de AR desde hace 3 años. Refiere dolor e inflamación en muñecas, MCF e IFP bilateral. Rigidez matinal >60 min. Dificultad para realizar actividades diarias. En tratamiento irregular.',
    ],
    'EPOC estable': [
      'Paciente con EPOC GOLD II. Ex fumador (30 paquetes-año). Disnea moderada al subir escaleras. Tos crónica con expectoración matinal. Uso de Tiotropio diario. FEV1/FVC <0.7 en espirometría previa.',
    ],
    'Neumonía adquirida en la comunidad': [
      'Paciente cuadro de 5 días de evolución: fiebre hasta 39°C, tos productiva con expectoración verdosa, dolor pleurítico en base derecha y disnea. Niega factores de riesgo. Sin respuesta a tratamiento ambulatorio.',
    ],
  };

  const physicalExamByDiag: Record<string, string[]> = {
    'Hipertensión arterial esencial': [
      'Conciente, orientado. PA elevada. Ruidos cardíacos rítmicos, sin soplos. Pulsos periféricos simétricos. Sin edemas. Fondo de ojo: sin signos de retinopatía hipertensiva.',
      'Regular estado general. PA 145/92 mmHg. FC 78 lpm. Auscultación cardiopulmonar normal. Pulsos pedios presentes. IMC 28.5. No edemas.',
    ],
    'Diabetes mellitus tipo 2': [
      'Paciente en buenas condiciones. Mucosas semihúmedas. Auscultación cardiopulmonar normal. Abdomen blando, no doloroso. Pulsos pedios disminuidos. Sensibilidad distal conservada. Sin lesiones en pies.',
    ],
    'Asma bronquial': [
      'Paciente taquipneico. FR 22 lpm. SatO2 95%. Auscultación pulmonar con sibilancias espiratorias difusas y roncus. Uso de musculatura accesoria leve. Tiraje intercostal mínimo.',
    ],
    'Gastritis crónica': [
      'Abdomen blando, depresible. Dolor epigástrico a la palpación profunda. Sin signos de irritación peritoneal. Ruidos intestinales presentes. Murphy negativo. No masas palpables.',
    ],
    'Lumbago crónico': [
      'Columna lumbar con dolor a la palpación paravertebral derecha. Limitación a la flexión anterior. Lasègue negativo bilateral. Fuerza y sensibilidad conservadas en EEII. ROTS presentes y simétricos.',
    ],
    'Trastorno de ansiedad generalizada': [
      'Paciente alerta, cooperadora, pero visiblemente ansiosa. Temblor fino en manos. Taquicardia sinusal a 95 lpm. Dermografismo leve. Refiere sensación de nudo en la garganta durante la entrevista.',
    ],
    'Hipotiroidismo': [
      'Piel seca y fría. Edema facial leve. Bocio difuso no doloroso a la palpación. Reflejo aquiliano prolongado. Bradicardia relativa 62 lpm. Peso aumentado. Mixedema pretibial leve.',
    ],
    'Migraña con aura': [
      'Paciente incómoda por cefalea. Examen neurológico normal: pares craneales íntegros, fuerza y sensibilidad conservadas, marcha normal. Signos meníngeos negativos. Fondo de ojo normal.',
    ],
    'Infección del tracto urinario': [
      'Febril 38.2ºC. Puño percusión lumbar derecha positiva leve. Abdomen blando, dolor suprapúbico a la palpación. Genitales externos sin lesiones. Signos de deshidratación leve.',
    ],
    'Insuficiencia cardíaca crónica': [
      'Paciente en regular estado. Ortopneico con 2 almohadas. Ingurgitación yugular leve. Crepitantes bibasales en tercio inferior. Edema bimaleolar con fóvea ++. Hepatomegalia moderada.',
    ],
    'Dermatitis atópica': [
      'Lesiones eccematosas eritematosas con descamación fina en flexuras cubitales y poplíteas. Liquenificación en zonas de rascado. Excoriaciones. Signo de Dennie-Morgan positivo. Piel xerótica generalizada.',
    ],
    'Artritis reumatoide': [
      'Sinovitis simétrica en muñecas, MCF e IFP bilateral. Desviación cubital incipiente. Nódulos reumatoides en codos. Dolor a la movilización. Rigidez articular. Limitación funcional moderada.',
    ],
    'EPOC estable': [
      'Tórax en tonel. FR 24 lpm. Uso de musculatura accesoria. Auscultación pulmonar con murmullo pulmonar disminuido, espiración prolongada. Roncus diseminados. SatO2 93%. Cianosis leve.',
    ],
    'Neumonía adquirida en la comunidad': [
      'Paciente febril 38.5ºC. TA 130/85. SatO2 94% con aire ambiente. Auscultación pulmonar con crepitantes en base derecha y soplo tubárico. Matidez a la percusión. FR 20 lpm.',
    ],
    'Hernia inguinal': [
      'Se palpa tumoración reductible en región inguinal derecha que aumenta con Valsalva. No dolorosa a la palpación. No signos de estrangulación. Testículos normales. Anillos inguinales sin alteraciones.',
    ],
  };

  const treatmentPlanByDiag: Record<string, string> = {
    'Hipertensión arterial esencial': 'Ajuste de terapia antihipertensiva. Control de PA en 1 mes. Reducir sodio en alimentación. Ejercicio 30 min/día. Evaluar perfil lipídico y función renal.',
    'Diabetes mellitus tipo 2': 'Ajustar metformina. Educación diabetológica. Control de glicemia capilar diario. Evaluación por nutricionista. Control en 1 mes con HbA1c. Cuidado de pies.',
    'Asma bronquial': 'Optimizar tratamiento de mantención con corticoide inhalado. Plan de acción para crisis. Derivación a kinesiología respiratoria. Control en 2-3 semanas.',
    'Gastritis crónica': 'Inhibidor de bomba de protones por 14 días. Dieta fraccionada y baja en irritantes gástricos. Evaluar necesidad de estudio endoscópico. Control en 1 mes.',
    'Lumbago crónico': 'AINEs por 7 días. Reposo relativo. Kinesioterapia lumbar. Evaluar estudio de imágenes si no mejora. Higiene postural. Control en 15 días.',
    'Trastorno de ansiedad generalizada': 'Iniciar ISRS. Derivación a psicoterapia. Técnicas de relajación y respiración. Higiene del sueño. Control en 3 semanas para evaluar respuesta.',
    'Hipotiroidismo': 'Iniciar levotiroxina. Control de TSH en 6-8 semanas. Ajuste de dosis según perfil tiroideo. Educación sobre toma en ayunas. Control de peso y síntomas.',
    'Diabetes mellitus tipo 2 con hiperlipidemia': 'Ajustar tratamiento: metformina + atorvastatina. Perfil lipídico en 3 meses. HbA1c en 3 meses. Educación nutricional intensiva. Evaluar adherencia terapéutica.',
    'Migraña con aura': 'Tratamiento agudo con triptanes. Profilaxis con propranolol. Diario de cefaleas. Identificar y evitar triggers. Control en 1 mes para evaluar respuesta a profilaxis.',
    'Infección del tracto urinario': 'Antibioticoterapia según cultivo y sensibilidades. Aumentar ingesta de líquidos. Uroanalítico de control post tratamiento. Evaluar factores de riesgo.',
    'Insuficiencia cardíaca crónica': 'Optimizar terapia: diurético + IECA + beta-bloqueador. Restricción de sodio y líquidos. Control de peso diario. Evaluar función renal y electrolitos. Control en 2 semanas.',
    'Dermatitis atópica': 'Corticoide tópico por 10 días. Emolientes diarios. Antihistamínico oral por prurito nocturno. Evitar factores desencadenantes. Control en 2 semanas.',
    'Colecistitis crónica': 'Analgesia. Evaluación por cirugía para colecistectomía laparoscópica programada. Dieta baja en grasas mientras tanto. Control con cirujano en 1 semana.',
    'Colelitiasis': 'Colecistectomía laparoscópica electiva programada. Dieta baja en grasas hasta cirugía. Evaluación preoperatoria completa. Control postquirúrgico en 7 días.',
    'Hernia inguinal': 'Hernioplastía inguinal programada. Evaluación prequirúrgica completa. Suspender AINEs 7 días antes. Control postoperatorio en 7 días.',
    'Artritis reumatoide': 'Reiniciar tratamiento de base con metotrexato. Ajustar dosis según tolerancia. Prednisona en dosis descendente. Evaluación por reumatología. Controles hematológicos mensuales.',
    'EPOC estable': 'Optimizar broncodilatación. Programa de rehabilitación pulmonar. Vacunación influenza y neumococo. Cesación tabáquica. Control espirométrico en 3 meses.',
    'Neumonía adquirida en la comunidad': 'Antibioticoterapia empírica. Control de temperatura y síntomas. Radiografía de tórax de control en 4-6 semanas. Reposo. Control en 48-72 horas.',
    'Control ginecológico de rutina': 'Toma de Papanicolaou. Evaluación mamaria. Consejería en salud sexual y reproductiva. Próximo control en 1 año.',
  };

  const notesByDiag: Record<string, string[]> = {
    'Hipertensión arterial esencial': [
      'Alergias: Penicilina. Antecedentes familiares: Padre con HTA, IAM a los 58 años. Hábitos: Sedentario, alimentación alta en sodio. Ex fumador. Sin antecedentes quirúrgicos.',
      'Alergias: Ninguna conocida. Antecedentes: HTA desde 2021. Niega otras comorbilidades. Hábitos: Caminata 3 veces/semana.',
    ],
    'Diabetes mellitus tipo 2': [
      'Alergias: Sulfonamidas. Antecedentes: DM2 desde 2019. Madre con DM2. No antecedentes quirúrgicos. Hábitos: Dieta alta en carbohidratos. Sedentario.',
    ],
    'Asma bronquial': [
      'Alergias: Ácaros, pólenes. Antecedentes: Asma desde los 8 años. Hospitalización por crisis asmática hace 2 años. Apendicectomía 2010. Hábitos: No fumador.',
    ],
    'Gastritis crónica': [
      'Alergias: AINES (urticaria). Antecedentes: Gastritis crónica diagnosticada endoscópicamente. H. pylori positivo tratado. No cirugías previas. Consume café y alcohol ocasionalmente.',
    ],
    'Trastorno de ansiedad generalizada': [
      'Alergias: Ninguna conocida. Antecedentes de ansiedad desde la adolescencia. Sin antecedentes quirúrgicos. Hábitos: Sedentaria. Trabajo bajo alta presión.',
    ],
    'Infección del tracto urinario': [
      'Alergias: Trimetoprima-sulfa. Antecedentes: ITU no recurrente. Niega cirugías previas. Hábitos: ingesta hídrica insuficiente.',
    ],
    'Insuficiencia cardíaca crónica': [
      'Alergias: Ninguna conocida. Antecedentes: HTA desde 2015, IAM inferolateral 2020, ICC desde 2021. Revascularización percutánea 2020. Ex fumador (20 paquetes-año).',
    ],
    'Colecistitis crónica': [
      'Alergias: Codeína. Antecedentes: Colelitiasis conocida. Obesidad grado I. Apendicectomía 2005. Hábitos: Dieta alta en grasas. Se programa colecistectomía laparoscópica.',
    ],
    'Colelitiasis': [
      'Alergias: Ninguna. Antecedentes: Litiasis vesicular conocida desde 2024. Niega cirugías previas. Se programa colecistectomía laparoscópica electiva.',
    ],
    'Hernia inguinal': [
      'Alergias: Ninguna conocida. Antecedentes: Hernia inguinal derecha. Trabajo con esfuerzo físico. Se programa hernioplastía. Sin otras comorbilidades.',
    ],
    'Neumonía adquirida en la comunidad': [
      'Alergias: Penicilina. Antecedentes: No comorbilidades. Niega tabaquismo. Sin hospitalizaciones previas. Vacunación antigripal 2025.',
    ],
    'EPOC estable': [
      'Alergias: Ninguna conocida. Antecedentes: EPOC GOLD II. Ex fumador. Vacunación antigripal e influenza al día. No hospitalizaciones en último año.',
    ],
    'Dermatitis atópica': [
      'Alergias: Metales, fragancias. Antecedentes: Dermatitis atópica desde la infancia. Rinitis alérgica concomitante. Sin cirugías.',
    ],
    'Artritis reumatoide': [
      'Alergias: AINES. Antecedentes: AR seropositiva diagnosticada hace 3 años. Madre con AR. Hábitos: Sedentaria por dolor articular.',
    ],
  };

  // ==================== MEDICATION PROFILES ====================
  const medProfiles = [
    { medication: 'Enalapril 10mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '30 días', instructions: 'Tomar con alimentos' },
    { medication: 'Losartán 50mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '30 días', instructions: 'Tomar en la mañana' },
    { medication: 'Hidroclorotiazida 25mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '30 días', instructions: 'Tomar en la mañana con desayuno' },
    { medication: 'Metformina 850mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '30 días', instructions: 'Tomar con alimentos' },
    { medication: 'Salbutamol 100mcg', dosage: '2 inhalaciones', frequency: 'cada 8 horas si es necesario', duration: '10 días', instructions: 'Inhalar cuando presente síntomas. Máximo 8 inhalaciones al día' },
    { medication: 'Budesonida 200mcg', dosage: '1 inhalación', frequency: 'cada 12 horas', duration: '30 días', instructions: 'Inhalar después de enjuague bucal. Enjuagar boca después de uso' },
    { medication: 'Omeprazol 20mg', dosage: '1 cápsula', frequency: 'cada 24 horas', duration: '14 días', instructions: 'Tomar en ayunas 30 minutos antes del desayuno' },
    { medication: 'Ibuprofeno 400mg', dosage: '1 comprimido', frequency: 'cada 8 horas', duration: '7 días', instructions: 'Tomar con alimentos. No exceder 3 dosis al día' },
    { medication: 'Paracetamol 500mg', dosage: '1 comprimido', frequency: 'cada 8 horas', duration: '5 días', instructions: 'Para dolor moderado' },
    { medication: 'Sertralina 50mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '30 días', instructions: 'Tomar en la mañana con desayuno. Puede causar náuseas las primeras semanas' },
    { medication: 'Clonazepam 0.5mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '15 días', instructions: 'No suspender bruscamente. Puede causar somnolencia. Evitar alcohol' },
    { medication: 'Levotiroxina 50mcg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '30 días', instructions: 'Tomar en ayunas 30 min antes del desayuno. No tomar con calcio ni hierro' },
    { medication: 'Atorvastatina 20mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '30 días', instructions: 'Tomar en la noche' },
    { medication: 'Gemfibrozilo 600mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '30 días', instructions: 'Tomar 30 minutos antes de alimentos' },
    { medication: 'Sumatriptán 50mg', dosage: '1 comprimido', frequency: 'cada 12 horas si es necesario', duration: '5 días', instructions: 'Tomar al inicio de la cefalea. Máximo 2 comprimidos al día' },
    { medication: 'Propranolol 40mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '30 días', instructions: 'Uso profiláctico. No suspender bruscamente. Controlar frecuencia cardíaca' },
    { medication: 'Ciprofloxacino 500mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '7 días', instructions: 'Tomar con abundante agua. Evitar antiácidos. Completar todo el tratamiento' },
    { medication: 'Nitrofurantoína 100mg', dosage: '1 cápsula', frequency: 'cada 6 horas', duration: '5 días', instructions: 'Tomar con alimentos. Puede colorar la orina' },
    { medication: 'Furosemida 40mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '30 días', instructions: 'Tomar en la mañana. Controlar peso y diuresis' },
    { medication: 'Metoprolol 50mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '30 días', instructions: 'No suspender bruscamente. Controlar frecuencia cardíaca' },
    { medication: 'Digoxina 0.25mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '30 días', instructions: 'Controlar niveles plasmáticos periódicamente' },
    { medication: 'Hidrocortisona 1% crema', dosage: 'aplicar capa fina', frequency: 'cada 12 horas', duration: '10 días', instructions: 'Solo en zonas afectadas. Evitar uso prolongado >14 días' },
    { medication: 'Cetirizina 10mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '10 días', instructions: 'Tomar en la noche para controlar prurito' },
    { medication: 'Metotrexato 7.5mg', dosage: '1 comprimido', frequency: '1 vez por semana', duration: '30 días', instructions: 'TOMAR UNA VEZ POR SEMANA. Control hematológico mensual' },
    { medication: 'Prednisona 5mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '15 días', instructions: 'Reducir gradualmente. No suspender bruscamente' },
    { medication: 'Tiotropio 18mcg', dosage: '1 cápsula inhalada', frequency: 'cada 24 horas', duration: '30 días', instructions: 'Inhalar a la misma hora todos los días. No tragar la cápsula' },
    { medication: 'Teofilina 200mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '30 días', instructions: 'No exceder dosis. Puede causar náuseas' },
    { medication: 'Amoxicilina + Ác. clavulánico 875/125mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '10 días', instructions: 'Tomar con alimentos. Completar todo el tratamiento' },
    { medication: 'Azitromicina 500mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '3 días', instructions: 'Completar los 3 días de tratamiento' },
  ];

  const medIndicesByDiag: Record<string, number[]> = {
    'Hipertensión arterial esencial': [0, 1],
    'Diabetes mellitus tipo 2': [3],
    'Asma bronquial': [4, 5],
    'Gastritis crónica': [6],
    'Lumbago crónico': [7, 8],
    'Trastorno de ansiedad generalizada': [9, 10],
    'Hipotiroidismo': [11],
    'Diabetes mellitus tipo 2 con hiperlipidemia': [3, 12],
    'Migraña con aura': [14, 15],
    'Infección del tracto urinario': [16],
    'Insuficiencia cardíaca crónica': [0, 19, 18],
    'Dermatitis atópica': [22, 23],
    'Colecistitis crónica': [7],
    'Colelitiasis': [7, 8],
    'Hernia inguinal': [8],
    'Artritis reumatoide': [24, 25],
    'EPOC estable': [4, 26],
    'Neumonía adquirida en la comunidad': [28, 29],
    'Control ginecológico de rutina': [],
  };

  // lab_test DB IDs (from init.sql seed order: 1=Hemograma, 2=Glucosa en ayunas, 3=Perfil lipídico, 4=Creatinina, 5=TSH, 6=Urocultivo, 7=HbA1c, 8=PCR, 9=Transaminasas)
  const labTestIndicesByDiag: Record<string, number[]> = {
    'Hipertensión arterial esencial': [4, 5],
    'Diabetes mellitus tipo 2': [2, 7],
    'Asma bronquial': [1, 8],
    'Gastritis crónica': [1],
    'Lumbago crónico': [1, 8],
    'Trastorno de ansiedad generalizada': [5],
    'Hipotiroidismo': [5],
    'Diabetes mellitus tipo 2 con hiperlipidemia': [2, 3, 7],
    'Migraña con aura': [1],
    'Infección del tracto urinario': [1, 6, 8],
    'Insuficiencia cardíaca crónica': [1, 3, 4],
    'Dermatitis atópica': [1],
    'Colecistitis crónica': [1, 3, 8],
    'Colelitiasis': [1, 3, 8],
    'Hernia inguinal': [1],
    'Artritis reumatoide': [1, 8],
    'EPOC estable': [1, 8],
    'Neumonía adquirida en la comunidad': [1, 8],
    'Control ginecológico de rutina': [1],
  };

  const conditionByPatient = new Map<number, PatientCondition>();
  for (const [pIdx, cond] of chronicPatientConditions) {
    conditionByPatient.set(patients[pIdx].id, cond);
  }

  // ==================== VITAL SIGNS PRESETS ====================
  const vitalPresets: Record<string, (o?: object) => Record<string, unknown>> = {
    hypertension: (o) => ({ blood_pressure: '148/94', heart_rate: 76, temperature: 36.5, respiratory_rate: 16, oxygen_saturation: 97, weight: 80, height: 170, bmi: 27.7, ...o }),
    diabetes: (o) => ({ blood_pressure: '135/85', heart_rate: 82, temperature: 36.4, respiratory_rate: 17, oxygen_saturation: 98, weight: 75, height: 168, bmi: 26.5, ...o }),
    asthma: (o) => ({ blood_pressure: '125/80', heart_rate: 88, temperature: 36.8, respiratory_rate: 22, oxygen_saturation: 95, weight: 70, height: 175, bmi: 22.9, ...o }),
    gastritis: (o) => ({ blood_pressure: '118/75', heart_rate: 72, temperature: 36.4, respiratory_rate: 16, oxygen_saturation: 98, weight: 65, height: 170, bmi: 22.5, ...o }),
    lumbago: (o) => ({ blood_pressure: '125/80', heart_rate: 70, temperature: 36.5, respiratory_rate: 15, oxygen_saturation: 98, weight: 78, height: 175, bmi: 25.5, ...o }),
    anxiety: (o) => ({ blood_pressure: '120/75', heart_rate: 95, temperature: 36.6, respiratory_rate: 20, oxygen_saturation: 99, weight: 65, height: 170, bmi: 22.5, ...o }),
    hypothyroid: (o) => ({ blood_pressure: '128/82', heart_rate: 62, temperature: 36.1, respiratory_rate: 15, oxygen_saturation: 97, weight: 85, height: 163, bmi: 32.0, ...o }),
    migraine: (o) => ({ blood_pressure: '122/78', heart_rate: 74, temperature: 36.4, respiratory_rate: 16, oxygen_saturation: 98, weight: 62, height: 165, bmi: 22.8, ...o }),
    infection: (o) => ({ blood_pressure: '130/85', heart_rate: 95, temperature: 38.2, respiratory_rate: 18, oxygen_saturation: 96, weight: 72, height: 165, bmi: 26.4, ...o }),
    cardiac: (o) => ({ blood_pressure: '155/90', heart_rate: 68, temperature: 36.3, respiratory_rate: 14, oxygen_saturation: 95, weight: 85, height: 178, bmi: 26.8, ...o }),
    dermatitis: (o) => ({ blood_pressure: '118/76', heart_rate: 72, temperature: 36.5, respiratory_rate: 16, oxygen_saturation: 98, weight: 58, height: 160, bmi: 22.7, ...o }),
    arthritis: (o) => ({ blood_pressure: '128/82', heart_rate: 72, temperature: 37.0, respiratory_rate: 16, oxygen_saturation: 97, weight: 60, height: 162, bmi: 22.9, ...o }),
    copd: (o) => ({ blood_pressure: '132/84', heart_rate: 84, temperature: 36.6, respiratory_rate: 24, oxygen_saturation: 93, weight: 68, height: 172, bmi: 23.0, ...o }),
    cholecystitis: (o) => ({ blood_pressure: '128/80', heart_rate: 88, temperature: 37.5, respiratory_rate: 17, oxygen_saturation: 97, weight: 70, height: 168, bmi: 24.8, ...o }),
    normal: (o) => ({ blood_pressure: '120/80', heart_rate: 72, temperature: 36.6, respiratory_rate: 16, oxygen_saturation: 98, weight: 70, height: 170, bmi: 24.2, ...o }),
  };

  // ==================== GENERAL DIAGNOSES (for patients without chronic profile) ====================
  const generalDiagnoses = [
    { diagnosis: 'Gastritis crónica', cie10: 'K29', vitalKey: 'gastritis' },
    { diagnosis: 'Lumbago crónico', cie10: 'M54.5', vitalKey: 'lumbago' },
    { diagnosis: 'Migraña con aura', cie10: 'G43', vitalKey: 'migraine' },
    { diagnosis: 'Infección del tracto urinario', cie10: 'N39.0', vitalKey: 'infection' },
    { diagnosis: 'Neumonía adquirida en la comunidad', cie10: 'J18.9', vitalKey: 'infection' },
    { diagnosis: 'Dermatitis atópica', cie10: 'L20.9', vitalKey: 'dermatitis' },
    { diagnosis: 'Hipotiroidismo', cie10: 'E03.9', vitalKey: 'hypothyroid' },
    { diagnosis: 'Artritis reumatoide', cie10: 'M06.9', vitalKey: 'arthritis' },
    { diagnosis: 'Diabetes mellitus tipo 2', cie10: 'E11', vitalKey: 'diabetes' },
    { diagnosis: 'Asma bronquial', cie10: 'J45', vitalKey: 'asthma' },
  ];

  // ==================== SURGERY PROFILES for specific patients ====================
  const surgeryRecords: Array<{ patientIdx: number; doctorIdx: number; diagnosis: string; surgeryName: string; cie10: string }> = [
    // Rosa Herrera (idx 3) - Colecistectomía post colecistitis crónica
    { patientIdx: 3, doctorIdx: 4, diagnosis: 'Colecistitis crónica', surgeryName: 'Colecistectomía laparoscópica', cie10: 'K81.9' },
    // Fernando Rivas (idx 12) - Colecistectomía electiva
    { patientIdx: 12, doctorIdx: 4, diagnosis: 'Colelitiasis', surgeryName: 'Colecistectomía laparoscópica electiva', cie10: 'K80.2' },
    // Cristián Guzmán (idx 14) - Hernioplastía inguinal
    { patientIdx: 14, doctorIdx: 10, diagnosis: 'Hernia inguinal', surgeryName: 'Hernioplastía inguinal con malla', cie10: 'K40.9' },
  ];

  // ==================== CLINICAL RECORDS ====================
  const clinicalRecordIds: number[] = [];
  const createdDiagForPatient = new Map<number, Set<string>>();

  const pastBookingIds = bookingIds.slice(0, 60);
  for (const bookingId of pastBookingIds) {
    if (Math.random() > 0.65) continue;

    const bookingResult = await pool.query(
      'SELECT doctor_id, user_id FROM bookings WHERE id = $1',
      [bookingId]
    );
    if (bookingResult.rows.length === 0) continue;
    const { doctor_id, user_id } = bookingResult.rows[0];
    if (!user_id) continue;

    const patientCondition = conditionByPatient.get(user_id);
    const hasCondition = patientCondition && patientCondition.doctorIdx === doctors.findIndex(d => d.id === doctor_id);

    let diagnosis: string;
    let cie10Codes: string[];
    let chiefComplaint: string;
    let anamnesis: string;
    let physicalExam: string;
    let treatmentPlan: string;
    let notes: string;
    let vitalSigns: Record<string, unknown>;

    if (hasCondition) {
      const cond = patientCondition!;
      diagnosis = cond.diagnosis;
      chiefComplaint = pick(chiefComplaintsByDiag[diagnosis] || chiefComplaintsByDiag['Hipertensión arterial esencial']);
      anamnesis = pick(anamnesisByDiag[diagnosis] || ['Paciente acude a control médico programado.']);
      physicalExam = pick(physicalExamByDiag[diagnosis] || ['Sin hallazgos relevantes.']);
      treatmentPlan = treatmentPlanByDiag[diagnosis] || 'Control médico general.';
      notes = pick(notesByDiag[diagnosis] || ['Sin antecedentes relevantes.']);
      vitalSigns = vitalPresets[cond.vitalKey]();

      if (!createdDiagForPatient.has(user_id)) createdDiagForPatient.set(user_id, new Set());
      createdDiagForPatient.get(user_id)!.add(diagnosis);
    } else {
      const genDiag = pick(generalDiagnoses);
      diagnosis = genDiag.diagnosis;
      cie10Codes = [genDiag.cie10];
      chiefComplaint = pick(chiefComplaintsByDiag[diagnosis] || ['Consulta médica general']);
      anamnesis = pick(anamnesisByDiag[diagnosis] || ['Paciente refiere malestar general de 2 días de evolución. Afebril. Sin otros síntomas.']);
      physicalExam = pick(physicalExamByDiag[diagnosis] || ['Paciente en buen estado general. Signos vitales estables.']);
      treatmentPlan = treatmentPlanByDiag[diagnosis] || 'Tratamiento sintomático. Control evolutivo en 7 días.';
      notes = pick(notesByDiag[diagnosis] || ['Alergias: Ninguna conocida. Sin antecedentes relevantes.']);
      vitalSigns = vitalPresets[genDiag.vitalKey]();
    }

    // Look up the actual CIE-10 code from our data
    const allDiags: Record<string, string> = {
      'Hipertensión arterial esencial': 'I10',
      'Diabetes mellitus tipo 2': 'E11',
      'Asma bronquial': 'J45',
      'Gastritis crónica': 'K29',
      'Lumbago crónico': 'M54.5',
      'Trastorno de ansiedad generalizada': 'F41',
      'Hipotiroidismo': 'E03.9',
      'Diabetes mellitus tipo 2 con hiperlipidemia': 'E11',
      'Migraña con aura': 'G43',
      'Infección del tracto urinario': 'N39.0',
      'Insuficiencia cardíaca crónica': 'I50.9',
      'Dermatitis atópica': 'L20.9',
      'Colecistitis crónica': 'K81.9',
      'Colelitiasis': 'K80.2',
      'Hernia inguinal': 'K40.9',
      'Artritis reumatoide': 'M06.9',
      'EPOC estable': 'J44.9',
      'Neumonía adquirida en la comunidad': 'J18.9',
      'Control ginecológico de rutina': 'Z00.0',
    };
    cie10Codes = [allDiags[diagnosis] || 'Z00.0'];

    try {
      const result = await pool.query(
        `INSERT INTO clinical_records (patient_id, doctor_id, booking_id, chief_complaint, anamnesis, physical_exam, diagnosis, cie10_codes, treatment_plan, notes, vital_signs, status, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed', $12) RETURNING id`,
        [
          user_id,
          doctor_id,
          bookingId,
          chiefComplaint,
          anamnesis,
          physicalExam,
          diagnosis,
          cie10Codes,
          treatmentPlan,
          notes,
          JSON.stringify(vitalSigns),
          DEFAULT_TENANT_ID,
        ]
      );
      clinicalRecordIds.push(result.rows[0].id);
    } catch (err) {
      // Silently skip duplicate or failed inserts
    }
  }

  // ==================== SURGERY CLINICAL RECORDS (creates direct clinical records for surgeries) ====================
  const surgeryClinicalRecordIds: number[] = [];
  for (const sr of surgeryRecords) {
    const patientId = patients[sr.patientIdx].id;
    // Create pre-surgery evaluation record
    const presurgeryComplaint = pick(chiefComplaintsByDiag[sr.diagnosis] || ['Dolor abdominal recurrente']);
    const presurgeryAnamnesis = pick(anamnesisByDiag[sr.diagnosis] || ['Paciente refiere dolor recurrente desde hace varios meses.']);
    const presurgeryExam = pick(physicalExamByDiag[sr.diagnosis] || ['Dolor a la palpación profunda.']);
    const presurgeryPlan = `${sr.surgeryName} programada. Evaluación prequirúrgica completa. Ayuno 8 horas previas. Suspender anticoagulantes 5 días antes.`;
    const presurgeryNotes = `Paciente programado para ${sr.surgeryName}. Se entregan indicaciones preoperatorias.`;
    const presurgeryVitals = vitalPresets['normal']();

    try {
      const result = await pool.query(
        `INSERT INTO clinical_records (patient_id, doctor_id, chief_complaint, anamnesis, physical_exam, diagnosis, cie10_codes, treatment_plan, notes, vital_signs, status, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed', $11) RETURNING id`,
        [
          patientId,
          doctors[sr.doctorIdx].id,
          presurgeryComplaint,
          presurgeryAnamnesis,
          presurgeryExam,
          sr.diagnosis,
          [sr.cie10],
          presurgeryPlan,
          presurgeryNotes,
          JSON.stringify(presurgeryVitals),
          DEFAULT_TENANT_ID,
        ]
      );
      surgeryClinicalRecordIds.push(result.rows[0].id);
    } catch {}

    // Create post-surgery follow-up record
    const postDate = addDays(today, -randomInt(15, 60));
    const postNotes = `Paciente fue sometido a ${sr.surgeryName} sin complicaciones. Evolución favorable. Herida operatoria en buenas condiciones. Se retiran puntos. Se indica continuar con cuidados de herida y control en 1 mes.`;
    try {
      const result = await pool.query(
        `INSERT INTO clinical_records (patient_id, doctor_id, chief_complaint, anamnesis, physical_exam, diagnosis, cie10_codes, treatment_plan, notes, vital_signs, status, tenant_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed', $11, $12) RETURNING id`,
        [
          patientId,
          doctors[sr.doctorIdx].id,
          `Control post ${sr.surgeryName}`,
          `Paciente en control postquirúrgico. Refiere molestias leves controladas con analgesia. No signos de infección. Movilizándose progresivamente.`,
          `Herida operatoria sin signos de infección. Puntos en buenas condiciones. Leve edema perilesional. Signos vitales estables.`,
          `Postoperatorio de ${sr.surgeryName}`,
          [sr.cie10],
          'Cuidados de herida. Analgesia según necesidad. Retiro de puntos en 7 días. Reposo relativo por 2 semanas. Control en 1 mes.',
          postNotes,
          JSON.stringify(vitalPresets['normal']()),
          DEFAULT_TENANT_ID,
          formatDate(postDate),
        ]
      );
      surgeryClinicalRecordIds.push(result.rows[0].id);
    } catch {}
  }

  logger.info(`Registros clínicos creados: ${clinicalRecordIds.length} (más ${surgeryClinicalRecordIds.length} quirúrgicos)`);

  // ==================== PRESCRIPTIONS ====================
  let prescriptionCount = 0;
  const allCrIds = [...clinicalRecordIds, ...surgeryClinicalRecordIds];
  for (const crId of allCrIds) {
    if (Math.random() > 0.55) continue;
    try {
      const crResult = await pool.query(
        'SELECT diagnosis FROM clinical_records WHERE id = $1',
        [crId]
      );
      if (crResult.rows.length === 0) continue;
      const diagName: string = crResult.rows[0].diagnosis;
      const medIndices = medIndicesByDiag[diagName];
      if (!medIndices || medIndices.length === 0) continue;

      const medCount = Math.min(randomInt(1, 3), medIndices.length);
      const usedMeds = new Set<number>();
      for (let m = 0; m < medCount; m++) {
        let medIdx: number;
        do { medIdx = pick(medIndices); } while (usedMeds.has(medIdx) && usedMeds.size < medIndices.length);
        usedMeds.add(medIdx);
        const med = medProfiles[medIdx];
        await pool.query(
          `INSERT INTO prescriptions (clinical_record_id, medication, dosage, frequency, duration, instructions, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [crId, med.medication, med.dosage, med.frequency, med.duration, med.instructions, DEFAULT_TENANT_ID]
        );
        prescriptionCount++;
      }
    } catch {
    }
  }

  logger.info(`Recetas creadas: ${prescriptionCount}`);

  // ==================== INVOICES ====================
  const conceptList = ['Consulta médica', 'Procedimiento', 'Urgencia', 'Control', 'Cirugía menor'];

  let invoiceCount = 0;
  for (const bookingId of pastBookingIds.slice(0, 40)) {
    if (Math.random() > 0.5) continue;
    const bookingResult = await pool.query(
      'SELECT user_id, doctor_id FROM bookings WHERE id = $1',
      [bookingId]
    );
    if (bookingResult.rows.length === 0) continue;
    const { user_id, doctor_id } = bookingResult.rows[0];
    if (!user_id) continue;

    const amount = randomInt(30, 500) + Math.round(Math.random() * 99) / 100;
    const tax = Math.round(amount * 0.19 * 100) / 100;
    try {
      await pool.query(
        `INSERT INTO invoices (invoice_number, patient_id, doctor_id, booking_id, concept, description, amount, tax_amount, discount_amount, total_amount, due_date, status, created_at, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
        [
          'INV-' + today.getFullYear() + '-' + String(invoiceCount + 1).padStart(5, '0'),
          user_id,
          doctor_id,
          bookingId,
          pick(conceptList),
          'Atención médica programada',
          amount,
          tax,
          0,
          amount + tax,
          formatDate(addDays(today, randomInt(-30, 30))),
          pick(['pending', 'paid', 'paid', 'paid', 'cancelled']),
          formatDate(addDays(today, -randomInt(1, 60))),
          DEFAULT_TENANT_ID,
        ]
      );
      invoiceCount++;
    } catch {
    }
  }

  logger.info(`Facturas creadas: ${invoiceCount}`);

  // ==================== LAB TESTS ====================
  // Realistic results per test type (for completed items)
  const labResultTemplates: Record<number, () => object> = {
    1: () => ({ hemoglobin: (13 + Math.random() * 3).toFixed(1), hematocrit: Math.round(38 + Math.random() * 10), wbc: (5 + Math.random() * 5).toFixed(1), platelets: Math.round(200 + Math.random() * 150) }),
    2: () => ({ glucose: Math.round(75 + Math.random() * 25), unit: 'mg/dL' }),
    3: () => ({ cholesterol: Math.round(150 + Math.random() * 50), triglycerides: Math.round(80 + Math.random() * 70), hdl: Math.round(35 + Math.random() * 20), ldl: Math.round(80 + Math.random() * 40) }),
    4: () => ({ creatinine: (0.7 + Math.random() * 0.5).toFixed(2), unit: 'mg/dL' }),
    5: () => ({ tsh: (0.8 + Math.random() * 3.2).toFixed(2), unit: 'mIU/L' }),
    6: () => ({ bacteria: Math.random() > 0.3 ? 'Negativo' : 'Positivo', culture: Math.random() > 0.3 ? 'Sin desarrollo bacteriano' : 'E. coli >100,000 UFC/mL' }),
    7: () => ({ hba1c: (4.5 + Math.random() * 3.5).toFixed(1), unit: '%' }),
    8: () => ({ pcr: (0.5 + Math.random() * 15).toFixed(1), unit: 'mg/L' }),
    9: () => ({ alt: Math.round(10 + Math.random() * 30), ast: Math.round(10 + Math.random() * 25), unit: 'U/L' }),
  };

  const generateRequestNumber = (): string => {
    const year = today.getFullYear();
    return 'LAB-' + year + '-' + String(randomInt(100000, 999999));
  };

  let labRequestCount = 0;
  const allCrIdsLab = [...clinicalRecordIds, ...surgeryClinicalRecordIds];
  for (const crId of allCrIdsLab) {
    if (Math.random() > 0.45) continue;
    try {
      const cr = await pool.query(
        'SELECT patient_id, doctor_id, diagnosis FROM clinical_records WHERE id = $1',
        [crId]
      );
      if (cr.rows.length === 0) continue;
      const { patient_id, doctor_id, diagnosis } = cr.rows[0];

      const labTestIds = labTestIndicesByDiag[diagnosis] || [1];
      if (labTestIds.length === 0) continue;

      const requestNumber = generateRequestNumber();
      const labStatus = pick(['pending', 'in_progress', 'completed', 'completed', 'completed']);
      const lrResult = await pool.query(
        `INSERT INTO lab_requests (request_number, patient_id, doctor_id, clinical_record_id, priority, status, notes, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [requestNumber, patient_id, doctor_id, crId, pick(['routine', 'routine', 'routine', 'urgent']), labStatus, 'Exámenes solicitados según diagnóstico', DEFAULT_TENANT_ID]
      );
      const lrId = lrResult.rows[0].id;

      for (const testId of labTestIds) {
        const itemStatus = labStatus === 'completed' ? 'completed' : pick(['pending', 'in_progress']);
        const resultTemplate = labResultTemplates[testId];
        const results = itemStatus === 'completed' && resultTemplate ? JSON.stringify(resultTemplate()) : null;

        await pool.query(
          `INSERT INTO lab_request_items (lab_request_id, lab_test_id, priority, status, results, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [lrId, testId, pick(['low', 'normal', 'normal', 'urgent']), itemStatus, results, DEFAULT_TENANT_ID]
        );
      }
      labRequestCount++;
    } catch (err) {
    }
  }

  logger.info(`Solicitudes de laboratorio creadas: ${labRequestCount}`);

  // ==================== AUDIT LOGS ====================
  const actions = ['login', 'create_booking', 'cancel_booking', 'create_clinical_record', 'update_status'];
  for (let i = 0; i < 50; i++) {
    try {
      await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, created_at, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          pick(patients.concat(doctors.map(d => ({ id: d.userId, name: '', email: '' })))).id,
          pick(actions),
          pick(['booking', 'clinical_record', 'user', 'invoice']),
          randomInt(1, 100),
          '192.168.1.' + randomInt(1, 255),
          formatDate(addDays(today, -randomInt(1, 30))),
          DEFAULT_TENANT_ID,
        ]
      );
    } catch {
    }
  }

  // ==================== ML DEMAND FORECAST ====================
  for (let d = 0; d < 14; d++) {
    try {
      await pool.query(
        `INSERT INTO ml_demand_forecast (date, predicted_demand, actual_demand, confidence, tenant_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          formatDate(addDays(today, d)),
          randomInt(15, 40),
          d < 7 ? randomInt(15, 40) : null,
          Math.round(Math.random() * 30 + 70),
          DEFAULT_TENANT_ID,
        ]
      );
    } catch {
    }
  }

  logger.info('Seed completo: base de datos poblada con datos realistas');
};

const pickOne = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

export const backfillMedicalHistory = async (): Promise<void> => {
  const { rows: existing } = await pool.query('SELECT COUNT(*) AS cnt FROM medical_history');
  if (Number(existing[0].cnt) > 0) return;

  const { rows: patients } = await pool.query(
    `SELECT id, name FROM users WHERE role = 'user' AND tenant_id = $1 ORDER BY id`,
    [DEFAULT_TENANT_ID]
  );
  if (patients.length === 0) return;

  const historyEntries: Array<{ patientName: string; condition: string; onsetYear: number; status: string; notes: string }> = [
    { patientName: 'Luis Ramírez', condition: 'Hipertensión arterial esencial', onsetYear: 2022, status: 'chronic', notes: 'Diagnosticada hace 3 años. Controlada con medicación. PA objetivo <140/90.' },
    { patientName: 'Luis Ramírez', condition: 'Dislipidemia mixta', onsetYear: 2023, status: 'chronic', notes: 'Colesterol total elevado. En tratamiento con estatina. Perfil lipídico controlado.' },
    { patientName: 'Marta Sepúlveda', condition: 'Hipotiroidismo', onsetYear: 2020, status: 'chronic', notes: 'Tiroiditis de Hashimoto. En tratamiento con levotiroxina 50mcg/día. TSH controlada.' },
    { patientName: 'Marta Sepúlveda', condition: 'Artritis reumatoide', onsetYear: 2023, status: 'chronic', notes: 'AR seropositiva. En tratamiento con metotrexato. Control hematológico mensual.' },
    { patientName: 'Jorge Castillo', condition: 'Asma bronquial', onsetYear: 2005, status: 'chronic', notes: 'Asma moderada persistente desde la infancia. Controlada con corticoide inhalado. Sin hospitalizaciones recientes.' },
    { patientName: 'Rosa Herrera', condition: 'Colecistitis crónica', onsetYear: 2024, status: 'active', notes: 'Litiasis vesicular sintomática. Programada colecistectomía laparoscópica.' },
    { patientName: 'Alberto Contreras', condition: 'Lumbago crónico', onsetYear: 2021, status: 'chronic', notes: 'Dolor lumbar crónico por desgaste discal. Manejo con fisioterapia y analgesia intermitente.' },
    { patientName: 'Silvia Medina', condition: 'Trastorno de ansiedad generalizada', onsetYear: 2019, status: 'chronic', notes: 'TAG diagnosticado. En tratamiento con sertralina. Terapia cognitivo-conductual. Estable.' },
    { patientName: 'Raúl Valenzuela', condition: 'Diabetes mellitus tipo 2', onsetYear: 2019, status: 'chronic', notes: 'DM2 con hiperlipidemia. Metformina + atorvastatina. HbA1c último control: 7.8%. Cuidado de pies anual.' },
    { patientName: 'Raúl Valenzuela', condition: 'Hipertensión arterial esencial', onsetYear: 2020, status: 'chronic', notes: 'HTA asociada a DM2. Enalapril 10mg. PA controlada en consultorio.' },
    { patientName: 'Nancy Campos', condition: 'Migraña con aura', onsetYear: 2018, status: 'chronic', notes: 'Migraña episódica con aura visual. Profilaxis con propranolol. Diario de cefaleas mantenido.' },
    { patientName: 'Héctor Vega', condition: 'EPOC GOLD II', onsetYear: 2022, status: 'chronic', notes: 'Ex fumador (30 paq-año). Tiotropio diario. Rehabilitación pulmonar. Vacunas al día.' },
    { patientName: 'Diana Paredes', condition: 'ITU recurrente', onsetYear: 2024, status: 'active', notes: 'Episodios recurrentes de cistitis. Cultivos positivos para E. coli. Evaluación urológica pendiente.' },
    { patientName: 'Oscar Fuentes', condition: 'Insuficiencia cardíaca crónica', onsetYear: 2020, status: 'chronic', notes: 'ICC NYHA II. Post IAM 2020. Triple terapia: IECA + betabloqueador + diurético. Control mensual.' },
    { patientName: 'Paola Figueroa', condition: 'Dermatitis atópica', onsetYear: 2008, status: 'chronic', notes: 'DA desde la infancia. Brotes en flexuras. Manejo con emolientes y corticoide tópico intermitente.' },
    { patientName: 'Fernando Rivas', condition: 'Colelitiasis', onsetYear: 2024, status: 'active', notes: 'Litiasis vesicular múltiple sintomática. Colecistectomía laparoscópica programada.' },
    { patientName: 'Cristián Guzmán', condition: 'Hernia inguinal derecha', onsetYear: 2024, status: 'active', notes: 'Hernia inguinal indirecta. Hernioplastía con malla programada.' },
    { patientName: 'Teresa Delgado', condition: 'Control ginecológico', onsetYear: 2024, status: 'active', notes: 'Papanicolaou de rutina. evaluación mamaria. Sin hallazgos patológicos.' },
    { patientName: 'Gabriela Acosta', condition: 'Rinitis alérgica', onsetYear: 2020, status: 'chronic', notes: 'Rinitis alérgica estacional. Manejo con antihistamínico oral y corticoide nasal.' },
    { patientName: 'Pablo Navarro', condition: 'Gastritis crónica', onsetYear: 2023, status: 'resolved', notes: 'Gastritis por H. pylori tratada satisfactoriamente. Erradicación confirmada por urea breath test.' },
  ];

  let count = 0;
  for (const entry of historyEntries) {
    const patient = patients.find(p => p.name === entry.patientName);
    if (!patient) continue;
    try {
      await pool.query(
        `INSERT INTO medical_history (patient_id, condition, onset_date, status, notes, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [patient.id, entry.condition, `${entry.onsetYear}-01-15`, entry.status, entry.notes, DEFAULT_TENANT_ID]
      );
      count++;
    } catch {}
  }

  if (count > 0) logger.info(`Medical history backfilled: ${count} entries`);
};

export const backfillLabRequests = async (): Promise<void> => {
  const { rows: existing } = await pool.query('SELECT COUNT(*) AS cnt FROM lab_requests WHERE tenant_id = $1', [DEFAULT_TENANT_ID]);
  if (Number(existing[0].cnt) >= 35) return;

  const { rows: doctors } = await pool.query(
    'SELECT id, user_id FROM doctors WHERE tenant_id = $1', [DEFAULT_TENANT_ID]
  );
  const { rows: patients } = await pool.query(
    'SELECT id FROM users WHERE role = $1 AND tenant_id = $2', ['user', DEFAULT_TENANT_ID]
  );
  if (doctors.length === 0 || patients.length === 0) return;

  const labResultTemplates: Record<number, () => object> = {
    1: () => ({ hemoglobin: (13 + Math.random() * 3).toFixed(1), hematocrit: Math.round(38 + Math.random() * 10), wbc: (5 + Math.random() * 5).toFixed(1), platelets: Math.round(200 + Math.random() * 150) }),
    2: () => ({ glucose: Math.round(75 + Math.random() * 25), unit: 'mg/dL' }),
    3: () => ({ cholesterol: Math.round(150 + Math.random() * 50), triglycerides: Math.round(80 + Math.random() * 70), hdl: Math.round(35 + Math.random() * 20), ldl: Math.round(80 + Math.random() * 40) }),
    4: () => ({ creatinine: (0.7 + Math.random() * 0.5).toFixed(2), unit: 'mg/dL' }),
    5: () => ({ tsh: (0.8 + Math.random() * 3.2).toFixed(2), unit: 'mIU/L' }),
    6: () => ({ bacteria: Math.random() > 0.3 ? 'Negativo' : 'Positivo', culture: Math.random() > 0.3 ? 'Sin desarrollo bacteriano' : 'E. coli >100,000 UFC/mL' }),
    7: () => ({ hba1c: (4.5 + Math.random() * 3.5).toFixed(1), unit: '%' }),
    8: () => ({ pcr: (0.5 + Math.random() * 15).toFixed(1), unit: 'mg/L' }),
    9: () => ({ alt: Math.round(10 + Math.random() * 30), ast: Math.round(10 + Math.random() * 25), unit: 'U/L' }),
  };

  const testGroups = [
    [1, 2], [1, 8], [2, 3, 7], [4, 5], [1, 6, 8], [1, 3, 4], [5], [1], [2, 7], [1, 3, 8],
  ];
  const priorities = ['routine', 'routine', 'routine', 'urgent'];
  const statuses = ['pending', 'in_progress', 'completed', 'completed', 'completed'];

  const maxReqResult = await pool.query(
    `SELECT COALESCE(MAX(REGEXP_REPLACE(request_number, '^LAB-[A-Z0-9]+-', ''))::INTEGER, 0) AS seq FROM lab_requests WHERE request_number ~ '^LAB-'`
  );
  let nextReqSeq = (maxReqResult.rows[0]?.seq ?? 0) + 1;

  let requestCount = 0;
  const targetRequests = 40;

  for (let i = 0; i < targetRequests; i++) {
    const doctor = pickOne(doctors);
    const patient = pickOne(patients);
    const testIds = pickOne(testGroups);
    const status = pickOne(statuses);

    try {
      const lrResult = await pool.query(
        `INSERT INTO lab_requests (request_number, patient_id, doctor_id, priority, status, notes, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          'LAB-' + today.getFullYear() + '-' + String(nextReqSeq++).padStart(6, '0'),
          patient.id, doctor.id,
          pickOne(priorities), status,
          'Exámenes de laboratorio solicitados', DEFAULT_TENANT_ID,
        ]
      );
      const lrId = lrResult.rows[0].id;

      for (const testId of testIds) {
        const itemStatus = status === 'completed' ? 'completed' : pickOne(['pending', 'in_progress']);
        const results = itemStatus === 'completed' ? JSON.stringify(labResultTemplates[testId]()) : null;
        await pool.query(
          `INSERT INTO lab_request_items (lab_request_id, lab_test_id, priority, status, results, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [lrId, testId, pickOne(['low', 'normal', 'normal', 'urgent']), itemStatus, results, DEFAULT_TENANT_ID]
        );
      }
      requestCount++;
    } catch {}
  }

  if (requestCount > 0) logger.info(`Lab requests backfilled: ${requestCount}`);
};

export const backfillLabNotifications = async (): Promise<void> => {
  const { rows: existing } = await pool.query('SELECT COUNT(*) AS cnt FROM lab_notifications WHERE tenant_id = $1', [DEFAULT_TENANT_ID]);
  if (Number(existing[0].cnt) >= 15) return;

  const { rows: urgentItems } = await pool.query(
    `SELECT lri.id AS item_id, lr.id AS request_id, lr.patient_id, lr.doctor_id,
            lt.name AS test_name, lri.results
     FROM lab_request_items lri
     JOIN lab_requests lr ON lr.id = lri.lab_request_id
     JOIN lab_tests lt ON lt.id = lri.lab_test_id
     WHERE lr.tenant_id = $1 AND lri.priority = 'urgent' AND lri.status = 'completed'
     LIMIT 10`,
    [DEFAULT_TENANT_ID]
  );

  const { rows: slaBreaches } = await pool.query(
    `SELECT lr.id AS request_id, lr.patient_id, lr.doctor_id, lr.request_number
     FROM lab_requests lr
     WHERE lr.tenant_id = $1 AND lr.status IN ('pending', 'in_progress')
       AND lr.created_at < NOW() - INTERVAL '3 days'
     LIMIT 10`,
    [DEFAULT_TENANT_ID]
  );

  const { rows: failedQc } = await pool.query(
    `SELECT lr.id AS request_id, lr.patient_id, lr.doctor_id
     FROM lab_requests lr
     WHERE lr.tenant_id = $1 AND lr.status = 'completed'
     ORDER BY lr.created_at DESC
     LIMIT 5`,
    [DEFAULT_TENANT_ID]
  );

  let count = 0;

  for (const item of urgentItems) {
    try {
      await pool.query(
        `INSERT INTO lab_notifications (type, title, message, severity, lab_request_item_id, lab_request_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'critical_result',
          `Resultado crítico: ${item.test_name}`,
          `El resultado de ${item.test_name} para la solicitud del paciente ID ${item.patient_id} presenta valores críticos que requieren revisión inmediata.`,
          'critical',
          item.item_id,
          item.request_id,
          DEFAULT_TENANT_ID,
        ]
      );
      count++;
    } catch {}
  }

  for (const breach of slaBreaches) {
    try {
      await pool.query(
        `INSERT INTO lab_notifications (type, title, message, severity, lab_request_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'sla_breach',
          `SLA vencido: ${breach.request_number}`,
          `La solicitud ${breach.request_number} lleva más de 3 días sin completarse. Se requiere atención.`,
          'warning',
          breach.request_id,
          DEFAULT_TENANT_ID,
        ]
      );
      count++;
    } catch {}
  }

  for (const qc of failedQc) {
    try {
      await pool.query(
        `INSERT INTO lab_notifications (type, title, message, severity, lab_request_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'qc_failure',
          'Control de calidad requiere revisión',
          `Se requiere verificación de calidad para la solicitud del paciente ID ${qc.patient_id}.`,
          'info',
          qc.request_id,
          DEFAULT_TENANT_ID,
        ]
      );
      count++;
    } catch {}
  }

  if (count > 0) logger.info(`Lab notifications backfilled: ${count}`);
};

export const backfillInvoices = async (): Promise<void> => {
  const concepts = ['Consulta médica', 'Procedimiento', 'Urgencia', 'Control', 'Cirugía menor'];

  const maxResult = await pool.query(
    `SELECT COALESCE(MAX(REGEXP_REPLACE(invoice_number, '^INV-[A-Z0-9]+-', ''))::INTEGER, 0) AS seq FROM invoices WHERE invoice_number ~ '^INV-'`
  );
  let nextSeq = (maxResult.rows[0]?.seq ?? 0) + 1;

  const result = await pool.query(
    `SELECT b.id, b.user_id, b.doctor_id, b.date
     FROM bookings b
     LEFT JOIN invoices i ON i.booking_id = b.id
     WHERE i.id IS NULL AND b.user_id IS NOT NULL AND (b.tenant_id IS NULL OR b.tenant_id = $1)`,
    [DEFAULT_TENANT_ID]
  );

  let count = 0;
  for (const row of result.rows) {
    const amount = randomInt(30, 500) + Math.round(Math.random() * 99) / 100;
    const tax = Math.round(amount * 0.19 * 100) / 100;
    try {
      await pool.query(
        `INSERT INTO invoices (invoice_number, patient_id, doctor_id, booking_id, concept, description, amount, tax_amount, discount_amount, total_amount, due_date, status, created_at, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          'INV-' + today.getFullYear() + '-' + String(nextSeq++).padStart(5, '0'),
          row.user_id,
          row.doctor_id,
          row.id,
          pickOne(concepts),
          'Atención médica programada',
          amount,
          tax,
          0,
          amount + tax,
          formatDate(addDays(today, randomInt(-30, 30))),
          pickOne(['pending', 'paid', 'paid', 'paid', 'cancelled']),
          formatDate(addDays(today, -randomInt(1, 60))),
          DEFAULT_TENANT_ID,
        ]
      );
      count++;
    } catch (err) {
      logger.warn('Error creando factura para booking ' + row.id, { error: toError(err).message });
    }
  }

  if (count > 0) logger.info(`Facturas generadas para bookings existentes: ${count}`);
};

const USER1_EMAIL = 'user1@clinic.com';

interface User1Visit {
  doctorEmail: string;
  daysAgo: number;
  time: string;
  diagnosis: string;
  cie10: string;
  vitalKey: string;
  meds: string[];
  labs: string[];
}

const user1Visits: User1Visit[] = [
  { doctorEmail: 'juan@clinic.com', daysAgo: 75, time: '09:00', diagnosis: 'Hipertensión arterial esencial', cie10: 'I10', vitalKey: 'hypertension', meds: ['Enalapril 10mg', 'Losartán 50mg'], labs: ['HEM001', 'CRE001', 'TSH001'] },
  { doctorEmail: 'carmen@clinic.com', daysAgo: 60, time: '10:30', diagnosis: 'Diabetes mellitus tipo 2', cie10: 'E11', vitalKey: 'diabetes', meds: ['Metformina 850mg'], labs: ['GLU001', 'HBA001'] },
  { doctorEmail: 'pedro@clinic.com', daysAgo: 45, time: '15:00', diagnosis: 'Gastritis crónica', cie10: 'K29', vitalKey: 'gastritis', meds: ['Omeprazol 20mg'], labs: ['HEM001'] },
  { doctorEmail: 'juan@clinic.com', daysAgo: 30, time: '09:30', diagnosis: 'Hipertensión arterial esencial', cie10: 'I10', vitalKey: 'hypertension', meds: ['Enalapril 10mg'], labs: ['CRE001', 'TSH001'] },
  { doctorEmail: 'ricardo@clinic.com', daysAgo: 21, time: '11:00', diagnosis: 'Lumbago crónico', cie10: 'M54.5', vitalKey: 'lumbago', meds: ['Ibuprofeno 400mg', 'Paracetamol 500mg'], labs: ['HEM001', 'PCR001'] },
  { doctorEmail: 'francisco@clinic.com', daysAgo: 12, time: '16:00', diagnosis: 'Infección del tracto urinario', cie10: 'N39.0', vitalKey: 'infection', meds: ['Ciprofloxacino 500mg', 'Nitrofurantoína 100mg'], labs: ['HEM001', 'URO001', 'PCR001'] },
  { doctorEmail: 'maria@clinic.com', daysAgo: 90, time: '10:00', diagnosis: 'Dermatitis atópica', cie10: 'L20.9', vitalKey: 'dermatitis', meds: ['Hidrocortisona 1% crema', 'Cetirizina 10mg'], labs: ['HEM001'] },
];

const user1FutureBookings: Array<{ doctorEmail: string; daysFromNow: number; time: string; status: string }> = [
  { doctorEmail: 'juan@clinic.com', daysFromNow: 4, time: '09:30', status: 'confirmed' },
  { doctorEmail: 'pedro@clinic.com', daysFromNow: 11, time: '15:00', status: 'pending' },
  { doctorEmail: 'carmen@clinic.com', daysFromNow: 18, time: '10:15', status: 'confirmed' },
];

const user1RecordTemplates: Record<string, { chiefComplaint: string; anamnesis: string; physicalExam: string; treatmentPlan: string; notes: string }> = {
  'Hipertensión arterial esencial': {
    chiefComplaint: 'Control de presión arterial',
    anamnesis: 'Paciente con HTA diagnosticada hace 4 años. Refiere buen apego al tratamiento. Cefalea occipital ocasional matinal. Dieta baja en sodio. Antecedente familiar de HTA.',
    physicalExam: 'Conciente, orientado. TA elevada. Ruidos cardíacos rítmicos, sin soplos. Pulsos periféricos simétricos. Sin edemas.',
    treatmentPlan: 'Ajuste de terapia antihipertensiva. Control de PA en 1 mes. Mantener dieta hiposódica. Ejercicio 30 min/día.',
    notes: 'Alergias: Penicilina. Hábitos: Sedentario, alimentación con exceso de sodio. Ex fumador.',
  },
  'Diabetes mellitus tipo 2': {
    chiefComplaint: 'Control de glicemia',
    anamnesis: 'Paciente con DM2 desde 2020. Refiere cumplir metformina. Última HbA1c 7.4%. Control de glicemia capilar irregular. Dieta alta en carbohidratos.',
    physicalExam: 'Paciente en buenas condiciones. Auscultación cardiopulmonar normal. Pulsos pedios presentes. Sensibilidad distal conservada. Sin lesiones en pies.',
    treatmentPlan: 'Mantener metformina. Educación diabetológica. Control de glicemia capilar diario. Evaluación por nutricionista. Control en 1 mes con HbA1c.',
    notes: 'Alergias: Sulfonamidas. Madre con DM2. Sin antecedentes quirúrgicos.',
  },
  'Gastritis crónica': {
    chiefComplaint: 'Dolor epigástrico',
    anamnesis: 'Paciente refiere dolor epigástrico urente postprandial desde hace 1 mes. Náuseas ocasionales. Usó antiácidos con mejoría parcial.',
    physicalExam: 'Abdomen blando, depresible. Dolor epigástrico a la palpación profunda. Sin signos de irritación peritoneal. Murphy negativo.',
    treatmentPlan: 'Inhibidor de bomba de protones por 14 días. Dieta fraccionada. Evaluar necesidad de estudio endoscópico. Control en 1 mes.',
    notes: 'Alergias: AINES (urticaria). H. pylori positivo tratado en 2022.',
  },
  'Lumbago crónico': {
    chiefComplaint: 'Dolor lumbar persistente',
    anamnesis: 'Paciente con lumbago crónico reagudizado hace 5 días. Dolor 6/10 irradiado a glúteo derecho. Empeora con flexión. Trabajo con carga de peso.',
    physicalExam: 'Columna lumbar con dolor a la palpación paravertebral derecha. Lasègue negativo bilateral. Fuerza y sensibilidad conservadas en EEII.',
    treatmentPlan: 'AINEs por 7 días. Reposo relativo. Kinesioterapia lumbar. Higiene postural. Control en 15 días.',
    notes: 'Alergias: Ninguna conocida. Niega cirugías previas.',
  },
  'Infección del tracto urinario': {
    chiefComplaint: 'Ardor al orinar',
    anamnesis: 'Paciente refiere disuria, polaquiuria y tenesmo vesical desde hace 3 días. Dolor suprapúbico. Fiebre de 38°C. Sin antecedentes de ITU recurrente.',
    physicalExam: 'Febril 38.1°C. Puño percusión lumbar derecha leve positiva. Abdomen blando, dolor suprapúbico leve. Genitales sin lesiones.',
    treatmentPlan: 'Antibioticoterapia según cultivo y sensibilidades. Aumentar ingesta de líquidos. Uroanalítico de control. Evaluar factores de riesgo.',
    notes: 'Alergias: Trimetoprima-sulfa. Niega cirugías previas. Ingesta hídrica insuficiente.',
  },
  'Dermatitis atópica': {
    chiefComplaint: 'Picazón intensa',
    anamnesis: 'Paciente refiere lesiones eccematosas pruriginosas en flexuras desde hace 2 semanas. Brotes recurrentes desde la niñez. Uso irregular de corticoide tópico.',
    physicalExam: 'Lesiones eccematosas eritematosas con descamación fina en flexuras cubitales y poplíteas. Excoriaciones por rascado. Piel xerótica generalizada.',
    treatmentPlan: 'Corticoide tópico por 10 días. Emolientes diarios. Antihistamínico oral por prurito nocturno. Evitar desencadenantes. Control en 2 semanas.',
    notes: 'Alergias: Metales, fragancias. Rinitis alérgica concomitante. Sin cirugías.',
  },
};

const user1VitalPresets: Record<string, () => Record<string, unknown>> = {
  hypertension: () => ({ blood_pressure: '148/94', heart_rate: 76, temperature: 36.5, respiratory_rate: 16, oxygen_saturation: 97, weight: 80, height: 170, bmi: 27.7 }),
  diabetes: () => ({ blood_pressure: '135/85', heart_rate: 82, temperature: 36.4, respiratory_rate: 17, oxygen_saturation: 98, weight: 75, height: 168, bmi: 26.5 }),
  gastritis: () => ({ blood_pressure: '118/75', heart_rate: 72, temperature: 36.4, respiratory_rate: 16, oxygen_saturation: 98, weight: 65, height: 170, bmi: 22.5 }),
  lumbago: () => ({ blood_pressure: '125/80', heart_rate: 70, temperature: 36.5, respiratory_rate: 15, oxygen_saturation: 98, weight: 78, height: 175, bmi: 25.5 }),
  infection: () => ({ blood_pressure: '130/85', heart_rate: 95, temperature: 38.2, respiratory_rate: 18, oxygen_saturation: 96, weight: 72, height: 165, bmi: 26.4 }),
  dermatitis: () => ({ blood_pressure: '118/76', heart_rate: 72, temperature: 36.5, respiratory_rate: 16, oxygen_saturation: 98, weight: 58, height: 160, bmi: 22.7 }),
};

const user1Meds: Record<string, { medication: string; dosage: string; frequency: string; duration: string; instructions: string }> = {
  'Enalapril 10mg': { medication: 'Enalapril 10mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '30 días', instructions: 'Tomar con alimentos' },
  'Losartán 50mg': { medication: 'Losartán 50mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '30 días', instructions: 'Tomar en la mañana' },
  'Metformina 850mg': { medication: 'Metformina 850mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '30 días', instructions: 'Tomar con alimentos' },
  'Omeprazol 20mg': { medication: 'Omeprazol 20mg', dosage: '1 cápsula', frequency: 'cada 24 horas', duration: '14 días', instructions: 'Tomar en ayunas 30 minutos antes del desayuno' },
  'Ibuprofeno 400mg': { medication: 'Ibuprofeno 400mg', dosage: '1 comprimido', frequency: 'cada 8 horas', duration: '7 días', instructions: 'Tomar con alimentos. No exceder 3 dosis al día' },
  'Paracetamol 500mg': { medication: 'Paracetamol 500mg', dosage: '1 comprimido', frequency: 'cada 8 horas', duration: '5 días', instructions: 'Para dolor moderado' },
  'Ciprofloxacino 500mg': { medication: 'Ciprofloxacino 500mg', dosage: '1 comprimido', frequency: 'cada 12 horas', duration: '7 días', instructions: 'Tomar con abundante agua. Completar todo el tratamiento' },
  'Nitrofurantoína 100mg': { medication: 'Nitrofurantoína 100mg', dosage: '1 cápsula', frequency: 'cada 6 horas', duration: '5 días', instructions: 'Tomar con alimentos. Puede colorar la orina' },
  'Hidrocortisona 1% crema': { medication: 'Hidrocortisona 1% crema', dosage: 'aplicar capa fina', frequency: 'cada 12 horas', duration: '10 días', instructions: 'Solo en zonas afectadas. Evitar uso prolongado >14 días' },
  'Cetirizina 10mg': { medication: 'Cetirizina 10mg', dosage: '1 comprimido', frequency: 'cada 24 horas', duration: '10 días', instructions: 'Tomar en la noche para controlar prurito' },
};

const user1LabResults: Record<string, () => object> = {
  HEM001: () => ({ hemoglobin: (14 + Math.random()).toFixed(1), hematocrit: Math.round(40 + Math.random() * 6), wbc: (6 + Math.random() * 3).toFixed(1), platelets: Math.round(220 + Math.random() * 80) }),
  GLU001: () => ({ glucose: Math.round(90 + Math.random() * 40), unit: 'mg/dL' }),
  LIP001: () => ({ cholesterol: Math.round(180 + Math.random() * 40), triglycerides: Math.round(120 + Math.random() * 50), hdl: Math.round(35 + Math.random() * 15), ldl: Math.round(100 + Math.random() * 30) }),
  CRE001: () => ({ creatinine: (0.8 + Math.random() * 0.4).toFixed(2), unit: 'mg/dL' }),
  TSH001: () => ({ tsh: (1.2 + Math.random() * 2.0).toFixed(2), unit: 'mIU/L' }),
  URO001: () => ({ bacteria: 'Positivo', culture: 'E. coli >100,000 UFC/mL' }),
  HBA001: () => ({ hba1c: (6.5 + Math.random() * 1.2).toFixed(1), unit: '%' }),
  PCR001: () => ({ pcr: (5 + Math.random() * 15).toFixed(1), unit: 'mg/L' }),
  ALT001: () => ({ alt: Math.round(15 + Math.random() * 20), ast: Math.round(15 + Math.random() * 15), unit: 'U/L' }),
};

export const backfillUser1Data = async (): Promise<void> => {
  const userRes = await pool.query('SELECT id FROM users WHERE email = $1 AND tenant_id = $2', [USER1_EMAIL, DEFAULT_TENANT_ID]);
  if (userRes.rows.length === 0) return;
  const userId: number = userRes.rows[0].id;

  await pool.query(
    'UPDATE users SET name = $1, gender = $2 WHERE id = $3',
    ['Usuario Uno', 'male', userId]
  );

  const doctorsRes = await pool.query('SELECT id, email FROM doctors WHERE tenant_id = $1 ORDER BY id', [DEFAULT_TENANT_ID]);
  const doctorIdByEmail = new Map<string, number>();
  for (const d of doctorsRes.rows) doctorIdByEmail.set(d.email, d.id);
  if (doctorIdByEmail.size === 0) return;

  const labRes = await pool.query(
    'SELECT id, code FROM lab_tests WHERE tenant_id = $1 AND code = ANY($2::text[])',
    [DEFAULT_TENANT_ID, ['HEM001', 'GLU001', 'LIP001', 'CRE001', 'TSH001', 'URO001', 'HBA001', 'PCR001', 'ALT001']]
  );
  const labIdByCode = new Map<string, number>();
  for (const r of labRes.rows) labIdByCode.set(r.code, r.id);

  const bookingCount = await pool.query('SELECT COUNT(*)::int AS cnt FROM bookings WHERE user_id = $1', [userId]);
  const hasBookings = (bookingCount.rows[0].cnt as number) > 0;

  if (hasBookings) {
    logger.info('[SEED user1] user1 ya tiene bookings — omitiendo generación de citas y registros');
  } else {
    await pool.query('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_future_date');

    const maxSeqRes = await pool.query(
    `SELECT COALESCE(MAX(REGEXP_REPLACE(request_number, '^LAB-[A-Z0-9]+-', ''))::INTEGER, 0) AS seq FROM lab_requests WHERE request_number ~ '^LAB-'`
    );
    let labSeq = (maxSeqRes.rows[0]?.seq ?? 0) + 1;

    const maxInvRes = await pool.query(
    `SELECT COALESCE(MAX(REGEXP_REPLACE(invoice_number, '^INV-[A-Z0-9]+-', ''))::INTEGER, 0) AS seq FROM invoices WHERE invoice_number ~ '^INV-'`
    );
    let invSeq = (maxInvRes.rows[0]?.seq ?? 0) + 1;

    const year = today.getFullYear();
    const labRequestNumber = (): string => `LAB-${year}-${String(labSeq++).padStart(6, '0')}`;
    const invoiceNumber = (): string => `INV-${year}-${String(invSeq++).padStart(5, '0')}`;

    let createdBookings = 0;
    let createdRecords = 0;
    let createdPrescriptions = 0;
    let createdInvoices = 0;
    let createdLabRequests = 0;

    const insertBooking = async (doctorId: number, date: string, time: string, status: string, confirmed: boolean): Promise<number | null> => {
      for (let attempt = 0; attempt < 6; attempt++) {
        const slotTime = attempt === 0 ? time : `${String(randomInt(9, 17)).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`;
        try {
          const res = await pool.query(
            `INSERT INTO bookings (doctor_id, user_id, date, time, duration, status, confirmed, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [doctorId, userId, date, slotTime, 30, status, confirmed, DEFAULT_TENANT_ID]
          );
          return res.rows[0].id as number;
        } catch {
          // Slot ocupado (unique_booking), probar otro horario
        }
      }
      return null;
    };

    for (const visit of user1Visits) {
      const doctorId = doctorIdByEmail.get(visit.doctorEmail);
      if (!doctorId) continue;
      const bookingId = await insertBooking(doctorId, formatDate(addDays(today, -visit.daysAgo)), visit.time, 'completed', true);
      if (!bookingId) continue;
      createdBookings++;

      const tpl = user1RecordTemplates[visit.diagnosis] || user1RecordTemplates['Hipertensión arterial esencial'];
      let crId: number | null = null;
      try {
        const crRes = await pool.query(
          `INSERT INTO clinical_records (patient_id, doctor_id, booking_id, chief_complaint, anamnesis, physical_exam, diagnosis, cie10_codes, treatment_plan, notes, vital_signs, status, tenant_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed', $12, $13) RETURNING id`,
          [userId, doctorId, bookingId, tpl.chiefComplaint, tpl.anamnesis, tpl.physicalExam, visit.diagnosis, [visit.cie10], tpl.treatmentPlan, tpl.notes, JSON.stringify(user1VitalPresets[visit.vitalKey]()), DEFAULT_TENANT_ID, formatDate(addDays(today, -visit.daysAgo))]
        );
        crId = crRes.rows[0].id as number;
        createdRecords++;
      } catch (err) {
        logger.warn('[SEED user1] Error creando registro clínico', { error: toError(err).message });
      }

      if (crId) {
        for (const medName of visit.meds) {
          const med = user1Meds[medName];
          if (!med) continue;
          try {
            await pool.query(
              `INSERT INTO prescriptions (clinical_record_id, medication, dosage, frequency, duration, instructions, tenant_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [crId, med.medication, med.dosage, med.frequency, med.duration, med.instructions, DEFAULT_TENANT_ID]
            );
            createdPrescriptions++;
          } catch {}
        }
      }

      if (crId) {
        const labCodes = visit.labs.filter((c) => labIdByCode.has(c));
        if (labCodes.length > 0) {
          const isRecent = visit.daysAgo <= 15;
          const status = isRecent ? 'in_progress' : 'completed';
          const priority = isRecent ? 'urgent' : 'routine';
          try {
            const lrRes = await pool.query(
              `INSERT INTO lab_requests (request_number, patient_id, doctor_id, clinical_record_id, priority, status, notes, tenant_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
              [labRequestNumber(), userId, doctorId, crId, priority, status, 'Exámenes solicitados según diagnóstico', DEFAULT_TENANT_ID]
            );
            const lrId = lrRes.rows[0].id as number;
            createdLabRequests++;

            let criticalItemId: number | null = null;
            for (const code of labCodes) {
              const testId = labIdByCode.get(code);
              if (!testId) continue;
              const itemStatus = status === 'completed' ? 'completed' : pick(['pending', 'in_progress']);
              const results = itemStatus === 'completed' ? JSON.stringify(user1LabResults[code]()) : null;
              const itemPriority = code === 'URO001' ? 'urgent' : pick(['low', 'normal', 'normal', 'urgent']);
              const itemRes = await pool.query(
                `INSERT INTO lab_request_items (lab_request_id, lab_test_id, priority, status, results, tenant_id)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [lrId, testId, itemPriority, itemStatus, results, DEFAULT_TENANT_ID]
              );
              if (code === 'URO001' && itemStatus === 'completed') criticalItemId = itemRes.rows[0].id as number;
            }

            if (criticalItemId) {
              await pool.query(
                `INSERT INTO lab_notifications (type, title, message, severity, lab_request_item_id, lab_request_id, tenant_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['critical_result', 'Resultado crítico: Urocultivo', 'El urocultivo del paciente presenta desarrollo de E. coli >100,000 UFC/mL. Requiere revisión inmediata.', 'critical', criticalItemId, lrId, DEFAULT_TENANT_ID]
              );
            }
          } catch (err) {
            logger.warn('[SEED user1] Error creando solicitud de laboratorio', { error: toError(err).message });
          }
        }
      }

      if (visit.daysAgo >= 20) {
        const amount = Math.round((45 + visit.daysAgo * 1.5) * 100) / 100;
        const tax = Math.round(amount * 0.19 * 100) / 100;
        const status = visit.daysAgo > 25 ? 'paid' : 'pending';
        try {
          await pool.query(
            `INSERT INTO invoices (invoice_number, patient_id, doctor_id, booking_id, concept, description, amount, tax_amount, discount_amount, total_amount, due_date, status, created_at, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [invoiceNumber(), userId, doctorId, bookingId, 'Consulta médica', 'Atención médica programada', amount, tax, 0, amount + tax, formatDate(addDays(today, -10)), status, formatDate(addDays(today, -visit.daysAgo)), DEFAULT_TENANT_ID]
          );
          createdInvoices++;
        } catch (err) {
          logger.warn('[SEED user1] Error creando factura', { error: toError(err).message });
        }
      }
    }

    for (const future of user1FutureBookings) {
      const doctorId = doctorIdByEmail.get(future.doctorEmail);
      if (!doctorId) continue;
      const id = await insertBooking(doctorId, formatDate(addDays(today, future.daysFromNow)), future.time, future.status, future.status === 'confirmed');
      if (id) createdBookings++;
    }

    await pool.query('ALTER TABLE bookings ADD CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE) NOT VALID');

    logger.info(`[SEED user1] Creados: ${createdBookings} bookings, ${createdRecords} registros clínicos, ${createdPrescriptions} recetas, ${createdInvoices} facturas, ${createdLabRequests} solicitudes de laboratorio`);
  }

  const histCountRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM medical_history WHERE patient_id = $1', [userId]);
  if ((histCountRes.rows[0].cnt as number) === 0) {
    const user1History = [
      { condition: 'Hipertensión arterial esencial', onset: '2021', status: 'chronic', notes: 'HTA diagnosticada hace 4 años. Controlada con Enalapril. PA objetivo <140/90.' },
      { condition: 'Diabetes mellitus tipo 2', onset: '2020', status: 'chronic', notes: 'DM2 en tratamiento con metformina. Última HbA1c 7.4%. Control nutricional en curso.' },
      { condition: 'Dermatitis atópica', onset: '2018', status: 'resolved', notes: 'Brotes atópicos desde la infancia. Último brote controlado con corticoide tópico.' },
      { condition: 'Gastritis crónica', onset: '2023', status: 'resolved', notes: 'Gastritis por H. pylori tratada. Erradicación confirmada.' },
      { condition: 'Lumbago crónico', onset: '2024', status: 'active', notes: 'Dolor lumbar crónico por desgaste discal. Manejo con kinesiología y analgesia intermitente.' },
    ];
    let histCount = 0;
    for (const h of user1History) {
      try {
        await pool.query(
          `INSERT INTO medical_history (patient_id, condition, onset_date, status, notes, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, h.condition, `${h.onset}-01-15`, h.status, h.notes, DEFAULT_TENANT_ID]
        );
        histCount++;
      } catch {}
    }
    if (histCount > 0) logger.info(`[SEED user1] Medical history creado: ${histCount} entradas`);
  }
};
