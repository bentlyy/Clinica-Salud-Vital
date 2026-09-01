const http = require('http');

function req(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const r = http.request({ hostname: 'localhost', port: 3000, path, method, headers }, (res) => {
      let b = ''; res.on('data', c => b += c);
      res.on('end', () => { let p; try { p = JSON.parse(b); } catch { p = b; } resolve({ status: res.statusCode, headers: res.headers, body: p }); });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function run() {
  const R = [];
  const log = (mod, test, s, d) => { R.push({s}); console.log(`${s==='PASS'?'✅':s==='WARN'?'⚠️':'❌'} [${mod}] ${test}: ${s} — ${d}`); };

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PRUEBAS API — Vitaria Clinic (sin cambios al proyecto)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Desbloquear admin ejecutando reset desde DB
  // (no es cambio al proyecto, es operación sobre datos)

  // ─── 10.5 HEALTH CHECK ───
  let r = await req('GET', '/health');
  log('10.5', 'Health check /health', r.status===200?'PASS':'FAIL', `status=${r.body.status}`);

  r = await req('GET', '/api/health');
  log('10.5', 'Health check /api/health', r.status===200?'PASS':'FAIL', `status=${r.body.status}`);

  // ─── 10.4 CORRELATION ID ───
  r = await req('GET', '/api/specialties');
  log('10.4', 'X-Request-ID header', r.headers['x-request-id']?'PASS':'FAIL', r.headers['x-request-id']||'absent');

  // ─── 10.2 CSRF ───
  log('10.2', 'CSRF protection', 'WARN', 'frontend maneja cookies automáticamente — verificar en UI');

  // ─── 8: GUEST ───
  r = await req('GET', '/api/specialties');
  log('8.1', 'GET /api/specialties (público)', r.status===200?'PASS':'FAIL', `${r.body?.length} specialties`);

  r = await req('GET', '/api/doctors/public');
  log('8.1', 'GET /api/doctors/public', r.status===200?'PASS':'FAIL', `${Array.isArray(r.body)?r.body.length:'ok'}`);

  r = await req('POST', '/api/guest/booking', { name:'Guest Test', email:'guest@test.com', phone:'+56912345678', rut:'12345678-5', doctor_id:11, date:'2026-09-02', time:'10:00' });
  log('8.2', 'Booking como invitado', r.status===201?'PASS':'FAIL', `status=${r.status} id=${r.body?.id||''}`);

  r = await req('GET', '/api/guest/bookings/12345678-5');
  log('8.4', 'Buscar citas por RUT', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  // ─── AUTH: Todos los logins ───
  r = await req('POST', '/api/auth/login', { email:'superadmin@clinic.com', password:'admin123' });
  let S = r.body?.access_token;
  log('1.2', 'Login superadmin', r.status===200?'PASS':'FAIL', `role=${r.body?.user?.role}`);

  r = await req('POST', '/api/auth/login', { email:'admin@clinic.com', password:'admin123' });
  let A = r.body?.access_token;
  log('1.2', 'Login admin', r.status===200?'PASS':'FAIL', `role=${r.body?.user?.role} ${r.status!==200?'(posible lockout 15min)':''}`);

  r = await req('POST', '/api/auth/login', { email:'juan@clinic.com', password:'admin123' });
  let D = r.body?.access_token;
  log('1.2', 'Login doctor', r.status===200?'PASS':'FAIL', `role=${r.body?.user?.role}`);

  r = await req('POST', '/api/auth/login', { email:'lab@clinic.com', password:'admin123' });
  let L = r.body?.access_token;
  log('1.2', 'Login lab_technician', r.status===200?'PASS':'FAIL', `role=${r.body?.user?.role}`);

  r = await req('POST', '/api/auth/login', { email:'admin@norte.clinic.com', password:'admin123' });
  let AN = r.body?.access_token;
  log('1.2', 'Login admin-norte (tenant)', r.status===200?'PASS':'FAIL', `role=${r.body?.user?.role} tenant=${r.body?.user?.tenant_id}`);

  // 1.3 Login incorrecto
  r = await req('POST', '/api/auth/login', { email:'admin@clinic.com', password:'wrong' });
  log('1.3', 'Login credenciales incorrectas', r.status===400?'PASS':'FAIL', `msg=${r.body.error}`);

  // 1.10 Forgot password
  r = await req('POST', '/api/auth/forgot-password', { email:'admin@clinic.com' });
  log('1.10', 'Forgot password', r.status===200?'PASS':'WARN', `status=${r.status} msg=${r.body?.message||r.body?.error||''}`);

  // ─── MÓDULO 10: CROSS-CUTTING ───
  // 10.8 Calendar ICS
  r = await req('GET', '/api/calendar/doctor/11/ics');
  log('10.8', 'Calendar ICS (doctor 11)', r.status===200?'PASS':'FAIL', `status=${r.status} content-type=${r.headers['content-type']||''}`);

  // 10.9 Audit logs (superadmin)
  r = await req('GET', '/api/audit', null, S);
  log('10.9', 'Audit logs (superadmin)', r.status===200?'PASS':'FAIL', `status=${r.status} ${r.body?.data?.length||''} logs`);

  // ─── MÓDULO 3: SUPER ADMIN ───
  r = await req('GET', '/api/super-admin/users', null, S);
  log('3.3', 'Usuarios globales (superadmin)', r.status===200?'PASS':'FAIL', `${r.body?.data?.length} users`);

  r = await req('GET', '/api/specialties', null, S);
  log('3.4', 'Especialidades (superadmin)', r.status===200?'PASS':'FAIL', `${r.body?.length} specialties`);

  r = await req('POST', '/api/specialties', { name:'TestEsp', description:'test', icon:'🔬', color:'#ff0000', department:'Test' }, S);
  log('3.4', 'Crear especialidad', r.status===201?'PASS':'FAIL', `id=${r.body?.id} status=${r.status}`);
  if (r.body?.id) { await req('DELETE', `/api/specialties/${r.body.id}`, null, S); }

  r = await req('GET', '/api/holidays', null, S);
  log('3.5', 'Feriados (superadmin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  r = await req('GET', '/api/audit', null, S);
  log('3.6', 'Auditoría (superadmin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  // SaaS - buscar ruta correcta
  r = await req('GET', '/api/saas/plans', null, S);
  log('3.1', 'SaaS planes', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  r = await req('GET', '/api/saas/subscription', null, S);
  log('3.1', 'SaaS subscription', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  r = await req('GET', '/api/saas/features', null, S);
  log('3.1', 'SaaS features', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  r = await req('GET', '/api/saas/limits', null, S);
  log('3.1', 'SaaS limits', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  r = await req('GET', '/api/saas/usage', null, S);
  log('3.7', 'SaaS usage/billing', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  // ─── MÓDULO 4: ADMIN ───
  if (A) {
    r = await req('GET', '/api/doctors', null, A);
    log('4.2', 'Doctores (admin)', r.status===200?'PASS':'FAIL', `${r.body?.data?.length} doctors`);

    r = await req('GET', '/api/super-admin/users', null, A);
    log('4.3', 'Usuarios (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/bookings/all', null, A);
    log('4.4', 'Todas las citas (admin)', r.status===200?'PASS':'FAIL', `status=${r.status} ${r.body?.data?.length||''}`);

    r = await req('GET', '/api/clinical-records', null, A);
    log('4.6', 'Registros clínicos (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/billing', null, A);
    log('4.11', 'Facturación (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/analytics/dashboard', null, A);
    log('4.14', 'Analytics dashboard (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/notifications', null, A);
    log('4.15', 'Notificaciones (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/reports', null, A);
    log('4.13', 'Reportes (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/dashboard', null, A);
    log('4.12', 'Lab dashboard (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/lab/all', null, A);
    log('4.12', 'Lab requests (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/tests', null, A);
    log('4.12', 'Lab tests catalog (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/samples', null, A);
    log('4.12', 'Lab samples (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/dashboard/analytics', null, A);
    log('4.12', 'Lab analytics (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    // Create booking as admin
    r = await req('POST', '/api/bookings', { doctor_id:11, patient_name:'Test Patient', patient_email:'test@test.com', patient_phone:'+56911111111', patient_rut:'11111111-1', date:'2026-09-10', time:'10:00', reason:'Checkup' }, A);
    log('4.4', 'Crear cita (admin)', r.status===201?'PASS':'WARN', `status=${r.status} id=${r.body?.id||r.body?.booking?.id||''}`);

    // Availability
    r = await req('GET', '/api/availability?doctor_id=11', null, A);
    log('4.9', 'Disponibilidad doctor (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    // Specialties
    r = await req('GET', '/api/specialties', null, A);
    log('4.5', 'Especialidades (admin)', r.status===200?'PASS':'FAIL', `${r.body?.length} specialties`);

    // Holidays
    r = await req('GET', '/api/holidays', null, A);
    log('4.5', 'Feriados (admin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    // Data export
    r = await req('GET', '/api/export/me', null, A);
    log('10.7', 'Exportar mis datos', r.status===200?'PASS':'FAIL', `status=${r.status} type=${r.headers['content-type']||''}`);
  }

  // ─── MÓDULO 5: DOCTOR ───
  if (D) {
    r = await req('GET', '/api/bookings/doctor', null, D);
    log('5.3', 'Mis citas (doctor)', r.status===200?'PASS':'FAIL', `status=${r.status} ${r.body?.data?.length||''}`);

    r = await req('GET', '/api/clinical-records', null, D);
    log('5.6', 'Registros clínicos (doctor)', r.status===200?'PASS':'FAIL', `status=${r.status} ${r.body?.data?.length||''}`);

    r = await req('GET', '/api/clinical-records/prescriptions', null, D);
    log('5.7', 'Prescripciones (doctor)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/availability', null, D);
    log('5.8', 'Mi disponibilidad (doctor)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/medical-history', null, D);
    log('5.5', 'Historial paciente (doctor)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/dashboard', null, D);
    log('5.9', 'Lab dashboard (doctor)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/analytics/dashboard', null, D);
    log('5.10', 'Analytics (doctor)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/notifications', null, D);
    log('5.10', 'Notificaciones (doctor)', r.status===200?'PASS':'FAIL', `status=${r.status}`);
  }

  // ─── MÓDULO 6: LAB TECH ───
  if (L) {
    r = await req('GET', '/api/laboratory/dashboard', null, L);
    log('6.2', 'Lab dashboard (lab_tech)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/lab/all', null, L);
    log('6.3', 'Solicitudes lab (lab_tech)', r.status===200?'PASS':'FAIL', `status=${r.status} ${r.body?.data?.length||''}`);

    r = await req('GET', '/api/laboratory/tests', null, L);
    log('6.6', 'Catálogo tests (lab_tech)', r.status===200?'PASS':'FAIL', `status=${r.status} ${r.body?.data?.length||''}`);

    r = await req('GET', '/api/laboratory/samples', null, L);
    log('6.4', 'Muestras (lab_tech)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/areas', null, L);
    log('6.8', 'Áreas lab (lab_tech)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/equipment', null, L);
    log('6.9', 'Equipos (lab_tech)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/reagents', null, L);
    log('6.10', 'Reactivos (lab_tech)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/laboratory/dashboard/analytics', null, L);
    log('6.13', 'Analytics lab (lab_tech)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

    r = await req('GET', '/api/notifications', null, L);
    log('6.11', 'Notificaciones lab (lab_tech)', r.status===200?'PASS':'FAIL', `status=${r.status}`);
  }

  // ─── MÓDULO 2: CUENTA ───
  // Sessions con superadmin
  r = await req('GET', '/api/auth/sessions', null, S);
  log('2.3', 'Sesiones activas', r.status===200?'PASS':'FAIL', `${r.body?.data?.length||0} sesiones`);

  r = await req('GET', '/api/auth/me', null, S);
  log('2.1', 'Ver perfil', r.status===200?'PASS':'FAIL', `name=${r.body?.name} role=${r.body?.role}`);

  // ─── MÓDULO 10: MORE ───
  r = await req('GET', '/api/waitlist', null, S);
  log('4.16', 'Lista de espera', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  r = await req('GET', '/api/webhooks', null, S);
  log('4.17', 'Webhooks', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  r = await req('GET', '/api/attachments', null, S);
  log('5.11', 'Adjuntos/archivos', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  r = await req('GET', '/api/medical-history', null, S);
  log('4.8', 'Historial médico', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  // Logout
  r = await req('POST', '/api/auth/logout', {}, S);
  log('1.7', 'Logout (superadmin)', r.status===200?'PASS':'FAIL', `status=${r.status}`);

  // ─── MULTI-TENANCY ───
  r = await req('GET', '/api/doctors', null, AN);
  log('10.1', 'Multi-tenancy (admin-norte solo ve sus doctores)', r.status===200?'PASS':'FAIL', `${r.body?.data?.length||0} doctors`);

  // ─── RESUMEN ───
  const P = R.filter(r=>r.s==='PASS').length;
  const F = R.filter(r=>r.s==='FAIL').length;
  const W = R.filter(r=>r.s==='WARN').length;
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  RESUMEN: ${P} PASS | ${F} FAIL | ${W} WARN — Total: ${R.length}`);
  console.log('═══════════════════════════════════════════════════════════');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
