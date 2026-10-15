# SUB-5 — Inventario de archivos

## Backend (propios)

| Archivo | LOC | ID | Tipo | Entry/Exit |
|---|---|---|---|---|
| `src/modules/doctor/doctor.routes.ts` | 39 | MOD-b-doctor-route | Router | importado por `app.ts:42`, montado `app.ts:266` |
| `src/modules/doctor/doctor.controller.ts` | 78 | MOD-b-doctor-controller | Controllers | importado por `doctor.routes.ts:2` |
| `src/modules/doctor/doctor.service.ts` | 361 | MOD-b-doctor-service | Service+SQL | importado por `doctor.controller.ts:1` y `auth.*` |
| `src/modules/doctor/doctor.schema.ts` | 35 | MOD-b-doctor-schema | Zod schemas | importado por `doctor.routes.ts:15` |
| `src/modules/doctor/doctor.email.ts` | 87 | MOD-b-doctor-email | Templates | importado por `doctor.service.ts:4` |

## Backend (consumidos)

| Archivo | LOC | ID | Rol respecto a SUB-5 | Evidencia |
|---|---|---|---|---|
| `src/modules/auth/auth.routes.ts` | 28 | MOD-b-auth-route | `GET /invite-info`, `POST /register` | `:11-12` |
| `src/modules/auth/auth.controller.ts` | 206 | MOD-b-auth-controller | `register` (body `tenant_id`), `inviteInfo` | `:46-58` |
| `src/modules/auth/auth.service.ts` | 962 | MOD-b-auth-service | `register` (rol por invitación / `patient`) | `:135-213` |
| `src/modules/auth/auth.schema.ts` | 50 | MOD-b-auth-schema | `registerSchema` (incl. `tenant_id`, `invite_token`) | `:11-19` |
| `src/modules/super-admin/super-admin.routes.ts` | 39 | MOD-b-sa-route | `/users`, `/users/:userId/active` | `:25-26` |
| `src/modules/super-admin/super-admin.controller.ts` | 159 | MOD-b-sa-controller | `listUsers`, `toggleUserActive`, `adminCreateTenant` | `:90-108` |
| `src/modules/super-admin/super-admin.service.ts` | 815 | MOD-b-sa-service | `listUsers` (`:216-276`), `setUserActive` (`:278-285`), `deleteTenant` (`:190-207`), `adminCreateTenant` (`:782-855`) | — |
| `src/shared/rut.ts` | 37 | SVC-rut | Validación/formato RUT Chile | `doctor.service.ts:10` |
| `src/shared/ownership.ts` | 58 | SVC-ownership | Pertenencia paciente↔tenant (`role IN ('user','patient')`) | `:54` |
| `src/shared/email.service.ts` | 158 | SVC-email | `sendEmail` (SendGrid) | `doctor.service.ts:3` |
| `src/shared/jwt.service.ts` | 34 | SVC-jwt | `signInvite`/`verify` (invite y setup-password) | `doctor.service.ts:5` |
| `src/middlewares/auth.middleware.ts` | 165 | MW-auth | `authMiddleware`, `authorize` | `doctor.routes.ts:13` |
| `src/middlewares/tenant.middleware.ts` | 91 | MW-tenant | `PUBLIC_PATHS` (`/api/doctors/public`, `/api/auth/register`), `req.tenant_id` | `:16-33` |

## Frontend

| Archivo | LOC | ID | Tipo |
|---|---|---|---|
| `frontend/src/modules/users/services/user.service.ts` | 83 | MOD-f-user-service | Service (`/doctors/users`, toggle, registerDoctor, invite) |
| `frontend/src/modules/users/hooks/useUsers.ts` | 52 | MOD-f-user-hooks | Hooks (list, registerDoctor, invite, toggle) |
| `frontend/src/modules/users/pages/UsersPage.tsx` | 239 | MOD-f-users-page | Página |
| `frontend/src/modules/users/components/UserFormDialog.tsx` | 281 | MOD-f-user-form | Diálogo alta/invitación |
| `frontend/src/modules/users/components/UserDetailDialog.tsx` | 115 | MOD-f-user-detail | Detalle |
| `frontend/src/modules/users/components/UserFilters.tsx` | 122 | MOD-f-user-filters | Filtros (rol/estado/búsqueda) |
| `frontend/src/modules/users/components/UserRow.tsx` | 147 | MOD-f-user-row | Fila |
| `frontend/src/modules/users/components/UsersStats.tsx` | 149 | MOD-f-users-stats | Métricas |
| `frontend/src/modules/users/components/UserStatusChip.tsx` | 43 | MOD-f-user-status | Chip estado |
| `frontend/src/modules/users/components/UserVisuals.tsx` | 157 | MOD-f-user-visuals | Visuales |
| `frontend/src/modules/users/types/user.types.ts` | 48 | MOD-f-user-types | Tipos |
| `frontend/src/modules/patients/services/patient.service.ts` | 82 | MOD-f-patient-service | Service (2 queries `role=user`+`patient`, merge en cliente) |
| `frontend/src/modules/patients/hooks/usePatients.ts` | 17 | MOD-f-patient-hooks | Hook |
| `frontend/src/modules/patients/pages/PatientsPage.tsx` | 199 | MOD-f-patients-page | Página |
| `frontend/src/modules/patients/types/patient.types.ts` | 19 | MOD-f-patient-types | Tipos |
| `frontend/src/modules/doctors/services/doctor.service.ts` | 79 | MOD-f-doctor-service | Service (`/doctors`; métodos a endpoints 404) |
| `frontend/src/modules/doctors/hooks/useDoctors.ts` | 91 | MOD-f-doctor-hooks | Hooks (detail/stats/schedule invocan 404) |
| `frontend/src/modules/doctors/pages/DoctorsPage.tsx` | 453 | MOD-f-doctors-page | Página |
| `frontend/src/modules/doctors/pages/DoctorPanel.tsx` | 270 | MOD-f-doctor-panel | Panel de doctor |
| `frontend/src/modules/doctors/pages/DoctorPatientHistoryPage.tsx` | 172 | MOD-f-doctor-history | Historia del paciente |
| `frontend/src/modules/doctors/components/DoctorCard.tsx` | 176 | MOD-f-doctor-card | Tarjeta |
| `frontend/src/modules/doctors/components/DoctorFormDialog.tsx` | 298 | MOD-f-doctor-form | Diálogo crear/editar |
| `frontend/src/modules/doctors/components/InviteDoctorDialog.tsx` | 172 | MOD-f-doctor-invite | Diálogo invitar |
| `frontend/src/modules/auth/pages/RegisterPage.tsx` | — | MOD-f-register-page | Auto-registro/invitación (`/register?invite=`) |

## Tablas

`users`, `doctors`, `doctor_availability` (+ referencias: `tenants`, `refresh_tokens`, `password_reset_tokens`). **No hay tabla `patients`** (`db/init.sql:25-71`).

## Dependencias npm relevantes

`bcrypt` (hash de contraseñas y temp password), `crypto` (generación de contraseña temporal), `jsonwebtoken` vía `jwtManager`, `zod`, `express`, `@sendgrid/mail` (vía `email.service`). Frontend: `@tanstack/react-query`, `react-hook-form` + `zod`, `axios`.

## Variables de entorno

`FRONTEND_URL` / `RENDER_EXTERNAL_URL` (enlaces de email), `DEFAULT_TENANT_ID`, `ADMIN_EMAIL` (reset admin). `JWT_*` para `signInvite`.
