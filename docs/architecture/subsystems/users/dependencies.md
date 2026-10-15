# SUB-5 — Dependencias

## Aristas internas (backend)

| Origen | → Destino | Tipo | Evidencia |
|---|---|---|---|
| `doctor.routes` | `doctor.controller` | import | `doctor.routes.ts:2-12` |
| `doctor.routes` | `auth.middleware` (`authMiddleware`,`authorize`) | import | `doctor.routes.ts:13` |
| `doctor.routes` | `validate.middleware` (`validateZod`) | import | `doctor.routes.ts:14` |
| `doctor.controller` | `doctor.service` | call | `doctor.controller.ts:1,7,13,18,28,39,47,52,57,69,75` |
| `doctor.service` | `shared/db` (`pool`,`readPool`) | query | `doctor.service.ts:1` |
| `doctor.service` | `shared/email.service` (`sendEmail`) | call | `doctor.service.ts:3,122,276` |
| `doctor.service` | `doctor.email` | import | `doctor.service.ts:4` |
| `doctor.service` | `shared/jwt.service` (`jwtManager`) | call | `doctor.service.ts:5,117,269,291` |
| `doctor.service` | `shared/rut` | call | `doctor.service.ts:10,72-74` |
| `doctor.service` | `specialties.service` (`ensureSpecialty`) | call | `doctor.service.ts:11,66,155` |
| `auth.controller` | `doctor.service` (`verifyInviteToken`) | call | `auth.controller.ts:5,51` |
| `auth.service` | `doctor.service` (`verifyInviteToken`) | call | `auth.service.ts:6,145` |
| `super-admin.controller` | `super-admin.service` (`listUsers`,`setUserActive`) | call | `super-admin.controller.ts:90-108` |
| `super-admin.service` | `shared/db` (`superAdminPool`) | query | `super-admin.service.ts:249,279` |

## Aristas frontend

| Origen | → Destino | Tipo | Evidencia |
|---|---|---|---|
| `users/services/user.service` | `apiClient` (`/doctors/users`,`/doctors/register`,`/doctors/invite`) | HTTP | `user.service.ts:43,56,62,80` |
| `patients/services/patient.service` | `apiClient` (`/doctors/users` ×2 roles) | HTTP | `patient.service.ts:45,52-55` |
| `doctors/services/doctor.service` | `apiClient` (`/doctors`, `/doctors/public`, `/doctors/register`, `/doctors/:id`…) | HTTP | `doctor.service.ts:15,38,43,48,58,66,71,76` |
| `RegisterPage` | `apiClient` (`/auth/invite-info`, `/auth/register`) | HTTP | `RegisterPage.tsx:102,121` |

## Depende de

- **SUB-2 (auth):** `authMiddleware`/`authorize`/`validateZod`; alta de usuario por invitación (`register`+`verifyInviteToken`); `registerDoctor` genera `setup-password` y `invite` con `jwtManager`.
- **SUB-11 (billing/SaaS):** gestión cross-tenant de usuarios (`super-admin.service`); `adminCreateTenant` crea el `admin`.
- **SUB-3 (multi-tenancy):** `req.tenant_id`, unicidad `(tenant_id,email)`, `PUBLIC_PATHS` (`/api/doctors/public`, `/api/auth/register`).
- **SUB-4 (seguridad):** RUT, sanitización de emails HTML (`escapeHtml`), limiters.
- **SUB-15 (BD):** tablas `users`, `doctors`, `doctor_availability`.
- **SUB-6 (booking) / SUB-7 (clinical) / SUB-8 (lab):** consumen `users`/`doctors` (`getDoctorByUserId`, `patient_id`).
- **Especialidades:** `ensureSpecialty` (auto-crea especialidad al dar de alta doctor).

## Es dependido por

- **Frontend:** `users`, `patients`, `doctors` (páginas, panel de doctor, ficha de paciente), `register` (invitación).
- **`billing`/`attachments`:** validan `patient_id` como `users.id` con rol `user`/`patient`.
- **Todos los módulos de negocio** que referencian `doctors.id`/`users.id`.

## Acoplamientos y problemas detectables

- **Enlace de setup sin consumidor** (FND-I1): `doctor.service` emite `purpose='setup-password'` que nadie verifica; rompe el onboarding de doctores creados por API.
- **Contrato frontend↔backend desalineado** (FND-I2/I3): el frontend llama endpoints de doctor inexistentes (`GET /:id`, `/:id/stats`, `/:id/schedule`, `POST /:id/invite`).
- **Validación cross-tenant global** en `registerDoctor` (FND-I4): consulta `users` por email/RUT sin `tenant_id`.
- **Duplicación de gestión de usuarios** entre `doctor` y `super-admin` (FND-I10), con alcance distinto.
- **Frontend "pacientes"** no corresponde a una entidad backend: `patientService` combina dos consultas y filtra en cliente (FND-I6).
