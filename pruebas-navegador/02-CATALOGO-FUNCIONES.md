# 02 — Catálogo maestro de funciones

> **Para qué sirve.** Ante la pregunta *"¿esto está probado?"* o *"¿dónde se prueba esta función?"*,
> la respuesta está en esta tabla. Una fila = una función verificable.
>
> **Cómo se lee.** `Área` es el archivo donde viven los casos. `Fuente` es el código que define el
> comportamiento. Si un caso y el código discrepan, **el código gana** (`00-README.md` §14).

---

## 1. Resumen

| Dimensión | Total |
|---|---:|
| Áreas funcionales cubiertas | 23 (más el gate G0) |
| Funciones catalogadas | 214 |
| Módulos backend | 24 |
| Endpoints REST | ~220 |
| Rutas de UI | 60+ |
| Tablas | 48 |
| Roles | 7 (+ `user` alias) |

---

## 2. Autenticación, sesiones y 2FA → `10-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| A-01 | Login con credenciales | 200 + cookie `httpOnly` de sesión, redirige a la home del rol | `POST /api/auth/login` | `/login` | cualquiera | `modules/auth` |
| A-02 | Login con captcha | Sin token válido → mensaje "Completa el captcha", sin cookie | `POST /api/auth/login` | `/login` | cualquiera | `LoginPage.tsx` |
| A-03 | Login con email inexistente | 401 con mensaje genérico. **No revela** si la cuenta existe | `POST /api/auth/login` | `/login` | cualquiera | `auth.service` |
| A-04 | Contraseña incorrecta | 401. Contador `failed_attempts` +1, sin revelar cuál campo falló | `POST /api/auth/login` | `/login` | cualquiera | `auth.service` |
| A-05 | Login con 2FA activo | 200 con `requires_2fa: true` y **sin** cookie de sesión | `POST /api/auth/login` | `/login` | cualquiera | H-12 |
| A-06 | Verificación 2FA con TOTP válido | Establece la sesión, redirige a la home del rol | `POST /api/auth/2fa/verify` | `/2fa` | cualquiera | `modules/2fa` |
| A-07 | Verificación 2FA con código inválido | 401, mensaje "Código inválido", no establece sesión | `POST /api/auth/2fa/verify` | `/2fa` | cualquiera | `modules/2fa` |
| A-08 | Refresh del access token | 200 con par nuevo. El refresh previo queda invalidado | `POST /api/auth/refresh` | — | autenticado | `auth.service` |
| A-09 | Reutilización de refresh token | Revoca la familia completa + la sesión | `POST /api/auth/refresh` | — | autenticado | H-10 |
| A-10 | Gracia de reutilización (30 s) | Dos pestañas no se expulsan entre sí dentro de la ventana | `POST /api/auth/refresh` | — | autenticado | `REUSE_GRACE_SECONDS` |
| A-11 | Broadcast entre pestañas | Pestaña B recibe el token nuevo y no usa el revocado | — | multi-tab | autenticado | H-21 |
| A-12 | Logout | 200, cookie borrada. `/dashboard` vuelve a pedir login | `POST /api/auth/logout` | — | autenticado | `auth.service` |
| A-13 | Logout de todas las sesiones | Revoca todas las sesiones del usuario | `POST /api/auth/logout-all` | `/settings` | autenticado | ⚠️ destructivo |
| A-14 | Listar sesiones activas | Lista con dispositivo, IP y última actividad | `GET /api/auth/sessions` | `/settings` | autenticado | `auth.routes` |
| A-15 | Revocar una sesión concreta | Esa sesión muere, las demás siguen vivas | `DELETE /api/auth/sessions/:id` | `/settings` | autenticado | `auth.routes` |
| A-16 | Cambio de contraseña | Exige la actual. Invalida los refresh previos vía `token_version` | `POST /api/auth/change-password` | `/settings` | autenticado | `99` |
| A-17 | Reset por email | Responde **igual** exista o no la cuenta. Anti-enumeración | `POST /api/auth/forgot-password` | `/forgot-password` | cualquiera | H-11 |
| A-18 | Registro por invitación | Solo con token válido. Password: 8+ chars, mayús, mínús, número, especial | `POST /api/auth/register` | `/register` | invitado | `RegisterPage.tsx` |
| A-19 | Activación de 2FA | QR `otpauth://` + verificación TOTP. Secreto cifrado AES-256-GCM | `POST /api/auth/2fa/enable` | `/settings` | autenticado | `modules/2fa` |
| A-20 | Desactivación de 2FA | Exige confirmación. Elimina el secreto | `POST /api/auth/2fa/disable` | `/settings` | autenticado | `modules/2fa` |
| A-21 | JWKS | Endpoint presente. Hoy devuelve `{ keys: [] }` (stub) | `GET /api/auth/jwks` | — | cualquiera | `README` §15.19 |
| A-22 | Sesión expirada por inactividad | Un solo toast, un solo logout, **sin bucle** de redirección | — | transversal | autenticado | `CU-112` |
| A-23 | Bloqueo por intentos fallidos | 5 intentos → bloqueo temporal con minutos restantes | `POST /api/auth/login` | `/login` | cualquiera | `failed_attempts` |
| A-24 | Cookie de sesiónIdle 24 h / máx 30 d | Ambos límites se aplican | — | transversal | autenticado | `SESSION_IDLE_HOURS` |
| A-25 | Códigos de error de auth | `AUTH_LOCKED`, `INVALID_CREDENTIALS` mapeados a i18n en los 4 idiomas | `POST /api/auth/login` | `/login` | cualquiera | `es.json` ns `errors` |
| A-26 | Contraseña débil rechazada | 400 con el requisito concreto (no genérico) | `POST /api/auth/change-password` | `/settings` | autenticado | `auth.schema` |

---

## 3. Autorización, roles y permisos → `11-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| Z-01 | Ruta protegida sin sesión | Redirige a `/login`, sin bucle | — | `ProtectedRoute` | anónimo | `AppRouter.tsx:131` |
| Z-02 | Ruta por rol no autorizada | Redirige a la home del rol, sin bucle | — | `ProtectedRoute` | cualquiera | `AppRouter.tsx:131-135` |
| Z-03 | `user` normalizado a `patient` | `role: 'user'` se trata como `patient` | — | transversal | `user` | `role.utils.ts` |
| Z-04 | Ownership de expediente | Expediente de otro paciente → 403/404, **nunca 200** | `GET /api/clinical-records/:id` | `/clinical-records` | patient | H-14 |
| Z-05 | Ownership de historial | Idem para historial médico | `GET /api/medical-history/:id` | `/medical-history` | patient | `assertPatientInTenant` |
| Z-06 | Relación médico-paciente | Un médico no ve fichas de pacientes sin relación | `GET /api/clinical-records/patient/:id` | `/clinical` | doctor | `assertDoctorPatientRelationship` |
| Z-07 | Paciente en su tenant | Un paciente de otro tenant → 403/404 | transversal | transversal | patient | `assertPatientInTenant` |
| Z-08 | Feature gating en middleware | Tenant sin feature → **403**, no 200 | `GET /api/laboratory/*` | `/laboratory` | cualquiera | H-15 |
| Z-09 | `PremiumLocked` en UI | Bloquea con "Ver Planes" → `/saas` | — | cualquier ruta premium | todos | `PremiumLocked.tsx:38` |
| Z-10 | Candado en el sidebar | Ítem con feature ausente muestra candado | — | sidebar | todos | `navigation.tsx` |
| Z-11 | Matriz `SUPERADMIN_ONLY` | 4 rutas restringidas a superadmin | varias | `/saas`, `/tenants`, `/audit` | superadmin | `AppRouter.tsx:131` |
| Z-12 | Matriz `ADMIN_STAFF` | Superadmin + admin | varias | `/onboarding-applications` | admin | `AppRouter.tsx:132` |
| Z-13 | Matriz `STAFF_ROLES` | Admin + doctor | varias | `/users`, `/clinical` | admin, doctor | `AppRouter.tsx:133` |
| Z-14 | Matriz `CLINICAL_ROLES` | Admin + doctor (+ patient para expedientes propios) | varias | `/clinical-records` | admin, doctor | `AppRouter.tsx:134` |
| Z-15 | Matriz `BOOKING_ROLES` | Solo quien agenda | varias | `/bookings` | patient | `AppRouter.tsx:135` |
| Z-16 | Sin 403 espurios | Paciente en `/patient/clinical-records` → **0 toasts 403** | `GET /api/clinical-templates` | `/patient/clinical-records` | patient | H-22 |
| Z-17 | Separación superadmin vs clínica | `/users` de superadmin usa `/api/super-admin/*` y su sidebar | `/api/super-admin/users` | `/users` | superadmin | H-61 |
| Z-18 | Sidebar por rol | Solo ítems del rol, sin candados si todo está contratado | — | sidebar | todos | `navigation.tsx:52-89` |
| Z-19 | Sidebar sin enlaces rotos | Clic en todos → 0× `NotFoundPage` | — | sidebar | todos | H-23 |
| Z-20 | Deep link a ruta protegida | URL directa con sesión → renderiza, no 404 | — | `/account` | autenticado | H-18 |
| Z-21 | Ruta inexistente | `NotFoundPage` con "Volver al inicio" | — | `*` | cualquiera | `NotFoundPage.tsx:32` |
| Z-22 | Rol `guest` sin enforcement | El rol existe en el esquema pero la reserva anónima no crea usuario | — | `/booking` | invitado | `README` §15 |
| Z-23 | RLS fuerza por tabla | 37 tablas con `FORCE RLS`, aplicable incluso al owner | — | — | — | `security.sql:87` |
| Z-24 | Excepción de política en `users` | `superadmin` con `tenant_id IS NULL` puede leer todo | — | `/super-admin/users` | superadmin | `security.sql:170` |

---

## 4. Landing, marketing, precios y SEO → `12-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| L-01 | Landing renderiza | Hero, features, workflow, tech, screenshots, pricing, testimonios, FAQ, CTA | — | `/` | anónimo | `LandingPage.tsx` |
| L-02 | Cambio de idioma en landing | es/en/pt/fr aplicado de inmediato, persistido en `localStorage.lang` | — | `/` | anónimo | `i18n.ts:11` |
| L-03 | `<html lang>` reactivo | Se actualiza al cambiar idioma | — | `/` | anónimo | `i18n.ts:32-36` |
| L-04 | Multimoneda por país | CL/AR/BR/MX/US → CLP/ARS/BRL/MXN/USD | `GET /api/currencies/rates` | `/` | anónimo | `99` |
| L-05 | Tasas fallback | Si falla la API: USD 1, CLP 950, ARS 1200, BRL 5.4, MXN 18.5. Precios visibles | `GET /api/currencies/rates` | `/` | anónimo | H-47 |
| L-06 | Precio consistente landing vs checkout | Mismo plan, misma moneda, mismo redondeo en `/` y `/saas/plan` | — | `/`, `/saas/plan` | anónimo | H-24 |
| L-07 | Solicitud de demo | Formulario con validación + captcha → confirmación | `POST /api/saas/onboard` | `/` | anónimo | `LandingPage.tsx` |
| L-08 | Directorio público de médicos | Cachea 60 s, sin sesión | `GET /api/doctors/public` | `/` | anónimo | `99` |
| L-09 | Especialidades públicas | Sin sesión, con y sin `:id` | `GET /api/specialties` | `/` | anónimo | `99` |
| L-10 | Slots libres sin sesión | **200**, sin `X-Tenant-Id` (regresión F-0b) | `GET /api/bookings/available-slots` | `/` | anónimo | H-17 |
| L-11 | Consentimiento de cookies | Persiste la elección entre recargas | — | `/` | anónimo | H-26 |
| L-12 | Rechazar cookies bloquea GA4 | **0 peticiones** a google-analytics/gtag | — | `/` | anónimo | H-26 |
| L-13 | Aceptar cookies habilita GA4 | Page views solo si `VITE_GA_MEASUREMENT_ID` está definido | — | `/` | anónimo | H-26 |
| L-14 | Metadatos SEO | `title`, `description`, `viewport`, `og:*`, `canonical` | — | `/` | anónimo | H-49 |
| L-15 | Páginas legales | `/privacidad` y `/terminos` con texto sustantivo, no placeholder | — | `/privacidad`, `/terminos` | anónimo | H-49 |
| L-16 | `DocumentTitle` por ruta | Cada ruta cambia el título del documento | — | transversal | anónimo | `i18n` |
| L-17 | CTA "Entrar como invitado" | Va a `/booking` o abre modal. **Nunca** a `/dashboard` | — | `/` | anónimo | H-27 |
| L-18 | Enlaces del footer | Sin enlaces `#` inertes | — | `/` | anónimo | H-27 |
| L-19 | Botón "Probar la demo" | Entra al tenant `clinica-demo` con credenciales públicas | — | `/` , `/login` | anónimo | `LoginPage.tsx:256` |
| L-20 | Sin claves i18n crudas | Ninguna clave con puntos visible en es/en/pt/fr | — | `/` | anónimo | H-25 |

---

## 5. Usuarios, médicos y pacientes → `13-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| U-01 | Listar usuarios | Tabla con filtros, sin paginar en el cliente | `GET /api/users` | `/users` | admin | `modules/users` |
| U-02 | Buscar usuarios | Filtro por nombre/email | `GET /api/users?q=` | `/users` | admin | `modules/users` |
| U-03 | Estadísticas de usuarios | Conteos por rol y estado | `GET /api/users/stats` | `/users` | admin | `modules/users` |
| U-04 | Activar/desactivar usuario | Toggle + efecto en el login | `PATCH /api/users/:id/status` | `/users` | admin | `modules/users` |
| U-05 | Ver detalle de usuario | Datos, rol, tenant, último acceso | `GET /api/users/:id` | `/users` | admin | `modules/users` |
| U-06 | Editar usuario | Nombre, email, teléfono, rol | `PATCH /api/users/:id` | `/users` | admin | `users.schema` |
| U-07 | Crear médico | Exige `specialty_id`. Campos: name, email, specialty, license_number, phone, consultation_fee, bio | `POST /api/doctors` | `/doctors` | admin | `DoctorFormDialog.tsx:24` |
| U-08 | Editar médico | Mismos campos, botón "Guardar Cambios" | `PATCH /api/doctors/:id` | `/doctors` | admin | `DoctorFormDialog.tsx` |
| U-09 | Validar `license_number` | Formato esperado, 400 con el motivo | `POST /api/doctors` | `/doctors` | admin | `doctor.schema` |
| U-10 | Tarifa en CLP | `consultation_fee` numérica, en pesos chilenos | `POST /api/doctors` | `/doctors` | admin | `DoctorFormDialog.tsx:24` |
| U-11 | Invitar médico | JWT de invitación válido 7 días → el invitado se registra | `POST /api/doctors/invite` | `/doctors` | admin | `InviteDoctorDialog` |
| U-12 | Revocar invitación | El token deja de servir | `DELETE /api/doctors/invitations/:id` | `/doctors` | admin | `modules/doctors` |
| U-13 | Panel del médico | KPIs del propio doctor | `GET /api/analytics/my-stats` | `/panel` | doctor | `DoctorPanel` |
| U-14 | Historial de sus pacientes | Solo pacientes con relación | `GET /api/doctors/:id/patients` | `/patient-history` | doctor | `modules/doctors` |
| U-15 | Listar pacientes | Directorio para admin/médico | `GET /api/users?role=patient` | `/patients` | admin, doctor | `PatientsPage` |
| U-16 | Ver paciente | Ficha básica, sin cruzar tenants | `GET /api/users/:id` | `/patients` | admin | `modules/users` |
| U-17 | CRUD de especialidades | Con estadísticas y filtros | `GET/POST/PATCH/DELETE /api/specialties` | `/specialties` | superadmin | `modules/specialties` |
| U-18 | Especialidad con médicos | Lista los médicos de la especialidad | `GET /api/specialties/:id` | `/specialties` | superadmin | `modules/specialties` |
| U-19 | No borrar especialidad en uso | 400 con el motivo | `DELETE /api/specialties/:id` | `/specialties` | superadmin | `specialties.service` |
| U-20 | Doctor con email duplicado | 400, no 500 | `POST /api/doctors` | `/doctors` | admin | `users.schema` |
| U-21 | Búsqueda de paciente (autocomplete) | Sugiere por nombre, filtra por tenant | `GET /api/users/search` | `/clinical` | doctor, admin | `Autocomplete` |
| U-22 | Seed de demo data | Siembra dataset completo para el tenant | `POST /api/admin/demo-data` | `/admin/demo-data` | admin | `AdminDemoDataPage` |

---

## 6. Onboarding y contratación → `14-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| O-01 | Stepper de contratación | 4 pasos con documentos | `POST /api/saas/onboard` | `/contratar` | anónimo | `OnboardingContractPage` |
| O-02 | Validación del paso 1 | Datos de la clínica antes de avanzar | — | `/contratar` | anónimo | `saas.schema` |
| O-03 | Captcha obligatorio | Sin `captcha_token` válido → **400** | `POST /api/saas/onboard` | `/contratar` | anónimo | H-29 |
| O-04 | Captcha ausente en el entorno | Si falta `RECAPTCHA_SECRET_KEY`, **todo se acepta** | `POST /api/saas/onboard` | `/contratar` | anónimo | H-29 |
| O-05 | Subir documento | `data_base64` + `file_name` + `mime_type`. Límite `MAX_FILE_BYTES` | `POST /api/saas/onboard/documents` | `/contratar` | anónimo | `onboarding.service` |
| O-06 | Base64 inválido rechazado | 400 con `SAAS_DOCUMENT_INVALID_BASE64`. **Hoy responde 201** | `POST /api/saas/onboard/documents` | `/contratar` | anónimo | H-30 |
| O-07 | `currency` y `country_code` | Llegan al alta del tenant. **Hoy los rechaza el `.strict()`** | `POST /api/saas/onboard` | `/contratar` | anónimo | H-51 |
| O-08 | Rate limit de onboarding | 3 por hora por IP → 429 en el 4.º | `POST /api/saas/onboard` | `/contratar` | anónimo | H-52 |
| O-09 | Página de gracias | Renderiza tras enviar la solicitud | — | `/gracias` | anónimo | `ThankYouPage` |
| O-10 | Bandeja de solicitudes | Superadmin ve la cola | `GET /api/saas/onboarding/applications` | `/onboarding-applications` | superadmin | `SuperAdminOnboardingPage` |
| O-11 | Aprobar solicitud | Crea tenant + admin + suscripción. **Sin reversión en la UI** | `PATCH /api/saas/onboarding/applications/:id/approve` | `/onboarding-applications` | superadmin | H-07 · ⚠️ destructivo |
| O-12 | Rechazar solicitud | Registra `rejection_reason`. **Camino siempre probado** | `PATCH /api/saas/onboarding/applications/:id/reject` | `/onboarding-applications` | superadmin | `tenant_onboarding.status` |
| O-13 | Completitud del onboarding | `completeness_pct` y `missing_fields[]` visibles | `GET /api/saas/onboarding/profile` | `/settings/onboarding` | admin | `tenant_onboarding` |
| O-14 | Mi onboarding | El admin ve y completa su perfil | `GET /api/saas/onboarding/profile` | `/settings/onboarding` | admin | `ClinicOnboardingPage` |
| O-15 | `tenant_onboarding` único | Un tenant no puede tener 2 solicitudes | `UNIQUE (tenant_id)` | — | — | `db/init.sql:1138` |
| O-16 | Estados de la solicitud | `pending` → `approved` \| `rejected`. Sin vuelta atrás | — | `/onboarding-applications` | superadmin | `026:39` |

---

## 7. SaaS, planes y checkout → `15-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| S-01 | Listar planes | 4 planes: `free` (0), `basic` (29), `pro` (79), `enterprise` (199). USD es la fuente de verdad | `GET /api/saas/plans` | `/saas/plan` | admin, superadmin | `db/init.sql:1189` |
| S-02 | Ver plan actual | Suscripción activa del tenant | `GET /api/saas/subscription` | `/saas/plan` | admin | `subscriptions` |
| S-03 | Checkout | Inicia el pago con MercadoPago | `POST /api/saas/checkout` | `/saas/checkout` | admin | `saas.controller` |
| S-04 | Webhook de MercadoPago | Re-resuelve el pago contra la API de MP. **No valida `x-signature`** | `POST /api/saas/webhooks/mercadopago` | — | externo | `saas.controller:86-133` |
| S-05 | Idempotencia del webhook | Reprocesar el mismo evento no duplica la suscripción | `POST /api/saas/webhooks/mercadopago` | — | externo | `99` |
| S-06 | Cambiar plan | Upgrade o downgrade | `PATCH /api/saas/subscription` | `/saas/plan` | admin | `saas.service` |
| S-07 | Cancelar suscripción | `active` → `canceled` | `DELETE /api/saas/subscription` | `/saas/plan` | admin | `subscriptions.status` |
| S-08 | Estados de suscripción | `active`, `trialing`, `past_due`, `canceled`, `incomplete` | — | `/saas/plan` | admin | `init.sql:443` |
| S-09 | `handlePastDueSubscriptions` | Marca `past_due` a los vencidos. **Implementado pero nunca programado** | — | — | — | `saas.job` sin cron |
| S-10 | Límites por plan | El plan define los límites de uso | `GET /api/saas/limits` | `/saas/plan` | admin | `tenant_features` |
| S-11 | Features por plan | 9 feature keys habilitadas por plan | `GET /api/saas/features` | `/saas/plan` | admin | `tenant_features` |
| S-12 | Uso del tenant | Consumo actual contra el límite | `GET /api/saas/usage` | `/saas/plan` | admin | `tenant_usage` |
| S-13 | Facturas de suscripción | Estados: `pending`, `paid`, `uncollectible`, `void` | `GET /api/saas/invoices` | `/saas/plan` | admin | `subscription_invoices` |
| S-14 | Página de éxito | Renderiza tras el pago | — | `/saas/success` | admin | `SuccessPage` |
| S-15 | Multi-moneda en checkout | Misma moneda que el landing | `GET /api/currencies/rates` | `/saas/checkout` | admin | H-24 |
| S-16 | `Precios CLP` | La migración 030 los agregó, la 031 **los dropeó** | — | — | — | `030`/`031` |
| S-17 | Checkout sin sesión | Redirige a `/login` | — | `/saas/checkout` | anónimo | `ProtectedRoute` |
| S-18 | Aislamiento de billing | El admin solo ve la suscripción de su tenant | `GET /api/saas/subscription` | `/saas/plan` | admin | `tenant_id` |

---

## 8. Agenda y citas → `16-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| C-01 | Crear cita | 201 con `id` numérico. Valida slot, solape y disponibilidad | `POST /api/bookings` | `/bookings` | patient, admin | `modules/booking` |
| C-02 | Estados de cita | `pending`, `confirmed`, `cancelled`, `completed`, `no_show` | — | `/bookings` | todos | `init.sql:83` |
| C-03 | Rechazar slot ya tomado | 400 con `BOOKING_SLOT_ALREADY_BOOKED` | `POST /api/bookings` | `/bookings` | patient | `booking-utils:96` |
| C-04 | Rechazar fuera de disponibilidad | 400 con el motivo (hoy en inglés: H-53) | `POST /api/bookings` | `/bookings` | patient | H-53 |
| C-05 | Fecha en pasado | 400. `CHECK date >= CURRENT_DATE - 1 día` | `POST /api/bookings` | `/bookings` | patient | `init.sql` |
| C-06 | Duración 1–480 min | 400 fuera de rango | `POST /api/bookings` | `/bookings` | patient | `init.sql` |
| C-07 | Confirmar por token | `POST /api/bookings/confirm/:token`. **Nunca escribe `status`** | `POST /api/bookings/confirm/:token` | `/confirm/:token` | invitado | H-38 |
| C-08 | Confirmar ya confirmada | 200 con `alreadyConfirmed: true` | `POST /api/bookings/confirm/:token` | `/confirm/:token` | invitado | `booking.service` |
| C-09 | Reprogramar | 200. **Reinicia la duración a 30 min** | `PATCH /api/bookings/:id/reschedule` | `/bookings` | patient, admin | H-09 |
| C-10 | Cancelar | `PATCH /api/bookings/:id/cancel` → `status: cancelled` | `PATCH /api/bookings/:id/cancel` | `/bookings` | patient, admin | `modules/booking` |
| C-11 | Cancelar fuera de plazo | 400 con el plazo permitido | `PATCH /api/bookings/:id/cancel` | `/bookings` | patient | `booking.service` |
| C-12 | Historial de estados | Cada cambio inserta en `booking_status_history`. **Sin endpoint de lectura** | — | — | — | H-32 |
| C-13 | Crear serie | Frecuencia `daily` \| `weekly` \| `monthly`, genera N citas | `POST /api/bookings/series` | `/bookings` | patient, admin | `booking.service` |
| C-14 | Cancelar serie completa | Cancela todas las ocurrencias | `DELETE /api/bookings/series/:id` | `/bookings` | patient | `booking.service` |
| C-15 | `confirmed` vs `status` | Series nacen con ambos contradictorios. **No es bug de la UI** | — | — | — | H-33, H-43 |
| C-16 | Restricción única sin filtro de estado | `unique_booking` **sí existe** (`init.sql:98`) pero no excluye `cancelled` | — | — | — | H-06 |
| C-17 | Listar mis citas | Próximas y pasadas separadas | `GET /api/bookings` | `/bookings` | patient | `modules/booking` |
| C-18 | Ver todas las citas del tenant | Solo staff | `GET /api/bookings/all` | `/bookings` | admin, doctor | `modules/booking` |
| C-19 | Citas de un médico | Filtro por `doctor_id` | `GET /api/bookings?doctor_id=` | `/bookings` | admin | ⚠️ no existe `GET` |
| C-20 | Densidad diaria | Citas por día en la grilla | `GET /api/bookings/density` | `/bookings` | admin | `modules/booking` |
| C-21 | Validación de solape | `make_interval` sin test que lo ejecute | — | — | — | H-31 |
| C-22 | Email de confirmación | Enlace a la cita. **Puede apuntar a `localhost:5173`** | — | — | patient | H-08 |
| C-23 | `guest` XOR `user` | `check_guest_or_user`: nunca ambos, nunca ninguno | `POST /api/bookings` | `/bookings` | todos | `init.sql` |
| C-24 | Recordatorios 1 h y 24 h | Flags `reminders_1h` / `reminders_24h` se encolan | — | — | — | `reminder.job` |
| C-25 | Marcar `no_show` | Solo staff | `PATCH /api/bookings/:id/no-show` | `/bookings` | admin, doctor | `init.sql:83` |
| C-26 | Marcar `completed` | Solo staff, al cerrar la cita | `PATCH /api/bookings/:id/complete` | `/bookings` | admin, doctor | `modules/booking` |
| C-27 | Doctor no disponible (día completo) | 400 `Doctor not available (full day blocked)` | `POST /api/bookings` | `/bookings` | patient | H-53 |
| C-28 | Bloqueo por excepción | 400 `Time blocked by doctor exception` | `POST /api/bookings` | `/bookings` | patient | H-53 |
| C-29 | FK `doctor_id` CASCADE | Borrar el médico borra sus citas | — | — | admin | `init.sql` |
| C-30 | `user_id` SET NULL | Borrar el paciente deja la cita huérfana, no la borra | — | — | admin | `init.sql` |
| C-31 | `confirmation_token` UNIQUE | Nunca colisiona | `POST /api/bookings` | `/bookings` | patient | `init.sql` |
| C-32 | Caché de slots | `GET /available-slots` cachea para no golpear la BD | `GET /api/bookings/available-slots` | `/booking` | cualquiera | `modules/booking` |

---

## 9. Disponibilidad, calendario y feriados → `17-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| D-01 | Ver mi disponibilidad | Bloques del médico autenticado | `GET /api/availability/me` | `/availability` | doctor | `availability.routes:26` |
| D-02 | Crear bloque | `days_of_week`, `start_time_label`, `end_time_label`. Fin > inicio obligatorio | `POST /api/availability` | `/availability` | doctor | `AvailabilityPage:310` |
| D-03 | Editar bloque | Mismos campos | `PATCH /api/availability/:id` | `/availability` | doctor | `modules/availability` |
| D-04 | Borrar bloque | Elimina el bloque; los slots derivados se liberan | `DELETE /api/availability/:id` | `/availability` | doctor | `modules/availability` |
| D-05 | Carga masiva | Varios bloques en una llamada | `POST /api/availability/bulk` | `/availability` | doctor | `modules/availability` |
| D-06 | Ver disponibilidad de un médico | `GET /api/availability/:id`. **Ruta pública sin auth** | `GET /api/availability/:id` | `/calendar` | cualquiera | H-37 |
| D-07 | `day_of_week` ISO | 1 = lunes … 7 = domingo. **El domingo es imposible** | `POST /api/availability` | `/availability` | doctor | H-01 |
| D-08 | Tres convenciones en conflicto | BD y `getDayOfWeek()` usan ISO; Zod y el servicio validan 0..6 | `POST /api/availability` | `/availability` | doctor | H-01 |
| D-09 | Crear excepción | `date` + `reason`. **Siempre 400** | `POST /api/availability-exceptions` | `/availability` | doctor | H-34 |
| D-10 | `doctor_id` obligatorio en el esquema | El controlador lo resuelve de la sesión. La UI no lo manda → 400 | `POST /api/availability-exceptions` | `/availability` | doctor | H-34 |
| D-11 | `reason` en la tabla | **`doctor_exceptions` no tiene la columna.** El motivo se pierde | — | `/availability` | doctor | H-34 |
| D-12 | Excepción de día completo | Sin horas si `is_full_day` | `POST /api/availability-exceptions` | `/availability` | doctor | `init.sql` |
| D-13 | Bloquear slots por excepción | Los slots del día desaparecen de `available-slots` | `GET /api/bookings/available-slots` | `/booking` | cualquiera | `modules/booking` |
| D-14 | Calendario del médico | FullCalendar daygrid/timegrid. **Hoy inservible: 4 rotas** | varias | `/calendar` | doctor | H-02 |
| D-15 | `daysOfWeek` de FullCalendar | 0 = domingo. El backend usa ISO → **días desplazados** | — | `/calendar` | doctor | H-03 |
| D-16 | Exportar `.ics` | Archivo de la agenda del médico | `GET /api/calendar/:doctorId.ics` | `/calendar` | doctor | `modules/calendar` |
| D-17 | ICS sin cota de rango | `from`/`to` sin `.max`. 200 años = ~73 000 iteraciones | `GET /api/calendar/:id.ics` | `/calendar` | doctor | H-36 |
| D-18 | ICS conforme a RFC 5545 | Plegado a 75 octetos, `CRLF` final, control chars escapados | `GET /api/calendar/:id.ics` | `/calendar` | doctor | H-54 |
| D-19 | ICS y excepciones parciales | Trata toda excepción como día completo → **pierde horas** | `GET /api/calendar/:id.ics` | `/calendar` | doctor | H-55 |
| D-20 | Listar feriados | Feriados del tenant | `GET /api/holidays` | `/holidays` | admin, superadmin | `modules/holidays` |
| D-21 | Crear feriado | `date` + `name` + `cancel_bookings` | `POST /api/holidays` | `/holidays` | admin | `modules/holidays` |
| D-22 | Borrar feriado | 200 | `DELETE /api/holidays/:id` | `/holidays` | admin | `modules/holidays` |
| D-23 | Feriado cancela citas | Las citas pasan a `cancelled` y se avisa a los pacientes | `POST /api/holidays` | `/holidays` | admin | `holidays.service` |
| D-24 | Historial de la cancelación | `from_status` se fija a `confirmed`. **Miente si estaba `pending`** | — | — | — | H-35 |
| D-25 | Feriado bloquea disponibilidad | El día no ofrece slots | `GET /api/bookings/available-slots` | `/booking` | cualquiera | `modules/availability` |
| D-26 | Etiqueta de=iado traducida | Sin claves crudas | `/holidays` | admin | H-25 |
| D-27 | Seed de excepciones | 2 por médico: 1 pasada, 1 parcial | — | — | — | `admin.seed` |
| D-28 | 7 áreas de laboratorio sembradas | HEM, BIO, HOR, INM, MIC, PAR, URO | `003_add_lab_areas:108` | — | — | `lab_areas` |
| D-29 | Tipos de columna `TIME` | `start_time`/`end_time` son `TIME`, no `TEXT`. `25:00` no se guarda | — | — | — | `information_schema` |
| D-30 | `WEEK_DAYS_ORDER` | `[1,2,3,4,5,6,0]` trata el `0` como domingo | `GET /api/availability/me` | `/availability` | doctor | `availability.types:55` |

---

## 10. Reserva de invitado → `18-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| G-01 | Stepper de 3 pasos | Nombre/email/teléfono → médico/fecha → hora | `POST /api/guest/booking` | `/booking` | invitado | `GuestBookingPage:57` |
| G-02 | Validación de RUT | Formato chileno con dígito verificador | `POST /api/guest/booking` | `/booking` | invitado | `shared/rut.ts` |
| G-03 | RUT obligatorio | El esquema lo exige. **La UI permite enviarlo vacío** | `POST /api/guest/booking` | `/booking` | invitado | H-58 |
| G-04 | Reserva creada | 201 con token de confirmación | `POST /api/guest/booking` | `/booking` | invitado | `guest.service` |
| G-05 | Nace `confirmed = true` | Y `status = 'pending'`. **Los dos a la vez** | `POST /api/guest/booking` | `/booking` | invitado | H-43 |
| G-06 | Candado anti-carrera | `pg_advisory_xact_lock`. **La firma no existe → 42883** | `POST /api/guest/booking` | `/booking` | invitado | H-05 |
| G-07 | Slot liberado sigue ocupado | Cancelar **no** libera `(doctor_id, date, time)` → `23505` crudo | `POST /api/guest/booking` | `/booking` | invitado | H-06 |
| G-08 | Consultar por RUT | Devuelve reservas de invitado **y** de la cuenta registrada | `GET /api/guest/bookings/:rut` | `/booking` | invitado | H-40 |
| G-09 | Rate limit de consulta | 3 por 15 min **por IP** | `GET /api/guest/bookings/:rut` | `/booking` | invitado | `guest.routes:10` |
| G-10 | Rate limit de reserva | 5 por hora por IP. **Clave compartida si el proxy no es confiable** | `POST /api/guest/booking` | `/booking` | invitado | H-42 |
| G-11 | Cancelar reserva | `DELETE /api/guest/booking/:id` con token. **Siempre 400** | `DELETE /api/guest/booking/:id` | — | invitado | H-04 |
| G-12 | Sin UI de cancelación | El email promete "gestionar mi cita". El enlace solo confirma | — | `/confirm/:token` | invitado | H-41 |
| G-13 | Bloqueo por inasistencia | RUT bloqueado → rechaza. **Nunca se aplica** (RUT normalizado vs formateado) | `POST /api/guest/booking` | `/booking` | invitado | H-39 |
| G-14 | Confirmación por token | `POST /api/bookings/confirm/:token`. Ya nace confirmada | `POST /api/bookings/confirm/:token` | `/confirm/:token` | invitado | H-38 |
| G-15 | Email con enlace | URL desde `FRONTEND_URL`. **Fallback a `localhost:5173`** | — | — | invitado | H-56 |
| G-16 | Mensajes de error literales | `GUEST_SLOT_BOOKED`, `Outside doctor availability`. **La UI los descarta** | `POST /api/guest/booking` | `/booking` | invitado | H-57 |
| G-17 | Fallo de red vs "no hay horas" | Un 404 se presenta igual que un día completo | `GET /api/bookings/available-slots` | `/booking` | invitado | H-57 |
| G-18 | `useMemo` con efecto dentro | Puede disparar la carga de médicos 2 veces en `StrictMode` | `GET /api/doctors/public` | `/booking` | invitado | H-59 |
| G-19 | `loadSlots` sin cancelación | Dos cambios rápidos pueden mostrar horas del médico anterior | `GET /api/bookings/available-slots` | `/booking` | invitado | H-59 |
| G-20 | Sin `X-Tenant-Id` | El frontend **no** manda la cabecera. Debe funcionar igual | `POST /api/guest/booking` | `/booking` | invitado | H-17 |
| G-21 | Carga de doctores públicos | `GET /api/doctors/public` cachea 60 s | `GET /api/doctors/public` | `/booking` | invitado | `modules/doctors` |
| G-22 | `guest_rut` con puntos o guion | Acepta ambos formatos, normaliza a dígitos+verificador | `POST /api/guest/booking` | `/booking` | invitado | `cleanRut` |
| G-23 | `guest` XOR `user` en bookings | Nunca ambos a la vez | `POST /api/guest/booking` | `/booking` | invitado | `check_guest_or_user` |
| G-24 | Enumeración de RUT | RUT Chilenos cortos y casi secuenciales → la agenda se reconstruye | `GET /api/guest/bookings/:rut` | — | anónimo | H-40 |
| G-25 | Feriados sin slots | Un feriado no ofrece horas en `/booking` | `GET /api/bookings/available-slots` | `/booking` | invitado | `modules/availability` |
| G-26 | Excepciones sin slots | Una excepción bloquea sus horas | `GET /api/bookings/available-slots` | `/booking` | invitado | `modules/availability` |

---

## 11. Multi-tenancy y aislamiento → `19-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| T-01 | `X-Tenant-Id` obligatorio | 400 `X-Tenant-Id header is required` sin la cabecera, salvo rutas públicas | transversal | — | todos | `tenant.middleware:52` |
| T-02 | Rutas públicas sin tenant | `available-slots`, `guest/booking`, `guest/bookings/*`, `/health` | varias | — | anónimo | `tenant.middleware:16-35` |
| T-03 | RLS `FORCE` | 37 tablas, se aplica **incluso al owner** | — | — | — | `security.sql:87` |
| T-04 | GUC `app.tenant_id` | Lo setean los middlewares por petición | — | — | todos | `set_tenant_id` |
| T-05 | Fallback a `'default'` | Sin GUC, la política usa `'default'`. **No falla: ve datos** | — | — | — | H-18 · RLS |
| T-06 | Política `tenant_isolation` | `USING` + `WITH CHECK` sobre `tenant_id` | — | — | — | `security.sql` |
| T-07 | Excepción en `users` | `superadmin` con `tenant_id IS NULL` lee todo | `GET /api/super-admin/users` | `/super-admin/users` | superadmin | `security.sql:170` |
| T-08 | `tenants` read-only | `USING(true) WITH CHECK(false)`: lectura sí, escritura por RLS no | — | `/tenants` | superadmin | `security.sql` |
| T-09 | `audit_logs` acepta `'system'` | Política extra `audit_write FOR INSERT` | — | `/audit` | superadmin | `security.sql:170` |
| T-10 | `clinic_app` sin privilegios | `CONNECTION LIMIT 20`, `statement_timeout 30s`, `lock_timeout 10s`, sin TRUNCATE | — | — | — | `security.sql:375` |
| T-11 | `clinic_superadmin` con `BYPASSRLS` | Pool `DATABASE_URL_SUPERADMIN` | — | `/saas` | superadmin | `025` |
| T-12 | `cie10_catalog` sin RLS | Catálogo global por diseño | `GET /api/clinical-templates/codes` | `/clinical` | doctor | `init.sql:170` |
| T-13 | Aislamiento de citas | Un tenant no ve citas de otro | `GET /api/bookings` | `/bookings` | admin | `bookings.tenant_id` |
| T-14 | Aislamiento de usuarios | Un admin no ve usuarios de otro tenant | `GET /api/users` | `/users` | admin | `users.tenant_id` |
| T-15 | Aislamiento clínico | Un médico no ve fichas de otro tenant | `GET /api/clinical-records` | `/clinical-records` | doctor | `clinical_records.tenant_id` |
| T-16 | Aislamiento de facturación | Un admin no ve facturas de otro tenant | `GET /api/billing/invoices` | `/billing` | admin | `invoices.tenant_id` |
| T-17 | `unique_booking` no excluye `cancelled` | Colisión real al reutilizar el slot de una cita cancelada | `POST /api/bookings` | `/bookings` | admin | H-06 |
| T-18 | `waitlist` única por `(doctor, user, fecha)` | `UNIQUE` incluye tenant por contexto | `POST /api/waitlist` | `/bookings` | patient | `init.sql:560` |
| T-19 | Trigger `security_audit` | Inserta en `audit_logs` con `tenant_id = COALESCE(x,'system')` | — | `/audit` | superadmin | `security.sql:260` |
| T-20 | Trigger `phi_audit` | Audita `clinical_records`, `invoices`, `payments`. En UPDATE solo guarda `id`+`status` | — | `/audit` | superadmin | `security.sql:308` |

---

## 12. Lista de espera → `20-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| W-01 | Unirse a la lista | Un registro `waiting` por `(doctor, user, fecha)` | `POST /api/waitlist` | `/bookings` | patient | `modules/waitlist` |
| W-02 | Ver mis entradas | Solo las propias | `GET /api/waitlist` | `/bookings` | patient | `MyWaitlistPanel` |
| W-03 | Salir de la lista | `status = removed` | `DELETE /api/waitlist/:id` | `/bookings` | patient | `modules/waitlist` |
| W-04 | Ver lista completa (staff) | Todas las entradas del tenant | `GET /api/waitlist` | — | admin, doctor | `waitlist.service` |
| W-05 | Notificar al paciente | Al liberarse un slot: `waiting` → `notified` | `PATCH /api/waitlist/:id/notify` | — | admin | `init.sql:560` |
| W-06 | Reservar desde la lista | `notified` → `booked`. **Nadie asigna `booked`** | `PATCH /api/waitlist/:id/book` | — | patient | H-F4b |
| W-07 | Estados de la lista | `waiting`, `notified`, `booked`, `removed` | — | `/bookings` | patient | `init.sql:560` |
| W-08 | `notified` no caduca | El aviso no expira. **El ciclo no termina** | `PATCH /api/waitlist/:id/notify` | — | admin | H-F4b |
| W-09 | El aviso apunta mal | Enlaza a `/bookings` en vez del horario liberado | `PATCH /api/waitlist/:id/notify` | — | patient | H-F4b |
| W-10 | Paciente llama al endpoint admin | 403. **No hay pantalla de staff** | `GET /api/waitlist` | `/bookings` | patient | H-F4b |
| W-11 | Orden de la lista | Por fecha solicitada, luego por antigüedad | `GET /api/waitlist` | — | admin | `waitlist.service` |
| W-12 | Aviso al staff | Notificación al entrar alguien | `POST /api/waitlist` | `/bookings` | patient | `99` |
| W-13 | `user_id` CASCADE | Borrar el paciente borra su entrada | — | — | admin | `init.sql:560` |
| W-14 | `doctor_id` CASCADE | Borrar el médico borra la lista | — | — | admin | `init.sql:560` |

---

## 13. Expedientes clínicos e historial → `21-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| E-01 | Crear expediente | Exige `patient_name`, `patient_id`, `chief_complaint`, `diagnosis`, `treatment_plan` | `POST /api/clinical-records` | `/clinical` | doctor | `ClinicalRecordFormDialog:36` |
| E-02 | Editar expediente | Mismos campos, botón "Actualizar" | `PATCH /api/clinical-records/:id` | `/clinical` | doctor | `ClinicalRecordFormDialog` |
| E-03 | Estados del expediente | `draft`, `completed`, `cancelled` | — | `/clinical-records` | doctor | `init.sql:151` |
| E-04 | Signos vitales | `vital_signs` JSONB: temperatura, PA, FC, peso, estatura, SatO₂ | `POST /api/clinical-records` | `/clinical` | doctor | `ClinicalRecordFormDialog:36` |
| E-05 | Códigos CIE-10 | `cie10_codes TEXT[]`. 26 códigos en el catálogo | `POST /api/clinical-records` | `/clinical` | doctor | `init.sql:1055` |
| E-06 | Buscar CIE-10 | Sugerencias por código y descripción | `GET /api/clinical-templates/codes` | `/clinical` | doctor | `cie10_catalog` |
| E-07 | Plantilla clínica | `template_id` opcional. **Sin página ni ruta** | `GET /api/clinical-templates` | — | — | H-22 |
| E-08 | Adjuntar resultado de lab | `clinical_record_id` en `lab_requests` SET NULL | `GET /api/clinical-records/:id` | `/clinical-records/:id` | doctor | `lab_requests` |
| E-09 | Ownership del expediente | Solo los propios (patient) o del propio paciente (doctor) | `GET /api/clinical-records/:id` | `/clinical-records/:id` | patient, doctor | H-14 |
| E-10 | Listar expedientes | Los del tenant; los propios si es patient | `GET /api/clinical-records` | `/clinical-records` | doctor, patient | `modules/records` |
| E-11 | Detalle del expediente | Ficha + recetas + adjuntos + historial | `GET /api/clinical-records/:id` | `/clinical-records/:id` | doctor, patient | `ClinicalRecordDetailPage` |
| E-12 | `chief_complaint` NOT NULL | 400 sin él | `POST /api/clinical-records` | `/clinical` | doctor | `init.sql:151` |
| E-13 | `patient_id` CASCADE | Borrar el paciente borra el expediente | — | — | admin | `init.sql` |
| E-14 | `doctor_id` CASCADE | Borrar el médico borra el expediente | — | — | admin | `init.sql` |
| E-15 | `booking_id` SET NULL | Borrar la cita no borra el expediente | — | — | admin | `init.sql` |
| E-16 | Trigger `phi_audit` | Cada INSERT/UPDATE/DELETE audita. En UPDATE solo `id`+`status` | — | `/audit` | superadmin | `security.sql:308` |
| E-17 | Crear historial médico | Condición, fecha de inicio, tipo | `POST /api/medical-history` | `/medical-history` | patient, doctor | `modules/records` |
| E-18 | Estados del historial | `active`, `resolved`, `chronic`, `family` | — | `/medical-history` | patient | `init.sql:590` |
| E-19 | Editar historial | `PATCH /api/medical-history/:id` | `PATCH /api/medical-history/:id` | `/medical-history` | patient | `modules/records` |
| E-20 | **Borrar historial** | **`DELETE /api/medical-history` no existe** | — | — | — | H-60 |
| E-21 | Listar historial | Solo el propio, o el del paciente con relación | `GET /api/medical-history` | `/medical-history` | patient, doctor | `modules/records` |
| E-22 | Vista admin del historial | El admin ve el de cualquier paciente de su tenant | `GET /api/admin/medical-history` | `/admin/medical-history` | admin | `AdminMedicalHistoryPage` |
| E-23 | Higiene de datos | Sin residuos "QA"/"TEST"/"PRUEBA" visibles al paciente | `GET /api/medical-history` | `/medical-history` | patient | H-60 |
| E-24 | Diálogo "Nuevo Registro" | **Falla: exige `patient_id` que no se manda** | `POST /api/clinical-records` | `/clinical` | doctor | 99 |
| E-25 | Borrar expediente | Solo `admin`. Deja huérfanas las recetas (CASCADE) | `DELETE /api/clinical-records/:id` | `/clinical-records/:id` | admin | `init.sql` |
| E-26 | 8 diagnósticos CIE-10 de seed | Dataset de `admin.seed.ts` | — | `/clinical` | doctor | `admin.seed` |
| E-27 | Signos vitales anómalos | Feed de anomalías en analítica | `GET /api/analytics/vitals-anomalies` | `/analytics` | admin | `modules/analytics` |
| E-28 | Adjuntos del expediente | 4 endpoints. Base64, no `multipart` | `GET/POST /api/attachments` | `/clinical-records/:id` | doctor | `modules/attachments` |

---

## 14. Recetas y PDF → `22-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| P-01 | Crear receta | Exige `patient_name`, `patient_id` y ≥1 medicamento con 4 campos | `POST /api/prescriptions` | `/clinical` | doctor | `PrescriptionFormDialog:29` |
| P-02 | Editar receta | Mismos campos, "Actualizar" | `PATCH /api/prescriptions/:id` | `/clinical` | doctor | `PrescriptionFormDialog` |
| P-03 | 1 receta = 1 medicamento | **No hay tabla de ítems.** Cada fila es un medicamento | `POST /api/prescriptions` | `/clinical` | doctor | `init.sql` |
| P-04 | `clinical_record_id` obligatorio | La receta cuelga del expediente | `POST /api/prescriptions` | `/clinical` | doctor | `init.sql` |
| P-05 | Campos del medicamento | Nombre, dosis, frecuencia, duración, instrucciones. `route` default `oral` | `POST /api/prescriptions` | `/clinical` | doctor | `PrescriptionFormDialog:29` |
| P-06 | Notas de la receta | `notes` opcional | `POST /api/prescriptions` | `/clinical` | doctor | `PrescriptionFormDialog` |
| P-07 | Ver mis recetas | El paciente ve solo las suyas | `GET /api/prescriptions` | `/prescriptions` | patient | `PatientPrescriptionsPage` |
| P-08 | Detalle de receta | Ver `/clinical-records/:id` para el médico | `GET /api/prescriptions/:id` | `/clinical` | doctor | `modules/prescriptions` |
| P-09 | PDF de la receta | Descarga con `no-store` | `GET /api/prescriptions/:id/pdf` | `/prescriptions` | patient, doctor | `prescription-pdf` |
| P-10 | Paciente ve el PDF | **Hoy solo ve tarjetas de texto** | `GET /api/prescriptions/:id/pdf` | `/prescriptions` | patient | 99 |
| P-11 | `PrescriptionsPage` sin ruta | 401 líneas **no enrutadas**. El médico no tiene UI de recetas | — | — | doctor | 99 |
| P-12 | Diálogo "Nueva Prescripción" | **Falla: exige `patient_id` que no se manda** | `POST /api/prescriptions` | `/clinical` | doctor | 99 |
| P-13 | Ownership de la receta | El paciente solo ve las suyas | `GET /api/prescriptions` | `/prescriptions` | patient | `prescriptions.patient_id` |
| P-14 | `clinical_record_id` CASCADE | Borrar el expediente borra sus recetas | — | — | admin | `init.sql` |
| P-15 | Receta sin paciente | 400: `patient_name` y `patient_id` son NOT NULL | `POST /api/prescriptions` | `/clinical` | doctor | `init.sql` |
| P-16 | Frecuencia de administración | Texto libre, sin catálogo | `POST /api/prescriptions` | `/clinical` | doctor | `PrescriptionFormDialog` |
| P-17 | Impresión | `window.print()` sobre el PDF | `GET /api/prescriptions/:id/pdf` | `/prescriptions` | patient | `prescription-pdf` |
| P-18 | Recetas de un expediente | Se listan dentro del detalle | `GET /api/clinical-records/:id` | `/clinical-records/:id` | doctor | `ClinicalRecordDetailPage` |
| P-19 | Receta `oral` por defecto | Si no se manda `route`, se guarda `oral` | `POST /api/prescriptions` | `/clinical` | doctor | `init.sql` |
| P-20 | Receta en la factura | Los ítems de factura referencian la receta | `POST /api/billing/invoices` | `/billing` | admin | `invoice_items` |

---

## 15. Laboratorio → `23-`

> 46 endpoints · 8 rutas · el módulo más grande del sistema. 14 estados posibles por ítem.

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| L-01 | Dashboard de laboratorio | KPIs del tenant | `GET /api/laboratory/dashboard` | `/laboratory` | lab_tech, admin | `modules/laboratory` |
| L-02 | Worklist de solicitudes | Lista con estado y prioridad | `GET /api/laboratory/requests` | `/laboratory/requests` | lab_tech | `LabRequestsPage` |
| L-03 | Crear solicitud | `patient_id` (número) + `test_ids` (CSV) + `priority` + `notes` | `POST /api/laboratory/requests` | `/laboratory/requests` | doctor, lab_tech | `LabRequestsPage:356` |
| L-04 | `request_number` UNIQUE | Numeración automática sin colisión | `POST /api/laboratory/requests` | `/laboratory/requests` | doctor | `init.sql:329` |
| L-05 | Prioridad de la solicitud | `routine`, `urgent`, `emergency` | `POST /api/laboratory/requests` | `/laboratory/requests` | doctor | `init.sql:328` |
| L-06 | Estados de la solicitud | 14: `pending`, `received`, `verified`, `assigned`, `processing`, `qc_review`, `result_entered`, `validated_tech`, `validated_doctor`, `signed`, `delivered`, `cancelled`, `rejected`, `repeated` | — | `/laboratory/requests` | lab_tech | `003:39` |
| L-07 | Estados del ítem | Los mismos 14 que la solicitud | — | `/laboratory/requests/:id` | lab_tech | `003:54` |
| L-08 | Prioridad del ítem | `low`, `normal`, `urgent` (distinta de la solicitud) | — | `/laboratory/requests/:id` | lab_tech | `003:350` |
| L-09 | Recibir muestra | `PATCH /api/laboratory/samples/:id/receive` → `received` | `PATCH /samples/:id/receive` | `/laboratory/requests/:id` | lab_tech | `99` |
| L-10 | Verificar muestra | `PATCH /samples/:id/verify` → `verified` | `PATCH /samples/:id/verify` | `/laboratory/requests/:id` | lab_tech | `99` |
| L-11 | Asignar muestra | `PATCH /samples/:id/assign` → `assigned` + `assigned_tech_id` | `PATCH /samples/:id/assign` | `/laboratory/requests/:id` | lab_tech | `99` |
| L-12 | Capturar resultado | `PATCH /items/:id/result` → `result_entered`. `results` JSONB | `PATCH /items/:id/result` | `/laboratory/requests/:id` | lab_tech | `99` |
| L-13 | Validación técnica | `PATCH /items/:id/validate-tech` → `validated_tech` | `PATCH /items/:id/validate-tech` | `/laboratory/requests/:id` | lab_tech | `99` |
| L-14 | Validación del médico | `PATCH /items/:id/validate-doctor` → `validated_doctor` | `PATCH /items/:id/validate-doctor` | `/laboratory/requests/:id` | doctor | `99` |
| L-15 | Firma | `PATCH /items/:id/sign` → `signed` | `PATCH /items/:id/sign` | `/laboratory/requests/:id` | doctor | `99` |
| L-16 | Entrega | `PATCH /items/:id/deliver` → `delivered` | `PATCH /items/:id/deliver` | `/laboratory/requests/:id` | lab_tech | `99` |
| L-17 | Rechazar muestra | `PATCH /samples/:id/reject` + `rejection_reason` | `PATCH /samples/:id/reject` | `/laboratory/requests/:id` | lab_tech | `99` |
| L-18 | Doble validación obligatoria | No se entrega sin pasar por técnico **y** médico | — | `/laboratory/requests/:id` | lab_tech, doctor | `99` |
| L-19 | Trigger `completed_at` del ítem | Se setea al entrar a `validated_tech`/`validated_doctor`/`signed`/`delivered` | — | — | — | `003:74` |
| L-20 | Trigger `completed_at` de la solicitud | Al entrar a `delivered` o `cancelled` | — | — | — | `003:91` |
| L-21 | Catálogo de pruebas | CRUD con `result_type`: `numeric`, `text`, `select`, `multiselect`, `graph`, `image` | `GET/POST /api/laboratory/tests` | `/laboratory/catalog` | lab_tech | `init.sql:302` |
| L-22 | 9 tests de seed | Catálogo inicial en `init.sql:1055` | `GET /api/laboratory/tests` | `/laboratory/catalog` | lab_tech | `init.sql` |
| L-23 | Muestras | Estados: `pending`, `received`, `verified`, `assigned`, `processing`, `completed`, `rejected`, `disposed` | `GET /api/laboratory/samples` | `/laboratory/requests/:id` | lab_tech | `init.sql:692` |
| L-24 | `qc_status` de la muestra | `pending`, `passed`, `failed`, `review` | `PATCH /samples/:id/qc` | `/laboratory/requests/:id` | lab_tech | `004:21` |
| L-25 | Control de calidad | `POST /api/laboratory/qc` → 201. **Hoy da 42703** | `POST /api/laboratory/qc` | `/laboratory/quality-control` | lab_tech | H-44 |
| L-26 | Gráfico Levey-Jennings | El punto de QC aparece en la gráfica | `GET /api/laboratory/qc/levey-jennings` | `/laboratory/quality-control` | lab_tech | `99` |
| L-27 | Tipos de QC | `internal`, `external`, `calibration`, `proficiency` | `POST /api/laboratory/qc` | `/laboratory/quality-control` | lab_tech | `005:53` |
| L-28 | Estado del QC | `passed`, `failed`, `warning`, `review` | `POST /api/laboratory/qc` | `/laboratory/quality-control` | lab_tech | `005:53` |
| L-29 | Equipos | Estados: `online`, `offline`, `maintenance`, `calibration` | `GET/POST /api/laboratory/equipment` | `/laboratory` | lab_tech | `init.sql:731` |
| L-30 | Reactivos y stock | CRUD con alerta de stock bajo | `GET/POST /api/laboratory/reagents` | `/laboratory` | lab_tech | `modules/laboratory` |
| L-31 | 7 áreas de trabajo | HEM, BIO, HOR, INM, MIC, PAR, URO | `GET /api/laboratory/areas` | `/laboratory/area/:areaId` | lab_tech | `003:108` |
| L-32 | Dashboard por área | Carga de trabajo del área | `GET /api/laboratory/areas/:id/dashboard` | `/laboratory/area/:areaId` | lab_tech | `99` |
| L-33 | SSE de eventos | `GET /api/laboratory/events`. **Único tiempo real del sistema** | `GET /api/laboratory/events` | `/laboratory` | lab_tech | `99` |
| L-34 | Notificaciones de lab | Severidad `info`/`warning`/`critical`; tipo `critical_result`, `qc_failure`, `equipment_alert`, `stock_alert`, `sla_breach`, `repeated_result` | `GET /api/laboratory/notifications` | `/laboratory` | lab_tech | `005:72` |
| L-35 | Acuse de notificación | `PATCH /api/laboratory/notifications/:id/ack` | `PATCH /notifications/:id/ack` | `/laboratory` | lab_tech | `99` |
| L-36 | Email de resultados | `POST /api/laboratory/results/email` | `POST /results/email` | `/laboratory/requests/:id` | lab_tech | `99` |
| L-37 | PDF de la orden | Descarga de la solicitud | `GET /api/laboratory/requests/:id/pdf` | `/laboratory/requests/:id` | lab_tech | `modules/laboratory` |
| L-38 | Resultado crítico | `is_critical` + `delta_check_status`: `normal`/`warning`/`critical` | `PATCH /items/:id/result` | `/laboratory/requests/:id` | lab_tech | `init.sql:781` |
| L-39 | Resultado repetido | `is_repeated` + `previous_result_id` | `PATCH /items/:id/result` | `/laboratory/requests/:id` | lab_tech | `init.sql` |
| L-40 | Ver mis resultados | El paciente ve los suyos en `/my-laboratory` | `GET /api/laboratory/results/patient/:id` | `/my-laboratory` | patient | `PatientLabResultsPage` |
| L-41 | Detalle de resultado | `/my-laboratory/:id` | `GET /api/laboratory/items/:id` | `/my-laboratory/:id` | patient | `LabResultDetailPage` |
| L-42 | Resultados del médico | `/doctor/lab-results` para sus pacientes | `GET /api/laboratory/doctor/results` | `/doctor/lab-results` | doctor | `DoctorLabResultsPage` |
| L-43 | Solicitudes del admin | Vista admin de solicitudes | `GET /api/admin/lab-requests` | `/admin/lab-requests` | admin | `AdminLabRequestsPage` |
| L-44 | Analítica de laboratorio | KPIs del módulo | `GET /api/laboratory/analytics` | `/laboratory/analytics` | lab_tech | `LabAnalyticsPage` |
| L-45 | Adjuntos de laboratorio | **Son un stub** | `GET /api/attachments?entity_type=lab_result` | `/laboratory/requests/:id` | lab_tech | H-44 |
| L-46 | Feature `laboratory` | Sin la feature, 403 en middleware y candado en el sidebar | `GET /api/laboratory/*` | `/laboratory` | todos | H-15 |

---

## 16. Facturación → `24-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| B-01 | Crear factura | Exige paciente, `due_date` y ≥1 ítem con descripción, cantidad ≥1, precio >0 | `POST /api/billing/invoices` | `/billing` | admin, doctor | `InvoiceFormDialog:136` |
| B-02 | Impuesto | `tax` ≤ 100 | `POST /api/billing/invoices` | `/billing` | admin | `InvoiceFormDialog:136` |
| B-03 | Ítems de la factura | `description`, `quantity`, `unit_price`. El total se calcula | `POST /api/billing/invoices` | `/billing` | admin | `invoice_items` |
| B-04 | `invoice_number` UNIQUE | Numeración automática sin colisión | `POST /api/billing/invoices` | `/billing` | admin | `init.sql:218` |
| B-05 | Estados de la factura | `pending`, `paid`, `cancelled`, `refunded`, `overdue` | — | `/billing` | admin | `init.sql:218` |
| B-06 | Marcar como pagada | `status = paid` + `paid_at` | `PATCH /api/billing/invoices/:id/pay` | `/billing` | admin | `modules/billing` |
| B-07 | Marcar vencida | `overdue`. Transición automática o manual | `PATCH /api/billing/invoices/:id` | `/billing` | admin | `init.sql:218` |
| B-08 | Reembolsar | `refunded` | `PATCH /api/billing/invoices/:id/refund` | `/billing` | admin | `init.sql:218` |
| B-09 | Eliminar factura | Admin. Deja huérfanos los pagos (CASCADE) | `DELETE /api/billing/invoices/:id` | `/billing` | admin | `init.sql` |
| B-10 | Registrar pago | `payment_method` NOT NULL (libre, sin CHECK) + `transaction_id` | `POST /api/billing/payments` | `/billing` | admin | `init.sql:248` |
| B-11 | Estados del pago | `pending`, `completed`, `failed`, `refunded` | — | `/billing` | admin | `init.sql:248` |
| B-12 | `amount` NUMERIC(10,2) | 400 con más de 2 decimales | `POST /api/billing/payments` | `/billing` | admin | `init.sql:218` |
| B-13 | Listar facturas | Filtros por estado y paciente | `GET /api/billing/invoices` | `/billing` | admin | `modules/billing` |
| B-14 | Detalle de factura | Factura + ítems + pagos | `GET /api/billing/invoices/:id` | `/billing` | admin | `modules/billing` |
| B-15 | Estadísticas de facturación | Ingresos, pendientes,逾期 | `GET /api/billing/stats` | `/billing` | admin | `modules/billing` |
| B-16 | `patient_id` CASCADE | Borrar el paciente borra sus facturas | — | — | admin | `init.sql` |
| B-17 | `doctor_id` SET NULL | La factura sobrevive al borrado del médico | — | — | admin | `init.sql` |
| B-18 | `booking_id` SET NULL | La factura sobrevive al borrado de la cita | — | — | admin | `init.sql` |
| B-19 | Claims de seguro | Estados: `pending`, `submitted`, `approved`, `rejected`, `partial`, `paid` | `GET/POST /api/billing/claims` | `/billing` | admin | `init.sql:264` |
| B-20 | Trigger `phi_audit` | Audita cada INSERT/UPDATE/DELETE de facturas y pagos | — | `/audit` | superadmin | `security.sql:308` |
| B-21 | Facturas de suscripción | Estados distintos: `pending`, `paid`, `uncollectible`, `void` | `GET /api/saas/invoices` | `/saas/plan` | admin | `init.sql:462` |
| B-22 | Notas de la factura | `notes` opcional | `POST /api/billing/invoices` | `/billing` | admin | `InvoiceFormDialog:136` |

---

## 17. Analítica y reportes → `25-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| N-01 | KPIs administrativos | 10 KPIs distintos con Recharts | `GET /api/analytics/dashboard` | `/analytics` | admin | `modules/analytics` |
| N-02 | Series mensuales | Evolución mes a mes | `GET /api/analytics/monthly` | `/analytics` | admin | `modules/analytics` |
| N-03 | Top médicos | Ranking por número de citas | `GET /api/analytics/top-doctors` | `/analytics` | admin | `modules/analytics` |
| N-04 | Tasa de no-show | `no_show` sobre el total de citas | `GET /api/analytics/no-shows` | `/analytics` | admin | `modules/analytics` |
| N-05 | Diagnósticos más frecuentes | Top por código CIE-10 | `GET /api/analytics/diagnoses` | `/analytics` | admin | `modules/analytics` |
| N-06 | Demanda por horário | Heurística. **No hay módulo ML** | `GET /api/analytics/demand` | `/analytics` | admin | `README` §15 |
| N-07 | Anomalías vitales | Signos fuera de rango | `GET /api/analytics/vitals-anomalies` | `/analytics` | admin | `modules/analytics` |
| N-08 | KPIs del médico | `/analytics` → `my-stats` | `GET /api/analytics/my-stats` | `/panel` | doctor | `99` |
| N-09 | Stats del tenant | Filtrado por `tenant_id` | transversal | `/analytics` | admin | `RLS` |
| N-10 | `SuperAdminAnalyticsPage` | **787 líneas no enrutadas.** `/analytics` usa `AdminAnalyticsPage` | — | — | superadmin | 99 |
| N-11 | Generar reporte | `status`: `generating`, `completed`, `failed` | `POST /api/reports` | `/reports` | lab_tech | `init.sql:636` |
| N-12 | Descargar PDF del reporte | Descarga del archivo generado | `GET /api/reports/:id/pdf` | `/reports` | lab_tech | `modules/reports` |
| N-13 | Exportar CSV | Descarga de los datos del reporte | `GET /api/reports/:id/export?format=csv` | `/reports` | lab_tech | `modules/reports` |
| N-14 | Exportar JSON | Ídem en JSON | `GET /api/reports/:id/export?format=json` | `/reports` | lab_tech | `modules/reports` |
| N-15 | Listar reportes | Los del tenant | `GET /api/reports` | `/reports` | lab_tech | `modules/reports` |
| N-16 | `reports.status` sin CHECK | Acepta valores arbitrarios | `POST /api/reports` | `/reports` | lab_tech | `README` §15.13 |
| N-17 | Analytics como lab_tech | El sidebar muestra Analíticas y Reportes a `lab_technician` | — | sidebar | lab_tech | `navigation.tsx` |
| N-18 | Analytics sin feature gate | **`analytics` no está en el feature gating** | `GET /api/analytics/*` | `/analytics` | cualquiera | análisis de módulos |
| N-19 | Métricas de tenant | Ocupación, revenue, growth, churn | `GET /api/super-admin/analytics/*` | `/saas` | superadmin | `SuperAdminDashboardPage` |
| N-20 | Health score del tenant | Ranking de clínicas | `GET /api/super-admin/tenants/health` | `/saas` | superadmin | `modules/super-admin` |

---

## 18. Auditoría y trazabilidad → `26-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| D-01 | Listar auditoría | Filtros por usuario, acción, fecha, entidad | `GET /api/audit` | `/audit` | superadmin | `modules/audit` |
| D-02 | Detalle de un evento | `old_values` y `new_values` en JSONB | `GET /api/audit/:id` | `/audit` | superadmin | `audit_logs` |
| D-03 | Cadena HMAC encadenada | `hash`/`previous_hash` VARCHAR(64) | `GET /api/audit` | `/audit` | superadmin | `init.sql` |
| D-04 | Verificar la cadena | Un job comprueba que la cadena no se rompió | `GET /api/audit/verify` | `/audit` | superadmin | `R-08` |
| D-05 | `user_id` SET NULL | El log sobrevive al borrado del usuario | — | `/audit` | superadmin | `init.sql` |
| D-06 | `ip_address` INET | La IP del actor | `GET /api/audit` | `/audit` | superadmin | `init.sql` |
| D-07 | Auditoría de seguridad | Trigger en `users`: loguea cambios de password, role, active, blocked_until, totp_enabled | — | `/audit` | superadmin | `security.sql:260` |
| D-08 | Solo en cambios reales | En UPDATE, el trigger compara antes de insertar | — | `/audit` | superadmin | `security.sql:260` |
| D-09 | Auditoría de PHI | Trigger en `clinical_records`, `invoices`, `payments` | — | `/audit` | superadmin | `security.sql:308` |
| D-10 | PHI sanitizada | En UPDATE solo guarda `id` y `status`, no los datos clínicos | — | `/audit` | superadmin | `security.sql:308` |
| D-11 | `tenant_id = 'system'` | Cuando el `tenant_id` del actor es NULL | — | `/audit` | superadmin | `security.sql:260` |
| D-12 | `X-Correlation-Id` | Toda respuesta lo trae; se propaga a los logs | transversal | — | — | `99` |
| D-13 | `booking_status_history` | **Sin endpoint de lectura.** Solo por `psql` | — | — | — | H-32 |
| D-14 | Contar filas de auditoría | Los triggers añaden filas: los conteos deben incluirlas | `GET /api/audit` | `/audit` | superadmin | `README` §7.3 |

---

## 19. Notificaciones → `27-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| N-01 | Listar notificaciones | Las del usuario autenticado | `GET /api/notifications` | `/notifications` | admin, doctor, lab_tech | `modules/notifications` |
| N-02 | Contar no leídas | El badge debe mostrar **no leídas**, no el total | `GET /api/notifications/unread-count` | campana | todos | H-F4d |
| N-03 | Marcar como leída | `PATCH /api/notifications/:id/read` | `PATCH /api/notifications/:id/read` | `/notifications` | todos | `modules/notifications` |
| N-04 | Marcar todas como leídas | Marca el lote completo | `PATCH /api/notifications/read-all` | `/notifications` | todos | `modules/notifications` |
| N-05 | Tipos de notificación | `info`, `warning`, `success`, `error` | — | `/notifications` | todos | `init.sql:543` |
| N-06 | Enlace de la notificación | `link` lleva a la pantalla relevante | `GET /api/notifications` | `/notifications` | todos | `notifications.link` |
| N-07 | `is_read` | Booleano, no timestamp | `GET /api/notifications` | `/notifications` | todos | `init.sql:543` |
| N-08 | **`patient` excluido** | `/notifications` **no incluye** a `patient` y `user`, los destinatarios reales | `/notifications` | patient | H-F4d |
| N-09 | Sin `updated_at` | La tabla no lo tiene: no se puede ordenar por cambio | `GET /api/notifications` | `/notifications` | todos | `README` §15.6 |
| N-10 | Aviso al entrar en la lista | Notifica al staff | `POST /api/waitlist` | `/bookings` | patient | `99` |
| N-11 | Aviso de cancelación por feriado | Avisa a los pacientes afectados | `POST /api/holidays` | `/holidays` | admin | D-23 |
| N-12 | Aviso de slot liberado | Notifica a la lista de espera | `PATCH /api/waitlist/:id/notify` | — | admin | H-F4b |
| N-13 | Notificaciones de laboratorio | 6 tipos con severidad | `GET /api/laboratory/notifications` | `/laboratory` | lab_tech | `005:72` |
| N-14 | Acuse de notificación de lab | `PATCH /api/laboratory/notifications/:id/ack` | `PATCH /notifications/:id/ack` | `/laboratory` | lab_tech | `99` |
| N-15 | Campana sin paciente | El topbar muestra la campana **solo a no-pacientes** | — | topbar | patient | `DashboardLayout:279` |
| N-16 | SSE actualiza la campana | El evento llega sin recargar | `GET /api/laboratory/events` | `/laboratory` | lab_tech | `99` |

---

## 20. Webhooks e integraciones → `28-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| WHK-01 | Crear suscripción de webhook | URL + eventos + secreto | `POST /api/webhooks/subscriptions` | — | superadmin | `modules/webhooks` |
| WHK-02 | Listar suscripciones | Las del tenant | `GET /api/webhooks/subscriptions` | — | superadmin | `modules/webhooks` |
| WHK-03 | Actualizar suscripción | Cambiar URL, eventos o estado | `PATCH /api/webhooks/subscriptions/:id` | — | superadmin | `modules/webhooks` |
| WHK-04 | Eliminar suscripción | Soft o hard delete | `DELETE /api/webhooks/subscriptions/:id` | — | superadmin | `modules/webhooks` |
| WHK-05 | Eventos disponibles | 6 declarados | `GET /api/webhooks/events` | — | superadmin | `webhooks.service` |
| WHK-06 | **`dispatchEvent` nunca se invoca** | **Los webhooks no emiten nada.** `webhook_deliveries` sin escrituras | — | — | — | `webhooks.service:142` |
| WHK-07 | Firma saliente | `X-Webhook-Signature: sha256=…`. **La firma no cubre el cuerpo** | — | — | — | `webhooks.service:172` |
| WHK-08 | Reintentos | Cola de reintentos con backoff | — | — | — | `modules/queue` |
| WHK-09 | Estado de entrega | `pending`, `delivered`, `failed` | `GET /api/webhooks/deliveries` | — | superadmin | `init.sql:663` |
| WHK-10 | Timeout de entrega | El receptor lento no bloquea | — | — | — | `webhooks.service` |
| WHK-11 | Validación de URL | 400 si la URL no es válida o no es https | `POST /api/webhooks/subscriptions` | — | superadmin | `webhooks.schema` |
| WHK-12 | Webhook de MercadoPago | Re-resuelve el pago. **No valida `x-signature`** | `POST /api/saas/webhooks/mercadopago` | — | externo | `saas.controller:86` |
| WHK-13 | Idempotencia de MP | Reprocesar no duplica | `POST /api/saas/webhooks/mercadopago` | — | externo | `99` |
| WHK-14 | Rate limit de webhooks entrantes | 200 con cuerpo inválido, no 429 | `POST /api/saas/webhooks/mercadopago` | — | externo | `saas.routes` |
| WHK-15 | Aislamiento de suscripciones | Un tenant no ve webhooks de otro | `GET /api/webhooks/subscriptions` | — | superadmin | `RLS` |
| WHK-16 | `webhook_subscriptions` con trigger | `updated_at` automático | `PATCH /api/webhooks/subscriptions/:id` | — | superadmin | `init.sql` |

---

## 21. Adjuntos y exportación → `29-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| R-01 | Listar adjuntos de una entidad | Filtrado por `entity_type` | `GET /api/attachments?entity_type=` | `/clinical-records/:id` | doctor, patient | `AttachmentsList` |
| R-02 | Tipos de entidad | `clinical_record`, `prescription`, `lab_result`, `booking`, `medical_history` | `GET /api/attachments` | `/clinical-records/:id` | doctor | `015:5` |
| R-03 | Subir adjunto | Base64 en el JSON body. **Choca con el `limit` de `express.json`** | `POST /api/attachments` | `/clinical-records/:id` | doctor | 99 |
| R-04 | Descargar adjunto | Recupera el archivo | `GET /api/attachments/:id` | `/clinical-records/:id` | doctor, patient | `modules/attachments` |
| R-05 | Eliminar adjunto | Con permisos de edición | `DELETE /api/attachments/:id` | `/clinical-records/:id` | doctor | `modules/attachments` |
| R-06 | Patient no puede subir | `canManage` exige `clinicalRecords.edit` | `POST /api/attachments` | `/clinical-records/:id` | patient | F-10 |
| R-07 | Adjuntos de lab son stub | `LabRequestDetailPage:71-73` | `GET /api/attachments` | `/laboratory/requests/:id` | lab_tech | H-44 |
| R-08 | Exportar mis datos | Descarga de portabilidad del paciente | `GET /api/export/me` | `/settings` | patient | `99` |
| R-09 | Exportar datos de un paciente | Portabilidad de un paciente, por staff | `GET /api/export/patients/:id` | `/clinical-records/:id` | doctor, admin | `99` |
| R-10 | Contenido de la exportación | JSON con citas, expedientes, recetas, historial, resultados | `GET /api/export/me` | `/settings` | patient | `data-portability` |
| R-11 | Aislamiento de la exportación | Un paciente solo exporta lo suyo | `GET /api/export/me` | `/settings` | patient | `RLS` |
| R-12 | Límite de tamaño | `express.json({limit})` recorta antes del controlador | `POST /api/attachments` | `/clinical-records/:id` | doctor | 99 |
| R-13 | `entity_id` CASCADE | Borrar la entidad borra sus adjuntos | — | — | admin | `attachments` |
| R-14 | Categoría en onboarding | `contract`, `license`, `tax_id`, `constitution`, `logo`, `other` | `POST /api/saas/onboard/documents` | `/contratar` | anónimo | `init.sql:1158` |

---

## 22. Seguridad transversal → `30-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| C-01 | Doble submit CSRF | Cookie `csrf_token` firmada + header `X-CSRF-Token` | todas mutantes | — | todos | `R-05` |
| C-02 | CSRF rejects mismatch | 403 si el header no coincide con la cookie | todas mutantes | — | todos | `csrf.middleware` |
| C-03 | Rutas exentas de CSRF | Login, health, webhooks entrantes | — | — | — | `csrf.middleware` |
| C-04 | Rate limit global | Límite base por tenant | transversal | — | todos | `rateLimit.middleware` |
| C-05 | Rate limit en `/auth` | Endpoints de auth más estrictos | `/api/auth/*` | `/login` | cualquiera | `R-10` |
| C-06 | Rate limit en sesión | Endpoints de sesión | `/api/auth/sessions` | `/settings` | autenticado | `R-10` |
| C-07 | Rate limit en PHI | Endpoints con datos clínicos | `/api/clinical-records/*` | `/clinical` | doctor | `R-10` |
| C-08 | Rate limit en invitado | 5 reservas/hora, 3 lookups/15min | `/api/guest/*` | `/booking` | invitado | H-42 |
| C-09 | Rate limit en onboard | 3/hora por IP | `/api/saas/onboard` | `/contratar` | anónimo | H-52 |
| C-10 | Rate limit en RUT lookup | 3/15 min por IP | `/api/guest/bookings/:rut` | `/booking` | invitado | H-40 |
| C-11 | Endpoints públicos sin rate limit | `available-slots`, `doctors/public`, `specialties` permiten enumerar | varias | — | anónimo | 99 |
| C-12 | Lockout por intentos | 5 intentos → bloqueo temporal | `POST /api/auth/login` | `/login` | cualquiera | `R-11` |
| C-13 | Mensaje de bloqueo | "Cuenta bloqueada" con minutos restantes, no "inválidas" | `POST /api/auth/login` | `/login` | cualquiera | A-25 |
| C-14 | Anti-enumeración en login | Mismo mensaje para email inexistente e incorrecto | `POST /api/auth/login` | `/login` | cualquiera | `A-03` |
| C-15 | Anti-enumeración en reset | Mismo status, cuerpo y **tiempo** | `POST /api/auth/forgot-password` | `/forgot-password` | cualquiera | `R-12` |
| C-16 | Helmet + CSP | CSP, HSTS, `noSniff`, `frameguard deny`, `Permissions-Policy` | transversal | — | — | `R-09` |
| C-17 | Validación Zod | `validateZod` en body, params y query | todas | — | — | `R-13` |
| C-18 | `sanitize-html` | Limpieza de HTML en campos de texto libre | todas | — | — | `R-13` |
| C-19 | Validación de RUT | Dígito verificador en registro y reserva | varias | `/register`, `/booking` | cualquiera | `99` |
| C-20 | `validateEnvSecurity` | **Aborta el arranque** si falta un secreto o hay captcha de test en prod | — | — | — | `99` |
| C-21 | Cookie `httpOnly` + `secure` + `sameSite` | Flags correctos en la cookie de sesión | — | — | — | `R-01` |
| C-22 | Refresh hasheado | SHA-256 en BD, nunca el token en claro | `POST /api/auth/refresh` | — | autenticado | `R-01` |
| C-23 | `trust proxy` | Solo rangos privados declarados | transversal | — | — | `src/app.ts:71` |
| C-24 | BOLA fail-closed | Recurso ajeno → 403/404, nunca 200 | transversal | — | todos | `99` |

---

## 23. i18n, tema, accesibilidad y responsive → `31-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| I-01 | 4 idiomas completos | `es`, `en`, `pt`, `fr`. `es` es el fallback | — | transversal | todos | `i18n.ts:11` |
| I-02 | 3 768 claves en `es.json` | 72 namespaces × 4 idiomas | — | — | — | `es.json` |
| I-03 | Cambio de idioma en la UI | `LanguageSwitcher` con banderas. `i18n.changeLanguage` | — | topbar | todos | `LanguageSwitcher:23` |
| I-04 | Persistencia del idioma | `localStorage['lang']` + `navigator` | — | transversal | todos | `i18n.ts:32` |
| I-05 | `<html lang>` reactivo | Se actualiza al cambiar | — | transversal | todos | `i18n.ts:36` |
| I-06 | Namespaces duplicados | `medicalHistory`/`medical_history`, 9 variantes de `superAdmin`, 8 de `lab` | — | — | — | 99 |
| I-07 | Sin claves crudas | Ninguna clave con puntos visible | — | transversal | todos | H-25 |
| I-08 | Texto literal de estados | `LoadingState` → "Cargando..." | — | transversal | todos | `LoadingState:12` |
| I-09 | Texto literal de error | `ErrorState` → "Algo salió mal" / "Intenta de nuevo." | — | transversal | todos | `ErrorState:21` |
| I-10 | Texto literal de 403 | "Acceso denegado" / "No tienes permisos para acceder a este recurso." | — | transversal | todos | `ErrorState:26` |
| I-11 | Texto literal de 404 | "No encontrado" / "El recurso que buscas no existe o fue eliminado." | — | transversal | todos | `ErrorState:31` |
| I-12 | Texto literal de premium | "Esta funcionalidad no está disponible en tu plan actual." | — | premium | todos | `PremiumLocked:38` |
| I-13 | Texto literal de 404 page | "Página no encontrada" / "Volver al inicio" | — | `*` | cualquiera | `NotFoundPage:32` |
| I-14 | Tema claro/oscuro | Atributo `data-theme` en `<html>`. **No es clase CSS** | — | topbar | todos | `ThemeProvider:338` |
| I-15 | Persistencia del tema | `localStorage['theme_mode']` = `light`/`dark` | — | transversal | todos | `ThemeProvider:16` |
| I-16 | Respetar `prefers-color-scheme` | Valor inicial del tema | — | — | — | `ThemeProvider:16` |
| I-17 | Colores del tema | primary `#0d9488`, secondary `#6366f1` | — | transversal | todos | `ThemeProvider` |
| I-18 | Responsive escritorio | Sidebar 260 px abierta / 72 px colapsada. Topbar 64 px | — | transversal | todos | `DashboardLayout` |
| I-19 | Responsive móvil | Breakpoint `down('md')` = < 900 px. Sidebar a drawer | — | transversal | todos | `DashboardLayout:45` |
| I-20 | `PatientLayout` sin usar | 179 líneas no enrutadas | — | — | patient | 99 |
| I-21 | `AuthLayout` sin usar | 20 líneas no enrutadas | — | — | cualquiera | 99 |
| I-22 | `role: 'user'` normalizado | A `patient` en `role.utils.ts` y en la navegación | — | transversal | user | `navigation.tsx:92` |
| I-23 | Accesibilidad del selector de idioma | `aria-label` = "Idioma" | — | topbar | todos | `settings.language` |
| I-24 | `aria-label` del 2FA | "Código de verificación de 6 dígitos" | — | `/2fa` | cualquiera | `TwoFAPage:50` |

---

## 24. Rendimiento y operación → `32-`

| # | Función | Comportamiento esperado | Endpoint | Ruta | Rol | Fuente |
|---|---|---|---|---|---|---|
| F-01 | Health check | 200 con `status`, `uptime`, `version` | `GET /api/health` | — | anónimo | `99` |
| F-02 | Liveness probe | Chequea la conexión a la BD | `GET /health/live` | — | anónimo | `99` |
| F-03 | `/api/health/live` no montado | Está en la lista de rate-limit skip pero **no existe**. 404 | `GET /api/health/live` | — | anónimo | H-45 |
| F-04 | Métricas Prometheus | `http_request_duration_seconds` | `GET /metrics` | — | — | `99` |
| F-05 | Métricas con token | `METRICS_TOKEN` protegido. **Falta en `.env.example`** | `GET /metrics` | — | — | 99 |
| F-06 | `X-Correlation-Id` | Se genera, se propaga, se loguea | transversal | — | — | `99` |
| F-07 | Sentry | `SENTRY_DSN` + `SENTRY_RELEASE` | transversal | — | — | `99` |
| F-08 | Cola de trabajos persistente | Tabla `jobs` + `enqueueJob` + `registerWorker` | — | — | — | `99` |
| F-09 | `jobs.status` sin CHECK | VARCHAR libre: acepta valores arbitrarios | — | — | — | `README` §15.13 |
| F-10 | Job de recordatorios | `reminder.job.ts` vía cola. 24 h y 1 h antes | — | — | — | `99` |
| F-11 | Job de suscripciones vencidas | `handlePastDueSubscriptions` **implementado pero no programado** | — | — | — | S-09 |
| F-12 | Verificación de cadena de auditoría | Job que comprueba el HMAC encadenado | `GET /api/audit/verify` | `/audit` | superadmin | `R-08` |
| F-13 | Migraciones al arranque | Runner sobre la tabla `_migrations` | — | — | — | `99` |
| F-14 | 31 migraciones | `001`–`031`. 20 esquema, 5 seguridad, 5 performance, 1 token family | — | — | — | `db/migrations` |
| F-15 | CI/CD | GitHub Actions: audit, typecheck, test, build | — | — | — | `99` |
| F-16 | Backups | `backup.yml` diario 02:00 UTC a S3 | — | — | — | `99` |

---

## 25. Índice de verificación rápida

> Para una función dada, la ruta más corta a su caso:

| Pregunta | Dónde mirar |
|---|---|
| ¿Qué hace esta función? | La columna **Comportamiento esperado** de su área |
| ¿Dónde se ejecuta? | La columna **Área** → nombre del archivo |
| ¿Qué código la define? | La columna **Fuente** |
| ¿Está rota ya? | `90-HALLAZGOS-CODIGO.md`, buscando el `H-NN` citado |
| ¿Qué se necesita antes? | `01-RUTA-DE-PRUEBAS.md` §8 (grafo de dependencias) |
| ¿Con qué frecuencia? | `01-RUTA-DE-PRUEBAS.md` §10 |
| ¿Quién la puede probar? | `01-RUTA-DE-PRUEBAS.md` §9 (matriz por rol) |
| ¿Qué falta cobrir? | `99-HUECOS-COBERTURA.md` |

---

*Catálogo construido sobre 24 módulos backend, ~220 endpoints, 60+ rutas de UI, 31 migraciones,
48 tablas y 3 768 claves i18n. Última revisión: 2026-10-01.*
