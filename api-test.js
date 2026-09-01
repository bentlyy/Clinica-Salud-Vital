const http = require('http');

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = http.request({
      hostname: 'localhost', port: 3000, path, method, headers
    }, (res) => {
      let rbody = '';
      res.on('data', c => rbody += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(rbody); } catch { parsed = rbody; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  const results = [];
  const log = (mod, test, status, detail) => {
    const icon = status === 'PASS' ? '✅' : '❌';
    results.push({ mod, test, status, detail });
    console.log(`${icon} [${mod}] ${test}: ${status} — ${detail}`);
  };

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PRUEBAS API — Vitaria Clinic (desde dentro del contenedor)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ─── MÓDULO 10: HEALTH CHECK ───
  let r = await request('GET', '/health');
  r.status === 200 ? log('10.5', 'Health check', 'PASS', `status=${r.body.status}`) : log('10.5', 'Health check', 'FAIL', `${r.status}`);

  // ─── MÓDULO 8: GUEST ───
  r = await request('GET', '/api/specialties');
  r.status === 200 ? log('8', 'GET /api/specialties', 'PASS', `${Array.isArray(r.body) ? r.body.length + ' specialties' : 'not array'}`) : log('8', 'GET /api/specialties', 'FAIL', `${r.status}`);

  r = await request('GET', '/api/doctors/public');
  r.status === 200 ? log('8', 'GET /api/doctors/public', 'PASS', `${Array.isArray(r.body) ? r.body.length + ' doctors' : JSON.stringify(r.body).substring(0,80)}`) : log('8', 'GET /api/doctors/public', 'FAIL', `${r.status}`);

  // Guest booking rate limit
  r = await request('POST', '/api/guest/booking', { name: 'Test', email: 'test@test.com', phone: '+56912345678', rut: '12345678-5', doctor_id: 1, date: '2026-09-01', time: '10:00' });
  r.status === 201 ? log('8.2', 'Guest booking', 'PASS', `booking created`) : log('8.2', 'Guest booking', r.status === 400 ? 'WARN' : 'FAIL', `status=${r.status} ${JSON.stringify(r.body).substring(0,100)}`);

  // Guest search by RUT
  r = await request('GET', '/api/guest/bookings/12345678-5');
  r.status === 200 ? log('8.4', 'Guest bookings by RUT', 'PASS', `found ${Array.isArray(r.body) ? r.body.length : 'data'}`) : log('8.4', 'Guest bookings by RUT', r.status === 404 ? 'PASS (no bookings)' : 'FAIL', `${r.status}`);

  // ─── MÓDULO 1: AUTH ───
  // 1.2 Login exitoso (admin)
  r = await request('POST', '/api/auth/login', { email: 'admin@clinic.com', password: 'admin123' });
  let adminToken = null;
  if (r.status === 200 && r.body.access_token) {
    adminToken = r.body.access_token;
    log('1.2', 'Login admin', 'PASS', `role=${r.body.user.role}`);
  } else {
    log('1.2', 'Login admin', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);
  }

  // 1.3 Login incorrecto
  r = await request('POST', '/api/auth/login', { email: 'admin@clinic.com', password: 'wrongpass' });
  r.status === 400 ? log('1.3', 'Login incorrecto', 'PASS', `error=${r.body.error}`) : log('1.3', 'Login incorrecto', 'FAIL', `${r.status}`);

  // 1.7 Perfil del usuario
  r = await request('GET', '/api/auth/me', null, adminToken);
  r.status === 200 ? log('1.7', 'GET /auth/me', 'PASS', `user=${r.body.email}`) : log('1.7', 'GET /auth/me', 'FAIL', `${r.status}`);

  // 1.2 Login superadmin
  r = await request('POST', '/api/auth/login', { email: 'superadmin@clinic.com', password: 'admin123' });
  let superToken = null;
  if (r.status === 200 && r.body.access_token) {
    superToken = r.body.access_token;
    log('1.2', 'Login superadmin', 'PASS', `role=${r.body.user.role}`);
  } else {
    log('1.2', 'Login superadmin', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);
  }

  // 1.2 Login doctor
  r = await request('POST', '/api/auth/login', { email: 'juan@clinic.com', password: 'admin123' });
  let doctorToken = null;
  if (r.status === 200 && r.body.access_token) {
    doctorToken = r.body.access_token;
    log('1.2', 'Login doctor', 'PASS', `role=${r.body.user.role}`);
  } else {
    log('1.2', 'Login doctor', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);
  }

  // 1.2 Login lab technician
  r = await request('POST', '/api/auth/login', { email: 'lab@clinic.com', password: 'admin123' });
  let labToken = null;
  if (r.status === 200 && r.body.access_token) {
    labToken = r.body.access_token;
    log('1.2', 'Login lab_technician', 'PASS', `role=${r.body.user.role}`);
  } else {
    log('1.2', 'Login lab_technician', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);
  }

  // 1.2 Login no tenant user (patient or another)
  r = await request('POST', '/api/auth/login', { email: 'carlos@clinic.com', password: 'admin123' });
  let userToken = null;
  if (r.status === 200 && r.body.access_token) {
    userToken = r.body.access_token;
    log('1.2', 'Login user (carlos)', 'PASS', `role=${r.body.user.role}`);
  } else {
    log('1.2', 'Login user (carlos)', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);
  }

  // 1.9 Cambiar contraseña
  r = await request('POST', '/api/auth/change-password', { current_password: 'admin123', new_password: 'Admin123!@#' }, adminToken);
  r.status === 200 ? log('1.9', 'Change password', 'PASS', `${r.body.message || 'ok'}`) : log('1.9', 'Change password', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);

  // Restore password
  r = await request('POST', '/api/auth/change-password', { current_password: 'Admin123!@#', new_password: 'admin123' }, adminToken);
  r.status === 200 ? log('1.9', 'Restore password', 'PASS', 'restored') : log('1.9', 'Restore password', 'FAIL', `${r.status}`);

  // 1.10 Forgot password
  r = await request('POST', '/api/auth/forgot-password', { email: 'admin@clinic.com' });
  r.status === 200 ? log('1.10', 'Forgot password', 'PASS', `${r.body.message || 'ok'}`) : log('1.10', 'Forgot password', 'FAIL', `${r.status}`);

  // Sessions
  r = await request('GET', '/api/auth/sessions', null, adminToken);
  r.status === 200 ? log('2.3', 'GET sessions', 'PASS', `${Array.isArray(r.body.data) ? r.body.data.length + ' sessions' : JSON.stringify(r.body).substring(0,80)}`) : log('2.3', 'GET sessions', 'FAIL', `${r.status}`);

  // ─── MÓDULO 10: CSRF ───
  r = await request('GET', '/api/auth/me', null, adminToken);
  const csrfCookie = r.headers['set-cookie'];
  log('10.2', 'CSRF cookie', csrfCookie && csrfCookie.some(c => c.includes('csrf_token')) ? 'PASS' : 'WARN', csrfCookie ? 'cookie present' : 'no csrf cookie in response');

  // ─── MÓDULO 10: CORRELATION ID ───
  log('10.4', 'X-Request-ID', r.headers['x-request-id'] ? 'PASS' : 'WARN', r.headers['x-request-id'] || 'not present');

  // ─── MÓDULO 3: SUPER ADMIN ───
  // 3.1 SaaS panel
  r = await request('GET', '/api/saas/dashboard', null, superToken);
  r.status === 200 ? log('3.1', 'SaaS dashboard', 'PASS', `keys: ${Object.keys(r.body).join(',')}`) : log('3.1', 'SaaS dashboard', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);

  // 3.2 Tenants
  r = await request('GET', '/api/saas/tenants', null, superToken);
  r.status === 200 ? log('3.2', 'List tenants', 'PASS', `${Array.isArray(r.body.data) ? r.body.data.length + ' tenants' : JSON.stringify(r.body).substring(0,80)}`) : log('3.2', 'List tenants', 'FAIL', `${r.status}`);

  // 3.3 Global users
  r = await request('GET', '/api/super-admin/users', null, superToken);
  r.status === 200 ? log('3.3', 'Global users', 'PASS', `${r.body.data ? r.body.data.length + ' users' : JSON.stringify(r.body).substring(0,80)}`) : log('3.3', 'Global users', 'FAIL', `${r.status}`);

  // ─── MÓDULO 4: ADMIN ───
  // 4.1 Dashboard
  r = await request('GET', '/api/analytics/dashboard', null, adminToken);
  r.status === 200 ? log('4.1', 'Admin dashboard', 'PASS', `keys: ${Object.keys(r.body).join(',')}`) : log('4.1', 'Admin dashboard', 'FAIL', `${r.status}`);

  // 4.2 Doctors
  r = await request('GET', '/api/doctors', null, adminToken);
  r.status === 200 ? log('4.2', 'List doctors', 'PASS', `${r.body.data ? r.body.data.length + ' doctors' : JSON.stringify(r.body).substring(0,80)}`) : log('4.2', 'List doctors', 'FAIL', `${r.status}`);

  // 4.3 Users
  r = await request('GET', '/api/super-admin/users', null, adminToken);
  r.status === 200 ? log('4.3', 'List users', 'PASS', `${r.body.data ? r.body.data.length + ' users' : 'ok'}`) : log('4.3', 'List users', 'FAIL', `${r.status}`);

  // 4.4 Bookings
  r = await request('GET', '/api/bookings', null, adminToken);
  r.status === 200 ? log('4.4', 'List bookings', 'PASS', `${r.body.data ? r.body.data.length + ' bookings' : JSON.stringify(r.body).substring(0,80)}`) : log('4.4', 'List bookings', 'FAIL', `${r.status}`);

  // 4.5 Patients
  r = await request('GET', '/api/doctors', null, adminToken);
  r.status === 200 ? log('4.5', 'Patients (via doctors)', 'PASS', 'ok') : log('4.5', 'Patients', 'FAIL', `${r.status}`);

  // 4.6 Clinical records
  r = await request('GET', '/api/clinical-records', null, doctorToken);
  r.status === 200 ? log('4.6', 'Clinical records', 'PASS', `${r.body.data ? r.body.data.length + ' records' : JSON.stringify(r.body).substring(0,80)}`) : log('4.6', 'Clinical records', 'FAIL', `${r.status}`);

  // 4.7 Prescriptions
  r = await request('GET', '/api/clinical-records/prescriptions', null, doctorToken);
  r.status === 200 ? log('4.7', 'Prescriptions', 'PASS', `${r.body.data ? r.body.data.length + ' prescriptions' : JSON.stringify(r.body).substring(0,80)}`) : log('4.7', 'Prescriptions', 'FAIL', `${r.status}`);

  // 4.8 Medical history
  r = await request('GET', '/api/medical-history', null, doctorToken);
  r.status === 200 ? log('4.8', 'Medical history', 'PASS', `${r.body.data ? r.body.data.length + ' entries' : JSON.stringify(r.body).substring(0,80)}`) : log('4.8', 'Medical history', 'FAIL', `${r.status}`);

  // 4.9 Availability
  r = await request('GET', '/api/availability', null, adminToken);
  r.status === 200 ? log('4.9', 'Doctor availability', 'PASS', `${r.body.data ? r.body.data.length + ' slots' : JSON.stringify(r.body).substring(0,80)}`) : log('4.9', 'Doctor availability', 'FAIL', `${r.status}`);

  // 4.11 Billing
  r = await request('GET', '/api/billing', null, adminToken);
  r.status === 200 ? log('4.11', 'Billing invoices', 'PASS', `${r.body.data ? r.body.data.length + ' invoices' : JSON.stringify(r.body).substring(0,80)}`) : log('4.11', 'Billing invoices', 'FAIL', `${r.status}`);

  // 4.12 Laboratory
  r = await request('GET', '/api/laboratory/requests', null, adminToken);
  r.status === 200 ? log('4.12', 'Lab requests', 'PASS', `${r.body.data ? r.body.data.length + ' requests' : JSON.stringify(r.body).substring(0,80)}`) : log('4.12', 'Lab requests', 'FAIL', `${r.status}`);

  // 4.13 Reports
  r = await request('GET', '/api/reports', null, adminToken);
  r.status === 200 ? log('4.13', 'Reports', 'PASS', `ok`) : log('4.13', 'Reports', 'FAIL', `${r.status}`);

  // 4.14 Analytics
  r = await request('GET', '/api/analytics/dashboard', null, adminToken);
  r.status === 200 ? log('4.14', 'Analytics', 'PASS', `ok`) : log('4.14', 'Analytics', 'FAIL', `${r.status}`);

  // 4.15 Notifications
  r = await request('GET', '/api/notifications', null, adminToken);
  r.status === 200 ? log('4.15', 'Notifications', 'PASS', `${r.body.data ? r.body.data.length + ' notifications' : JSON.stringify(r.body).substring(0,80)}`) : log('4.15', 'Notifications', 'FAIL', `${r.status}`);

  // ─── MÓDULO 5: DOCTOR ───
  // 5.1 Dashboard
  r = await request('GET', '/api/analytics/dashboard', null, doctorToken);
  r.status === 200 ? log('5.1', 'Doctor dashboard', 'PASS', `ok`) : log('5.1', 'Doctor dashboard', 'FAIL', `${r.status}`);

  // 5.4 My patients
  r = await request('GET', '/api/doctors', null, doctorToken);
  r.status === 200 ? log('5.4', 'Doctor sees doctors', 'PASS', 'ok') : log('5.4', 'Doctor sees doctors', 'FAIL', `${r.status}`);

  // 5.8 Availability
  r = await request('GET', '/api/availability', null, doctorToken);
  r.status === 200 ? log('5.8', 'Doctor availability', 'PASS', 'ok') : log('5.8', 'Doctor availability', 'FAIL', `${r.status}`);

  // ─── MÓDULO 6: LAB TECH ───
  // 6.2 Lab dashboard
  r = await request('GET', '/api/laboratory/requests', null, labToken);
  r.status === 200 ? log('6.2', 'Lab requests', 'PASS', 'ok') : log('6.2', 'Lab requests', 'FAIL', `${r.status}`);

  // 6.6 Lab catalog
  r = await request('GET', '/api/laboratory/catalog', null, labToken);
  r.status === 200 ? log('6.6', 'Lab catalog', 'PASS', `${r.body.data ? r.body.data.length + ' tests' : JSON.stringify(r.body).substring(0,80)}`) : log('6.6', 'Lab catalog', 'FAIL', `${r.status}`);

  // 6.8 Lab areas
  r = await request('GET', '/api/laboratory/areas', null, labToken);
  r.status === 200 ? log('6.8', 'Lab areas', 'PASS', 'ok') : log('6.8', 'Lab areas', 'FAIL', `${r.status}`);

  // 6.9 Equipment
  r = await request('GET', '/api/laboratory/equipment', null, labToken);
  r.status === 200 ? log('6.9', 'Lab equipment', 'PASS', 'ok') : log('6.9', 'Lab equipment', 'FAIL', `${r.status}`);

  // 6.10 Reagents
  r = await request('GET', '/api/laboratory/reagents', null, labToken);
  r.status === 200 ? log('6.10', 'Lab reagents', 'PASS', 'ok') : log('6.10', 'Lab reagents', 'FAIL', `${r.status}`);

  // ─── MÓDULO 3: SUPER ADMIN (more) ───
  // 3.4 Specialties
  r = await request('GET', '/api/specialties', null, superToken);
  r.status === 200 ? log('3.4', 'Specialties', 'PASS', `${Array.isArray(r.body) ? r.body.length + ' specialties' : 'ok'}`) : log('3.4', 'Specialties', 'FAIL', `${r.status}`);

  // 3.5 Holidays
  r = await request('GET', '/api/holidays', null, superToken);
  r.status === 200 ? log('3.5', 'Holidays', 'PASS', 'ok') : log('3.5', 'Holidays', 'FAIL', `${r.status}`);

  // 3.6 Audit logs
  r = await request('GET', '/api/audit', null, superToken);
  r.status === 200 ? log('3.6', 'Audit logs', 'PASS', `${r.body.data ? r.body.data.length + ' logs' : JSON.stringify(r.body).substring(0,80)}`) : log('3.6', 'Audit logs', 'FAIL', `${r.status}`);

  // ─── MÓDULO 10: CROSS-CUTTING ───
  // 10.4 Correlation IDs on various endpoints
  r = await request('GET', '/api/specialties');
  log('10.4', 'Correlation ID on /specialties', r.headers['x-request-id'] ? 'PASS' : 'WARN', r.headers['x-request-id'] || 'not present');

  // 10.5 API Health
  r = await request('GET', '/api/health');
  r.status === 200 ? log('10.5', 'API Health check', 'PASS', `status=${r.body.status}`) : log('10.5', 'API Health check', 'FAIL', `${r.status}`);

  // ─── CREATE + READ CYCLE: SPECIALTY ───
  r = await request('POST', '/api/specialties', { name: 'Test Specialty', description: 'Test', icon: '🧪', color: '#ff0000', department: 'Test Dept' }, superToken);
  let specialtyId = null;
  if (r.status === 201) {
    specialtyId = r.body.id;
    log('3.4', 'Create specialty', 'PASS', `id=${r.id}`);
  } else {
    log('3.4', 'Create specialty', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);
  }

  if (specialtyId) {
    r = await request('GET', `/api/specialties/${specialtyId}`, null, superToken);
    r.status === 200 ? log('3.4', 'Get specialty by ID', 'PASS', `name=${r.body.name}`) : log('3.4', 'Get specialty by ID', 'FAIL', `${r.status}`);

    r = await request('PUT', `/api/specialties/${specialtyId}`, { name: 'Updated Specialty' }, superToken);
    r.status === 200 ? log('3.4', 'Update specialty', 'PASS', 'ok') : log('3.4', 'Update specialty', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);

    r = await request('DELETE', `/api/specialties/${specialtyId}`, null, superToken);
    r.status === 200 ? log('3.4', 'Delete specialty', 'PASS', 'ok') : log('3.4', 'Delete specialty', 'FAIL', `${r.status}`);
  }

  // ─── HOLIDAYS CRUD ───
  r = await request('POST', '/api/holidays', { name: 'Test Holiday', date: '2026-12-25', cancellation_days: 3 }, superToken);
  let holidayId = null;
  if (r.status === 201) {
    holidayId = r.body.id;
    log('3.5', 'Create holiday', 'PASS', `id=${holidayId}`);
  } else {
    log('3.5', 'Create holiday', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);
  }

  if (holidayId) {
    r = await request('DELETE', `/api/holidays/${holidayId}`, null, superToken);
    r.status === 200 ? log('3.5', 'Delete holiday', 'PASS', 'ok') : log('3.5', 'Delete holiday', 'FAIL', `${r.status}`);
  }

  // ─── DOCTOR AVAILABILITY CRUD ───
  r = await request('POST', '/api/availability', { doctor_id: 11, day_of_week: 1, start_time: '09:00', end_time: '12:00' }, adminToken);
  let availId = null;
  if (r.status === 201 || r.status === 200) {
    availId = r.body.id;
    log('4.9', 'Create availability', 'PASS', `id=${availId}`);
  } else {
    log('4.9', 'Create availability', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);
  }

  // Available slots
  r = await request('GET', '/api/bookings/available-slots?doctor_id=11&date=2026-09-01');
  r.status === 200 ? log('4.4', 'Available slots', 'PASS', `${r.body.data ? r.body.data.length + ' slots' : JSON.stringify(r.body).substring(0,80)}`) : log('4.4', 'Available slots', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);

  // ─── BOOKING CREATION (ADMIN) ───
  r = await request('POST', '/api/bookings', { doctor_id: 11, patient_name: 'Test Patient', patient_email: 'patient@test.com', patient_phone: '+56911111111', patient_rut: '11111111-1', date: '2026-09-15', time: '10:00', reason: 'General checkup' }, adminToken);
  let bookingId = null;
  if (r.status === 201) {
    bookingId = r.body.id || r.body.booking?.id;
    log('4.4', 'Create booking', 'PASS', `id=${bookingId}`);
  } else {
    log('4.4', 'Create booking', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,150)}`);
  }

  // ─── CLINICAL RECORD CREATION (DOCTOR) ───
  if (bookingId) {
    r = await request('POST', '/api/clinical-records', {
      patient_id: 1,
      booking_id: bookingId,
      motivo_consulta: 'Dolor de cabeza',
      anamnesis: 'Paciente refiere cefalea desde hace 3 días',
      signos_vitales: { temperatura: '36.5', presion: '120/80', pulso: '72', peso: '70', saturacion: '98' },
      examen_fisico: 'Exploración normal',
      diagnostico: 'Cefalea tensional',
      cie10_code: 'G44.2',
      plan_tratamiento: 'Paracetamol 500mg cada 8 horas por 5 días'
    }, doctorToken);
    let clinicalRecordId = null;
    if (r.status === 201) {
      clinicalRecordId = r.body.id;
      log('4.6', 'Create clinical record', 'PASS', `id=${clinicalRecordId}`);
    } else {
      log('4.6', 'Create clinical record', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,150)}`);
    }

    // ─── PRESCRIPTION ───
    r = await request('POST', '/api/clinical-records/prescriptions', {
      patient_id: 1,
      clinical_record_id: clinicalRecordId,
      medications: [
        { name: 'Paracetamol', dosage: '500mg', frequency: 'Cada 8 horas', duration: '5 días', instructions: 'Tomar con alimentos' }
      ]
    }, doctorToken);
    r.status === 201 ? log('4.7', 'Create prescription', 'PASS', `id=${r.body.id}`) : log('4.7', 'Create prescription', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,150)}`);
  }

  // ─── MEDICAL HISTORY ───
  r = await request('POST', '/api/medical-history', {
    patient_id: 1,
    condition: 'Hipertensión arterial',
    onset_date: '2024-01-15',
    status: 'active',
    notes: 'Controlada con medicación'
  }, doctorToken);
  r.status === 201 ? log('4.8', 'Create medical history entry', 'PASS', `id=${r.body.id}`) : log('4.8', 'Create medical history entry', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);

  // ─── ANALYTICS ───
  r = await request('GET', '/api/analytics/bookings-by-month', null, adminToken);
  r.status === 200 ? log('4.14', 'Bookings by month', 'PASS', 'ok') : log('4.14', 'Bookings by month', 'FAIL', `${r.status}`);

  r = await request('GET', '/api/analytics/top-doctors', null, adminToken);
  r.status === 200 ? log('4.14', 'Top doctors', 'PASS', 'ok') : log('4.14', 'Top doctors', 'FAIL', `${r.status}`);

  // ─── LABORATORY FULL FLOW ───
  // Create lab request
  r = await request('POST', '/api/laboratory/requests', {
    patient_id: 1,
    items: [{ test_id: 1, priority: 'normal' }],
    notes: 'Solicitud de prueba'
  }, doctorToken);
  let labRequestId = null;
  if (r.status === 201) {
    labRequestId = r.body.id;
    log('4.12', 'Create lab request', 'PASS', `id=${labRequestId}`);
  } else {
    log('4.12', 'Create lab request', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,150)}`);
  }

  if (labRequestId) {
    // Get lab request detail
    r = await request('GET', `/api/laboratory/requests/${labRequestId}`, null, labToken);
    r.status === 200 ? log('6.3', 'Get lab request detail', 'PASS', `status=${r.body.status || r.body.data?.status}`) : log('6.3', 'Get lab request detail', 'FAIL', `${r.status}`);

    // Update status
    r = await request('PATCH', `/api/laboratory/requests/${labRequestId}/status`, { status: 'in_progress' }, labToken);
    r.status === 200 ? log('6.3', 'Update lab status to in_progress', 'PASS', 'ok') : log('6.3', 'Update lab status', 'FAIL', `${r.status} ${JSON.stringify(r.body).substring(0,100)}`);
  }

  // ─── LOGOUT ───
  r = await request('POST', '/api/auth/logout', {}, adminToken);
  r.status === 200 ? log('1.7', 'Logout', 'PASS', 'ok') : log('1.7', 'Logout', 'FAIL', `${r.status}`);

  // ─── SUMMARY ───
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warns = results.filter(r => r.status === 'WARN').length;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  RESUMEN: ${passed} PASS | ${failed} FAIL | ${warns} WARN`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
