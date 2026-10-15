# Hallazgos (Fase 12) — registro vivo

> Este archivo se va poblando durante la auditoría. Aquí solo se consignan hallazgos con **evidencia de código**; la matriz de impacto/probabilidad/severidad completa se cerrará en Fase 12.
> **Regla:** no modificar código para resolverlos.

## Confirmados (código)

### FND-A1 — El bloqueo de cuenta por intentos fallidos no persiste 🔴
- **Descripción:** en login con contraseña incorrecta, el `UPDATE users SET failed_attempts = ... , locked_until = NOW() + INTERVAL '15 minutes'` se ejecuta dentro de la transacción y acto seguido se hace `ROLLBACK`, revirtiendo el incremento. Nunca se acumulan 5 intentos, por lo que `locked_until` jamás se activa.
- **Evidencia:** `src/modules/auth/auth.service.ts:318-325`.
- **Impacto:** protección anti-fuerza bruta de cuenta inoperante; sólo queda el límite por IP+email (10/15 min).
- **Certeza:** confirmado (lectura de código).
- **Recomendación (Fase 12):** persistir el contador fuera/después del rollback (p. ej. `COMMIT` del incremento antes de lanzar el error, o pool aparte).

### FND-A2 — JWKS vacío pese a claves RSA declaradas 🟡
- **Descripción:** `GET /api/auth/.well-known/jwks.json` devuelve `{ "keys": [] }`; no se implementa RS256. `render.yaml` declara `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` que el código nunca lee.
- **Evidencia:** `src/shared/jwt.service.ts:39-41`; `render.yaml:50-53`.
- **Certeza:** confirmado.

### FND-A3 — Reutilización de `AUDIT_HMAC_SECRET` para hashear tokens de sesión 🟡
- **Descripción:** `hashToken()` = HMAC con `AUDIT_HMAC_SECRET`, usado para refresh tokens y reset tokens; acopla dos mecanismos de seguridad a un mismo secreto.
- **Evidencia:** `src/shared/crypto.service.ts:71-77`; uso en `auth.service.ts:356,377,460,642,844,892`.
- **Certeza:** confirmado.

### FND-A4 — Política de contraseña duplicada (3 implementaciones) 🟡
- **Evidencia:** Zod `auth.schema.ts:3-9`; `validatePassword` `auth.service.ts:127-133`; inline en `resetPassword` `auth.service.ts:882-886`.
- **Riesgo:** divergencia (la de Zod no se aplica en reset porque el endpoint usa `resetPasswordSchema`… verificar en Fase 4 si coinciden exactamente).
- **Certeza:** confirmado.

### FND-A6 — `optionalAuth` global sin verificar `token_version`/sesión 🟡
- **Descripción:** `optionalAuth` (ejecutado en toda petición, `app.ts:189`) sólo firma-verifica el JWT y asigna `req.user`, sin comprobar `token_version`, `active`, `revoked_at` ni `expires_at`. `tenantMiddleware` confía en `req.user.tenant_id`.
- **Evidencia:** `src/middlewares/auth.middleware.ts:136-145`.
- **Riesgo:** un token revocado sigue poblando `req.user` en rutas no protegidas por `authMiddleware`; impacto acotado pero requiere revisión de qué rutas usan `req.user` sin `authMiddleware`.
- **Certeza:** confirmado (comportamiento); impacto real pendiente.

### FND-A8 — `auth.service.ts` (962 líneas) mezcla 3 dominios 🟢
- **Descripción:** credenciales/sesiones + 2FA + password-reset con SQL inline extenso en un solo archivo.
- **Evidencia:** `src/modules/auth/auth.service.ts` (conteo de líneas).
- **Certeza:** confirmado.

## Confirmados — SUB-3 (multi-tenancy / RLS)

### FND-B1 — 7 tablas con fuga cross-tenant conocida y sin corregir 🔴
- **Descripción:** el test de aislamiento marca explícitamente como "deuda conocida" tablas que HOY exponen filas de otros tenants: `onboarding_documents`, `specialties`, `subscription_invoices`, `subscriptions`, `tenant_features`, `tenant_onboarding`, `tenant_usage`. El test **no falla** por ellas.
- **Evidencia:** `tests/integration/rls-isolation.test.js:30-41`.
- **Impacto:** lectura cross-tenant de datos SaaS y de catálogo; `specialties` y `onboarding_documents` pueden no tener `tenant_id`/RLS.
- **Certeza:** confirmado (declarado en el propio test).

### FND-B2 — RLS con fallback fail-open a `'default'` 🟡
- **Descripción:** todas las policies usan `COALESCE(current_setting('app.tenant_id', true), 'default')`. Si el GUC no está seteado (job, query fuera del wrapper, cliente raw), el predicado es `tenant_id = 'default'` en vez de denegar.
- **Evidencia:** `db/security.sql:136-139`; `db/migrations/021:36-38,59-60`; `db.ts:122` (usa `DEFAULT_TENANT_ID`).
- **Mitigación actual:** `tagTenantAwarePool` siempre setea el GUC (a `default` si no hay contexto), por lo que el tráfico normal no cae al fallback "accidental" — pero **cualquier query fuera del pool envuelto sí**.
- **Certeza:** confirmado.
- **DECISIÓN (2026-10-15): aceptado, no se corrige.** Producción (Vitaria/Render) retuvo **deliberadamente** `COALESCE(..., 'default')` por compatibilidad Render/PgBouncer (ver `033_rls_hardening.sql` en prod): una política fail-closed devolvería 0 filas si el GUC no llega a la conexión, con riesgo de corte. Se descartó el fail-closed; la migración que lo proponía (antes `033_rls_fail_closed.sql`) se renumeró a `036_rls_tenant_isolation_standard.sql` conservando COALESCE. Mitigación: warning explícito en `src/shared/db.ts` si el GUC no puede setearse.

### FND-B3 — Rutas públicas operan sobre la clínica `'default'` 🟡
- **Descripción:** en rutas de `PUBLIC_PATHS` sin tenant, el middleware fija `req.tenant_id = DEFAULT_TENANT_ID || 'default'` incluso en producción.
- **Evidencia:** `tenant.middleware.ts:16-35,57-61`; `multi-tenant.service.ts:87-89`.
- **Certeza:** confirmado.

### FND-B4 — `tenants` con `USING (true)` 🟡
- **Descripción:** la policy de lectura de `tenants` no filtra por tenant: cualquier conexión de app (con `app.tenant_id` seteado) lee **todas** las filas de tenants (nombre, dominio, config). Escrituras bloqueadas (`WITH CHECK false`).
- **Evidencia:** `db/security.sql:178-182`, `db/migrations/021:63-66`.
- **Certeza:** confirmado.

### FND-B5 — La migración 021 debilita la restricción de escritura SaaS 🟡 (contradice el comentario)
- **Descripción:** `security.sql:213-218` bloquea escritura en `plans, subscriptions, subscription_invoices, tenant_features, tenant_usage` con `USING (false) WITH CHECK (false)`. La migración 021 **recrea** `restrict_writes` como `USING (current_setting('app.tenant_id', true) IS NOT NULL) WITH CHECK (mismo)` (`021:77-85`). Como el wrapper siempre setea el GUC, el rol de app **puede escribir** esas tablas. El comentario de `security.sql:211-212` ("writes blocked") deja de ser cierto tras 021.
- **Evidencia:** `db/security.sql:205-221` vs `db/migrations/021:69-86`.
- **Impacto:** un endpoint con bug podría alterar planes/suscripciones/features, saltándose el diseño de "sólo superadmin escribe" (que sí se respeta en `saas.service` al usar `superAdminPool`).
- **Certeza:** confirmado.

### FND-B6 — Cambios de `locked_until` no se auditan 🟢
- **Descripción:** el trigger de auditoría de `users` compara/loguea `blocked_until` (bloqueo clínico de paciente), no `locked_until` (lockout de login). Los bloqueos/desbloqueos de credenciales no quedan en `audit_logs`.
- **Evidencia:** `db/security.sql:270-289`; columnas en `db/init.sql:35` (`blocked_until`) y `:43` (`locked_until`).
- **Certeza:** confirmado.

### FND-B7 — `DEFAULT_TENANT_ID` acopla dev/CI/prod 🟢
- **Descripción:** `'default'` es a la vez tenant semilla, fallback de contexto y valor de RLS; no hay un `deny-all` cuando falta tenant.
- **Evidencia:** `db.ts:75-80,92,122,129`; `multi-tenant.service.ts:88`.
- **Certeza:** confirmado.

### FND-B8 — `getTenantFeatures` provoca N+1 🟢
- **Descripción:** itera 9 feature keys y llama `checkFeatureAccess` (1 query c/u) secuencialmente con `Promise.all`; ~9 consultas por request que lo use.
- **Evidencia:** `saas.service.ts:403-412` + `389-401`.
- **Certeza:** confirmado.

## Confirmados — SUB-7 (historia clínica / PHI)

### FND-C1 — `POST /clinical-records` no valida relación médico-paciente 🟡
- **Descripción:** el controller de creación (`createClinicalRecord`) obtiene el doctor y llama al servicio con `doctor_id` propio, pero **no** invoca `assertDoctorPatientRelationship` ni ningún chequeo de relación. El servicio solo verifica que el paciente exista en el tenant (`SELECT id FROM users WHERE id=$1 AND tenant_id=$2`). Resultado: un doctor puede crear una ficha (con diagnóstico/PHI) para **cualquier** paciente del tenant, incluso uno que nunca trató. Contraste: `medical-history` **sí** aplica `assertDoctorAccessToPatient` en la escritura (`medical-history.controller.ts:63-67`).
- **Evidencia:** `clinical-record.controller.ts:129-139`; `clinical-record.service.ts:158-159`; contraste `medical-history.controller.ts:10-14,63-67`.
- **Impacto:** integridad/autorización de PHI en escritura; posible atribución falsa de una ficha.
- **Certeza:** confirmado.

### FND-C2 — Rutas de PHI de `superadmin` quedan limitadas al tenant `'default'` 🟡
- **Descripción:** cuando un `superadmin` llama a rutas de fichas/recetas, el controller pasa `tenantId=undefined` para "ver todo", pero el contexto RLS se fijó a `'default'` en el middleware (superadmin tiene `tenant_id NULL`), y estas rutas usan `readPool`/`pool` (con RLS), **no** `superAdminPool`. Efecto: el superadmin solo ve el tenant `'default'`.
- **Evidencia:** `clinical-record.controller.ts:49-58,199-200`; `medical-history.controller.ts:17,44`; `tenant.middleware.ts:47-58`; coherente con el motivo de la migración `025` ("panel SuperAdmin muestra 0 salvo default").
- **Impacto:** funcional (no fuga). El aislamiento no se rompe; la funcionalidad cross-tenant no existe por esta vía.
- **Certeza:** confirmado (código); efecto en prod asumido.

### FND-C3 — `doesDoctorHaveBookingWithPatient` no excluye bookings canceladas 🟡
- **Descripción:** la versión de `clinical-record.service` cuenta cualquier booking `(doctor_id, user_id, tenant)` sin filtrar `status != 'cancelled'`, mientras `ownership.ts:26-27` sí lo hace. Un doctor conserva acceso al historial completo de un paciente tras cancelarse la única cita.
- **Evidencia:** `clinical-record.service.ts:350-356` vs `shared/ownership.ts:23-32`.
- **Certeza:** confirmado.

### FND-C4 — Listado general no excluye fichas canceladas 🟡
- **Descripción:** `getAllClinicalRecords` no filtra `status != 'cancelled'`, pero `getClinicalRecordsByPatient` sí. Una ficha cancelada reaparece en listados generales.
- **Evidencia:** `clinical-record.service.ts:92-95` vs `:131`.
- **Certeza:** confirmado.

### FND-C5 — PII del paciente expuesta a doctores/admin (`patient_rut`, `patient_email`) 🟢
- **Descripción:** los `SELECT` de fichas traen `u.email AS patient_email, u.rut AS patient_rut` para todos los roles autorizados.
- **Evidencia:** `clinical-record.service.ts:67-68,112`.
- **Certeza:** confirmado.

### FND-C6 — SQL inline duplicado en el controller de recetas 🟢
- **Descripción:** `getAllPrescriptions` (controller) reimplementa en SQL lo que ya existe en `prescriptionService.getAllPrescriptions`; importa `pool` dinámicamente dentro del handler.
- **Evidencia:** `clinical-record.controller.ts:207-233` vs `prescription.service.ts:115-143`.
- **Certeza:** confirmado.

### FND-C7 — `medical-history` no sanitiza texto libre 🟢
- **Descripción:** `condition` y `notes` se insertan tal cual; `clinical-record` sí usa `sanitizeTextStrict`. Inconsistencia de sanitización entre módulos PHI.
- **Evidencia:** `medical-history.service.ts:73-95` vs `clinical-record.service.ts:9-20`.
- **Certeza:** confirmado.

### FND-C8 — `updateTemplate` recibe `doctorId` sin usarlo; plantillas sin ownership 🟢
- **Descripción:** la firma `updateTemplate(id, data, doctorId, tenantId)` ignora `doctorId`; cualquier doctor/admin del tenant puede editar cualquier plantilla.
- **Evidencia:** `clinical-template.service.ts:51`.
- **Certeza:** confirmado.

### FND-C9 — Sin máquina de estados en fichas 🟢
- **Descripción:** `updateClinicalRecord` acepta cualquier `status` (`draft`/`completed`/`cancelled`) sin validar transiciones; se puede reabrir una ficha `completed`... (no: eso se bloquea) pero sí pasar `cancelled`→`draft`.
- **Evidencia:** `clinical-record.service.ts:255-280`.
- **Certeza:** confirmado.

### FND-C10 — `medical-history` define sus esquemas Zod inline 🟢
- **Descripción:** los schemas viven en el router, no en un `.schema.ts`; rompe el patrón Route/Schema/Controller/Service del resto.
- **Evidencia:** `medical-history.routes.ts:9-22`.
- **Certeza:** confirmado.

## Confirmados — SUB-6 (agenda, disponibilidad y citas)

### FND-D1 — El job de recordatorios opera sólo sobre el tenant `'default'` 🔴
- **Descripción:** `sendReminders` corre desde un cron (sin request), por lo que el pool tenant-aware no tiene contexto en `AsyncLocalStorage`; bajo RLS cae al fallback `COALESCE(current_setting('app.tenant_id', true), 'default')`. Además `sendEmail({to,subject,html})` se invoca **sin `tenantId`**, por lo que se usa la configuración SMTP del tenant por defecto. Efecto: los recordatorios 1h/24h no se envían a tenants ≠ `'default'` (o se envían con remitente incorrecto).
- **Evidencia:** `src/jobs/reminder.job.ts:41-56,65-79`; `src/shared/db.ts` (ALS/`tagTenantAwarePool`); `src/shared/email.service.ts`.
- **Impacto:** funcional multi-tenant — recordatorios inoperantes fuera de `'default'`.
- **Certeza:** confirmado (código); efecto en prod asumido.

### FND-D2 — El flujo "confirmar cita" es código muerto para las citas que crea el sistema 🟡
- **Descripción:** las citas se insertan siempre con `confirmed = true` (booking autenticado, serie y guest). `confirmBooking` sólo actualiza filas `WHERE confirmed = FALSE`, condición que nunca se cumple; siempre devuelve `alreadyConfirmed: true`. El email/botón "Confirma tu cita" y el `needsConfirmation` del recordatorio son no-ops.
- **Evidencia:** `booking.service.ts:419,705-708,412-415`; `guest.service.ts:74-77`; `booking.service.ts:138-142` (serie); `reminder.job.ts:59,67`.
- **Certeza:** confirmado.

### FND-D3 — Desalineación `confirmed` (bool) ↔ `status` (enum) y máquina de estados implícita 🟡
- **Descripción:** una cita nace `confirmed=true` pero `status='pending'`; el recordatorio filtra por `status='pending'`; `validateBookingSlot` sólo excluye `status='cancelled'`. No existe una máquina de estados formal ni guarda `status != 'cancelled'` en los `UPDATE` de cancelación (doble cancelación reescribe historial).
- **Evidencia:** `booking.service.ts:424-434,540-545`; `booking-utils.ts:106`; `reminder.job.ts:52`.
- **Certeza:** confirmado.

### FND-D4 — `GET /api/guest/bookings/:rut` es público y revela citas (PHI) de cualquier RUT del tenant 🟡
- **Descripción:** la ruta no exige autenticación (prefijo público en `tenant.middleware`) y devuelve doctor/fecha/hora/estado de las citas (y las de `users` con ese RUT) dentro del tenant. Con RUT ajeno (dato semi-público en Chile) se puede enumerar la agenda de salud de una persona.
- **Evidencia:** `guest.routes.ts:23`; `tenant.middleware.ts:35`; `guest.service.ts:109-128`.
- **Mitigación actual:** `rutLookupLimiter` 3/15 min.
- **Certeza:** confirmado.

### FND-D5 — Tokens de confirmación sin `tenant_id` (autenticado/serie) → guarda cross-tenant omitida 🟡
- **Descripción:** `signInvite({user_id,doctor_id,date,time})` no incluye `tenant_id` para citas autenticadas ni por series, así que `if (payload.tenant_id && …)` se salta y el `UPDATE` de confirmación depende del tenant del request (`'default'` si es público sin header). Los tokens guest **sí** llevan `tenant_id`. Inconsistencia.
- **Evidencia:** `booking.service.ts:412-415,697-702`; `guest.service.ts:68-71`.
- **Certeza:** confirmado.

### FND-D6 — Dos cancelaciones divergentes (`booking` vs `guest`) 🟡
- **Descripción:** `booking.service.cancelBooking` permite sólo al dueño, notifica waitlist + in-app y no toca series. `guest.service.cancelGuestBooking` permite a `admin`/`doctor` cancelar cualquier cita, pero **no** llama `notifyWaitlistForSlot`, ni notificación in-app, ni cancela la serie. Un staff que cancele por la ruta guest deja el hueco sin ofrecer a la waitlist.
- **Evidencia:** `booking.service.ts:525-571` vs `guest.service.ts:130-175`.
- **Certeza:** confirmado.

### FND-D7 — `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ` sin `BEGIN` (sin efecto) 🟡
- **Descripción:** `getAvailableSlots` emite `SET TRANSACTION …` como primera sentencia de una conexión en autocommit, sin abrir transacción; PostgreSQL no aplica el nivel y las 4 lecturas (feriado, disponibilidad, reservadas, excepciones) no comparten snapshot.
- **Evidencia:** `booking.service.ts:741-791`.
- **Certeza:** confirmado.

### FND-D8 — Feriado: `from_status` fijo `'confirmed'` y aviso a waitlist sin hueco real 🟡
- **Descripción:** al crear un feriado, el historial masivo escribe `from_status='confirmed'` para todas las citas (aunque su estado real sea `pending`), y luego llama `notifyWaitlistForSlot` por cada cita cancelada — prometiendo un hueco en una fecha en que la clínica **está cerrada**.
- **Evidencia:** `holidays.service.ts:103-122,127-148`.
- **Certeza:** confirmado.

### FND-D9 — `GET /bookings/all` como `superadmin` queda limitado al tenant `'default'` 🟡
- **Descripción:** el controller pasa `tenantId = undefined` para superadmin, pero `getAllBookings` usa `readPool` (RLS activo) y el contexto se fijó a `'default'`; no usa `superAdminPool`. Mismo patrón que FND-C2.
- **Evidencia:** `booking.controller.ts:76-77`; `booking.service.ts:295-338`.
- **Certeza:** confirmado (código).

### FND-D10 — `rescheduleBooking` registra historial con `from_status == to_status` 🟢
- **Descripción:** graba `toStatus: booking.status` y `fromStatus: booking.status` (mismo valor), por lo que el historial muestra una transición ficticia y el `status` nunca pasa a `'rescheduled'`.
- **Evidencia:** `booking.service.ts:634-645`.
- **Certeza:** confirmado.

### FND-D11 — `cancelBookingSeries` ejecuta `SELECT` antes del `BEGIN` 🟢
- **Descripción:** la lectura de `booking_series` (y el chequeo de autorización) ocurre antes de `BEGIN` con el mismo cliente → ventana de carrera entre la verificación y la actualización de las citas.
- **Evidencia:** `booking.service.ts:236-250`.
- **Certeza:** confirmado.

### FND-D12 — `GET /api/availability/:id` es público 🟢
- **Descripción:** la ruta no aplica `authMiddleware`, permitiendo enumerar la disponibilidad semanal de cualquier doctor por `id` dentro del tenant.
- **Evidencia:** `availability.routes.ts:26`.
- **Certeza:** confirmado.

### FND-D13 — Export ICS asume horas locales como UTC y filtra RUT del paciente 🟢
- **Descripción:** `toUTCDate` serializa `…T${time}Z` (hora local tratada como UTC) → desfase horario en Chile; además la `DESCRIPTION` incluye el `RUT` del paciente, PII en un archivo exportable/compartible.
- **Evidencia:** `calendar.service.ts:19,95-104`.
- **Certeza:** confirmado.

### FND-D14 — Filtro tautológico y join sin tenant en `sendReminders` 🟢
- **Descripción:** `AND (b.confirmed = TRUE OR b.confirmed = FALSE)` es siempre verdadero, y `b.tenant_id IS NOT NULL` es redundante; el `LEFT JOIN users u ON b.user_id = u.id` omite la condición de tenant (inconsistente con el resto de queries).
- **Evidencia:** `reminder.job.ts:49-56`.
- **Certeza:** confirmado.

### FND-D15 — `DELETE /api/guest/booking/:id` sin rate limiter 🟢
- **Descripción:** la cancelación de invitado usa `optionalAuth` pero no tiene limiter (a diferencia de las otras rutas guest), habilitando intentos repetidos de cancelación por RUT+token.
- **Evidencia:** `guest.routes.ts:24`.
- **Certeza:** confirmado.

## Confirmados — SUB-8 (laboratorio)

### FND-E1 — Envío de resultados de laboratorio (PHI) a un email arbitrario sin ownership 🔴
- **Descripción:** `POST /api/laboratory/results/email` toma `req.body.email` y lo usa como destinatario de los resultados del paciente; no verifica que la orden pertenezca al médico/tenant del solicitante ni que el email sea del paciente. Cualquier `doctor`/`lab_technician`/`admin` puede exfiltrar PHI de laboratorio de **cualquier** orden del tenant a una dirección que él elija.
- **Evidencia:** `laboratory.controller.ts:179-192`; `lab-result-email.service.ts:70-127`; ruta `laboratory.routes.ts:93`. Contrasta con `getLabRequestById` (`laboratory.controller.ts:88-97`) que **sí** aplica ownership.
- **Impacto:** fuga de datos clínicos (resultados) a terceros; rompe el modelo de ownership usado en el resto del módulo.
- **Certeza:** confirmado.

### FND-E2 — Capturar un resultado no avanza el estado → la validación por técnico queda inalcanzable por el flujo natural 🟡
- **Descripción:** `updateLabRequestItemResult` escribe `result_value`/`result_notes` pero **no** cambia `status` a `result_entered`. `validateItemByTech` solo acepta `status IN ('result_entered','processing')`; por lo tanto, tras capturar un resultado (ítem en `pending` u otro estado), la validación técnica falla con `LAB_ITEM_INVALID_STATUS`. El flujo "capturar → validar → firmar → entregar" solo funciona si alguien fija el estado a mano vía `updateLabRequestItemStatus`.
- **Evidencia:** `laboratory.service.ts:296-303` (result) vs `:691-699` (validate-tech).
- **Certeza:** confirmado.

### FND-E3 — Sin máquina de estados ni validación de entrada en los cambios de status 🟡
- **Descripción:** `updateLabRequestStatus` y `updateLabRequestItemStatus` escriben directamente el `status` recibido en `req.body`, sin Zod (enum) ni guarda de transición/rol. El único límite es el `CHECK` de la tabla (conjunto de valores), no el orden; cualquier rol autorizado puede saltar a `signed`/`delivered`. Tampoco hay validación de entrada para muestras, QC, equipos ni reactivos (todo `req.body` directo).
- **Evidencia:** `laboratory.service.ts:263-270,337-344`; rutas `laboratory.routes.ts:97,40`; ausencia de schemas en `laboratory.schema.ts` (14 L).
- **Certeza:** confirmado.

### FND-E4 — `lab_result_history` es una tabla muerta y el historial se calcula (mal) en vivo 🟡
- **Descripción:** la tabla `lab_result_history` existe y está bajo RLS, pero **ningún** código la escribe ni la lee. `getItemHistory` calcula los deltas al vuelo con `LAG(result_value) OVER (ORDER BY lr.created_at DESC)`: con orden DESC, `LAG` devuelve la fila **más reciente** como "previous", invirtiendo la semántica de `previous_result_value`/`delta_percentage`. Los campos `previous_result_id` y `delta_check_status` de `lab_request_items` tampoco se pueblan.
- **Evidencia:** `db/init.sql:773-784`; `db/migrations/004_add_lab_samples.sql:36`; `laboratory.service.ts:774-820`.
- **Certeza:** confirmado.

### FND-E5 — Endpoint público de resultados por token sin rate limiting ni revocación 🟡
- **Descripción:** `GET /api/laboratory/results/shared/:token` es público, no tiene `rateLimiter` y acepta además `?token=` en query; el JWT (`scope=lab-result`) es válido 7 días y no es revocable individualmente. Un token filtrado (logs, historial, referrer) expone PHI hasta su expiración.
- **Evidencia:** `laboratory.routes.ts:27`; `laboratory.controller.ts:194-200`; `lab-result-email.service.ts:77-80,129-135`.
- **Certeza:** confirmado.

### FND-E6 — Estrategia cross-tenant de superadmin inconsistente dentro del mismo módulo 🟡
- **Descripción:** para superadmin, `getLabTests` y `getLabRequests` pasan `tenantId = undefined` (se omite el filtro SQL), pero siguen usando `pool`/`readPool` sujetos a RLS con `app.tenant_id` (probable `'default'`), reproduciendo la limitación de FND-C2/D9. En cambio, `getNotifications` y `handleLabEvents` **sí** aceptan `req.query.tenant_id` para el superadmin. Conviven dos mecanismos distintos en el mismo módulo.
- **Evidencia:** `laboratory.controller.ts:18-25,74-82` vs `:350-356,364-367`.
- **Certeza:** parcialmente confirmado (depende de qué fija `tenantMiddleware` para superadmin — Fase 7).

### FND-E7 — Vínculos sin verificación de pertenencia (BOLA/IDOR) en muestras y órdenes 🟢
- **Descripción:** `createSample` acepta `lab_request_id`/`lab_request_item_id` del body sin verificar que pertenezcan al tenant; `createLabRequest` acepta `clinical_record_id` sin verificar pertenencia; `sample_code` se genera aleatorio sin chequear unicidad ni constraint visible en `init.sql`.
- **Evidencia:** `laboratory.service.ts:609-616,585-588,136-140`.
- **Certeza:** confirmado (la verificación de pertenencia no existe en el código).

### FND-E8 — Analytics con campos placeholder hardcodeados 🟢
- **Descripción:** `getAnalyticsData` devuelve `by_priority: []`, `avg_processing_time: 0` y `error_rate: 0` fijos, pese a que el dashboard y la UI los consumen.
- **Evidencia:** `laboratory.service.ts:571-576`.
- **Certeza:** confirmado.

### FND-E9 — Umbral de delta de historial hardcodeado, ignora `lab_tests.delta_check_pct` 🟢
- **Descripción:** `getItemHistory` usa umbrales fijos (`>50` crítico, `>20` warning) en lugar de `lab_tests.delta_check_pct` (columna existente, default 20 definido en migración 003).
- **Evidencia:** `laboratory.service.ts:806`; `db/migrations/003_add_lab_areas.sql:25`.
- **Certeza:** confirmado.

### FND-E10 — Borrado físico de exámenes con FK `ON DELETE CASCADE` 🟢
- **Descripción:** `deleteLabTest` hace `DELETE` físico; `lab_request_items.lab_test_id` referencia `lab_tests` con `ON DELETE CASCADE`, por lo que borrar un test elimina el vínculo de ítems históricos (pérdida de trazabilidad).
- **Evidencia:** `laboratory.service.ts:120-126`; `db/init.sql:349`.
- **Certeza:** confirmado.

### FND-E11 — La ruta de creación de orden permite `admin`, pero el controller exige perfil de médico 🟢
- **Descripción:** `POST /api/laboratory` autoriza `admin` y `doctor`, pero el controller ejecuta incondicionalmente `getDoctorByUserId(req.user.id)` y lanza 404 si no existe perfil médico. Un `admin` sin perfil de doctor **no** puede crear órdenes pese a estar autorizado por la ruta (rama muerta).
- **Evidencia:** `laboratory.routes.ts:96`; `laboratory.controller.ts:102-107`.
- **Certeza:** confirmado.

### FND-E12 — La cancelación de orden admite paciente en el service pero la ruta no 🟢
- **Descripción:** `cancelLabRequest` contempla que el paciente cancele su propia orden (`request.patient_id === userId`), pero la ruta `DELETE /:id` solo autoriza `admin`,`doctor` (no `patient`/`user`, ni `lab_technician`), dejando esa rama inalcanzable.
- **Evidencia:** `laboratory.service.ts:358-366`; `laboratory.routes.ts:98`.
- **Certeza:** confirmado.

## Confirmados — SUB-4 (seguridad transversal)

### FND-F1 — reCAPTCHA verificado en login y `/onboard`, pero NO en `register` 🟡
- **Descripción:** sí existe verificación real de captcha: `verifyCaptcha` llama a `https://www.google.com/recaptcha/api/siteverify` en **login** (`auth.service.ts:219-249,258`) y `verifyCaptchaOnboard` hace lo propio en **`POST /saas/onboard`** (`saas.controller.ts:158-186`). En producción `RECAPTCHA_SECRET_KEY` es obligatoria y se bloquea la test-key (`security.middleware.ts:108-116`). El hueco es **`register`**: `registerSchema` declara `captcha_token` (opcional) y el mensaje de arranque dice proteger *"login/registro"*, pero `register` (`auth.service.ts:135`) **no** invoca `verifyCaptcha` → creación de cuentas sin captcha (sólo `authLimiter` 10/15 min ip+email). Excepción adicional: el **login demo** omite el captcha por diseño (`isDemoLogin`, `auth.service.ts:220-223`).
- **Evidencia:** `src/modules/auth/auth.service.ts:135,219-249,258`; `src/modules/saas/saas.controller.ts:158-186`; `src/modules/auth/auth.schema.ts:25`; `src/middlewares/security.middleware.ts:108-116`.
- **Nota de auditoría:** una versión previa de este hallazgo afirmaba "captcha nunca verificado"; era **incorrecto** por un `grep` no recursivo. Corregido.
- **Certeza:** confirmado.

### FND-F2 — Bypass del CSRF cuando no hay cookie `csrf_token` previa 🟡
- **Descripción:** en `csrfProtection`, si la cookie `csrf_token` **no existe**, se genera, se setea y se llama `next()` **antes** de comprobar el método/header; es decir, una primera petición mutante (POST/PUT/…) sin cookie previa pasa el filtro. Además el token es *double-submit* puro (no ligado a la sesión) y la cookie usa `sameSite: 'lax'` (no `strict`).
- **Evidencia:** `src/middlewares/csrf.middleware.ts:9-22`.
- **Impacto:** en un cliente que aún no ha hecho un GET (sin cookie), la defensa CSRF no aplica; reduce la eficacia frente a CSRF en ese escenario.
- **Certeza:** confirmado (código).

### FND-F3 — Sanitización de entrada aplicada de forma inconsistente entre módulos 🟢
- **Descripción:** el helper `sanitizeTextStrict` **sí** se aplica en `clinical-record.service.ts` (campos libres y bulk update, `:13,169-174,276`), pero **no** en `medical-history.service.ts` (FND-C7) ni en otros módulos con texto libre; además `sanitizeText` (no estricto) y `sanitizeRecordFields` no se usan en ningún flujo. El único uso transversal de `shared/sanitize` es `stripSensitiveFields` (logs). Resultado: la sanitización depende de que cada módulo se acuerde de invocarla.
- **Evidencia:** `src/modules/clinical-record/clinical-record.service.ts:4,13,169-174,276`; `src/modules/medical-history/medical-history.service.ts:73-95`; `src/shared/sanitize.ts:14,20,26`; `src/middlewares/requestLogger.middleware.ts:3,10`.
- **Nota de auditoría:** una versión previa afirmaba "ningún flujo invoca los sanitizadores"; era **incorrecto** (grep no recursivo). Corregido.
- **Certeza:** confirmado.

### FND-F4 — Endurecimiento de CSP mejorable 🟢
- **Descripción:** `frameSrc` repite `https://www.google.com/recaptcha/` (falta `https://www.gstatic.com/recaptcha/` que sí aparece en `scriptSrc`/`workerSrc`); `styleSrc` incluye `'unsafe-inline'` e `imgSrc` permite `https:` completo.
- **Evidencia:** `src/middlewares/security.middleware.ts:19-24`.
- **Certeza:** confirmado.

### FND-F5 — Rate limiters con store en memoria (por instancia) 🟢
- **Descripción:** `globalLimiter`, `authLimiter`, `sessionLimiter` y `phiWriteLimiter` no configuran `store`, por lo que usan el `MemoryStore` por defecto: los límites son **por instancia** y se pierden al reiniciar. Con más de una instancia (escalado horizontal) el límite efectivo se multiplica.
- **Evidencia:** `src/app.ts:197-250`.
- **Impacto:** depende del número de instancias en producción (Fase 10).
- **Certeza:** confirmado (código); efecto en prod pendiente.

### FND-F6 — `trust proxy` acotado a rangos privados; efecto sobre la clave de limiters 🟢
- **Descripción:** `app.set('trust proxy', ['loopback','linklocal','uniquelocal'])` y los limiters usan `req.ip`. Si la IP del cliente no queda correctamente reconstruida (proxy no en esos rangos), todos los clientes podrían compartir bucket (sobre-bloqueo) o, si el proxy se confía de más, aceptar `X-Forwarded-For` spoofeado.
- **Evidencia:** `src/app.ts:71,204,220,236,249`.
- **Certeza:** parcialmente confirmado (depende de la topología de Render — Fase 10).

### FND-F7 — `errorHandler` propaga `err.message`/`err.code` en errores 4xx 🟢
- **Descripción:** en errores 4xx se responde `{ error: err.message, code? }` sin normalizar; si los servicios usan mensajes específicos de dominio, pueden revelar existencia de recursos (p. ej. usuario/RUT/orden), facilitando enumeración. Los 5xx sí se enmascaran en producción.
- **Evidencia:** `src/middlewares/errorHandler.middleware.ts:28-34`.
- **Certeza:** parcialmente confirmado (depende de los mensajes por módulo; verificar en Fase 12).

## Confirmados — SUB-15 (base de datos y acceso a datos)

### FND-G1 — Doble fuente de verdad del esquema (`init.sql` vs 31 migraciones) 🟡
- **Descripción:** `db/init.sql` se declara como *"Single source of truth (sin migrations)"*, pero varias tablas se **redefinen** también en migraciones con `CREATE TABLE IF NOT EXISTS` (`clinical_templates`, `tenant_onboarding`, `onboarding_documents`, `lab_areas`, `lab_tests`, `lab_requests`, `lab_request_items`, `lab_samples`, `lab_qc_records`, `lab_equipment`, `lab_reagents`, `lab_notifications`, `lab_result_history`, `jobs`…). Al usar `IF NOT EXISTS`, gana la primera declaración y las diferencias posteriores **no se aplican** silenciosamente → riesgo de divergencia (drift) entre entornos nuevos y migrados. La migración 029 reconoce explícitamente que "init.sql es la fuente de verdad" y deduplica índices creados por migraciones 016-019.
- **Evidencia:** `db/init.sql:1-4`; `db/migrations/003-005,009,026`; `db/migrations/029_drop_duplicate_indexes.sql:15-18`.
- **Certeza:** confirmado.

### FND-G2 — `tenant_id TEXT NOT NULL DEFAULT 'default'` masivo y `users.tenant_id` nullable 🟡
- **Descripción:** ~40 tablas declaran `tenant_id TEXT NOT NULL DEFAULT 'default'`; un `INSERT` que omita `tenant_id` cae **silenciosamente** en `'default'`. Combinado con el RLS fail-open a `'default'` (FND-B2), un bug de escritura queda enmascarado como "datos del tenant default" en lugar de fallar. Además `users.tenant_id` es `TEXT DEFAULT 'default'` **sin `NOT NULL`** (`init.sql:47`), por lo que puede quedar `NULL` (inconsistente con las demás tablas).
- **Evidencia:** `db/init.sql:47,68,101,116,132,586,601,617,633,647,659,677,701,723,741,761,783,808,1181`.
- **Certeza:** confirmado.

### FND-G3 — FKs ausentes / columnas huérfanas 🟡
- **Descripción:** varias columnas referenciales no tienen FK, por lo que la integridad no se fuerza a nivel de motor: `bookings.series_id` (col. e índice añadidos por migración 019 sin `REFERENCES`), `lab_samples.assigned_equipment_id`, `lab_qc_records.equipment_id`/`reagent_id`, `attachments.entity_id` (polimórfico por diseño). Pueden quedar referencias huérfanas.
- **Evidencia:** `db/init.sql:92,689,705-706,619`; `db/migrations/019_booking_series.sql:24-25`.
- **Certeza:** confirmado.

### FND-G4 — `jobs` sin `tenant_id` (cola de background sin contexto de tenant) 🟡
- **Descripción:** la tabla `jobs` no tiene `tenant_id`; los trabajos se procesan fuera de un request HTTP, por lo que `tenantContext` está vacío y el RLS cae a `'default'`. El tenant sólo podría recuperarse de `data` JSONB, cosa que ningún worker hace hoy. Mismo patrón que los recordatorios (FND-D1).
- **Evidencia:** `db/init.sql:789-801`; `db/migrations/009_add_jobs_table.sql`; `src/shared/db.ts:118-135`.
- **Certeza:** confirmado (esquema); impacto depende de los workers (Fase 10).

### FND-G5 — `CHECK` con `CURRENT_DATE` en `bookings` (función no inmutable) 🟢
- **Descripción:** `CONSTRAINT check_future_date CHECK (date >= CURRENT_DATE - INTERVAL '1 day')` usa una expresión no inmutable: la restricción se revalida en cada `UPDATE`/restore, puede romper `pg_dump`/restauración y cargas de datos históricos.
- **Evidencia:** `db/init.sql:99`.
- **Certeza:** confirmado.

### FND-G6 — `ml_demand_forecast` sin uso (¿subsistema ML real?) 🟢
- **Descripción:** la tabla existe (con índice por tenant/fecha) y se menciona en seeds, pero no se observa servicio que la escriba/lea; sugiere un ML declarado pero no implementado.
- **Evidencia:** `db/init.sql:804-814,925-926`.
- **Certeza:** parcialmente confirmado (requiere Fase de búsqueda de consumidores).

### FND-G7 — Índices duplicados históricos (limpiados por migración 029) 🟢
- **Descripción:** existieron 4 pares de índices con definición idéntica (booking_series, clinic_holidays, notifications, webhook_subscriptions) por migraciones 016-019; la 029 los elimina. Indica proliferación de índices sin control previo.
- **Evidencia:** `db/migrations/029_drop_duplicate_indexes.sql`.
- **Certeza:** confirmado.

### FND-G8 — Overhead de 3 round-trips por query en el wrapper tenant-aware 🟢
- **Descripción:** `scopedQuery` ejecuta `set_config` (ida) + `query` + `set_config` de reset (vuelta) en **cada** `pool.query`, además de un `pool.on('connect')` inicial. Multiplica la latencia frente a fijar el GUC una vez por conexión/transacción, y toma `rawConnect()` por query (no recicla el cliente del pool como haría `pool.query`).
- **Evidencia:** `src/shared/db.ts:74-81,102-139`.
- **Certeza:** confirmado (código); impacto medible en Fase 10.

### FND-G9 — Fallback silencioso de pools especializados al pool principal 🟢
- **Descripción:** si faltan `DATABASE_URL_READ_ONLY` o `DATABASE_URL_SUPERADMIN`, `readPool`/`superAdminPool` **son** `pool`; el código igual invoca `tagTenantAwarePool(readPool)`. Se pierde en silencio la separación de lectura réplica y, sobre todo, el `BYPASSRLS` del panel superadmin (que entonces queda sujeto a RLS → limitado a `'default'`, coherente con FND-C2/D9). Sólo se emite un `logger.info` cuando **sí** están configuradas.
- **Evidencia:** `src/shared/db.ts:145-185`.
- **Certeza:** confirmado.

### FND-G10 — `ON DELETE CASCADE` en cadena sobre datos clínicos (sin soft-delete generalizado) 🟢
- **Descripción:** borrar `users`/`doctors`/`clinical_records`/`lab_requests` propagación CASCADE elimina fichas, prescripciones, ítems y muestras de laboratorio de forma **física**; sólo `tenants` tiene `deleted_at`. Riesgo de pérdida de trazabilidad/PHI y conflicto con requisitos de retención clínica.
- **Evidencia:** `db/init.sql:94,140-142,159,325-327,348-349,660,766`; `src/shared/db.ts`.
- **Certeza:** confirmado (esquema).

## Confirmados — SUB-11 (billing / SaaS)

### FND-H1 — El checkout en modo MVP activa un plan de pago sin pago 🟡
- **Descripción:** si `MERCADOPAGO_ACCESS_TOKEN` **no** está configurado, `POST /api/saas/checkout` entra en "MVP mode" y llama a `createSubscription`, que inserta la suscripción con `status='active'` y la factura `subscription_invoices` con `status='paid'` y `paid_at=NOW()` **sin que exista ningún cobro**. Cualquier `admin` (o `superadmin`) puede autoprovisionarse cualquier plan de pago gratis. Si en producción falta el token, todo el cobro es un bypass comercial.
- **Evidencia:** `src/modules/saas/saas.controller.ts:71-78`; `src/modules/saas/saas.service.ts:169-182`.
- **Certeza:** confirmado.
- **Recomendación (Fase 12):** en prod, rechazar el modo MVP (exigir token) o dejar la suscripción en `incomplete`/`trialing` hasta conciliar pago.

### FND-H2 — `changePlan` crea factura `paid` sin cobro ni prorrateo 🟡
- **Descripción:** al cambiar de plan, además de actualizar `plan_id`, se inserta una factura `subscription_invoices` con `status='paid'` y `paid_at=NOW()` inmediatamente, **sin** ninguna pasarela de pago ni cálculo de prorrateo. Un `admin` puede subir a un plan superior sin pagar.
- **Evidencia:** `src/modules/saas/saas.service.ts:225-236`.
- **Certeza:** confirmado.

### FND-H3 — El flujo de gracia `past_due` es inalcanzable (código muerto) 🟡
- **Descripción:** `handlePastDueSubscriptions` (cron) sólo actúa sobre suscripciones `status='past_due'`, pero **ningún** código del repositorio escribe ese estado: `createSubscription` usa `active`/`trialing`, `changePlan` no toca `status`, `cancelSubscription` usa `canceled`, `activateSubscriptionForPayment`/`onboardTenant` usan `active`. La degradación por fin de gracia nunca se dispara (análogo a FND-D2).
- **Evidencia:** `src/modules/saas/saas.service.ts:284-313` vs `:167,226,261,520-523,633,643`.
- **Certeza:** confirmado (ningún escritor del estado).

### FND-H4 — Webhook de Mercado Pago sin verificación de firma 🟡
- **Descripción:** `POST /api/saas/webhook/mercadopago` es público, sin auth, y **no** valida la cabecera de firma `x-signature`/`x-request-id` de Mercado Pago. Se mitiga porque el handler nunca confía en el payload: re-consulta el pago vía `fetchPayment` con el access token del servidor y sólo actúa si `status==='approved'`. Aun así, falta la validación recomendada por MP (riesgo de notificaciones falsas que disparen lookups / denegación).
- **Evidencia:** `src/modules/saas/saas.routes.ts:25`; `src/modules/saas/saas.controller.ts:86-133`; `src/shared/mercadopago.service.ts:85-101`.
- **Certeza:** confirmado.

### FND-H5 — Idempotencia de facturas no durable (en memoria) 🟡
- **Descripción:** `createInvoice` deduplica por `Idempotency-Key` usando un `Map` en proceso (`idempotencyCache`, TTL 5 min), no persistente: en despliegue multi-instancia el mismo key puede crear facturas en réplicas distintas; el respaldo en BD sólo consulta `invoices.payment_reference` (que el cliente puede no enviar). Además la clave se marca en caché **antes** de crear la factura, de modo que un fallo posterior deja la clave "quemada" 5 min. Mismo patrón que FND-F5.
- **Evidencia:** `src/modules/billing/billing.service.ts:12-41,67-70`.
- **Certeza:** confirmado.

### FND-H6 — `updateInvoiceStatus` sin máquina de estados ni efectos de pago 🟡
- **Descripción:** `PATCH /api/billing/:id/status` valida el enum con Zod (`pending|paid|cancelled|refunded|overdue`) pero no valida transiciones (p. ej. `paid`→`pending`, `cancelled`→`paid`), no comprueba el pago y al pasar a `paid` **no** fija `paid_at` ni `payment_method`/`payment_reference` (sólo guarda `payment_data`). Similar a FND-C9/E3.
- **Evidencia:** `src/modules/billing/billing.service.ts:211-218`; `src/modules/billing/billing.schema.ts:21-28`.
- **Certeza:** confirmado.

### FND-H7 — Importes de factura sin revalidación server-side 🟢
- **Descripción:** `createInvoice` confía en `amount`/`tax_amount`/`discount_amount` del cliente para calcular `total_amount` y no recomputa ni verifica que `sum(items) == amount`; no hay autoridad de precios en servidor. Aceptable para facturación manual, pero un rol autorizado fija libremente el importe.
- **Evidencia:** `src/modules/billing/billing.service.ts:110,156-173`.
- **Certeza:** confirmado.

### FND-H8 — Lock de advisory sobre-serializa facturas sin booking 🟢
- **Descripción:** `pg_advisory_xact_lock(hashtext('create_invoice:' || COALESCE(booking_id,0) || tenant))` hace que **todas** las facturas sin `booking_id` de un tenant compartan la misma clave, serializando innecesariamente esos inserts (no incorrecto, sí contención).
- **Evidencia:** `src/modules/billing/billing.service.ts:80-83`.
- **Certeza:** confirmado.

### FND-H9 — `onboardTenant` puede crear el tenant sin suscripción en silencio 🟢
- **Descripción:** el bloque que crea la suscripción durante el onboarding está dentro de un `try/catch` que sólo hace `logger.warn` y continúa; la respuesta es `201` con `message: 'Tenant created (no plan assigned)'`. Un fallo (p. ej. `plan_code` inexistente) no se reporta al solicitante.
- **Evidencia:** `src/modules/saas/saas.service.ts:511-535,567-573`.
- **Certeza:** confirmado.

### FND-H10 — `GET /api/billing/stats` expone facturación global del tenant a doctores 🟢
- **Descripción:** la ruta autoriza `doctor` y `getBillingStats` agrega sobre **todo** el tenant (no filtra por `doctor_id`), a diferencia del listado `GET /api/billing` que sí se filtra por rol. Un doctor ve los totales de facturación de toda la clínica.
- **Evidencia:** `src/modules/billing/billing.routes.ts:12`; `src/modules/billing/billing.service.ts:240-251`.
- **Certeza:** confirmado.

### FND-H11 — Borrado físico de facturas (`deleteInvoice`) 🟢
- **Descripción:** `deleteInvoice` hace `DELETE` físico de `invoices` e `invoice_items` (sin soft-delete), contra la política de retención ("Data retained for compliance") usada para tenants. Rompe trazabilidad contable. Cross-ref FND-G10.
- **Evidencia:** `src/modules/billing/billing.service.ts:220-238`.
- **Certeza:** confirmado.

### FND-H12 — Tasas de cambio estáticas con fallback fijo y caché en proceso 🟢
- **Descripción:** `FALLBACK_RATES` está hardcodeadas (CLP 950, ARS 1200, BRL 5.4, MXN 18.5) y `cachedRates` vive en memoria; si `refreshRates` (open.er-api.com, al boot/cron) falla, persiste la tasa estática indefinidamente, desactualizando los precios de suscripción convertidos a moneda local. `GET /api/currencies/rates` además es público.
- **Evidencia:** `src/shared/currencies.ts:24-30,54-75`; `src/modules/currencies/currencies.controller.ts:10-12`.
- **Certeza:** confirmado.

### FND-H13 — `getTenantFeatures` provoca N+1 (9 consultas) 🟢
- **Descripción:** `getTenantFeatures` itera 9 feature keys y llama `checkFeatureAccess` (una consulta c/u) con `Promise.all`; ~9 queries por request que lo use. Replica el patrón de FND-B8 (la variante `checkFeatureAccess` individual sí es una sola consulta con subqueries).
- **Evidencia:** `src/modules/saas/saas.service.ts:403-412`.
- **Certeza:** confirmado.

### FND-H14 — `GET /api/saas/features` sin control de rol 🟢
- **Descripción:** a diferencia del resto de rutas SaaS, `getFeatures` se monta sólo tras `authMiddleware` (sin `authorize`), por lo que cualquier rol autenticado (incluido `patient`/`user`) puede consultar las features del tenant. Exposición menor.
- **Evidencia:** `src/modules/saas/saas.routes.ts:40`.
- **Certeza:** confirmado.

## Confirmados — SUB-5 (usuarios, doctores y pacientes)

### FND-I1 — El enlace de bienvenida del doctor no tiene consumidor (onboarding roto) 🔴
- **Descripción:** `registerDoctor` (invocado por `POST /api/doctors/register` y por `adminCreateTenant` del SuperAdmin) crea el usuario con una **contraseña temporal generada que nunca se entrega** y envía un email cuyo botón apunta a `.../setup-password?token=<JWT>`. Ese JWT se firma con `purpose='setup-password'`, pero **ningún** endpoint lo verifica (el flujo de reset usa la tabla `password_reset_tokens`, no el `purpose`) y **no existe** una ruta frontend `/setup-password`. Resultado: todo doctor creado por esa vía queda **sin poder iniciar sesión** (no conoce contraseña y el enlace no funciona).
- **Evidencia:** `src/modules/doctor/doctor.service.ts:83-84,117-132` (firma `setup-password` + email con `tempPassword` no devuelta); `src/modules/doctor/doctor.email.ts:11` (URL `/setup-password`); `src/modules/auth/auth.service.ts:885-930` (`resetPassword` usa `password_reset_tokens`); sin coincidencias de `setup-password` en `frontend/src`.
- **Certeza:** confirmado (código + ausencia de consumidor).

### FND-I2 — El frontend invoca `POST /api/doctors/:id/invite`, que no existe (404) 🟡
- **Descripción:** `doctorService.invite(id,email)` envía a `POST /api/doctors/{id}/invite`, pero el backend sólo expone `POST /api/doctors/invite` (sin `:id`). La acción de invitar desde `DoctorsPage` (`useInviteDoctor`) falla con 404.
- **Evidencia:** `frontend/src/modules/doctors/services/doctor.service.ts:65-68`; `src/modules/doctor/doctor.routes.ts:19-36`.
- **Certeza:** confirmado.

### FND-I3 — Endpoints `GET /doctors/:id`, `/stats`, `/schedule` no existen (404); método de servicio muerto 🟡
- **Descripción:** el service del frontend y los hooks `useDoctorDetail/useDoctorStats/useDoctorSchedule` llaman a rutas inexistentes. Sólo se usan en tests, por lo que hay código de servicio roto sin verificación en runtime.
- **Evidencia:** `frontend/src/modules/doctors/services/doctor.service.ts:42-78`; `frontend/src/modules/doctors/hooks/useDoctors.ts:21-43`; `src/modules/doctor/doctor.routes.ts` (9 rutas, ninguna `/:id`).
- **Certeza:** confirmado.

### FND-I4 — `registerDoctor` valida email y RUT globalmente (sin `tenant_id`) 🟡
- **Descripción:** comprueba existencia con `SELECT ... FROM users WHERE email=$1` / `WHERE rut=$1` **sin** filtrar por `tenant_id`, aunque la unicidad real de la tabla es `(tenant_id, email)` (`idx_users_tenant_email`). Un email/RUT válido en otro tenant se rechaza como duplicado (falso positivo cross-tenant) y rompe la semántica multi-tenant.
- **Evidencia:** `src/modules/doctor/doctor.service.ts:76-81`; `db/init.sql:50` (`idx_users_tenant_email ON users (tenant_id, email)`).
- **Certeza:** confirmado.

### FND-I5 — `GET /api/doctors/users` autoriza a `doctor` y expone todos los usuarios del tenant 🟡
- **Descripción:** la ruta permite rol `doctor`; `listTenantUsers` devuelve **todos** los `users` del tenant (email, RUT, teléfono), incluidos administradores y otros doctores. Es una exposición de PII desproporcionada para el rol médico.
- **Evidencia:** `src/modules/doctor/doctor.routes.ts:35`; `src/modules/doctor/doctor.service.ts:298-346`.
- **Certeza:** confirmado.

### FND-I6 — El listado de pacientes del frontend hace 2 peticiones y filtra/pagina en cliente 🟡
- **Descripción:** `patientService.list` realiza dos llamadas a `/doctors/users` (`role=user` y `role=patient`), concatena y re-pagina en cliente. El backend no devuelve `gender`, por lo que el filtro y la columna de género son inertes; la paginación mostrada es aproximada respecto al backend.
- **Evidencia:** `frontend/src/modules/patients/services/patient.service.ts:44-80`; `frontend/src/modules/patients/pages/PatientsPage.tsx:89-101,159-171`; `src/modules/doctor/doctor.service.ts:327-333`.
- **Certeza:** confirmado.

### FND-I7 — `createDoctorSchema` acepta campos que el servicio ignora 🟢
- **Descripción:** el schema admite `specialty_id`, `license_number`, `bio`, `consultation_fee`, pero `createDoctor` sólo persiste `name`, `specialty`, `email`, `user_id`. Los datos extra se descartan en silencio.
- **Evidencia:** `src/modules/doctor/doctor.schema.ts:18-21`; `src/modules/doctor/doctor.service.ts:146-208`.
- **Certeza:** confirmado.

### FND-I8 — `updateDoctorSchema` sólo permite `name` y `specialty` 🟢
- **Descripción:** la edición de doctor no admite actualizar email, teléfono, licencia, tarifa ni especialidad estructurada (`specialty_id`), forzando recreación para cambiar esos datos.
- **Evidencia:** `src/modules/doctor/doctor.schema.ts:24-27`; `src/modules/doctor/doctor.service.ts:228-247`.
- **Certeza:** confirmado.

### FND-I9 — `toggleUserActive` del SuperAdmin queda acotado a `req.tenant_id` 🟢
- **Descripción:** `super-admin.controller.toggleUserActive` pasa `req.tenant_id` a `setUserActive`, que añade `AND tenant_id=$3`. Un superadmin sólo puede activar/desactivar usuarios del tenant activo, no globalmente; además, a diferencia de `doctor.toggleUserActive`, no revoca `refresh_tokens`.
- **Evidencia:** `src/modules/super-admin/super-admin.controller.ts:101-109`; `src/modules/super-admin/super-admin.service.ts:278-285`.
- **Certeza:** confirmado.

### FND-I10 — Gestión de usuarios duplicada entre `doctor` y `super-admin`; sin endpoints de paciente 🟢
- **Descripción:** coexisten dos contratos de listado/toggle de usuarios con distinto alcance y efectos (`/api/doctors/users` tenant-scoped vs `/api/super-admin/users` global). No hay endpoints dedicados de "paciente"; el frontend los deriva de `/doctors/users`, lo que arrastra FND-I6.
- **Evidencia:** `src/modules/doctor/doctor.routes.ts:35-36`; `src/modules/super-admin/super-admin.routes.ts:25-26`.
- **Certeza:** confirmado.

### FND-I11 — `invitePerson`/`register` no validan la especialidad del doctor contra `specialties` 🟢
- **Descripción:** al invitar un doctor sólo se comprueba que `specialty` no esté vacío (no se invoca `ensureSpecialty` ni se valida contra la tabla de especialidades); la creación de la especialidad se difiere al `register` con invitación. Un `specialty` arbitrario puede quedar sin normalizar.
- **Evidencia:** `src/modules/doctor/doctor.service.ts:263`; `src/modules/auth/auth.service.ts:162-198`.
- **Certeza:** confirmado.

### FND-I12 — `registerDoctor` siembra disponibilidad fija 09:00–17:00 (días 1-5) 🟢
- **Descripción:** toda alta de doctor inserta `doctor_availability` con horario y días hardcodeados, sin respetar configuración de clínica ni zona horaria; puede chocar con la disponibilidad real y con las reglas de agenda (SUB-6).
- **Evidencia:** `src/modules/doctor/doctor.service.ts` (bloque de inserción de `doctor_availability`).
- **Certeza:** confirmado.

## Confirmados — SUB-10 (notificaciones y recordatorios)

### FND-J1 — `markAllAsRead` ignora el scope `allUsers` del superadmin 🟢
- **Descripción:** el controller calcula `resolveScope` (`allUsers`/`tenantFilter`) y lo pasa a `markAllAsRead`, pero el service ejecuta siempre `WHERE user_id=$1 AND tenant_id=$2`; un superadmin que lista notificaciones de otro tenant/usuarios (`allUsers=true`) sólo marca como leídas las suyas. Contrato inconsistente respecto a `listNotifications`/`getUnreadCount`.
- **Evidencia:** `src/modules/notifications/notification.controller.ts:38-41`; `src/modules/notifications/notification.service.ts:109-116`.
- **Certeza:** confirmado.

### FND-J2 — Cron de recordatorios sin lock distribuido (posible doble envío) 🟢
- **Descripción:** `startReminderJob` arranca un cron `node-cron` en cada proceso (`app.ts:311`) sin `pg_advisory_lock` ni marca transaccional "en curso"; en despliegue multi-instancia dos réplicas pueden leer el mismo booking (`... WHERE sentField=FALSE`) antes de marcarlo y enviar el recordatorio duplicado. Mismo patrón de estado en memoria que FND-F5/H5.
- **Evidencia:** `src/jobs/reminder.job.ts:41-88,100-119`; `src/app.ts:311`.
- **Certeza:** confirmado (código); efecto depende del nº de instancias (NO VERIFICADO).

### FND-J3 — [RESUELTO / DESCARTADO] `audit-integrity.job` sí está programado 🟢
- **Descripción:** hallazgo inicial incorrecto. `verifyAuditChain` **sí** se programa como cron cada 6 horas en `app.ts:517-529` (`cron.schedule('0 */6 * * *', ...)`); no es una función huérfana. Se descarta este hallazgo. La cadena HMAC presenta, no obstante, defectos reales que se documentan en **FND-M1** (SUB-13).
- **Evidencia:** `src/app.ts:517-529`; `src/jobs/audit-integrity.job.ts:5-41`.
- **Certeza:** confirmado (descartado).

### FND-J4 — Los recordatorios no generan notificación in-app 🟢
- **Descripción:** el recordatorio sólo envía email; no inserta en `notifications`. Un paciente que no revise el correo no ve el aviso en la aplicación (divergencia de canales). 
- **Evidencia:** `src/jobs/reminder.job.ts:64-84` (sólo `sendWithRetry` + `UPDATE bookings`).
- **Certeza:** confirmado.

### FND-J5 — `createNotification` no valida pertenencia `user_id` ↔ `tenant_id` 🟢
- **Descripción:** el INSERT escribe `(tenant_id, user_id)` sin comprobar que el usuario exista o pertenezca al tenant; un llamador con datos inconsistentes puede crear notificaciones cruzadas de tenant (no hay FK compuesta que lo impida).
- **Evidencia:** `src/modules/notifications/notification.service.ts:14-21`.
- **Certeza:** confirmado.

## Confirmados — SUB-9 (documentos, PDF y adjuntos)

### FND-K1 — El límite real de subida de adjuntos es ~75 KB (no 10 MB) 🟡
- **Descripción:** los adjuntos se envían en base64 dentro del body JSON y pasan por el parser global `express.json({ limit: '100kb' })` (`app.ts:182`). Por tanto cualquier archivo cuyo base64 supere 100 KB (≈75 KB binarios) se rechaza con `413 PayloadTooLarge` **antes** de llegar al handler; la comprobación `MAX_FILE_BYTES = 10 MB` y el mensaje "El archivo excede el tamaño máximo permitido (10MB)" son inalcanzables. Subir imágenes/PDF reales (fotos clínicas, DICOM) falla.
- **Evidencia:** `src/modules/attachments/attachments.service.ts:103,187-189`; `src/app.ts:182`; `src/modules/attachments/attachments.routes.ts:10`.
- **Certeza:** confirmado.

### FND-K2 — Sin validación de contenido (se confía en `mime_type` del cliente) y `try/catch` muerto 🟡
- **Descripción:** el servicio valida sólo la cadena `mime_type` contra `ALLOWED_MIME`, sin comprobar magic-bytes/firma del archivo; además `Buffer.from(data_base64,'base64')` **nunca lanza** en Node (decodificación tolerante), por lo que el `try/catch` que pretende detectar "data_base64 inválido" es código muerto: un base64 malformado produce bytes basura silenciosamente. Riesgo de almacenar contenido no conforme (p. ej. un ejecutable declarado como `image/png` o `text/plain`).
- **Evidencia:** `src/modules/attachments/attachments.service.ts:174,181-186`.
- **Certeza:** confirmado.

### FND-K3 — Almacenamiento en sistema de archivos local efímero 🟡
- **Descripción:** los archivos se escriben en `UPLOAD_ROOT = UPLOAD_DIR || <cwd>/uploads` (FS del contenedor). En plataformas con FS efímero (Render/containers) o con varias instancias, las filas de `attachments` quedan apuntando a archivos que desaparecen tras un redeploy o que sólo existen en una réplica (descarga `404` "El archivo no existe en disco", o inconsistente en balanceo).
- **Evidencia:** `src/modules/attachments/attachments.service.ts:7,191-196,246,274`; `src/modules/saas/onboarding.service.ts:11`.
- **Certeza:** confirmado (código); persistencia depende del volumen montado (NO VERIFICADO).

### FND-K4 — `listAttachments` sin paginación ni límite 🟢
- **Descripción:** el listado devuelve **todos** los adjuntos de una entidad sin `LIMIT` ni paginación, a diferencia del resto de listados paginados. Impacto bajo (entidades con pocos adjuntos), pero inconsistente.
- **Evidencia:** `src/modules/attachments/attachments.service.ts:221-224`; `src/modules/attachments/attachments.controller.ts:26-39`.
- **Certeza:** confirmado.

### FND-K5 — Descarga de adjuntos sin `X-Content-Type-Options: nosniff` y con `inline` 🟢
- **Descripción:** a diferencia de los endpoints PDF (que sí fijan `nosniff` + `no-store`), la descarga de adjuntos sirve `Content-Type = mime_type` con `Content-Disposition: inline` y **sin** `nosniff`; siendo `mime_type` controlado por el cliente (FND-K2), un archivo servido inline podría permitir renderizado no previsto en navegadores.
- **Evidencia:** `src/modules/attachments/attachments.controller.ts:51-53`; contraste con `src/modules/clinical-record/clinical-record.controller.ts:284`.
- **Certeza:** confirmado.

## Confirmados — SUB-12 (informes, analítica y métricas)

### FND-L1 — Endpoint `/metrics` sin autenticación por defecto (sólo `METRICS_TOKEN` opcional) 🔴
- **Descripción:** `/metrics` y `/api/metrics` se montan en `app.ts:141-142`, **antes** de todo middleware de auth y **antes** del rate limiter global (`app.ts:252`); además están en la lista de exclusión del limiter. La única protección es `METRICS_TOKEN` (Bearer opcional): si no está definido, cualquiera puede leer las métricas Prometheus (rutas y códigos HTTP, tamaño de la base, conexiones del pool, nº de queries lentas, uso de disco) y forzar trabajo de BD en cada scrape (3 consultas a `pg_stat_activity`). `METRICS_TOKEN` no aparece en `.env.example` ni en `.env`/`render.yaml` (sólo en `dist/` compilado) → postura por defecto = público.
- **Evidencia:** `src/app.ts:141-142,195,207,252`; `src/shared/metrics.service.ts:160-179`; `src/middlewares/metrics.middleware.ts:4-11`; ausencia de `METRICS_TOKEN` en `.env.example`.
- **Certeza:** confirmado (código); valor en producción NO VERIFICADO.

### FND-L2 — Join de doctor incorrecto en el informe de citas 🟡
- **Descripción:** `generateAppointments` une `LEFT JOIN doctors d ON b.doctor_id = d.user_id`, pero `bookings.doctor_id` referencia `doctors.id` (FK `fk_doctor`). Al comparar el PK `doctors.id` con `doctors.user_id` (secuencia distinta), el `doctor_name` resulta nulo o asignado a otro doctor. El defecto se propaga al PDF y al CSV del cliente.
- **Evidencia:** `src/modules/reports/report.service.ts:52`; `db/init.sql:78,94`.
- **Certeza:** confirmado.

### FND-L3 — Join de doctor incorrecto en el informe de laboratorio 🟡
- **Descripción:** `generateLaboratory` une `LEFT JOIN users u ON lr.doctor_id = u.id`, pero `lab_requests.doctor_id` referencia `doctors.id` (no `users.id`). El `doctor_name` del informe es nulo o corresponde a un usuario arbitrario.
- **Evidencia:** `src/modules/reports/report.service.ts:108`; `db/init.sql:326`.
- **Certeza:** confirmado.

### FND-L4 — Analítica que fabrica datos y "ML" inexistente 🟡
- **Descripción:** `getOptimalSchedules` devuelve, si la consulta falla, un resultado **generado con `Math.random()`** (ocupación y scores aleatorios) que la UI presenta como "horarios óptimos" reales. Además `getVitalSignsAnomalies` fija `mlScore: 0` y usa sólo reglas clínicas; `getDemandForecast` usa una **media móvil simple** (`smaForecast`) etiquetada como predicción. No existe modelo ML en el repositorio.
- **Evidencia:** `src/modules/analytics/analytics.service.ts:33-50,213-228,268-269`.
- **Certeza:** confirmado.

### FND-L5 — `total_patients` inconsistente en el dashboard 🟡
- **Descripción:** `getDashboardStats` cuenta pacientes como `users.role = 'user'` únicamente, mientras el resto del sistema (p. ej. `generatePatients`, `getComparisonTable`) usa `role IN ('user','patient')`. Los usuarios con `role='patient'` no se cuentan → KPI subestimado e inconsistente.
- **Evidencia:** `src/modules/analytics/analytics.service.ts:55`; contraste `report.service.ts:91`; `super-admin.service.ts:646`.
- **Certeza:** confirmado.

### FND-L6 — `/reports/:id/pdf` no se usa y la lógica de informe está duplicada 🟢
- **Descripción:** el SPA descarga los informes como **CSV generado en el navegador** (`downloadReport` a partir del JSON de `result_url`); `report.service.ts` (frontend) no expone método para el PDF, por lo que `GET /reports/:id/pdf` (pdfkit) es código muerto desde el cliente. La lógica de columnas/estados queda duplicada (backend PDF vs cliente CSV) → riesgo de deriva.
- **Evidencia:** `frontend/src/modules/reports/utils/reportGenerator.ts:292-336`; `frontend/src/modules/reports/services/report.service.ts`; `frontend/src/modules/reports/pages/ReportsPage.tsx:244-259`; `src/modules/reports/report.controller.ts:32-44`.
- **Certeza:** confirmado (código); posible consumidor externo NO VERIFICADO.

### FND-L7 — `reports.result_url` almacena JSON y parseo sin protección 🟢
- **Descripción:** `result_url` es una columna `TEXT` que en la práctica guarda el **JSON del resultado** (no una URL). `getByIdParsed` ejecuta `JSON.parse(result_url)` sin `try/catch`; un valor no-JSON provoca error 500 en el endpoint PDF. La tabla `reports` carece de `updated_at`, columna de error e índice por `tenant_id`.
- **Evidencia:** `src/modules/reports/report.service.ts:160-163,183-188`; `db/init.sql:631-640`.
- **Certeza:** confirmado.

### FND-L8 — El informe de pacientes incluye a todos (0 citas) 🟢
- **Descripción:** `generatePatients` lista **todos** los usuarios `role IN ('user','patient')` del tenant aunque tengan 0 citas en el periodo (LEFT JOIN sin filtro), por lo que "pacientes atendidos" no refleja la asistencia real del periodo.
- **Evidencia:** `src/modules/reports/report.service.ts:81-97`.
- **Certeza:** confirmado.

### FND-L9 — Reporte queda en `generating` si el worker no está registrado 🟢
- **Descripción:** `enqueueJob('report:generate')` → `QueueService.addJob` **no inserta** el job si el tipo no tiene handler registrado (sólo `logger.warn`). Si `registerWorkers()` no se hubiera ejecutado antes de la petición, el reporte quedaría `generating` indefinidamente sin error visible. En AS-IS `registerWorkers()` sí corre al arranque (`app.ts:457-458`), por lo que es una fragilidad latente.
- **Evidencia:** `src/shared/queue.service.ts:27-32`; `src/modules/reports/report.service.ts:138`; `src/app.ts:457-460`.
- **Certeza:** confirmado.

### FND-L10 — Parámetros de rango sin cota superior en analítica 🟢
- **Descripción:** `months` (`bookings-by-month`), `days` (`demand`) y `limit` (`top-doctors`) se parsean con `getQueryInt` sin límite máximo: `?months=1000000` genera `INTERVAL '1 months' * 1000000`. Impacto acotado por el volumen de datos, pero permite consultas innecesariamente costosas desde un `admin`.
- **Evidencia:** `src/modules/analytics/analytics.controller.ts:12-20`; `src/shared/query.ts:8-13`; `src/modules/analytics/analytics.service.ts:76,286`.
- **Certeza:** confirmado.

## Confirmados — SUB-13 (auditoría e integridad)

### FND-M1 — La cadena de integridad HMAC de `audit_logs` no es funcional 🔴
- **Descripción:** la garantía de no-repudio de la auditoría está rota por tres defectos combinados: (1) los **escritores reales** son los triggers DB `audit_security_changes`/`audit_phi_changes`, que insertan **sin** `hash` ni `previous_hash` (quedan `NULL`); (2) la única función que calcularía el hash, `auditService.logAction`, **nunca se invoca** (FND-M5); (3) `verifyAuditChain` recalcula el hash esperado con una canonical **distinta** a la de `logAction`: verificador `HMAC([previous_hash, action, tenant_id])` vs escritor `HMAC([prevHash, action, resource_type, resource_id, old_values, new_values, ip_address, tenant_id, Date.now()])`. Resultado: el cron de las 6h compara `expectedHash` contra `hash=NULL` → `brokenLinks == checked` en cada ejecución (falsos positivos permanentes) y **ninguna manipulación sería detectable**. Además `computeAuditHash` incluye `Date.now()` (no determinista) y ordena claves JSON, de modo que ni siquiera la propia escritura es verificable de forma reproducible.
- **Evidencia:** `src/modules/audit/audit.service.ts:4-17,43-67`; `src/jobs/audit-integrity.job.ts:25-30`; `db/security.sql:260-294,308-346`; `db/init.sql:186-198`; `src/app.ts:517-529`. Comentarios que asumen la cadena: `db/migrations/023_fix_audit_rls.sql:33-34`; `db/migrations/027_performance_indexes.sql:15`.
- **Certeza:** confirmado (código); contenido real de `audit_logs` en prod NO VERIFICADO.

### FND-M2 — La auditoría no atribuye actor (`user_id` siempre `NULL`) 🔴
- **Descripción:** ambos triggers insertan `user_id = NULL` explícito y **no leen** `current_setting('app.user_id')` (u otro contexto de sesión); el escritor app-level `logAction` (que sí aceptaría `user_id`) no se usa. El rastro de auditoría de cambios de seguridad y de PHI queda **anónimo**: no se puede saber qué usuario provocó cada cambio. El `LEFT JOIN users u ON al.user_id = u.id` de la API devuelve por tanto `user_name = NULL` en todas las filas.
- **Evidencia:** `db/security.sql:264-268,277-288,312-345`; `src/modules/audit/audit.service.ts:60-66`.
- **Certeza:** confirmado.

### FND-M3 — La creación de usuarios no se audita (INSERT sin rama en el trigger) 🟡
- **Descripción:** el trigger `security_audit` se dispara en `AFTER INSERT OR UPDATE OR DELETE`, pero `audit_security_changes()` sólo maneja `DELETE` y `UPDATE`; para `INSERT` cae al `RETURN NEW` final **sin insertar**. El alta de usuarios (incluidos doctores/admin) queda fuera de la auditoría de seguridad, pese a ser una operación sensible.
- **Evidencia:** `db/security.sql:263-293` (no hay rama `IF TG_OP = 'INSERT'`), `:298-301`.
- **Certeza:** confirmado.

### FND-M4 — Encadenado global incompatible con la verificación por tenant y sin lock 🟡
- **Descripción:** `logAction` obtiene el hash anterior con `SELECT hash FROM audit_logs ORDER BY created_at DESC LIMIT 1` **sin filtrar por `tenant_id`** y **sin bloqueo**, mientras `verifyAuditChain(tenantId)` encadena **por tenant**. Si `logAction` se activara, los `previous_hash` por tenant serían incoherentes entre sí y, en concurrencia, dos transacciones leerían el mismo último hash → bifurcación/duplicados. `hash` se calcula con `Date.now()` (no `created_at`) → el orden por `created_at` puede no corresponder al de la cadena.
- **Evidencia:** `src/modules/audit/audit.service.ts:45-47,10-14`; `src/jobs/audit-integrity.job.ts:9-14`.
- **Certeza:** confirmado.

### FND-M5 — `logAction` es código muerto (auditoría app-level nunca ejecutada) 🟢
- **Descripción:** `auditService.logAction` (la única pieza que materializaría `hash`/`previous_hash` y podría atribuir `user_id`/`ip_address`) no tiene **ningún invocador** en `src/` (búsqueda exhaustiva: única aparición es su propia definición). No existe middleware de auditoría que la conecte a las mutaciones.
- **Evidencia:** `src/modules/audit/audit.service.ts:43` (sin referencias); ausencia de middleware de auditoría en `src/middlewares/`.
- **Certeza:** confirmado.

### FND-M6 — `GET /api/audit` devuelve un array sin metadatos de paginación 🟢
- **Descripción:** `getAuditLogs` aplica `LIMIT` (`<=100`) y `OFFSET`, pero el controller responde `res.json(rows)` con el array desnudo: no hay `total`, `page` ni `pageSize`, por lo que el cliente no puede paginar ni saber si hay más resultados. Contraste con otros listados que usan `PaginatedResponse`. El frontend mitiga parcialmente: `auditService.list` detecta el array y fabrica `{ data, total: data.length, page, limit, totalPages: 1 }`, por lo que el contador de resultados de `AuditPage` muestra sólo el tamaño de la página actual (nunca el total real).
- **Evidencia:** `src/modules/audit/audit.controller.ts:20-30`; `src/modules/audit/audit.service.ts:70-101`; `frontend/src/modules/audit/services/audit.service.ts:8-9`; `frontend/src/modules/audit/pages/AuditPage.tsx`.
- **Certeza:** confirmado.

### FND-M7 — `hashToken` acopla los tokens de autenticación con `AUDIT_HMAC_SECRET` 🟢
- **Descripción:** `hashToken` (usado para hashear refresh tokens / tokens de reset) reutiliza `computeHmac`, que exige `AUDIT_HMAC_SECRET` (`getAuditHmacSecret` lanza error si falta o mide <32 chars). Así, el secreto de **integridad de auditoría** pasa a ser dependencia dura del flujo de **autenticación**: rotarlo invalida todos los tokens, y su ausencia rompería el hashing de tokens. Dos dominios criptográficos distintos comparten clave.
- **Evidencia:** `src/shared/crypto.service.ts:60-77`.
- **Certeza:** confirmado. (Cross-ref SUB-2.)

### FND-M8 — `audit_logs` sin mecanismo de inmutabilidad (append-only) a nivel tabla 🟢
- **Descripción:** no existe trigger `BEFORE UPDATE OR DELETE` que bloquee la modificación/borrado de `audit_logs`; la integridad depende únicamente de los permisos (REVOKE a `clinic_app`). Un rol con privilegios (p. ej. `postgres`/owner) o un `UPDATE` accidental podría alterar la auditoría sin dejar rastro. La tabla tampoco fija `REVOKE UPDATE/DELETE` explícito en `db/security.sql` (sólo `REVOKE ALL ON FUNCTION ...` para las funciones de trigger).
- **Evidencia:** `db/security.sql:71-72,164-173` (políticas) y ausencia de trigger de protección; `db/init.sql:186-198`.
- **Certeza:** confirmado (código/SQL); privilegios efectivos por rol NO VERIFICADO.

## Confirmados — SUB-14 (portabilidad de datos y webhooks)

### FND-N1 — Los webhooks salientes nunca se disparan (`dispatchEvent` sin invocadores) 🔴
- **Descripción:** `dispatchEvent(event, payload, tenantId)` es el único punto que consulta las suscripciones activas y encola entregas `webhook:dispatch`; **no tiene ningún invocador** en `src/`. Ningún módulo de dominio (booking, laboratorio, billing, pacientes) emite eventos. Por tanto, aunque el CRUD de suscripciones, el worker y la firma HMAC existen, **ninguna suscripción entrega nunca un evento**: la funcionalidad es inerte.
- **Evidencia:** `src/modules/webhooks/webhooks.service.ts:142-162` (definición sin uso); ausencia de `dispatchEvent` en `src/` (búsqueda exhaustiva); worker registrado en `src/shared/queue.service.ts:151-152`.
- **Certeza:** confirmado.

### FND-N2 — El secreto de firma de webhooks se almacena en texto plano 🟡
- **Descripción:** `webhook_subscriptions.secret` es una columna `TEXT NOT NULL` y se guarda el secreto **sin cifrar**; además `createSubscription` lo devuelve al cliente. El sistema ya dispone de cifrado AES-256-GCM (`ENCRYPTION_KEY`, `shared/crypto.service`) pero no lo usa aquí. Un acceso de lectura a la tabla (o un backup) expone los secretos de firma de todos los tenants, permitiendo forjar entregas válidas.
- **Evidencia:** `src/modules/webhooks/webhooks.service.ts:92-101`; `db/init.sql:649`; `db/migrations/017_webhook_subscriptions.sql:6`; `src/shared/crypto.service.ts:34-43`.
- **Certeza:** confirmado.

### FND-N3 — Protección SSRF incompleta (redirecciones y sin validación de IP resuelta) 🟡
- **Descripción:** `assertValidUrl` bloquea URLs cuyo **hostname** coincide con patrones de IP/host privados (127./10./172.16-31./192.168./169.254./localhost/::1). Sin embargo, `dispatchWebhook` usa `fetch` con `redirect` por defecto (`follow`): un endpoint atacante puede responder `3xx` hacia una IP interna y la entrega seguirá la redirección. Tampoco se resuelve/valida la IP destino (posible DNS rebinding entre la validación y la conexión). Al ser URLs configuradas por un `admin` de tenant, el riesgo es de exfiltración/escaneo interno.
- **Evidencia:** `src/modules/webhooks/webhooks.service.ts:36-65,177-187`.
- **Certeza:** confirmado (código).

### FND-N4 — Export RGPD sin derecho al olvido y sin auditoría del acceso a PHI 🟡
- **Descripción:** sólo existe **export** (`/api/export`); no hay endpoint de **supresión/borrado** ni anonimización de los datos del paciente (derecho al olvido RGPD). Además, el hecho de exportar PHI no se registra en `audit_logs` (ni por trigger — no hay trigger de lectura — ni por app — `logAction` está muerta, FND-M5): no queda rastro de quién exportó los datos de qué paciente.
- **Evidencia:** `src/modules/data-portability/data-portability.routes.ts:10-11` (sin `DELETE`); `src/modules/data-portability/data-portability.service.ts:65-149`; cross-ref FND-M2/M5 (SUB-13).
- **Certeza:** confirmado.

### FND-N5 — `webhook_deliveries` definida pero nunca escrita (sin historial de entregas) 🟡
- **Descripción:** existe la tabla `webhook_deliveries` (con `status`, `attempts`, `last_attempt_at`, `next_attempt_at`, `response_status`, `response_body`) e índices, pero **ningún módulo la referencia**: ni `dispatchEvent` ni `dispatchWebhook` ni el worker registran la entrega. Se pierde el historial de entregas/intentos y no hay visibilidad operativa ni base para reintentos persistentes (el reintento sólo vive en `jobs`, 3 intentos, sin registro del resultado en esta tabla).
- **Evidencia:** `db/init.sql:657-670`; ausencia de referencias a `webhook_deliveries` en `src/`.
- **Certeza:** confirmado.

### FND-N6 — Export en memoria, síncrono y sin streaming ni cola 🟢
- **Descripción:** `exportPatientData` ejecuta todas las consultas con `Promise.all`, agrega todo en memoria y responde de forma síncrona (`res.json`). Un paciente con mucho histórico (citas, adjuntos, resultados) puede generar respuestas grandes y un pico de memoria/tiempo, sin límite ni paginación ni procesamiento asíncrono por cola.
- **Evidencia:** `src/modules/data-portability/data-portability.service.ts:74-149`; `data-portability.controller.ts:19-21`.
- **Certeza:** confirmado.

### FND-N7 — Sin endpoint de rotación del secreto de webhook 🟢
- **Descripción:** el `secret` sólo se puede fijar al crear (`createWebhookSchema.secret`); `updateWebhookSchema` no admite `secret` y no hay endpoint de rotación. Cambiar el secreto obliga a borrar y recrear la suscripción (nuevo `id`, se pierde la referencia). Tampoco hay período de gracia con doble secreto.
- **Evidencia:** `src/modules/webhooks/webhooks.schema.ts:12-22`; `src/modules/webhooks/webhooks.service.ts:104-132`.
- **Certeza:** confirmado.

### FND-N8 — `/export/patients/:id` no valida que el objetivo sea un paciente 🟢
- **Descripción:** `exportPatientData` selecciona por `users.id` y `tenant_id` sin comprobar `role IN ('user','patient')`; el ownership sólo se verifica cuando el solicitante tiene `role='patient'`. Un `admin`/`doctor` puede exportar la fila `users` (redactada) de cualquier id del tenant, incluido otro doctor o admin, no necesariamente un paciente.
- **Evidencia:** `src/modules/data-portability/data-portability.controller.ts:11-22`; `data-portability.service.ts:66-70`.
- **Certeza:** confirmado.

### FND-N9 — Drift `init.sql` vs migración 017 en `webhook_subscriptions` 🟢
- **Descripción:** la migración `017` define `CONSTRAINT uq_webhook_sub_tenant_url UNIQUE (tenant_id, url)` y columnas `TIMESTAMPTZ`, mientras que `db/init.sql` crea la tabla **sin** la restricción UNIQUE y con `TIMESTAMP`/`DEFAULT '{}'` en `events`. Según el camino de bootstrap (init.sql vs migraciones) el esquema difiere, pudiendo permitir duplicados `(tenant_id,url)` que la migración prohíbe.
- **Evidencia:** `db/migrations/017_webhook_subscriptions.sql:2-14`; `db/init.sql:645-655`; cross-ref FND-G1 (SUB-15).
- **Certeza:** confirmado (código/SQL); esquema efectivo en prod NO VERIFICADO.

## Confirmados — SUB-17 (especialidades y catálogos)

### FND-O1 — Endpoint público de especialidades filtra por `X-Tenant-Id` y expone emails de doctores (PII cross-tenant) 🟡
- **Descripción:** `GET /api/specialties` y `GET /api/specialties/:id` se registran **sin** `authMiddleware` y `/api/specialties` figura en `PUBLIC_PATHS`. El `tenantMiddleware` resuelve el tenant como `req.user?.tenant_id || header['x-tenant-id'] || DEFAULT`; para rutas públicas acepta el header sin autenticar. `getAllSpecialties` devuelve, además del catálogo, el array `doctors[]` con `name` y **`email`** de cada doctor del tenant. En consecuencia, un cliente **no autenticado** puede fijar `X-Tenant-Id: <tenant>` y enumerar el catálogo y los **nombres/emails de los doctores de cualquier tenant** (fuga de PII entre inquilinos).
- **Evidencia:** `src/modules/specialties/specialties.routes.ts:37-38`; `src/middlewares/tenant.middleware.ts:27,46-50,80-83`; `src/modules/specialties/specialties.service.ts:36-69`; `src/modules/specialties/specialties.controller.ts:34-48`.
- **Certeza:** confirmado (código).

### FND-O2 — Listado de especialidades sin paginación (frontend simula la paginación) 🟢
- **Descripción:** `GET /api/specialties` devuelve un array completo (sin `total`/`page`); el service del SPA fabrica `{ total: length, page: 1, totalPages: 1 }` y aplica el filtro `search` en el cliente. No hay búsqueda ni paginación en servidor. Mismo patrón que FND-M6 (auditoría).
- **Evidencia:** `frontend/src/modules/specialties/services/specialty.service.ts:11-30`; `src/modules/specialties/specialties.controller.ts:38`.
- **Certeza:** confirmado.

### FND-O3 — "No encontrado" devuelve 400 en lugar de 404 🟢
- **Descripción:** `getSpecialtyById`/`updateSpecialty`/`deleteSpecialty` lanzan `BadRequestError(E.SPECIALTY_NOT_FOUND)` cuando no existe la especialidad (o no pertenece al tenant), resultando en **HTTP 400** en vez de 404. Contrato confuso y no distinguible de una entrada inválida.
- **Evidencia:** `src/modules/specialties/specialties.service.ts:110,138,147`.
- **Certeza:** confirmado.

### FND-O4 — `tenant_id` en el body de create/update es un campo muerto para admin 🟢
- **Descripción:** los schemas `specialtySchema`/`specialtyUpdateSchema` aceptan `tenant_id` (y `.strict()` lo requiere conocido), y el frontend lo envía; pero `resolveTenant` sólo lo honra para `superadmin`. Para un `admin`, el valor se valida y luego se **ignora**, dando falsa sensación de control multi-tenant.
- **Evidencia:** `src/modules/specialties/specialties.routes.ts:20,34`; `src/modules/specialties/specialties.controller.ts:8-18`; `frontend/src/modules/specialties/services/specialty.service.ts:39,45`.
- **Certeza:** confirmado.

### FND-O5 — `POST /api/specialties` es "get-or-create" (no devuelve 409 ante duplicado) 🟢
- **Descripción:** `createSpecialty` busca por `(tenant_id, name)` y, si existe, devuelve la especialidad existente sin error. Aunque la tabla tiene `UNIQUE (tenant_id, name)`, un POST duplicado responde `201` con el registro previo (no `409 Conflict`), lo que puede ocultar errores de cliente y dificultar la idempotencia real.
- **Evidencia:** `src/modules/specialties/specialties.service.ts:85-92`; `db/init.sql:415` (`UNIQUE (tenant_id, name)`).
- **Certeza:** confirmado.

### FND-O6 — Tasas de cambio con fallback hardcodeado y `updatedAt` potencialmente nulo 🟢
- **Descripción:** `getRates` sirve `FALLBACK_RATES` (USD 1, CLP 950, ARS 1200, BRL 5.4, MXN 18.5) mientras `refreshRates` no haya tenido éxito; `updatedAt` es `null` si nunca se refrescó, de modo que el cliente no puede distinguir una tasa viva de una estática. La conversión (`convertFromUsd`) cae a `1` si falta la tasa de una moneda. Cross-ref FND-H12 (billing).
- **Evidencia:** `src/shared/currencies.ts:24-39,54-75,90-99`.
- **Certeza:** confirmado.

## Confirmados — SUB-18 (semillas y arranque de datos)

### FND-P1 — Credenciales de seed predecibles + contraseña demo hardcodeada 🟡
- **Descripción:** todos los usuarios de seed no privilegiados reciben una contraseña **derivada por regla pública** `deriveSeedPassword(email)` = `Vitaria.<local-part>.<año>!` (p. ej. `juan@clinic.com` → `Vitaria.juan.2026!`), y el admin de demo el literal **`DemoVitaria2026!`** hardcodeado en el código. Si en algún entorno se activan los seeds (`RUN_SEEDS=true` para el bloque general, o `SEED_ON_STARTUP=true` para `seed()`), cualquiera que conozca un email conocido (`juan@clinic.com`, `admin@demo.clinic.com`, `compartido@clinic.com`, …) puede iniciar sesión con la contraseña calculada. Mitigado por defecto (doble gate OFF en producción), pero es riesgo de configuración con credenciales adivinables.
- **Evidencia:** `src/seed/seed-credentials.ts:20-23`; `src/seed/admin.seed.ts:13,159-235,352`; `src/seed/seed.ts:118-125`; `src/app.ts:472-509`.
- **Certeza:** confirmado (código).

### FND-P2 — `seedTestTenants` crea tenants de demo con plan `pro` y datos ficticios completos 🟡
- **Descripción:** `seedTestTenants` provisiona clínicas completas (doctores, pacientes, laboratorio pro, facturas, suscripciones, 35+ registros de auditoría) para tenants de prueba y un `compartido@clinic.com` con el mismo email en varias clínicas. Expuestos si se ejecuta en un entorno accesible; además el `audit_logs` sembrado usa `adminUserId || 1` (fallback al `id=1` global, atribución falsa). Cross-ref FND-M2.
- **Evidencia:** `src/seed/admin.seed.ts:352,1103-1131`; `src/seed/seed.ts` (audit logs).
- **Certeza:** confirmado.

### FND-P3 — DDL en runtime durante el arranque y desactivación temporal de constraints 🟡
- **Descripción:** `seed()` ejecuta DDL en caliente: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email`, `ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS token_version`, `CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_tenant_email`, y sobre todo `ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_future_date` … `ADD CONSTRAINT check_future_date CHECK (...) NOT VALID` (repetido en `spreadSeedDates`). El `DROP`+`ADD ... NOT VALID` deja la restricción **desactivada** durante el seed y no valida filas existentes; el esquema efectivo depende de si el seed se ejecutó (drift, cross-ref FND-G1).
- **Evidencia:** `src/seed/seed.ts:110-112,290-392`; `src/seed/admin.seed.ts:1133-1179`.
- **Certeza:** confirmado.

### FND-P4 — `seed()` no transaccional con `catch {}` silenciosos 🟢
- **Descripción:** a diferencia de `seedTestTenants` (que usa transacción + `set_config(tenant)`), `seed()` corre sobre el `pool` global sin transacción y con múltiples `catch {}` vacíos que ocultan fallos de inserción parciales; el seed puede quedar a medias sin señal en los logs.
- **Evidencia:** `src/seed/seed.ts:109-393` (p. ej. `catch {}` en `:339,366,389`).
- **Certeza:** confirmado.

### FND-P5 — `spreadSeedDates` sin filtro de tenant y sin transacción 🟢
- **Descripción:** `spreadSeedDates` actualiza `created_at` de `users`/`bookings`/`clinical_records` **sin `WHERE tenant_id`**, con `random()`, y sólo se salta en `NODE_ENV==='production'`. Con un `NODE_ENV` mal configurado podría reescribir fechas de datos reales de todos los tenants. Cross-ref FND-B (aislamiento).
- **Evidencia:** `src/seed/admin.seed.ts:1133-1179`.
- **Certeza:** confirmado.

### FND-P6 — Variables de arranque de seeds no todas documentadas en `.env.example` 🟢
- **Descripción:** el comportamiento del arranque depende de `RUN_SEEDS`, `SEED_ON_STARTUP`, `NODE_ENV`, `ADMIN_PASSWORD`, `SUPERADMIN_PASSWORD`, `DEFAULT_TENANT_ID`; no todas figuran en `.env.example`/`render.yaml` (cross-ref FND-L1 sobre `METRICS_TOKEN`). Un operador puede habilitar seeds sin intención.
- **Evidencia:** `src/app.ts:472-509`; `src/seed/seed.ts:9-17,118-125`; `.env.example` (NO VERIFICADO).
- **Certeza:** parcialmente confirmado.

## Confirmados — SUB-16 (infraestructura y observabilidad)

### FND-Q1 — `COPY frontend/dist/ frontend/dist/ || true` es Dockerfile inválido 🟡
- **Descripción:** en el stage runner del `Dockerfile` se intenta tolerar la ausencia del build del frontend con `COPY frontend/dist/ frontend/dist/ || true`. Docker **no** interpreta `||` en instrucciones `COPY`; si `frontend/dist` no existe en el contexto, la construcción de la imagen **falla** (y si existe, la línea es redundante porque el estándar no copia el SPA). El `Dockerfile` tampoco construye el frontend. Riesgo de imagen de producción no reproducible.
- **Evidencia:** `Dockerfile:22-23`.
- **Certeza:** confirmado (sintaxis Docker).

### FND-Q2 — `render.yaml` con `plan: free` y sin varios secretos críticos 🟡
- **Descripción:** el web service `vitaria-api` se declara `plan: free` (instancias que se suspenden por inactividad, sin SLA) y **no** define `METRICS_TOKEN`, `ADMIN_PASSWORD`, `SENTRY_DSN`, `MERCADOPAGO_ACCESS_TOKEN`, `TWILIO_*`, `COOKIE_SECRET`, `DATABASE_URL_SUPERADMIN` ni `DB_POOL_MAX`. Consecuencias: `/metrics` queda **sin protección** (FND-L1), seeds sin `ADMIN_PASSWORD` (FND-P1), `superAdminPool` cae al pool normal (RLS), y el billing/MP puede no funcionar. La discrepancia con `docker-compose.prod.yml` (que sí declara `METRICS_TOKEN`, `SENTRY_DSN`, `ALERT_WEBHOOK_URL`, `MERCADOPAGO_ACCESS_TOKEN`) confirma drift de configuración entre plataformas.
- **Evidencia:** `render.yaml:5-57`; `docker-compose.prod.yml:25,37-39`.
- **Certeza:** confirmado.

### FND-Q3 — `.env.example` incompleto respecto al código 🟡
- **Descripción:** `.env.example` no documenta variables que el código consume: `METRICS_TOKEN`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `ALERT_WEBHOOK_URL`, `ALLOWED_DOMAINS`, `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`, `RUN_SEEDS`, `SEED_ON_STARTUP`. Un operador que siga la plantilla deja features (métricas protegidas, Sentry, alertas, seeds) en estado inseguro o deshabilitado sin saberlo. Cross-ref FND-L1, FND-P6.
- **Evidencia:** `.env.example` (claves presentes) vs `src/shared/metrics.service.ts:161`, `src/shared/sentry.service.ts:7,12`, `src/shared/alerts.service.ts:30`, `src/app.ts:470`.
- **Certeza:** confirmado.

### FND-Q4 — Datos comerciales (leads) versionados en el repositorio 🟢
- **Descripción:** el repo contiene `scripts/prospeccion.mjs` y ficheros `leads-cl-*.csv/json` (con nombres de clínicas/contactos de varias ciudades) además de `scripts/git-rewrite-commits.js`. Son datos comerciales/PII fuera del ámbito de la app, versionados y distribuidos con el código.
- **Evidencia:** `scripts/prospeccion.mjs`, `scripts/leads-cl-santiago-valparaiso-vina-del-mar-concepcion-antofagasta-temuco-la-serena-rancagua-iquique-2026-10-02.{csv,json}`.
- **Certeza:** confirmado.

### FND-Q5 — Alertas sin persistencia ni ruta por defecto (solo log) 🟢
- **Descripción:** `notifyCritical` sólo escribe un log de error y, si existe `ALERT_WEBHOOK_URL`, hace un POST *fire-and-forget* con cooldown de 60 s. Sin webhook configurado (default en Render, ausente en `.env.example`), las alertas críticas **no salen del proceso** (nadie es notificado). No hay reintentos ni almacenamiento.
- **Evidencia:** `src/shared/alerts.service.ts:13-45`; `render.yaml` (sin `ALERT_WEBHOOK_URL`).
- **Certeza:** confirmado.

### FND-Q6 — `/metrics` ejecuta 3 consultas a la BD por cada scrape 🟢
- **Descripción:** `metricsHandler` llama a `refreshDbMetrics()` en cada petición, que dispara 3 queries a `pg_stat_activity`/`pg_database_size`. Combinado con `/metrics` público por defecto (FND-L1), un cliente puede generar carga de BD con scrapes rápidos. No hay caché ni ventana mínima entre refrescos.
- **Evidencia:** `src/shared/metrics.service.ts:160-179,139-158`; `src/app.ts:141-142`.
- **Certeza:** confirmado.

## Confirmados — SUB-1 (SPA frontend)

### FND-R1 — Credenciales demo hardcodeadas y visibles en la UI y en el bundle 🟡
- **Descripción:** `shared/config/demo.ts` fija `DEMO_TENANT_ID='clinica-demo'`, `DEMO_EMAIL='admin@demo.clinic.com'` y `DEMO_PASSWORD='DemoVitaria2026!'`. Esas constantes se importan y se **muestran en pantalla** y hay un **botón de login demo** siempre activo, sin gating por `import.meta.env.DEV` ni por variable de entorno. En una build de producción el texto y la contraseña viajan en el bundle JS (no son secretos). Cross-ref FND-P1/FND-P2: el backend siembra ese tenant admin con `DemoVitaria2026!` y tenants demo con plan `pro`; si los seeds están activos (o existieron) en prod, cualquiera puede entrar como admin de `clinica-demo`.
- **Evidencia:** `frontend/src/shared/config/demo.ts:1-3`; `frontend/src/modules/auth/pages/LoginPage.tsx:24,80,254`; `frontend/src/modules/landing/LandingPage.tsx:8,808,843`; `src/seed/admin.seed.ts:13`; `frontend/src/main.tsx` (sin gating).
- **Certeza:** confirmado.

### FND-R2 — `src/test` excluido del type-check del frontend 🟡
- **Descripción:** `tsconfig.app.json` declara `exclude: ["src/test"]` y el `tsconfig.json` sólo referencia `tsconfig.app.json` y `tsconfig.node.json` (este último sólo incluye `vite.config.ts`). Por tanto `tsc --noEmit` / `tsc -b` (usado por `npm run build` y por `npm run type-check` en CI) **no tipan los 184 archivos de test**. Errores de tipos en la suite pasan desapercibidos hasta runtime de Vitest, y el proyecto queda con `strict` real solo sobre `src` menos `src/test`.
- **Evidencia:** `frontend/tsconfig.app.json:24-25`; `frontend/tsconfig.json:1-6`; `frontend/tsconfig.node.json:17`; script `type-check` en `frontend/package.json:11`.
- **Certeza:** confirmado.

### FND-R3 — `npm run lint` inválido: sin ESLint y CI no lo ejecuta 🟡
- **Descripción:** `frontend/package.json` define `"lint": "eslint ."` pero **no** incluye `eslint` en `devDependencies` ni existe configuración (`eslint.config.*` / `.eslintrc*`) en `frontend/`. `npm run lint` fallará ("eslint no se reconoce"). El job `frontend` de CI ejecuta `type-check`, `test` y `coverage`, pero **no** `lint`. Resultado: no hay linting real de la SPA (reglas como `react-hooks/exhaustive-deps`, `react/jsx-key`, `no-unused-vars` no se aplican).
- **Evidencia:** `frontend/package.json:10,44-58`; `.github/workflows/ci.yml` (job `frontend`, pasos type-check/test/coverage, sin lint); ausencia de config ESLint.
- **Certeza:** confirmado.

### FND-R4 — Sin observabilidad de errores en frontend y un único ErrorBoundary raíz 🟡
- **Descripción:** el frontend no integra Sentry ni ningún reportero de errores (no hay `@sentry/react` en `package.json`), a diferencia del backend (SUB-16, `sentry.service.ts`). El único manejo de errores de render es un `ErrorBoundary` **a nivel raíz** (`main.tsx:31`), que al capturar un error reemplaza **toda la aplicación** por la pantalla de error (no hay límites por ruta/módulo). `componentDidCatch` sólo hace `console.error`. En producción no queda registro de excepciones de UI.
- **Evidencia:** `frontend/src/shared/components/ErrorBoundary.tsx:30-32`; `frontend/src/main.tsx:31`; `frontend/package.json` (sin `@sentry/react`); cross-ref `src/shared/sentry.service.ts` (SUB-16).
- **Certeza:** confirmado.

### FND-R5 — Componentes sobredimensionados (responsabilidad múltiple) 🟢
- **Descripción:** varios componentes superan con holgura las 500 líneas mezclando datos, formularios, transformaciones y presentación: `LandingPage.tsx` (998L), `SuperAdminAnalyticsPage.tsx` (851L), `DoctorCalendarPage.tsx` (608L), `LabRequestDetailPage.tsx` (583L), `CreateBookingDialog.tsx` (581L), `AvailabilityPage.tsx` (579L), `MedicalHistoryPage.tsx` (572L), `QCForm.tsx` (567L). Dificultan el test, la revisión y el rendimiento. No rompe funcionalidad.
- **Evidencia:** tamaños por `read`/conteo en `frontend/src/modules/**`.
- **Certeza:** confirmado.

### FND-R6 — `getRoleColor` usa colores hex hardcodeados fuera del tema 🟢
- **Descripción:** `getRoleColor(role)` devuelve hex literales (`#7c3aed`, `#0d9488`, …) en lugar de tokens de la paleta MUI, por lo que no se adapta a modo oscuro ni a cambios de tema, y duplica valores ya definidos en `ThemeProvider` (`custom.purple`, `custom.brand`, …).
- **Evidencia:** `frontend/src/shared/utils/role.utils.ts:64-75`; `frontend/src/shared/providers/ThemeProvider.tsx:109-147`.
- **Certeza:** confirmado.

### FND-R7 — 27 estilos inline `style={{}}` mezclados con `sx` 🟢
- **Descripción:** se detectan 27 usos de `style={{ … }}` en `.tsx`, coexistiendo con `sx` de MUI; los estilos inline no participan del tema (dark mode puede quedar inconsistente) y dificultan overrides. Muestra de LandingPage con su propio `<style>`/clases `lm-*` (SUB-19).
- **Evidencia:** conteo `style={{` en `frontend/src/**/*.tsx` (27); p. ej. landing con clases `lm-*`.
- **Certeza:** parcialmente confirmado (conteo; revisión caso a caso pendiente).

### FND-R8 — Clave `auth_user` en `localStorage` sólo se elimina (código muerto) 🟢
- **Descripción:** `AuthProvider` llama `localStorage.removeItem('auth_user')` en 4 puntos pero **nunca** escribe esa clave (el access token vive en memoria). Es residuo de una versión anterior; mantener la limpieza es inocuo, pero induce a confusión sobre dónde se persiste la sesión.
- **Evidencia:** `frontend/src/shared/providers/AuthProvider.tsx:89,113,143,160`; `frontend/src/shared/services/api-client.ts:8` (token en memoria).
- **Certeza:** confirmado.

### FND-R9 — `error-sanitizer.ts` importa i18n por ruta relativa `.js` 🟢
- **Descripción:** `error-sanitizer.ts` importa `'../../i18n/i18n.js'`, mientras el resto del código usa el alias `@/i18n/i18n`. La incoherencia (extensión `.js` + ruta relativa) es frágil ante reubicaciones y estilísticamente inconsistente.
- **Evidencia:** `frontend/src/shared/utils/error-sanitizer.ts:1`; p. ej. `frontend/src/shared/services/api-client.ts:3`.
- **Certeza:** confirmado.

### FND-R10 — Umbrales de cobertura frontend por debajo del backend; README sin verificar 🟢
- **Descripción:** `vitest.config.ts` fija umbrales `lines:80, branches:70, functions:70, statements:80`, inferiores a los del backend (`lines:85, branches:80, functions:85, statements:85`, ver SUB-16). El `README.md` afirma ~2730 tests y ~89% de cobertura **NO VERIFICADO** (no ejecutado en esta auditoría). La cobertura de la SPA se mide sobre `src/**` excluyendo `main.tsx`, tests, `*.d.ts` y locales.
- **Evidencia:** `frontend/vitest.config.ts:20-39`; `vitest.config.js` (backend, SUB-16); `README.md` (métricas).
- **Certeza:** parcialmente confirmado (config verificada; cobertura real pendiente de ejecución).

### FND-R11 — Flujo 2FA del login roto: el backend nunca devuelve `requires_2fa` 🔴
- **Descripción:** `AuthProvider.login` y `LoginPage` esperan una respuesta **200** con `data.requires_2fa === true` para navegar a `/2fa` (`AuthProvider.tsx:122`; `LoginPage.tsx:60-61`). El backend **nunca** emite ese campo: en `auth.service` (login) lanza `throw new BadRequestError(E.AUTH_2FA_REQUIRED)` (**400**) cuando `user.totp_enabled` y falta `totp_token` (`src/modules/auth/auth.service.ts:347-351`). Confirmado: `requires_2fa` no aparece en ningún punto de `src/` (sólo en el frontend). Consecuencia: un usuario con TOTP habilitado **no puede completar el login** — la promesa se rechaza, `LoginPage` cae al `catch`, muestra el mensaje del backend y **no** navega a `/2fa`; el `interceptor` además dispara un toast de error 400. La página `/2fa` queda inalcanzable desde login. Cross-ref SUB-2 (auth).
- **Evidencia:** `frontend/src/modules/auth/pages/LoginPage.tsx:59-67`; `frontend/src/shared/providers/AuthProvider.tsx:120-126`; `frontend/src/shared/types/api.types.ts` (`requires_2fa?`); `src/modules/auth/auth.service.ts:347-355`; `src/utils/error-codes.ts:45,275`.
- **Certeza:** confirmado.

### FND-S1 — El alta pública autoprovisiona el plan elegido como `active` y factura `paid` sin cobro 🔴
- **Descripción:** `POST /api/saas/onboard` es **público** y acepta `plan_code` arbitrario. `onboardTenant` no realiza ningún cobro pero inserta la suscripción con `status='active'` y una factura con `status='paid'` incondicionalmente (`paid_at` solo se sella si el precio es 0). Cualquiera puede autoprovisionarse un tenant con un plan de pago activo y una factura marcada como pagada. Es la misma clase de defecto que FND-H1/H2 pero por la vía pública de contratación.
- **Evidencia:** `src/modules/saas/saas.service.ts:511-535`; `src/modules/saas/saas.routes.ts:27-29` (`/plans` y `/onboard` antes de `authMiddleware`); `src/modules/saas/saas.schema.ts:24` (`plan_code` libre); `frontend/src/modules/onboarding/pages/OnboardingContractPage.tsx:305-325,188`.
- **Certeza:** confirmado.

### FND-S2 — Aprobar es un no-op y rechazar NO desactiva el tenant 🔴
- **Descripción:** el alta crea el tenant con `active=true` y un usuario admin operativo en la misma transacción. `approveOnboardingApplication` solo vuelve a poner `tenants.active=true` (ya lo estaba); `rejectOnboardingApplication` cambia `tenant_onboarding.status='rejected'` pero **no** desactiva el tenant ni al admin. La cola de aprobación del superadmin, por tanto, **no gatinga** el acceso: una solicitud rechazada conserva tenant y login activos.
- **Evidencia:** `src/modules/saas/saas.service.ts:483-496` (INSERT `active=true`); `src/modules/saas/onboarding.service.ts:585-614`; `frontend/src/modules/onboarding/pages/SuperAdminOnboardingPage.tsx:87-111`.
- **Certeza:** confirmado.

### FND-S3 — Alta de tenant sin verificación ni notificación por email 🟡
- **Descripción:** `onboardTenant` no envía email de verificación ni de bienvenida, y crea el usuario admin con `password_changed=true` y `active` de inmediato. No se comprueba que quien se registra controle el correo `admin_email`, habilitando suplantación del contacto y altas automatizadas. Cross-ref FND-I1 (enlace de bienvenida sin consumidor).
- **Evidencia:** `src/modules/saas/saas.service.ts:501-506,566-580`; `src/modules/saas/onboarding.service.ts` (sin llamada a `email.service`).
- **Certeza:** confirmado.

### FND-S4 — Documentos de onboarding limitados por el body JSON de 100 KB (no por `MAX_FILE_BYTES`) 🟡
- **Descripción:** los documentos del onboarding viajan en `data_base64` dentro del JSON. El servicio valida `MAX_FILE_BYTES` y `ALLOWED_MIME` (`onboarding.service.ts:190-199`), pero la petición nunca llega allí si el body supera `express.json({limit:'100kb'})` (`app.ts:182`). Con el inflado de base64 (+33%), cualquier documento mayor a ~72 KB es rechazado con 413, aunque la UI ofrece "formatos aceptados" y hasta 6 archivos. Es el mismo defecto de FND-K1 por la vía pública de contratación.
- **Evidencia:** `src/app.ts:182`; `src/modules/saas/onboarding.service.ts:185-212`; `src/modules/saas/saas.controller.ts:224-231`; `frontend/src/modules/onboarding/services/onboarding.service.ts:95-106`; `frontend/src/modules/onboarding/pages/OnboardingContractPage.tsx:172-177`.
- **Certeza:** confirmado.

### FND-S5 — `verifyCaptchaOnboard` falla-abierto sin secret o con la TEST key 🟡
- **Descripción:** si `RECAPTCHA_SECRET_KEY` no está definida, `verifyCaptchaOnboard` devuelve `true` (acepta sin captcha); si es la TEST key de Google, también devuelve `true`. En no-producción el formulario público de contratación queda sin protección automatizable (el rate limit es 3/h/IP). En producción `security.middleware` exige el secret al arrancar, pero la aceptación de la TEST key persistiría. Cross-ref FND-F1.
- **Evidencia:** `src/modules/saas/saas.controller.ts:158-168`; `src/middlewares/security.middleware.ts:108-115`.
- **Certeza:** confirmado.

### FND-S6 — Paginación del panel superadmin inalcanzable 🟢
- **Descripción:** en `SuperAdminOnboardingPage` los botones "anterior/siguiente" se renderizan dentro de `{page > 1 && (…)}`, por lo que en la página 1 **no aparece** el botón "siguiente" y es imposible avanzar a la página 2+ (con `limit=20`). El botón siguiente además se deshabilita con `applications.length < 20`.
- **Evidencia:** `frontend/src/modules/onboarding/pages/SuperAdminOnboardingPage.tsx:193-198`.
- **Certeza:** confirmado.

### FND-S7 — Precios de la landing hardcodeados y desacoplados del catálogo backend 🟢
- **Descripción:** la landing usa `PRICING_PLANS` con `usdPrice` fijos (29/79/199) en el bundle, mientras `/contratar` y `GET /saas/plans` leen el catálogo real (`price_monthly` de la BD). Existen dos fuentes de verdad de precios que pueden divergir (marketing vs contratación).
- **Evidencia:** `frontend/src/modules/landing/LandingPage.tsx:45-73,580-593`; `frontend/src/modules/onboarding/services/onboarding.service.ts:23-26`; `src/modules/saas/saas.service.ts` (`getPlanByCode`).
- **Certeza:** confirmado.

### FND-S8 — `operating_hours` con forma inconsistente entre formulario, panel y schema 🟢
- **Descripción:** el formulario público envía `operating_hours` como `{ raw: v }` (`OnboardingContractPage.tsx:402`), mientras el panel de la clínica hace `JSON.stringify(string)` → guarda un string entrecomillado (`ClinicOnboardingPage.tsx:168,228`). El backend espera `z.record(z.string(), z.unknown())` (`saas.schema.ts:42`) y `serializeValue` lo re-serializa si es objeto (`onboarding.service.ts:109`). El ida y vuelta no es idempotente y el valor mostrado puede quedar como texto JSON.
- **Evidencia:** `frontend/src/modules/onboarding/pages/OnboardingContractPage.tsx:402`; `frontend/src/modules/onboarding/pages/ClinicOnboardingPage.tsx:79,168,228`; `src/modules/saas/saas.schema.ts:42`; `src/modules/saas/onboarding.service.ts:107-113`.
- **Certeza:** parcialmente confirmado (comportamiento de guardado por inspección de código; no ejecutado).

### FND-S9 — Enlaces muertos y anclas que recargan la SPA en la landing 🟢
- **Descripción:** el footer/nav de la landing usa múltiples `href="#"` (API, changelog, about, blog, careers, contact, HIPAA) sin destino, y `<a href="/privacidad">`, `<a href="/terminos">`, `<a href="/">` que provocan recarga completa en lugar de `Link` de react-router (pierde estado SPA).
- **Evidencia:** `frontend/src/modules/landing/LandingPage.tsx:336,690-708`.
- **Certeza:** confirmado.

### FND-S10 — Código/artefactos vestigiales en el módulo 🟢
- **Descripción:** `onboardingService.listDocuments()` no se usa (la página lee `profile.documents`); `OnboardingContractPage` contiene `void RECAPTCHA_SITE_KEY; void hasCaptcha;` y `const onQuestionnaire = getValues()` en cada render; y existe `landing-vitaria.html` (1279L) en la raíz como landing paralela no referenciada por el router.
- **Evidencia:** `frontend/src/modules/onboarding/services/onboarding.service.ts:44-47`; `frontend/src/modules/onboarding/pages/OnboardingContractPage.tsx:75-76,222`; `landing-vitaria.html` (raíz) vs `AppRouter.tsx:405`.
- **Certeza:** confirmado.

### FND-S11 — Dos algoritmos de completitud distintos (frontend vs backend) 🟢
- **Descripción:** el formulario público calcula un `%` de completitud con `computePreviewCompleteness` (`OnboardingContractPage.tsx:525-535`) sobre 17 campos, mientras el backend calcula `completeness_pct`/`missing_fields` con `computeCompleteness` sobre su propio conjunto (`onboarding.service.ts:101-104`). Los porcentajes mostrados al usuario y al superadmin pueden diferir para los mismos datos.
- **Evidencia:** `frontend/src/modules/onboarding/pages/OnboardingContractPage.tsx:471-473,525-535`; `src/modules/saas/onboarding.service.ts:101-105,128`.
- **Certeza:** parcialmente confirmado (la divergencia depende del conjunto de campos; revisión de listas pendiente de ejecución).

## Confirmados — transversales (Fase 3)

### FND-T1 — Cobertura de validación de entrada baja (80/219 endpoints con Zod) 🟡
- **Descripción:** solo 80 de 219 endpoints declaran `validateZod` (o validación equivalente) en la ruta; **139 no tienen validación de entrada explícita**. El saneamiento/validación manual por controller es desigual (complementa FND-F3). Es la mayor brecha transversal.
- **Evidencia:** `docs/architecture/catalog/endpoints.csv` (columna `validation`); `src/middlewares/validate.middleware.ts:8-29` (103 usos de `validateZod`).
- **Certeza:** confirmado (conteo estático).

### FND-T2 — Logs de `info` solo a ficheros locales efímeros 🟡
- **Descripción:** `winston` escribe `logs/error.log` y `logs/combined.log` en el sistema de archivos local (`LOG_DIR` default `logs`); en un contenedor/Render efímero esos ficheros se pierden al reiniciar y no hay transporte externo para logs de nivel `info` (solo 5xx llegan a Sentry/`notifyCritical`). Complementa FND-Q5/FND-Q6.
- **Evidencia:** `src/utils/logger.ts:19,24-39`; `src/middlewares/errorHandler.middleware.ts:17-23`.
- **Certeza:** confirmado (efecto en prod depende de disco persistente → NO VERIFICADO).

### FND-T3 — i18n backend desalineado con el frontend 🟡
- **Descripción:** el backend gestiona su propio diccionario (`Locale = 'es' | 'en'`) para emails/notificaciones; `pt` está presente pero marcado **DEPRECADO** y el comentario indica que `fr` falta y `pt` está incompleto. La UI ofrece 4 idiomas (es/en/fr/pt). Resultado: un tenant en `fr`/`pt` recibe emails en otro idioma (fuga al fallback `es`).
- **Evidencia:** `src/shared/i18n.service.ts:3-5,951-952`; frontend `frontend/src/i18n/i18n.ts` + `locales/{es,en,fr,pt}.json`.
- **Certeza:** confirmado.

### FND-T4 — Sin manejo de zona horaria pese a `tenants.timezone` 🟢
- **Descripción:** las utilidades de fecha son mínimas (`getDayOfWeek`, `isValidDate`, `isValidTime`) y no hay conversión de zona horaria ni DST; el cálculo de disponibilidad/recordatorios/ICS usa cadenas locales. Existe `tenants.timezone` y `tenant_onboarding.timezone`, pero no se aplica en el cálculo.
- **Evidencia:** `src/shared/date.ts:1-9`; `tenants.timezone` (`db/init.sql`); `subsystems/notifications`/`subsystems/booking`.
- **Certeza:** confirmado (impacto real depende de tenants fuera de la zona por defecto).

### FND-T5 — Sin módulo de configuración central ni validación de esquema de entorno 🟢
- **Descripción:** no existe `src/config/`; el código accede a `process.env.*` disperso. `validateEnvSecurity()` cubre los secretos críticos pero no hay validación de esquema (Zod) del conjunto completo. Se combina con `.env.example` incompleto (FND-Q3).
- **Evidencia:** ausencia de `src/config/`; `src/middlewares/security.middleware.ts:58-121`.
- **Certeza:** confirmado.

### FND-T6 — Formato de respuesta de éxito/paginación no uniforme 🟢
- **Descripción:** los errores usan `{ error, code }`, pero las respuestas de éxito no tienen envelope ni paginación estandarizada; algunos listados devuelven array desnudo (FND-M6, FND-O2) y el frontend "fabrica" `{ total, page, totalPages }`. Inconsistencia transversal de contrato.
- **Evidencia:** `src/middlewares/errorHandler.middleware.ts:31-34`; `subsystems/audit` (FND-M6); `subsystems/specialties` (FND-O2).
- **Certeza:** confirmado.

## Pendientes de verificar

| ID | Pregunta | Cómo verificar |
|---|---|---|
| FND-F5 | Nº de instancias en producción (efecto real del store en memoria) | configuración Render (Fase 10) |
| FND-H1 | ¿`MERCADOPAGO_ACCESS_TOKEN` configurado en prod? (si no, checkout = bypass de pago) | variables de entorno Render (Fase 10) |
| FND-H3 | ¿Algún proceso externo/manual escribe `subscriptions.status='past_due'`? | operación en BD / jobs (Fase 10) |

> **FND-A5 (`requires_2fa`):** resuelto → **confirmado como defecto** (SUB-1): el frontend espera `requires_2fa` en la respuesta 200, pero el backend lanza `400 AUTH_2FA_REQUIRED`; el flujo 2FA del login queda roto. Ver **FND-R11**.
> **FND-A7 (tenant_id en `register`):** resuelto → **confirmado** (SUB-5): `register` usa `req.body.tenant_id || req.tenant_id` sin validar el tenant y `/api/auth/register` es `PUBLIC_PATH`, permitiendo alta en un tenant arbitrario/inexistente. Evidencia: `src/modules/auth/auth.controller.ts:56`; `src/modules/auth/auth.service.ts:142-151,200-212`; `src/modules/auth/auth.schema.ts:18`; `src/middlewares/tenant.middleware.ts:16-33,74-84`.
> **FND-A9 (captcha):** resuelto → **no es defecto**: el captcha se verifica en producción en login y `/onboard` (ver FND-F1; el hueco real es `register`).
> **FND-A10 (Twilio):** resuelto → confirmado: **no hay** implementación de Twilio (0 coincidencias en `src/`).
> **FND-A11 (SendGrid):** resuelto → **sí se usa** `@sendgrid/mail` (`src/shared/email.service.ts:2,42-56,108`).

## Oportunidades de mejora (no defectos)

- MEMO-1: unificar política de contraseña en un único helper compartido.
- MEMO-2: extraer SQL de `auth.service` a un repositorio (`auth.repository.ts`) para testear sin BD.
