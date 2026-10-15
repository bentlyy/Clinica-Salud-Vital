# SUB-5 — Flujos

## F1. Alta directa de doctor (`registerDoctor`) — enlace de setup roto

```
POST /api/doctors/register { name, specialty, email, rut?, phone? }   (admin)
   |
   v
registerDoctor(body, tenant_id)   [pool, BEGIN]
   - ensureSpecialty(specialty)
   - valida email (regex) y RUT (cleanRut/validateRut)
   - SELECT 1 FROM users WHERE rut=$1  FOR UPDATE   (GLOBAL, sin tenant) [FND-I4]
   - SELECT 1 FROM users WHERE email=$1 FOR UPDATE  (GLOBAL, sin tenant) [FND-I4]
   - tempPassword = generatePassword()  (12 chars, crypto.randomInt)     [no se devuelve]
   - bcrypt.hash(tempPassword, 12)
   - INSERT users (role='doctor', tenant_id)
   - INSERT doctors (name, specialty, email, user_id, tenant_id)
   - INSERT doctor_availability  (días 1-5, 09:00-17:00, hardcoded)       [FND-I12]
   COMMIT
   |
   v
setupToken = jwtManager.signInvite({id}, '24h')  purpose='setup-password'
   |
   v
sendEmail(doctorCredentialsEmail -> FRONTEND/login/setup-password?token=...)
   |
   v
201 { doctor, email }     (NUNCA se envía ni devuelve tempPassword)
   *
   NINGÚN endpoint verifica purpose='setup-password' ni existe ruta frontend
   /setup-password  ->  el doctor creado NO puede iniciar sesión  [FND-I1]
```

## F2. Invitación y aceptación (funciona)

```
POST /api/doctors/invite { email, name?, role, specialty? }  (admin|superadmin)
   |
   invitePerson():
     - role='doctor' -> exige specialty (solo no-vacío)                 [FND-I11]
     - role='lab_technician' -> specialty=undefined
     - SELECT 1 FROM users WHERE email=$1 AND tenant_id=$2 -> ya existe? BadRequest
     - inviteToken = signInvite({email,name,role,specialty,tenant_id},'7d') purpose='invite'
     - sendEmail(invitationEmail -> FRONTEND/register?invite=<token>)
   201 { message }
        |
        v
   (usuario recibe email) -> GET /api/auth/invite-info?token=  (público)
        -> { email, name, role, specialty, tenant_id }
        |
        v
   POST /api/auth/register { email, password, invite_token }   (público)
        register():
          - verifica invite_token (purpose='invite') -> override email/name/role/specialty/tid
          - si role='doctor' && specialty:
               [pool, BEGIN] INSERT users(role)=doctor + INSERT doctors + disponibilidad  COMMIT
             else:
               INSERT users (role heredado: patient|lab_technician)
          -> si rol distinto de doctor, NO se hace ensureSpecialty              [FND-I11]
```

## F3. Auto-registro público (sin invitación)

```
POST /api/auth/register { email, password, name, rut?, phone?, tenant_id? }  (público, authLimiter)
   |
   register():
     - validatePassword (mayús/minús/dígito/especial)   [SUB-2]
     - role = 'patient'  (por defecto)                                    [FND-A7]
     - tid = tenant_id(body) || req.tenant_id
        * /api/auth/register es PUBLIC_PATH: si el tenant no existe NO se rechaza
          -> se puede crear el usuario en un tenant arbitrario/inexistente  [FND-A7]
     - INSERT users (role='patient', tenant_id=tid)
   201 { id, email, rut, phone }
   *
   `tenant_id` del body (auth.controller.ts:56) tiene prioridad sobre el header.
```

## F4. Listado y activación/desactivación de usuarios del tenant

```
GET /api/doctors/users?page&limit&role&search   (admin|superadmin|doctor)
   |
   listTenantUsers(tenant_id, page, limit, {role, search})
     - conditions: u.tenant_id=$1 [+ role] [+ (name|email) ILIKE]
     - COUNT(*) OVER() para total; ORDER BY created_at DESC
   -> { data:[id,email,name,role,rut,phone,active,created_at], pagination }
   *
   devuelve TODO el tenant (admins, doctores, pacientes) -> PII a doctores [FND-I5]
   * NO filtra por `active` (el filtro is_active del frontend es inerte)

PATCH /api/doctors/users/:userId/active   (admin|superadmin)
   |
   toggleUserActive(userId, tenant_id)   [pool]
     - UPDATE users SET active = NOT active WHERE id=$1 AND tenant_id=$2
     - si queda inactivo: UPDATE refresh_tokens SET revoked=true WHERE user_id=$1
   -> authMiddleware ya bloquea `active=false` en cada request (auth.middleware.ts:110)
```

## F5. Listado de pacientes (frontend, sin entidad backend)

```
PatientsPage -> usePatientList -> patientService.list(params)
   |
   Promise.all([
     apiClient.get('/doctors/users', { params:{...,role:'user'} }),
     apiClient.get('/doctors/users', { params:{...,role:'patient'} }),
   ])
   - merge + dedupe por id en cliente
   - filtered por gender  (el backend NO devuelve gender -> filtro inerte) [FND-I6]
   - re-paginación en cliente (slice) sobre total combinado              [FND-I6]
   -> { data, total, page, limit, totalPages }
   *
   La columna "gender" siempre muestra '—' (mapPatient no mapea gender).
```

## F6. Gestión global de usuarios (SuperAdmin)

```
GET /api/super-admin/users?tenant_id&role&search   (superadmin)
   |
   listUsers(page, limit, {tenantId, role, search})  [superAdminPool, BYPASSRLS]
     - WHERE 1=1 [+ u.tenant_id] [+ u.role] [+ (name|email) ILIKE]
   -> data incluye tenant_id, password_changed, totp_enabled, last_activity_at

PATCH /api/super-admin/users/:userId/active { active }   (superadmin)
   |
   setUserActive(userId, active, req.tenant_id)      [superAdminPool]
     - UPDATE users SET active=$1 WHERE id=$2 [AND tenant_id=$3]
   *
   se pasa req.tenant_id como scope -> acota a un tenant, no es realmente global [FND-I9]
   * a diferencia de doctor.toggleUserActive, NO revoca refresh_tokens

DELETE /api/super-admin/tenants/:id  -> deleteTenant(): desactiva TODOS los users del tenant [FND-G10]
```

## F7. Creación de ficha de doctor para usuario existente

```
POST /api/doctors { name, specialty, email, user_id }   (admin|superadmin)
   |
   controller: si no viene user_id -> delega en registerDoctor (F1)
   si viene user_id -> createDoctor():
     [pool, BEGIN]
       ensureSpecialty(specialty)
       SELECT id, role, tenant_id FROM users WHERE id=$1 FOR UPDATE
         - no existe / tenant distinto -> BadRequest
         - role != 'doctor' -> BadRequest
       INSERT doctors (name, specialty, email, user_id, tenant_id)
       INSERT doctor_availability (días 1-5, 09:00-17:00)
     COMMIT
   *
   createDoctorSchema acepta specialty_id/license_number/bio/consultation_fee
   que createDoctor IGNORA (se descartan en silencio)                     [FND-I7]
```
