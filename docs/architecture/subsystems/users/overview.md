# SUB-5 — Usuarios, doctores y pacientes

> **Estado:** descripción AS-IS completada · **Certeza global:** confirmado (lectura de código).
> **Evidencia principal:** `src/modules/doctor/*`; consumo de registro/invitación en `src/modules/auth/{auth.routes,auth.controller,auth.service,auth.schema}.ts`; gestión cross-tenant en `src/modules/super-admin/*`; `src/shared/{rut.ts,ownership.ts}`; frontend `frontend/src/modules/{users,patients,doctors}/*`.
> **Pregunta abierta #1 resuelta:** **no existe** un módulo backend `users` ni `patients`. Los **carecen de endpoints dedicados**: la identidad vive en la tabla `users` (con `role`), el CRUD de personas se reparte entre `doctor` (tenant-scoped) y `super-admin` (global), y los "pacientes" son `users` con `role IN ('user','patient')`.

## 1. Propósito

Gestionar las **personas** del sistema y sus identidades:

- **Usuarios** (`users`): credenciales y perfil base de cualquier actor (`superadmin`, `admin`, `doctor`, `lab_technician`, `patient`, `user`, `guest`).
- **Doctores** (`doctors`): ficha profesional (especialidad, `user_id`, disponibilidad) ligada 1:1 a un `users` de rol `doctor`.
- **Pacientes**: **no** son una entidad propia; son `users` con `role = 'user'` (legacy) o `'patient'`, referenciados como `patient_id` en citas/fichas/laboratorio.

El subsistema cubre: **creación de doctores** (directa con contraseña temporal o por invitación), **invitación de personas** (paciente/doctor/técnico) por email, **auto-registro público** de pacientes, **listado/activación-desactivación de usuarios** del tenant y **gestión global de usuarios** por el SuperAdmin.

## 2. Componentes

| Capa | Módulo | Rol |
|---|---|---|
| HTTP tenant | `doctor.routes/controller/service` | Doctores del tenant + listado/toggle de usuarios (`/api/doctors/users`) |
| Emails | `doctor.email.ts` | Plantillas de bienvenida (setup-password) e invitación |
| Identidad | `auth.routes/controller/service` (SUB-2) | `POST /auth/register` (auto-registro/invitación) y `GET /auth/invite-info` |
| Cross-tenant | `super-admin.routes/controller/service` (SUB-11) | Listado y activación de usuarios de **todos** los tenants |
| Compartido | `shared/rut.ts`, `shared/ownership.ts` | Validación RUT Chile; verificación de pertenencia paciente↔tenant |

## 3. Superficie HTTP (`API_PREFIX = /api`)

### 3.1 Doctores y usuarios del tenant — `src/modules/doctor/doctor.routes.ts` (montado en `app.ts:266`)

| Método | Ruta | Auth/rol | Notas |
|---|---|---|---|
| POST | `/api/doctors/register` | `admin` | Crea `users`(doctor) + `doctors` + disponibilidad; envía email con enlace `/setup-password` (**roto**, FND-I1) |
| POST | `/api/doctors/invite` | admin, superadmin | Envía invitación (paciente/doctor/lab_technician) por email; no crea usuario |
| GET | `/api/doctors` | admin, superadmin, doctor | Lista doctores del tenant |
| GET | `/api/doctors/public` | **público** (sin auth) | `{id,name,specialty}`; cache 60s; `PUBLIC_PATHS` |
| POST | `/api/doctors` | admin, superadmin | Crea ficha `doctors` para un `user_id` existente (rol doctor) |
| PATCH | `/api/doctors/:id` | admin, superadmin | Solo `name`/`specialty` |
| GET | `/api/doctors/me` | `doctor` | Ficha propia (por `user_id`) |
| GET | `/api/doctors/users` | admin, superadmin, **doctor** | Lista **todos** los usuarios del tenant (FND-I5) |
| PATCH | `/api/doctors/users/:userId/active` | admin, superadmin | Activa/desactiva usuario del tenant |

> **Rutas inexistentes pero consumidas por el frontend:** `GET /api/doctors/:id`, `GET /api/doctors/:id/stats`, `GET /api/doctors/:id/schedule` y `POST /api/doctors/:id/invite` → **404** (FND-I2, FND-I3).

### 3.2 Identidad (registro/invitación) — `src/modules/auth/auth.routes.ts` (SUB-2, montado en `app.ts:265`)

| Método | Ruta | Auth/rol | Notas |
|---|---|---|---|
| GET | `/api/auth/invite-info` | **público** | Devuelve `{email,name,role,specialty,tenant_id}` de un `invite_token` |
| POST | `/api/auth/register` | **público** + `authLimiter` | Alta de usuario; con `invite_token` hereda rol/tenant; sin él → `role='patient'` y `tenant_id` del body/header (FND-A7) |

### 3.3 SuperAdmin (global) — `src/modules/super-admin/super-admin.routes.ts` (SUB-11, montado en `app.ts:282`)

| Método | Ruta | Auth/rol | Notas |
|---|---|---|---|
| GET | `/api/super-admin/users` | `superadmin` | Lista usuarios de todos los tenants (filtros `tenant_id`, `role`, `search`) |
| PATCH | `/api/super-admin/users/:userId/active` | `superadmin` | Activa/desactiva usuario, acotado a `req.tenant_id` (FND-I9) |

## 4. Roles/actores

- **admin** (tenant): crea/invita doctores y personas, lista y activa/desactiva usuarios de su clínica.
- **doctor**: ve la lista de doctores, su propia ficha (`/me`) y —por FND-I5— **todos** los usuarios del tenant.
- **superadmin**: gestión global de usuarios cross-tenant.
- **patient/user**: gestionados; no tienen endpoints de autoedición de perfil (solo `2FA`, `change-password`, `logout`).
- **Público**: `/doctors/public`, auto-registro (`/auth/register`) e info de invitación.

## 5. Acceso a datos

- **`pool`** (RLS, dentro de request): altas de `users`/`doctors`, `UPDATE users ... active`.
- **`readPool`** (RLS): lecturas de listados (`getAllDoctors`, `listTenantUsers`, `getDoctorByUserId`).
- **`superAdminPool`** (BYPASSRLS): `listUsers`/`setUserActive`/`deleteTenant`/`adminCreateTenant` en `super-admin` (cross-tenant).
- **Tablas propias:** `users`, `doctors`, `doctor_availability`. Relacionadas: `tenants`, `refresh_tokens`, `password_reset_tokens`.
- **No existe** tabla `patients`: los pacientes se consultan como `users` con `role IN ('user','patient')` (p. ej. `ownership.ts:54`, `billing.service.ts:88`, `attachments.service.ts:66`).

## 6. Integraciones y reglas

- **Email (SendGrid):** `sendEmail` con `doctorCredentialsEmail` (enlace `/setup-password`, **roto**) e `invitationEmail` (enlace `/register?invite=`). 
- **JWT de invitación:** `jwtManager.signInvite(payload,'7d')` con `purpose='invite'`; consumido por `auth.register`/`auth.inviteInfo` vía `verifyInviteToken`.
- **JWT de setup:** `signInvite({id}, '24h')` con `purpose='setup-password'`; **sin consumidor** (FND-I1).
- **RUT Chile:** `cleanRut`/`validateRut`/`formatRut` (`shared/rut.ts`).
- **Multi-tenancy:** unicidad `(tenant_id,email)` (`idx_users_tenant_email`); `registerDoctor` valida email/RUT **globalmente** por error (FND-I4).

## 7. Findings de SUB-5 (ver `05-findings.md`, FND-I1…I12)

Destacan: **FND-I1 🔴** (enlace de bienvenida de doctor sin consumidor → el doctor no puede iniciar sesión), **FND-I2 🟡** (invitación de doctor por id → 404), **FND-I3 🟡** (endpoints `GET /doctors/:id|/stats|/schedule` → 404), **FND-I4 🟡** (validación de email/RUT global en `registerDoctor`), **FND-I5 🟡** (`/doctors/users` expone todos los usuarios del tenant a doctores).
Se resuelve además la pregunta pendiente **FND-A7** (inyección de `tenant_id` en `register` → confirmada).

## 8. Notas de NO VERIFICADO

- Si el enlace `/setup-password` funcionó en alguna versión anterior del frontend (posible regresión).
- Si existe un proceso operativo (manual/script) que asigne contraseñas a doctores creados por `/doctors/register` (por lo demás, FND-I1 los deja sin acceso).
- Efecto real del RLS sobre `users` para `role='doctor'` en el listado (Fase 10).
- Cobertura de tests de las rutas del frontend roto (`useInviteDoctor`, `patientService`).
