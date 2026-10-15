# SUB-5 — Módulos y capas

| ID | Unidad | Tipo | Archivo | Responsabilidad | LOC |
|---|---|---|---|---|---|
| SUB5-U1 | doctor.routes | Route | `src/modules/doctor/doctor.routes.ts` | 9 rutas de doctores + usuarios del tenant (auth/rol, `validateZod`) | 39 |
| SUB5-U2 | doctor.controller | Controller | `src/modules/doctor/doctor.controller.ts` | Handlers de doctores, invitación, usuarios; `asyncHandler` | 78 |
| SUB5-U3 | doctor.service | Service | `src/modules/doctor/doctor.service.ts` | Alta doctor/usuario, invitación, `listTenantUsers`, `toggleUserActive`, `verifyInviteToken` | 361 |
| SUB5-U4 | doctor.schema | Schema (Zod) | `src/modules/doctor/doctor.schema.ts` | `registerDoctor`, `createDoctor`, `updateDoctor`, `invitePerson` (`.strict()`) | 35 |
| SUB5-U5 | doctor.email | Templates | `src/modules/doctor/doctor.email.ts` | `doctorCredentialsEmail`, `invitationEmail` (`escapeHtml`) | 87 |
| SUB5-U6 | auth.register | Controller+Service (SUB-2) | `src/modules/auth/{auth.controller,auth.service}.ts` | Alta de usuario y consumo de `invite_token` | 58 / 962 |
| SUB5-U7 | super-admin users | Controller+Service (SUB-11) | `src/modules/super-admin/{super-admin.controller,super-admin.service}.ts` | `listUsers`/`setUserActive`/`deleteTenant`/`adminCreateTenant` (global) | 159 / 815 |
| SUB5-U8 | rut | Shared | `src/shared/rut.ts` | `cleanRut`, `validateRut`, `formatRut` | 37 |
| SUB5-U9 | ownership | Shared | `src/shared/ownership.ts` | Verificación paciente/usuario↔tenant (rol `user`/`patient`) | 58 |
| SUB5-U10 | email.service | Shared | `src/shared/email.service.ts` | `sendEmail` (SendGrid) para bienvenida/invitación | 158 |
| SUB5-U11 | frontend users | Frontend | `frontend/src/modules/users/*` | Página, hooks y componentes de usuarios; `user.service` | — |
| SUB5-U12 | frontend patients | Frontend | `frontend/src/modules/patients/*` | Listado de pacientes (`patient.service` combina dos roles) | — |
| SUB5-U13 | frontend doctors | Frontend | `frontend/src/modules/doctors/*` | Doctores: página, panel, ficha de paciente, hooks/service | — |

## Patrón de capas (backend)

`doctor.routes.ts` (auth/rol + `validateZod`) → `doctor.controller.ts` (`asyncHandler`) → `doctor.service.ts` (SQL inline + transacciones). Sin capa `repository/`. El alta de usuario cruza a `auth.service.register` (por invitación) y la gestión global a `super-admin.service`.

## Tipos clave

- `DoctorInput`, `CreateDoctorInput`, `Doctor` (`doctor.service.ts:15-37`).
- `InvitePersonInput` (`doctor.service.ts:249-254`).
- Frontend `User`, `CreateUserInput`, `InviteUserInput`, `UserListParams` (`users/types/user.types.ts:5-48`); `Patient`, `PatientListParams` (`patients/types/patient.types.ts`).

## Notas

- **SUB5-U3** (361 L) concentra creación de usuarios/doctores, invitación, listado paginado y toggle de actividad; genera contraseña temporal con `crypto.randomInt`.
- **SUB5-U7** duplica la gestión de usuarios con contrato y alcance distintos a `/api/doctors/users` (FND-I10).
- No hay endpoints dedicados de "pacientes"; el frontend los deriva de `/api/doctors/users` filtrando por rol (FND-I6).
- La tabla `users` es la raíz de identidad; `doctors` es una extensión 1:1 (`user_id`).
