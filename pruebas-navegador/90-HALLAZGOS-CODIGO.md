# 90 — Hallazgos de código conocidos

> Defectos detectados por **análisis estático del código fuente**, no por ejecución de pruebas.
> No son fallos de prueba: son el estado real del sistema. Un caso que falla por uno de estos
> defectos se anota `FALLÓ (defecto conocido: H-NN)`, no como hallazgo nuevo.
> Origen: consolidación de los 8 archivos `_hallazgos-01…08.md` (eliminados), fechas 2026-10-01.
> Cobertura: onboarding, landing, auth, autorización, agenda, disponibilidad, reserva invitado.

| Sev | Cantidad | Áreas cubiertas |
|---|---:|---|
| 🔴 Alta (P0) | 21 | 10, 11, 16, 19, 20, 21, 24, 25, 30 |
| 🟡 Media (P1) | 31 | 10, 11, 12, 14, 16, 18, 19, 20, 22, 24, 25, 30, 31 |
| 🟢 Baja (P2/P3) | 20 | 10, 12, 13, 16, 19, 20, 22, 24, 25, 30, 32 |
| **Total** | **72** | |

**Convenciones de ID:** cada entrada conserva su prefijo de área original (`H-AVL-04`, `H-GST-02`…)
para que las referencias de los casos de prueba sigan siendo válidas aunque cambie la numeración.
El índice `H-NN` de esta tabla es el índice estable y ordenado por severidad. H-62 y H-63 no
proceden de los archivos originales: se añadieron el 2026-10-01 al verificar el código contra la
documentación, y no tienen prefijo de área heredado.

**H-64 … H-72** se promovieron el 2026-10-02 desde numeración local de los archivos de área, **tras
verificar cada uno contra el código fuente**. Cuatro afirmaciones locales resultaron falsas y se
descartaron (ver §Hallazgos locales descartados).

---

## 🔴 Alta — 19 hallazgos

| ID | Área | Título | Ubicación | Efecto observable |
|---|---|---|---|---|
| H-01 | H-AVL-01 | `day_of_week`: 3 convenciones en conflicto, **el domingo es imposible de crear** | `db/init.sql` (`CHECK 1..7`) vs `availability.schema.ts:4`, `availability.service.ts:46,95`, `src/shared/date.ts:1-5`, `frontend/.../availability.types.ts:4,55` | Selector ofrece "Domingo" y no se guarda. `day_of_week: 0` pasa Zod y revienta el CHECK → **500 `23514`** en vez de 400. `day_of_week: 7` → 400 del servicio. Ningún valor sirve. |
| H-02 | H-AVL-02 | 4 rutas que el frontend llama **no existen** en el backend | `DoctorCalendarPage.tsx:169-171,277,290-295` vs `src/app.ts:268-269` | `/calendar` inservible: `Promise.all` rechaza en el primer 404 y la página pinta `ErrorState` con calendario vacío. Rutas rotas: `GET /availability`, `GET /availability/exceptions`, `GET /bookings?doctor_id=`, `POST\|DELETE /availability/exceptions/*`. |
| H-03 | H-AVL-03 | `daysOfWeek` de FullCalendar usa 0=domingo, el backend usa ISO | `DoctorCalendarPage.tsx:192-201` vs `src/shared/date.ts:1-5` | Toda la disponibilidad se mostraría **desplazada un día** (lunes se pinta domingo). Un `day_of_week: 7` válido no se dibuja. No observable hoy por H-02. |
| H-04 | H-GST-01 | La cancelación de invitado **no está en las rutas públicas** | `tenant.middleware.ts:16-35` vs `guest.routes.ts:24` | `DELETE /api/guest/booking/:id` → **400 `X-Tenant-Id header is required`**. La cancelación es imposible desde el navegador: la ruta existe y el email la anuncia, pero ningún visitante puede tener esa cabecera. |
| H-05 | H-GST-02 | El candado anti-carrera usa una firma que PostgreSQL **no tiene** | `guest.service.ts:57-60`; `booking.service.ts:127,388,607` | `pg_advisory_xact_lock(bigint, bigint)` → **42883** (la variante de 2 args solo existe como `(integer,integer)`). Es el único mecanismo que serializa reservas concurrentes: si falla, **toda reserva da 500**. Contraste: `billing.service.ts:81` y `clinical-record.service.ts:146` usan la variante de 1 argumento, que sí existe. |
| H-06 | H-GST-03 | `unique_booking` es ÚNICA y **global, sin filtro de estado**: una cita cancelada bloquea el slot para siempre | `db/init.sql:98` (`CONSTRAINT unique_booking UNIQUE (doctor_id, date, time)`), `db/init.sql:823-833` (índices auxiliares, no únicos), `guest.service.ts:102` | **Corrección**: la restricción **sí existe** (la versión anterior de este hallazgo afirmaba lo contrario). El defecto real es otro: al no filtrar por `status`, una cita `cancelled` o `no_show` sigue ocupando `(doctor_id, date, time)`, así que **repetir ese horario es imposible** aunque esté libre de verdad → `23505` crudo, sin mapear a `BOOKING_SLOT_ALREADY_BOOKED` ni a `GUEST_SLOT_BOOKED`. Contradice el caso AGD de "cancelar libera el slot". Solución: índice único parcial `WHERE status <> 'cancelled'`. |
| H-07 | H-ONB-07 | Aprobar una solicitud crea un tenant que **la UI no puede deshacer** | `PATCH /api/saas/onboarding/applications/:id/approve` | Activa clínica + crea tenant, admin, suscripción y datos iniciales. Sin reversión: única vía es `DELETE /api/super-admin/tenants/:id {confirm:true}`, cascada destructiva. Por eso solo se prueba el camino de **rechazo**. |
| H-08 | H-CIT-03 | El fallback `localhost:5173` está repetido en **11 sitios**; todos los correos pueden apuntar a la máquina del ejecutor | `reminder.job.ts:60`, `auth.service.ts:854`, `booking.email.ts:12,46`, `booking.service.ts:447,662`, `doctor.service.ts:129,274`, `guest.service.ts:92`, `waitlist.service.ts:169`, `app.ts:146-150`, `lab-result-email.service.ts:82` | **Corrección**: el patrón no está solo en el envío de `booking.service.ts`, sino en 11 ubicaciones de 8 archivos. Sin `FRONTEND_URL`, cada enlace (confirmación, invitado, recordatorio, alta de médico, laboratorio, lista de espera, reset de contraseña) apunta a `http://localhost:5173`. **Fallo invisible** en pruebas locales: el enlace sí abre en la máquina del ejecutor. **Outlier**: `lab-result-email.service.ts:82` omite `RENDER_EXTERNAL_URL`, así que ni siquiera acepta el fallback de Render. |
| H-09 | H-CIT-06 | Reprogramar **reinicia la duración** de la cita a 30 min | `rescheduleBookingSchema` (`duration` optional sin default) + servicio (`duration ?? 30`) | Paciente que reprograma desde la UI (no manda `duration`) reduce su cita de 60 a 30 min sin advertencia. El historial no deja rastro. |
| H-10 | H-AUT-01 | Reutilización de refresh token: familia + gracia de 30 s | Rotación transaccional con familia; `REUSE_GRACE_SECONDS` | Reutilizar un refresh antiguo revoca familia + sesión. Debe probarse que **no expulsa abrupto al usuario** y que la rotación no genera bucles. |
| H-11 | H-AUT-03 | Anti-enumeración y tiempo de respuesta en `forgot-password` | `POST /api/auth/forgot-password` | Email existente y no existente deben devolver **status, cuerpo y tiempo** equivalentes. Un leak por timing basta para enumerar usuarios. |
| H-12 | H-AUT-04 | 2FA: `requires_2fa` **sin establecer cookie** de sesión | Login con 2FA activo | Respuesta 200 con `requires_2fa: true` y **sin `Set-Cookie`**. Debe verificarse que no hay acceso parcial antes del segundo factor. |
| H-13 | H-R-AUT-01 | `/login` debe renderizar por URL directa | `AppRouter.tsx:417` | Deep link a `$BASE_URL/login` con contexto limpio → `LoginPage` completa (formulario, fondo, enlace forgot-password), documento 200. |
| H-14 | H-AUTZ-01 | Principios fail-closed y ownership estricto | `src/shared/ownership.ts` (`assertPatientInTenant`, `assertDoctorPatientRelationship`) | Recurso ajeno (`/api/clinical-records/:id` de otro paciente) → **403 o 404, nunca 200**. Prevents escalada horizontal. |
| H-15 | H-AUTZ-02 | Feature gating debe aplicarse en **middleware + endpoint** | `src/middlewares/feature.middleware.ts` | Con tenant sin feature (`clinica-sur`): `GET /api/laboratory/dashboard` y `/requests` → **403**. Si devuelve 200, el gating solo visual y el plan no protege nada. |
| H-16 | H-RF0-01 | Regresión histórica **F-0** (`checkSlotOverlap`): corregido en código, sin verificar en deploy | `src/shared/booking-utils.ts:104-117` (usa `make_interval`), `db/init.sql` (`bookings.time TIME NOT NULL`) | Crear cita → 201 y reprogramar → 200, sin 500. Cualquier discrepancia build/deploy reintroduce el bug. |
| H-17 | H-RF0-03 | Regresión histórica **F-0b** (`X-Tenant-Id` en endpoints públicos) | `tenant.middleware.ts:16-33` (`PUBLIC_PATHS` incluye `/api/bookings/available-slots` y `/api/guest/booking`), `GuestBookingPage.tsx:172` | `/booking` debe completar los 3 pasos: `GET /available-slots` → 200 y `POST /api/guest/booking` → 201, sin 400 por tenant. |
| H-18 | H-RF1-01 | Regresión histórica **F-1**: `/account` y `/patient/settings` → 404 | `AppRouter.tsx:199,417` | Deep link a `$BASE_URL/account` y `/patient/settings` con sesión válida renderiza `SettingsPage`, no 404. |
| H-19 | H-RF2-01 | Regresión histórica **F-2**: alta de médico rechazada por Zod `.strict()` | `doctor.schema.ts` | `POST /api/doctors` con `specialty_id` y todos los campos → **201** y aparece en la lista. |
| H-64 | H-TEN-01 | En producción, una ruta pública **sin `X-Tenant-Id`** lee el tenant `default` | `tenant.middleware.ts:52-62` | `req.tenant_id = process.env.DEFAULT_TENANT_ID \|\| 'default'`. La guarda de producción (línea 53) solo rechaza cuando `!isPublicPath`, así que cualquier petición anónima a `/api/specialties`, `/api/doctors/public` o `/api/saas/plans` consulta los datos del tenant **`default`** y devuelve `200`. Es el precio del arreglo de H-17: los endpoints públicos se hicieron tolerantes, pero ahora filtran por un tenant que el llamante no eligió. |
| H-68 | H-CLI-01 | El guardado de expediente usa `PATCH` y el backend solo registra `PUT` | `clinical-record.service.ts:87` (`apiClient.patch`) vs `clinical-record.routes.ts:47` (`router.put('/:id')`) | No hay ningún `router.patch` en `clinical-record.routes.ts`. Guardar desde `ClinicalRecordFormDialog` da **404** y el diagnóstico se pierde en silencio porque la mutación no revierte el formulario. Las recetas sí están bien: `prescription.service.ts:36` usa `put` y el backend registra `router.put` (línea 52). |

---

## 🟡 Media — 27 hallazgos

| ID | Área | Título | Ubicación | Efecto observable |
|---|---|---|---|---|
| H-20 | H-SMK-02 | Integridad de bundle y política de CDN | Bundles servidos en `/` | Todos los chunks desde el origen propio (sin unpkg/cdn.jsdelivr), con chunks `vendor`, `mui`, `charts`, `calendar`, `query`, `auth`; `favicon.ico` → 200. |
| H-21 | H-AUT-02 | Coordinación multi-pestaña con `BroadcastChannel` | Canal `vitaria-auth` | Refresh / logout-all en la pestaña A: la B recibe el evento y **no intenta usar el token revocado**. |
| H-22 | H-AUTZ-03 | 403 espurios por cargar recursos no visibles al paciente | `GET /api/clinical-templates` para rol `patient` | Navegar `/patient/clinical-records` como paciente debe producir **0 toasts 403**. Hoy hay 2. |
| H-23 | H-AUTZ-04 | Coherencia navegación: sidebar vs rutas declaradas | `navigation.tsx` vs `AppRouter.tsx` | clic en todos los ítems del sidebar por rol → **0 enlaces a 404**. Ruta sin enlace no es bug; enlace a ruta inexistente sí. |
| H-24 | H-LND-03 | Consistencia de precio entre landing y checkout | `/` (visitante) vs `/saas/plan` (admin) | Mismo plan básico muestra **misma moneda y mismo redondeo** en ambas pantallas. |
| H-25 | H-LND-05 | Claves i18n crudas visibles en pantalla | `shared/i18n.service.ts:166-198`; sobre todo `/booking` (ns `guest_booking`) | Recorrer landing y `/booking` en es/en/pt/fr: **ninguna clave con puntos** en pantalla. Etiqueta de feriados incluida. |
| H-26 | H-LND-06 | Consentimiento de cookies y gate de analytics | Banner GDPR | Rechazar → **0 peticiones** a google-analytics/gtag. Aceptar → page views solo si `VITE_GA_MEASUREMENT_ID` está definido. La elección persiste entre recargas. |
| H-27 | H-LND-07 | Enlaces `#` muertos en footer y CTA "Entrar como invitado" | `LandingPage.tsx:581-587,728-736` | Footer sin enlaces inertes. El CTA de invitado va a `/booking` o abre modal login, **nunca a `/dashboard`** sin sesión. |
| H-28 | H-ONB-01 | Subida de documentos en base64: no escalable, sin feedback | `OnboardingContractPage.tsx` (`FileReader.readAsDataURL`) + `express.json({limit})` global | PDF de 10 MB viaja como ~13 MB de JSON → riesgo de **413**. Sin `FormData`, sin barra de progreso, sin cancelación. El `limit` global recorta antes de que el controlador vea el body. |
| H-29 | H-ONB-02 | reCAPTCHA depende de variables ausentes; sin secret **todo se acepta** | `OnboardingContractPage.tsx:73-76`; `saas.controller.ts:158-181` (`if (!secret) return true`) | Sin `RECAPTCHA_SECRET_KEY`, `POST /api/saas/onboard` sin `captcha_token` → **201**. La clave de prueba de Google también se acepta siempre, y solo se loguea un warning. |
| H-30 | H-ONB-05 | `Buffer.from(x,'base64')` nunca lanza: base64 inválido se acepta | `onboarding.service.ts:191-199` | `data_base64: "no-es-base64!!!"` con `file_name` y `mime_type` válidos → **201** (no 400). El error `SAAS_DOCUMENT_INVALID_BASE64` es inalcanzable: el 400 real solo lo dispara el chequeo de longitud. |
| H-31 | H-CIT-01 | La detección de solape **no tiene test** | `booking-utils.ts:78-95` (`make_interval`) | `make_interval` requiere PG 9.4+ y no está portado al entorno de tests, así que nada lo ejecuta. Si la expresión cambia, el solape deja de detectarse **en silencio** y se aceptan citas superpuestas. |
| H-32 | H-CIT-02 | El historial de estados no es accesible desde la app | `db/migrations/012_booking_status_history.sql` | Cada cambio de estado inserta en `booking_status_history`, pero **no hay vista ni endpoint** que lo lea. Solo por `psql`. |
| H-33 | H-CIT-05 | `confirmed: true` con `status: 'pending'` en las series | `booking.service.ts` (`createBookingSeries`) | Las series no aparecen en listados que filtran `status='confirmed'` pero sí en los que filtran `confirmed=true`. Métricas que usen un campo cuentan citas distintas. |
| H-34 | H-AVL-04 | La excepción exige `doctor_id`, rechaza `reason`, y la tabla **no tiene esa columna** | `availability.schema.ts:21-27` (`.strict()`), `availability.controller.ts:74-89`, `db/init.sql`, `AvailabilityPage.tsx:169-182` | **Crear una excepción de horario es imposible desde la UI** (siempre 400). Los chips muestran `— undefined`. El motivo nunca queda registrado. |
| H-35 | H-AVL-05 | `booking_status_history`: sin ruta de lectura y `from_status` fijo a `confirmed` | `holidays.service.ts:103,115-122`; `src/shared/booking-history.ts:25` (único INSERT); `db/init.sql:522` | Al cancelar por feriado, **todas** las citas quedan registradas como `confirmed → cancelled` aunque muchas estén `pending`. El historial miente y no es auditable desde la app. |
| H-36 | H-AVL-06 | El ICS no acota el rango `from`/`to` | `calendar.schema.ts:7-10` (sin `.refine`/`.max`), `calendar.service.ts:74-89` | Rango de 200 años = ~73 000 iteraciones por bloque → decenas de miles de `VEVENT` en memoria. Un `doctor`/`admin` autenticado puede tumbar la CPU. Sin rate limit específico en la ruta. |
| H-37 | H-AVL-09 | `GET /api/availability/:id` es una **ruta pública** | `availability.routes.ts:26` (sin `authMiddleware`); `PUBLIC_PATHS` no incluye `/api/availability/:id` | El horario completo de cualquier médico es legible **sin credenciales** por quien conozca su `doctor_id`. Sin la cabecera: 400 por tenant, no por permisos. |
| H-38 | H-GST-04 | El enlace del email de confirmación **no confirma nada** | `guest.service.ts:74-76` (`confirmed=true` en el INSERT), `booking.service.ts` (`confirmBooking` solo actualiza `WHERE confirmed = FALSE`) | El invitado ve siempre "Esta cita ya había sido confirmada", nunca el éxito. `confirmBooking` **nunca escribe** `status='confirmed'`. El enlace es decorativo. |
| H-39 | H-GST-05 | El bloqueo por inasistencia **nunca se aplica**: RUT normalizado vs formateado | `guest.controller.ts:14` (`cleanRut`), `guest.service.ts:25-34,47` (`WHERE rut = $1`), `admin.seed.ts` (RUT con guion y puntos) | Se compara `123456785` contra `12.345.678-5`: nunca coincide, `rows.length` 0, la función devuelve `false` siempre. Un paciente bloqueado por no-show **sigue reservando como invitado**. |
| H-40 | H-GST-06 | El endpoint público por RUT **expone la agenda completa**, incluidas citas de cuentas registradas | `guest.routes.ts:23` (sin `authMiddleware`), `guest.service.ts:109-128` | `GET /api/guest/bookings/:rut` devuelve `id, date, time, status, doctor_name, specialty` de todo lo no cancelado, comparando contra `bookings.guest_rut` **o** `users.rut`. RUT Chilenos cortos y casi secuenciales → enumeración de la agenda médica de cada paciente. Mitigación: 3 req/15 min **por IP**. |
| H-41 | H-GST-07 | El email promete "gestionar mi cita" pero no hay interfaz de cancelación | `guest.email.ts:26-31`, `ConfirmPage.tsx` (solo confirma), `GuestBookingPage.tsx` | El enlace apunta a `/confirm/<token>` que solo confirma. En todo el frontend hay **una sola** llamada a la API de invitado: el `POST` de creación. El `DELETE` es inalcanzable desde el producto. |
| H-42 | H-GST-08 | Los límites por IP dependen de qué se considere IP confiable | `guest.routes.ts:10-20` (`rutLookupLimiter` 3/15min, `guestBookingLimiter` 5/hora), `src/app.ts:71` (`trust proxy` solo rangos privados) | Si el proxy no cae en los rangos privados, **todas las peticiones anónimas comparten la misma clave**: el 5º visitante de la hora recibe 429 (NAT de sala de espera es el caso normal). Si cae, el límite se elude falseando `X-Forwarded-For`. |
| H-43 | H-GST-09 | La reserva de invitado nace con `confirmed = true` **y** `status = 'pending'` | `guest.service.ts:73-77` (INSERT sin `status`), `db/init.sql:83` | Lo que filtra `status='confirmed'` (agenda, métricas, `.ics`) **no ve** las reservas de invitado. La clínica ve un estado y el invitado recibe un email que dice lo contrario. Mismo conflicto en el flujo autenticado (ver H-33). |
| H-44 | H-RF8-01 | Regresión histórica **F-8**: guardado de QC de laboratorio → `42703` | `laboratory.service.ts:853`; `LabRequestDetailPage.tsx:71-73` (adjuntos de lab son stub) | `POST /api/laboratory/qc` → **201** y el punto aparece en el gráfico Levey-Jennings. |
| H-62 | H-AUTZ-06 | El alias `user`/`patient` se repite inline en 20 sitios del backend | `attachments.service.ts:96`, `billing.controller.ts:16,44`, `booking.controller.ts:97`, `clinical-record.controller.ts:16,72,90,103,274`, `laboratory.controller.ts:52,88,131` (entre otros) | El frontend centraliza con `normalizeRole()` (`frontend/src/shared/utils/role.utils.ts:24`), pero el backend no: cada controller reimplementa `role === 'user' \|\| role === 'patient'`. Un módulo nuevo que olvide la comparación rechaza a un paciente con rol `user` (403 espurio) sin que ningún test lo detecte. Al invertir el orden de un `if` se puede abrir una escalada horizontal. |
| H-63 | H-AUTZ-07 | El feature gating solo se aplica a `laboratory` | `src/middlewares/feature.middleware.ts` (definido, 1 uso), `laboratory.routes.ts:30` (único `router.use(requireFeature(...))`), `AppRouter.tsx:287` (único `FeatureRoute`) | De las **9 feature keys** del seed (`bookings`, `clinical_records`, `laboratory`, `analytics`, `api_access`, `white_label`, `custom_domain`, `sms`, `advanced_reports`), solo `laboratory` se verifica en middleware **y** en el router. `clinical_records`, `analytics`, `advanced_reports` y `api_access` son features de pago sin enforcement: un tenant `free` puede leer expedientes clínicos y analítica por API. El candado del sidebar es solo visual. |
| H-65 | H-TEN-02 | La política RLS de `users` exime las filas de superadmin con `tenant_id IS NULL` | `db/security.sql:147-156` (`CREATE POLICY tenant_isolation ON users USING (... OR (role = 'superadmin' AND tenant_id IS NULL))`) | Es un **exención deliberada**, pero no está aislada al rol de conexión: las filas de superadmin son globales para *cualquier* GUC de tenant, así que un `admin` autenticado de la clínica A las ve al listar usuarios si la consulta no filtra `tenant_id IS NULL`. El resto de tablas (35 de 37) no tienen esta exención; `users` es la excepción. |

---

## 🟢 Baja — 17 hallazgos

| ID | Área | Título | Ubicación | Efecto observable |
|---|---|---|---|---|
| H-45 | H-SMK-01 | Health checks: rutas declaradas que no están montadas | `src/app.ts:136-137` vs `:~207` (skip de rate-limit) | `/api/health` → 200 con `status`, `uptime`, `version`. `/api/health/live` está en la lista de públicas pero **no está montado** → 404. Ambigüedad entre config y endpoints. |
| H-46 | H-LND-01 | Duplicidad del landing: HTML estático vs React | `landing-vitaria.html` (1 279 líneas) en raíz | Duplica `LandingPage.tsx` y **nadie lo sirve** (nginx sirve `dist` con fallback a `index.html`). Riesgo de editar el equivocado. |
| H-47 | H-LND-02 | Multimoneda con tasas fallback | `GET /api/currencies/rates` | Si falla, fallback USD 1, CLP 950, ARS 1200, BRL 5.4, MXN 18.5. En modo offline los precios siguen visibles y coherentes, sin ceros ni pantalla de error. |
| H-48 | H-LND-04 | Las solicitudes de demo crean registros reales | `/onboarding-applications` | Enviar la solicitud crea una fila en la cola real → **requiere limpieza** (rechazar desde `/onboarding-applications` como superadmin). |
| H-49 | H-LND-08 | SEO: metadatos y páginas legales | `<head>` en `/` | `title`, `description`, `viewport`, `og:*`, `canonical`, y `lang` reactivo. `/privacidad` y `/terminos` con texto legal sustantivo (no placeholder) y `DocumentTitle` correcto. |
| H-50 | H-ONB-03 | Código muerto de captcha en la página de contratación | `OnboardingContractPage.tsx:75-76` (`void RECAPTCHA_SITE_KEY; void hasCaptcha;`) | Residuo que **hace pensar que el captcha no está conectado**, cuando sí lo está (se lee en el paso 4 y se valida en cliente y servidor). Solo ruido para el revisor. |
| H-51 | H-ONB-04 | `currency` y `country_code` nunca llegan al alta del tenant | `saas.controller.ts:197-198` vs `onboardSchema` (`.strict()` sin ambos campos) | Zod rechaza las claves desconocidas → 400, y ambos llegan `undefined` al servicio. El tenant creado queda sin moneda ni país, aunque la UI y el servicio los contemplen. |
| H-52 | H-ONB-06 | El rate limit de onboarding vive **en memoria del proceso** | `saas.routes.ts:18-23` (`onboardLimiter`, `max: 3`/hora, store en memoria) | El límite se reinicia con cada reinicio, redeploy o escala horizontal. Con varias instancias, cada una tiene su propio contador. No es fiable como control de abuso. |
| H-53 | H-CIT-04 | Mensajes de rechazo de disponibilidad en inglés, sin i18n | `booking-utils.ts` | `No hay disponibilidad…`, `Outside doctor availability`, `Doctor not available (full day blocked)`, `Time blocked by doctor exception` se muestran crudos al usuario en una app es/en. |
| H-54 | H-AVL-07 | El ICS no cumple RFC 5545 (plegado, cierre, control chars) | `ics.util.ts:15-20,43,55`; `calendar.service.ts:108` | Ninguna línea pliega a 75 octetos, falta el `CRLF` final obligatorio, y `escapeText` no neutraliza los demás caracteres de control. Google Calendar y Outlook **rechazan o truncan** el archivo. Sin `METHOD` ni `X-WR-CALNAME`. |
| H-55 | H-AVL-08 | El ICS trata **cualquier** excepción como día completo bloqueado | `calendar.service.ts:67-68,78` (`exceptedDates` sin mirar `is_full_day`) | Una excepción parcial (12:00–14:00) elimina el día entero del `.ics`: quien lo importa ve **menos** disponibilidad que la real y puede marcar como libres horas bloqueadas. |
| H-56 | H-GST-10 | El email de invitado puede apuntar a `localhost:5173` | `guest.service.ts:92` → `guest.email.ts:13` | Mismo patrón que H-08, y aquí el enlace es la **única** vía de confirmación. Fallo 100 % silencioso: el envío se registra como correcto. |
| H-57 | H-GST-11 | La página de invitado **descarta el mensaje de error** del servidor | `GuestBookingPage.tsx:183-185,129-131,103-105` | Los tres `catch` muestran texto genérico en vez de `GUEST_SLOT_BOOKED`, `Outside doctor availability` o `Tu RUT está bloqueado hasta el…`. Un fallo de red se presenta como "no hay horas" con el mismo `Alert` informativo. |
| H-58 | H-GST-12 | El campo RUT es opcional en la UI y **obligatorio** en el esquema | `GuestBookingPage.tsx:234-242,73-81,176` vs `guest.schema.ts:7` (`min(1)`) | Se puede completar el flujo sin RUT: el `POST` sale sin él → 400 que no señala el campo. Deja reservas cuyo autor no podrá consultar ni cancelar después. |
| H-59 | H-GST-13 | Los médicos se cargan con un `useMemo` que tiene un efecto dentro | `GuestBookingPage.tsx:111-115` (`useMemo(() => { void loadDoctors() })`) | `StrictMode` puede dispararlo dos veces y no garantiza una ejecución por cambio de dependencias. `loadSlots` no cancela la petición anterior → las horas mostradas pueden no corresponder al médico o fecha elegidos. |
| H-60 | H-RF5-01 | Higiene de datos: residuos de QA en historial médico | `DELETE /api/medical-history` **no existe** | El historial de `user1@clinic.com` debe contener solo seed legítimo, sin entradas tipo "QA"/"TEST"/"PRUEBA" ni IDs altos sin correlato. Existió un registro residual `id=27` no eliminable. |
| H-61 | H-AUTZ-05 | Separación de espacios superadmin vs clínica | `AppRouter.tsx:131-135` | Como superadmin, `/users` renderiza `SuperAdminUsersPage` y usa endpoints `/api/super-admin/*`, con sidebar de plataforma. |
| H-66 | H-TEN-03 | Un tenant inexistente en ruta pública responde `200 []` en vez de `404` | `tenant.middleware.ts:74-84` | Si `tenantService.getById()` falla, el middleware reintenta con `loadTenantsFromDB()` y, si sigue sin encontrarlo, solo aborta cuando `!isPublicPath` (línea 76). En ruta pública asigna `req.tenant_id = rawTenantId` **sin validar**. No hay fuga de datos (las consultas filtran por un tenant inexistente y devuelven vacío), pero un `typo` en `X-Tenant-Id` se manifiesta como "no hay datos" en lugar de un error de configuración. |
| H-67 | H-TEN-04 | El tenant de la sesión anula `X-Tenant-Id` sin avisar al cliente | `tenant.middleware.ts:50` (`const rawTenantId = userTenantId \|\| headerTenantId`) | Es lo correcto por seguridad (un header no puede cambiar de tenant), pero el cliente no recibe una señal explícita: solo se deduce del `X-Tenant-Id` de la **respuesta** (línea 89), que refleja el tenant efectivo. Un `admin` que envía `X-Tenant-Id` de otra clínica para "previsualizar" no tiene forma de saber que fue descartado. |
| H-69 | H-RCP-01 | El listado global de recetas devuelve vacío para `superadmin` | `clinical-record.controller.ts:198` (`role === 'superadmin' ? undefined : req.tenant_id`) → `:236` (`getAllPrescriptions(tenantId!, ...)`) → `prescription.service.ts:137` (`WHERE cr.tenant_id = $1`) | `undefined` llega a node-pg como `null`, así que la consulta queda `tenant_id = NULL`, que nunca es verdadero: **cero filas**, sin error. El superadmin ve la pantalla de recetas vacía y no hay forma de distinguir "sin recetas" de "consulta rota". Debería ser `tenant_id IS NOT NULL` o una consulta sin filtro. |
| H-70 | H-RCP-02 | `COALESCE` en la edición impide **borrar** campos opcionales | `prescription.service.ts:100-105` (`medication = COALESCE($1, medication)` … `route = COALESCE($6, route)`) | Enviar `null` explícito conserva el valor anterior en vez de limpiarlo: un `duration`, `instructions` o `route` que se quiere quitar **nunca se borra**, y la UI no puede corregir un dato. Es el patrón inverso a un `PATCH`: aquí `null` significa "no toques", no "vacía". |
| H-71 | H-RCP-03 | Literal en inglés fuera del diccionario i18n | `prescription.service.ts:184` (`return { message: 'Prescription deleted successfully' }`) | El mensaje de borrado exitoso no pasa por `es/en/pt/fr`. En la interfaz aparece en inglés dentro de una app traducido, y el cliente no puede traducirlo porque la clave no existe. Mismo tipo de defecto que H-53. |
| H-72 | H-RCP-04 | Falta paginación en 2 de los 3 listados de recetas | `prescription.service.ts:24-29` (`getPrescriptionsByClinicalRecord`, sin `LIMIT`) y `:145-174` (`getMyPrescriptions`, sin `LIMIT`); `getAllPrescriptions` **sí** la tiene (`:115,140`) | `?limit` y `?offset` se ignoran en `GET /:record_id/prescriptions` y en `GET /prescriptions/mine`. Un paciente con historial largo recibe todas sus recetas de una vez. Corrección frente a la afirmación local: `/prescriptions/all` sí pagina (100 por defecto, tope 200). |

---

## Hallazgos locales descartados en la consolidación (2026-10-02)

Los archivos de área `19`, `21` y `22` traían su propia numeración `H-NN`, que **chocaba** con este
registro (p. ej. `H-05` local = "PATCH vs PUT", pero global = candado `42883`). Al verificar cada uno:

| ID local | Archivo | Afirmación | Verificación | Destino |
|---|---|---|---|---|
| `H-05` | 21 | Frontend manda `PATCH`, backend solo `PUT` | **CIERTO**: `clinical-record.service.ts:87` vs `clinical-record.routes.ts:47` | **H-68** (Alta) |
| `H-15` | 22 | `PUT`/`DELETE /prescriptions/:id` no existen | **FALSO**: existen en `clinical-record.routes.ts:52-53`, y el frontend usa `put` correctamente (`prescription.service.ts:36`) | Descartado |
| `H-08` | 19 | `clinic_app` tiene `BYPASSRLS` | **FALSO**: `security.sql:26` lo crea `LOGIN NOINHERIT`, sin `BYPASSRLS` | Descartado; pasa a caso de verificación TEN-017 |
| `H-07` | 19 | Sin GUC, la política cae en `default` con `COALESCE(...,'default')` | **MECANISMO FALSO**: las políticas usan `current_setting('app.tenant_id', false)` (`security.sql:138,150,161`), que **falla cerrado**. El fallback real está en `tenant.middleware.ts:58` | **H-64** (Alta), reescrito |
| `H-09` + `H-11` | 19 | La política de `users` exime a superadmin con `tenant_id IS NULL` | **CIERTO** (`security.sql:147-156`), pero eran el mismo defecto | **H-65** (Media), fusionados |
| `H-12` | 19 | Tenant crudo sin validar en ruta pública | **CIERTO** (`tenant.middleware.ts:74-84`) | **H-66** (Baja) |
| `H-13` + `H-14` | 19 | La sesión anula `X-Tenant-Id` | **CIERTO** (`tenant.middleware.ts:50`), mismo defecto; el `X-Tenant-Id` de la respuesta **sí** revela el tenant efectivo | **H-67** (Baja), fusionados |
| `H-18` | 19 | `unique_booking` sin `tenant_id` | **CIERTO** pero ya cubierto por **H-06** | Fusionado en H-06 |
| `H-01`…`H-15` | 02 (catálogo) | Funciones de webhooks | No son hallazgos: son IDs de **función** del catálogo | Renombrados a `WHK-01`…`WHK-15` |

---

## Comprobaciones de base de datos previas a la ejecución

```sql
-- H-01: ¿el CHECK de día de semana sigue en 1..7? Ningún día debe ser 0 ni 7.
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'doctor_availability'::regclass AND contype = 'c';
SELECT day_of_week, count(*) FROM doctor_availability GROUP BY 1 ORDER BY 1;

-- H-06: la restricción ÚNICA sí existe (corrige el hallazgo). Comprobar si filtra por estado.
-- Esperado: aparece unique_booking UNIQUE (doctor_id, date, time) SIN cláusula WHERE.
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'bookings'::regclass AND contype = 'u';
-- Demostrar el defecto:slot liberado tras cancelar sigue ocupado
SELECT b.doctor_id, b.date, b.time, b.status
FROM bookings b WHERE b.status = 'cancelled'
  AND EXISTS (SELECT 1 FROM bookings x
              WHERE x.doctor_id = b.doctor_id AND x.date = b.date AND x.time = b.time
                AND x.id <> b.id);

-- H-39: ¿cómo se guardan los RUT y qué bloqueos hay activos?
SELECT rut, blocked_until, tenant_id FROM users
WHERE blocked_until IS NOT NULL ORDER BY blocked_until DESC;
SELECT DISTINCT rut ~ '^\d{1,2}\.?\d{3}\.?\d{3}-[\dK]$' AS con_puntos, count(*)
FROM users GROUP BY 1;

-- H-05: confirmar en consola si la firma de 2 argumentos existe (esperado: error 42883)
-- SELECT pg_advisory_xact_lock(1::bigint, hashtext('2026-01-01')::bit(32)::bigint);

-- H-33/H-43: estado real de las reservas de invitado y de series
SELECT id, confirmed, status, guest_rut FROM bookings
WHERE guest_rut IS NOT NULL ORDER BY id DESC LIMIT 10;
SELECT id, series_id, confirmed, status FROM bookings
WHERE series_id IS NOT NULL AND confirmed = true AND status <> 'confirmed';

-- H-35: los from_status de cancelaciones por feriado (esperado: todos 'confirmed')
SELECT from_status, to_status, count(*) FROM booking_status_history
WHERE to_status = 'cancelled' GROUP BY 1, 2 ORDER BY 3 DESC;

-- H-34: ¿doctor_exceptions sigue sin columna 'reason'?
SELECT column_name FROM information_schema.columns WHERE table_name = 'doctor_exceptions';
```

---

*Documento generado por consolidación de los hallazgos estáticos de las suites 01–08.
Ningún defecto fue confirmado por ejecución en este entorno: todos provienen de lectura de código
y esquema. Los marcados como regresión histórica (H-16…H-19, H-44, H-60) requieren verificación
en producción antes de darse por cerrados.*
