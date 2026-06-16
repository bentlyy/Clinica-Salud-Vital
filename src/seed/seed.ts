import { pool } from '../shared/db.js';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger.js';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default';

let _HASH: string | null = null;
const getHash = async (): Promise<string> => {
  if (!_HASH) _HASH = await bcrypt.hash(process.env.SEED_PASSWORD || 'REPLACED_PASSWORD', 12);
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

export const seed = async (): Promise<void> => {
  const HASH = await getHash();
  const exists = await pool.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', ['admin@clinic.com']);
  if (exists.rows.length > 0) {
    // Asegurar pacientes simples incluso si el seed ya se ejecutó
    const simplePatients = [
      { email: 'user1@clinic.com', rut: '15666777-3', phone: '+56911111111' },
      { email: 'user2@clinic.com', rut: '16777888-7', phone: '+56922222222' },
      { email: 'user3@clinic.com', rut: '17888999-0', phone: '+56933333333' },
    ];
    for (const p of simplePatients) {
      await pool.query(
        'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name',
        [p.email, HASH, p.email.split('@')[0], 'user', p.rut, p.phone, DEFAULT_TENANT_ID]
      );
    }
    logger.info('Seed ya ejecutado');
    return;
  }

  // ==================== USERS ====================

  const adminResult = await pool.query(
    'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password RETURNING id',
    ['admin@clinic.com', HASH, 'Admin', 'admin', generateRut(), '+56987654321', DEFAULT_TENANT_ID]
  );
  const adminId = adminResult.rows[0].id;

  const doctorsData = [
    { name: 'Dr. Juan Pérez', specialty: 'Cardiología', email: 'juan@clinic.com' },
    { name: 'Dra. María López', specialty: 'Dermatología', email: 'maria@clinic.com' },
    { name: 'Dr. Carlos Soto', specialty: 'Neurología', email: 'carlos@clinic.com' },
    { name: 'Dra. Ana Torres', specialty: 'Pediatría', email: 'ana@clinic.com' },
    { name: 'Dr. Pedro González', specialty: 'Medicina General', email: 'pedro@clinic.com' },
    { name: 'Dra. Claudia Muñoz', specialty: 'Ginecología', email: 'claudia@clinic.com' },
    { name: 'Dr. Ricardo Díaz', specialty: 'Traumatología', email: 'ricardo@clinic.com' },
    { name: 'Dra. Patricia Vega', specialty: 'Oftalmología', email: 'patricia@clinic.com' },
    { name: 'Dr. Mauricio Rojas', specialty: 'Psiquiatría', email: 'mauricio@clinic.com' },
    { name: 'Dra. Carmen Flores', specialty: 'Endocrinología', email: 'carmen@clinic.com' },
    { name: 'Dr. Francisco Mora', specialty: 'Urología', email: 'francisco@clinic.com' },
    { name: 'Dra. Verónica Pizarro', specialty: 'Reumatología', email: 'veronica@clinic.com' },
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
      'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
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
      'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [email, HASH, pName, 'user', generateRut(), '+569' + String(randomInt(10000000, 99999999)), DEFAULT_TENANT_ID]
    );
    patients.push({ id: userResult.rows[0].id, name: pName, email });
  }

  logger.info(`Usuarios creados: 1 admin, ${doctors.length} doctores, ${patients.length} pacientes`);

  // ==================== SIMPLE PATIENTS (user1/2/3) ====================
  const simplePatients = [
    { email: 'user1@clinic.com', rut: '15666777-3', phone: '+56911111111' },
    { email: 'user2@clinic.com', rut: '16777888-7', phone: '+56922222222' },
    { email: 'user3@clinic.com', rut: '17888999-0', phone: '+56933333333' },
  ];
  for (const p of simplePatients) {
    await pool.query(
      'INSERT INTO users (email, password, name, role, rut, phone, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tenant_id, email) DO NOTHING',
      [p.email, HASH, p.email.split('@')[0], 'user', p.rut, p.phone, DEFAULT_TENANT_ID]
    );
  }

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

  const statuses = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'];
  const bookingIds: number[] = [];

  for (let i = 0; i < 80; i++) {
    const doctor = pick(doctors);
    const patient = pick(patients);
    const daysAgo = randomInt(1, 60);
    const date = addDays(today, -daysAgo);
    const hour = randomInt(9, 16);
    const time = `${String(hour).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`;

    const status = daysAgo <= 1
      ? pick(['pending', 'confirmed'])
      : pick(['completed', 'completed', 'completed', 'no_show', 'cancelled']);

    try {
      const result = await pool.query(
        `INSERT INTO bookings (doctor_id, user_id, date, time, duration, status, confirmed, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          doctor.id,
          patient.id,
          formatDate(date),
          time,
          30,
          status,
          status === 'confirmed' || status === 'completed',
          DEFAULT_TENANT_ID,
        ]
      );
      bookingIds.push(result.rows[0].id);
    } catch {
    }
  }
  for (let i = 0; i < 40; i++) {
    const doctor = pick(doctors);
    const patient = pick(patients);
    const daysFromNow = randomInt(1, 30);
    const date = addDays(today, daysFromNow);
    const hour = randomInt(9, 16);
    const time = `${String(hour).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`;
    const confirmed = Math.random() > 0.3;

    try {
      const result = await pool.query(
        `INSERT INTO bookings (doctor_id, user_id, date, time, duration, status, confirmed, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          doctor.id,
          patient.id,
          formatDate(date),
          time,
          30,
          confirmed ? 'confirmed' : 'pending',
          confirmed,
          DEFAULT_TENANT_ID,
        ]
      );
      bookingIds.push(result.rows[0].id);
    } catch {
    }
  }

  await pool.query('ALTER TABLE bookings ADD CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE) NOT VALID');
  logger.info(`Reservas creadas: ${bookingIds.length}`);

  // ==================== CLINICAL RECORDS ====================
  const diagnoses = [
    'Hipertensión esencial esencial', 'Diabetes tipo 2',
    'Bronquitis aguda', 'Gastritis crónica',
    'Lumbago crónico', 'Cefalea tensional',
    'Infección urinaria', 'Dermatitis atópica',
    'Neumonía adquirida', 'Artritis reumatoide',
    'Asma bronquial', 'Hipotiroidismo',
    'Insuficiencia cardíaca', 'Colecistitis',
  ];

  const cie10Map: Record<string, string> = {
    'Hipertensión esencial esencial': 'I10',
    'Diabetes tipo 2': 'E11',
    'Bronquitis aguda': 'J20',
    'Gastritis crónica': 'K29',
    'Lumbago crónico': 'M54.5',
    'Cefalea tensional': 'G44.2',
    'Infección urinaria': 'N39.0',
    'Dermatitis atópica': 'L20.9',
    'Neumonía adquirida': 'J18.9',
    'Artritis reumatoide': 'M06.9',
    'Asma bronquial': 'J45',
    'Hipotiroidismo': 'E03.9',
    'Insuficiencia cardíaca': 'I50.9',
    'Colecistitis': 'K81.9',
  };

  const clinicalRecordIds: number[] = [];

  const pastBookingIds = bookingIds.slice(0, 60);
  for (const bookingId of pastBookingIds) {
    if (Math.random() > 0.7) continue;

    const bookingResult = await pool.query(
      'SELECT doctor_id, user_id FROM bookings WHERE id = $1',
      [bookingId]
    );
    if (bookingResult.rows.length === 0) continue;
    const { doctor_id, user_id } = bookingResult.rows[0];
    if (!user_id) continue;

    const diagnosis = pick(diagnoses);
    try {
      const result = await pool.query(
        `INSERT INTO clinical_records (patient_id, doctor_id, booking_id, chief_complaint, anamnesis, diagnosis, cie10_codes, treatment_plan, vital_signs, status, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', $10) RETURNING id`,
        [
          user_id,
          doctor_id,
          bookingId,
          pick(['Dolor de cabeza', 'Dolor abdominal', 'Fiebre', 'Malestar general', 'Dolor de espalda', 'Mareos', 'Tos persistente']),
          pick(['Paciente refiere dolor desde hace 3 días', 'Cuadro de evolución progresiva', 'Paciente relata síntomas intermitentes']),
          diagnosis,
          [cie10Map[diagnosis] || 'Z00.0'],
          pick(['Reposo por 7 días', 'Tratamiento farmacológico', 'Control en 15 días', 'Derivación a especialista', 'Exámenes de laboratorio']),
          JSON.stringify({
            pressure: `${randomInt(110, 160)}/${randomInt(60, 100)}`,
            heartRate: randomInt(60, 100),
            temperature: (36 + Math.random()).toFixed(1),
            weight: randomInt(55, 95),
            height: randomInt(150, 190),
          }),
          DEFAULT_TENANT_ID,
        ]
      );
      clinicalRecordIds.push(result.rows[0].id);
    } catch {
    }
  }

  logger.info(`Registros clínicos creados: ${clinicalRecordIds.length}`);

  // ==================== PRESCRIPTIONS ====================
  const medications = [
    'Enalapril 10mg', 'Metformina 850mg', 'Amoxicilina 500mg', 'Omeprazol 20mg',
    'Ibuprofeno 400mg', 'Salbutamol 100mcg', 'Losartán 50mg', 'Atorvastatina 20mg',
    'Metoprolol 50mg', 'Paracetamol 500mg', 'Diazepam 5mg', 'Sertralina 50mg',
  ];

  let prescriptionCount = 0;
  for (const crId of clinicalRecordIds) {
    if (Math.random() > 0.6) continue;
    const medCount = randomInt(1, 3);
    for (let m = 0; m < medCount; m++) {
      try {
        await pool.query(
          `INSERT INTO prescriptions (clinical_record_id, medication, dosage, frequency, duration, instructions, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
           [
            crId,
            pick(medications),
            pick(['1 comprimido', '2 comprimidos', '1 cápsula', '5ml', '1 aplicación']),
            pick(['cada 8 horas', 'cada 12 horas', 'cada 24 horas', '3 veces al día']),
            pick(['7 días', '10 días', '14 días', '30 días']),
            pick(['Tomar con alimentos', 'Tomar en ayunas', 'Evitar alcohol durante el tratamiento']),
            DEFAULT_TENANT_ID,
          ]
        );
        prescriptionCount++;
      } catch {
      }
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
      const invResult = await pool.query(
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
  let labRequestCount = 0;
  for (const crId of clinicalRecordIds.slice(0, 25)) {
    if (Math.random() > 0.5) continue;
    try {
      const cr = await pool.query(
        'SELECT patient_id, doctor_id FROM clinical_records WHERE id = $1',
        [crId]
      );
      if (cr.rows.length === 0) continue;
      const { patient_id, doctor_id } = cr.rows[0];

      const lrResult = await pool.query(
        `INSERT INTO lab_requests (patient_id, doctor_id, clinical_record_id, status, notes, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [patient_id, doctor_id, crId, pick(['pending', 'in_progress', 'completed']), 'Exámenes de rutina', DEFAULT_TENANT_ID]
      );
      const lrId = lrResult.rows[0].id;

      const testCount = randomInt(2, 4);
      for (let t = 0; t < testCount; t++) {
        await pool.query(
          `INSERT INTO lab_request_items (lab_request_id, lab_test_id, priority, status, results, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            lrId,
            randomInt(1, 9),
            pick(['low', 'normal', 'urgent']),
            pick(['pending', 'in_progress', 'completed']),
            Math.random() > 0.5 ? JSON.stringify({ value: randomInt(50, 200), unit: 'mg/dL' }) : null,
          ]
        );
      }
      labRequestCount++;
    } catch {
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

export const backfillInvoices = async (): Promise<void> => {
  const concepts = ['Consulta médica', 'Procedimiento', 'Urgencia', 'Control', 'Cirugía menor'];

  const maxResult = await pool.query(
    `SELECT COALESCE(MAX(REGEXP_REPLACE(invoice_number, '^INV-[0-9]+-', ''))::INTEGER, 0) AS seq FROM invoices WHERE invoice_number ~ '^INV-'`
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
      logger.warn('Error creando factura para booking ' + row.id, { error: (err as Error).message });
    }
  }

  if (count > 0) logger.info(`Facturas generadas para bookings existentes: ${count}`);
};
