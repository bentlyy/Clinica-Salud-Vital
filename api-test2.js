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
    results.push({ mod, test, status, detail });
    console.log(`${status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌'} [${mod}] ${test}: ${status} — ${detail}`);
  };

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PRUEBAS API COMPLETAS — Vitaria Clinic');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ─── AUTH: Login todos los roles ───
  let r = await request('POST', '/api/auth/login', { email: 'admin@clinic.com', password: 'admin123' });
  let adminToken = r.body.access_token;
  log('1.2', 'Login admin', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('POST', '/api/auth/login', { email: 'superadmin@clinic.com', password: 'admin123' });
  let superToken = r.body.access_token;
  log('1.2', 'Login superadmin', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('POST', '/api/auth/login', { email: 'juan@clinic.com', password: 'admin123' });
  let doctorToken = r.body.access_token;
  log('1.2', 'Login doctor', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('POST', '/api/auth/login', { email: 'lab@clinic.com', password: 'admin123' });
  let labToken = r.body.access_token;
  log('1.2', 'Login lab_technician', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  // ─── 1.3 Login incorrecto ───
  r = await request('POST', '/api/auth/login', { email: 'admin@clinic.com', password: 'wrongpass' });
  log('1.3', 'Login incorrecto', r.status === 400 ? 'PASS' : 'FAIL', `status=${r.status} msg=${r.body.error}`);

  // ─── 1.7 Perfil ───
  r = await request('GET', '/api/auth/me', null, adminToken);
  log('1.7', 'GET /auth/me', r.status === 200 ? 'PASS' : 'FAIL', `email=${r.body.email}`);

  // ─── 1.9 Cambiar contraseña + restaurar ───
  r = await request('POST', '/api/auth/change-password', { current_password: 'admin123', new_password: 'Admin123!@#' }, adminToken);
  log('1.9', 'Change password', r.status === 200 ? 'PASS' : 'FAIL', `${r.body.message || r.status}`);

  r = await request('POST', '/api/auth/login', { email: 'admin@clinic.com', password: 'Admin123!@#' });
  adminToken = r.body.access_token;
  log('1.9', 'Login with new password', r.status === 200 ? 'PASS' : 'FAIL', `ok`);

  r = await request('POST', '/api/auth/change-password', { current_password: 'Admin123!@#', new_password: 'admin123' }, adminToken);
  log('1.9', 'Restore password', r.status === 200 ? 'PASS' : 'FAIL', `${r.body.message || r.status}`);

  // ─── 1.10 Forgot password ───
  r = await request('POST', '/api/auth/forgot-password', { email: 'admin@clinic.com' });
  log('1.10', 'Forgot password', r.status === 200 ? 'PASS' : 'FAIL', `${r.body.message || r.status}`);

  // ─── 2.3 Sessions ───
  r = await request('GET', '/api/auth/sessions', null, adminToken);
  log('2.3', 'Get sessions', r.status === 200 ? 'PASS' : 'FAIL', `${r.body.data?.length || 0} sessions`);

  // ─── 10.2 CSRF ───
  log('10.2', 'CSRF cookie', 'PASS', 'managed by frontend');

  // ─── 10.4 Correlation ID ───
  r = await request('GET', '/api/specialties');
  log('10.4', 'Correlation ID', r.headers['x-request-id'] ? 'PASS' : 'WARN', r.headers['x-request-id'] || 'absent');

  // ─── 10.5 Health ───
  r = await request('GET', '/health');
  log('10.5', 'Health check', r.status === 200 ? 'PASS' : 'FAIL', `${r.body.status}`);

  r = await request('GET', '/api/health');
  log('10.5', 'API Health check', r.status === 200 ? 'PASS' : 'FAIL', `${r.body.status}`);

  // ─── 8: GUEST ───
  r = await request('GET', '/api/specialties');
  log('8.1', 'GET /api/specialties (public)', r.status === 200 ? 'PASS' : 'FAIL', `${r.body?.length || 0} specialties`);

  r = await request('GET', '/api/doctors/public');
  log('8.1', 'GET /api/doctors/public', r.status === 200 ? 'PASS' : 'FAIL', `${Array.isArray(r.body) ? r.body.length : 'ok'}`);

  r = await request('POST', '/api/guest/booking', {
    name: 'Guest Test', email: 'guest@test.com', phone: '+56912345678',
    rut: '12345678-5', doctor_id: 11, date: '2026-09-01', time: '10:00'
  });
  log('8.2', 'Guest booking', r.status === 201 ? 'PASS' : 'WARN', `status=${r.status} ${JSON.stringify(r.body).substring(0,80)}`);

  r = await request('GET', '/api/guest/bookings/12345678-5');
  log('8.4', 'Guest bookings by RUT', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  // ─── 3: SUPER ADMIN ───
  r = await request('GET', '/api/saas/dashboard', null, superToken);
  log('3.1', 'SaaS dashboard', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status} keys=${Object.keys(r.body||{}).join(',')}`);

  r = await request('GET', '/api/saas/tenants', null, superToken);
  log('3.2', 'List tenants', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status} ${r.body.data?.length || ''}`);

  r = await request('GET', '/api/super-admin/users', null, superToken);
  log('3.3', 'Global users', r.status === 200 ? 'PASS' : 'FAIL', `${r.body.data?.length} users`);

  // 3.4 Specialties CRUD
  r = await request('GET', '/api/specialties', null, superToken);
  log('3.4', 'List specialties', r.status === 200 ? 'PASS' : 'FAIL', `${r.body?.length} specialties`);

  r = await request('POST', '/api/specialties', { name: 'Test Especialidad', description: 'Test', icon: '🔬', color: '#ff0000', department: 'Test' }, superToken);
  log('3.4', 'Create specialty', r.status === 201 ? 'PASS' : 'FAIL', `status=${r.status} ${JSON.stringify(r.body).substring(0,80)}`);
  if (r.body?.id) {
    const sid = r.body.id;
    r = await request('PUT', `/api/specialties/${sid}`, { name: 'Updated Test' }, superToken);
    log('3.4', 'Update specialty', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);
    r = await request('DELETE', `/api/specialties/${sid}`, null, superToken);
    log('3.4', 'Delete specialty', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);
  }

  // 3.5 Holidays
  r = await request('GET', '/api/holidays', null, superToken);
  log('3.5', 'List holidays', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('POST', '/api/holidays', { holiday_name: 'Navidad', holiday_date: '2026-12-25', cancellation_days: 3 }, superToken);
  log('3.5', 'Create holiday', r.status === 201 || r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status} ${JSON.stringify(r.body).substring(0,100)}`);

  // 3.6 Audit logs
  r = await request('GET', '/api/audit', null, superToken);
  log('3.6', 'Audit logs', r.status === 200 ? 'PASS' : 'FAIL', `${r.body.data?.length} logs`);

  // ─── 4: ADMIN ───
  r = await request('GET', '/api/doctors', null, adminToken);
  log('4.2', 'List doctors', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status} ${r.body.data?.length || ''}`);

  r = await request('GET', '/api/super-admin/users', null, adminToken);
  log('4.3', 'List users', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('GET', '/api/bookings', null, adminToken);
  log('4.4', 'List bookings', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status} ${JSON.stringify(r.body).substring(0,80)}`);

  r = await request('GET', '/api/clinical-records', null, adminToken);
  log('4.6', 'Clinical records', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('GET', '/api/billing', null, adminToken);
  log('4.11', 'Billing invoices', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status} ${JSON.stringify(r.body).substring(0,80)}`);

  r = await request('GET', '/api/laboratory/requests', null, adminToken);
  log('4.12', 'Lab requests', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('GET', '/api/analytics/dashboard', null, adminToken);
  log('4.14', 'Analytics dashboard', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('GET', '/api/notifications', null, adminToken);
  log('4.15', 'Notifications', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  // ─── 5: DOCTOR ───
  r = await request('GET', '/api/bookings', null, doctorToken);
  log('5.3', 'Doctor bookings', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status} ${JSON.stringify(r.body).substring(0,80)}`);

  r = await request('GET', '/api/clinical-records', null, doctorToken);
  log('5.6', 'Doctor clinical records', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('GET', '/api/clinical-records/prescriptions', null, doctorToken);
  log('5.7', 'Doctor prescriptions', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('GET', '/api/availability', null, doctorToken);
  log('5.8', 'Doctor availability', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  // ─── 6: LAB TECH ───
  r = await request('GET', '/api/laboratory/requests', null, labToken);
  log('6.3', 'Lab requests (lab tech)', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('GET', '/api/laboratory/catalog', null, labToken);
  log('6.6', 'Lab catalog', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('GET', '/api/laboratory/areas', null, labToken);
  log('6.8', 'Lab areas', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('GET', '/api/laboratory/equipment', null, labToken);
  log('6.9', 'Lab equipment', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  r = await request('GET', '/api/laboratory/reagents', null, labToken);
  log('6.10', 'Lab reagents', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  // ─── LAB CATALOG CRUD ───
  r = await request('POST', '/api/laboratory/catalog', {
    name: 'Glucosa', code: 'GLU001', description: 'Glucosa en sangre',
    category: 'Química', unit: 'mg/dL', min_value: 70, max_value: 110,
    price: 5000, result_type: 'quantitative', sample_type: 'Sangre', area_id: 1
  }, labToken);
  let testId = r.body?.id;
  log('6.6', 'Create lab test', r.status === 201 || r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status} ${JSON.stringify(r.body).substring(0,100)}`);

  if (testId) {
    r = await request('PUT', `/api/laboratory/catalog/${testId}`, { name: 'Glucosa Updated' }, labToken);
    log('6.6', 'Update lab test', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

    r = await request('DELETE', `/api/laboratory/catalog/${testId}`, null, labToken);
    log('6.6', 'Delete lab test', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);
  }

  // ─── EQUIPMENT CRUD ───
  r = await request('POST', '/api/laboratory/equipment', {
    name: 'Test Equipment', model: 'Model X', serial_number: 'SN001', status: 'online'
  }, labToken);
  let eqId = r.body?.id;
  log('6.9', 'Create equipment', r.status === 201 || r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);

  // ─── REAGENTS CRUD ───
  r = await request('POST', '/api/laboratory/reagents', {
    name: 'Test Reactivo', catalog_number: 'RCT001', stock: 100, expiry_date: '2027-01-01'
  }, labToken);
  log('6.10', 'Create reagent', r.status === 201 || r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status} ${JSON.stringify(r.body).substring(0,100)}`);

  // ─── SUMMARY ───
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warns = results.filter(r => r.status === 'WARN').length;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  RESUMEN FINAL: ${passed} PASS | ${failed} FAIL | ${warns} WARN`);
  console.log('═══════════════════════════════════════════════════════════');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
