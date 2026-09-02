# Referencia de API

> Todos los endpoints expuestos por el backend. Prefijo base: `/api`.
> ~204 endpoints en total (202 routers de módulos + `/health` y `/api/health`).

## Auth — `/api/auth`

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| GET | `.well-known/jwks.json` | ❌ | - | JWKS public key |
| GET | `invite-info` | ❌ | - | Info de invitación |
| POST | `register` | ❌ | - | Registro de usuario |
| POST | `login` | ❌ | - | Login (soporta 2FA) |
| POST | `refresh` | ❌ | - | Refresh token |
| POST | `logout` | ❌ | - | Logout |
| POST | `logout-all` | ✅ | - | Logout en todos los dispositivos |
| GET | `sessions` | ✅ | - | Listar sesiones activas |
| DELETE | `sessions/:id` | ✅ | - | Revocar una sesión |
| POST | `change-password` | ✅ | - | Cambio de contraseña |
| POST | `2fa/enable` | ✅ | - | Activar 2FA |
| POST | `2fa/verify` | ✅ | - | Verificar código 2FA |
| POST | `2fa/disable` | ✅ | - | Desactivar 2FA |
| POST | `forgot-password` | ❌ | - | Solicitar reset |
| POST | `reset-password` | ❌ | - | Resetear contraseña |
| POST | `reset-admin` | ❌ | - | Reset admin |

## Doctors — `/api/doctors`

| Método | Ruta | Auth | Roles | Descripción |
|--------|------|------|-------|-------------|
| GET | `public` | ❌ | - | Lista pública (cache 60s) |
| GET | `/` | ✅ | admin, superadmin | Lista doctores |
| POST | `/` | ✅ | admin, superadmin | Crear doctor |
| POST | `register` | ✅ | admin | Registrar doctor |
| POST | `invite` | ✅ | admin, superadmin | Invitar doctor |
| GET | `me` | ✅ | doctor | Perfil propio |
| GET | `users` | ✅ | admin, superadmin | Lista usuarios |
| PATCH | `users/:userId/active` | ✅ | admin, superadmin | Toggle activo |

## Bookings — `/api/bookings`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/` | ✅ | Crear reserva |
| GET | `me` | ✅ | Mis reservas |
| DELETE | `:id` | ✅ | Cancelar reserva |
| GET | `available-slots` | ❌ | Slots disponibles |
| GET | `doctor/daily-density` | doctor | Densidad diaria |
| GET | `doctor` | doctor | Agenda del doctor |
| GET | `all` | admin | Todas las reservas |

## Availability — `/api/availability`

| Método | Ruta | Auth | Roles |
|--------|------|------|-------|
| GET | `me` | ✅ | doctor |
| GET | `:id` | ❌ | - |
| POST | `/` | ✅ | doctor |
| DELETE | `:id` | ✅ | doctor |

## Exceptions — `/api/exceptions`

| Método | Ruta | Auth | Roles |
|--------|------|------|-------|
| GET | `me` | ✅ | doctor |
| POST | `/` | ✅ | doctor |
| DELETE | `:id` | ✅ | doctor |

## Guest — `/api/guest`

| Método | Ruta | Límite | Descripción |
|--------|------|--------|-------------|
| POST | `booking` | 5/hora | Booking sin login |
| GET | `bookings/:rut` | 3/15min | Consultar por RUT |
| DELETE | `booking/:id` | - | Cancelar |

## Clinical Records — `/api/clinical-records`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `cie10/search` | doctor, admin |
| GET | `cie10/categories` | doctor, admin |
| GET | `cie10/:code` | doctor, admin |
| GET | `prescriptions/:id/pdf` | doctor |
| GET | `/` | doctor, admin, user, patient |
| GET | `:id` | doctor, admin, user, patient |
| GET | `:id/lab-results` | doctor, admin, user, patient |
| GET | `patient/:patient_id` | doctor, admin, user, patient |
| POST | `/` | doctor |
| PUT | `:id` | doctor |
| DELETE | `:id` | doctor |
| GET | `:record_id/prescriptions` | doctor, admin |
| POST | `prescriptions` | doctor |
| PUT | `prescriptions/:id` | doctor |
| DELETE | `prescriptions/:id` | doctor |

## Billing — `/api/billing`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/` | admin, doctor, user, patient |
| GET | `stats` | admin, doctor |
| GET | `:id` | admin, doctor, user, patient |
| POST | `/` | admin, doctor |
| PATCH | `:id/status` | admin |
| DELETE | `:id` | admin, doctor |

## Laboratory — `/api/laboratory`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `tests` | Authenticated + feature |
| POST | `tests` | admin, superadmin |
| PUT | `tests/:id` | admin, superadmin |
| DELETE | `tests/:id` | admin, superadmin |
| GET | `/` | Varios |
| GET | `:id` | Varios |
| POST | `/` | admin, doctor |
| PATCH | `:id/status` | admin, superadmin, doctor, lab_technician |
| PATCH | `items/:item_id/result` | admin, superadmin, doctor, lab_technician |
| DELETE | `:id` | admin, doctor |
| GET | `:id/pdf` | Varios |
| GET | `lab/all` | admin, superadmin, lab_technician |
| PATCH | `lab/items/:item_id/status` | admin, superadmin, lab_technician |
| PATCH | `lab/:id/lab-type` | admin, superadmin, lab_technician |

## Analytics — `/api/analytics`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `dashboard` | admin, superadmin |
| GET | `bookings-by-month` | admin, doctor, superadmin |
| GET | `top-doctors` | admin, superadmin |
| GET | `status-distribution` | admin, doctor, superadmin |
| GET | `my-stats` | doctor |
| GET | `no-shows` | admin, superadmin |
| GET | `diagnoses` | admin, superadmin |
| GET | `demand` | admin, superadmin |
| GET | `schedules` | admin, superadmin |
| GET | `vitals` | admin, superadmin |

## Audit — `/api/audit`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/` | admin |

## Specialties — `/api/specialties`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/` | ❌ Público |
| GET | `:id` | ❌ Público |
| POST | `/` | admin, superadmin |
| PUT | `:id` | admin, superadmin |
| DELETE | `:id` | admin, superadmin |

## SaaS — `/api/saas`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `webhook/stripe` | ❌ | Webhook Stripe |
| GET | `plans` | ❌ | Lista de planes |
| POST | `onboard` | 3/hora | Onboarding |
| GET | `features` | ❌ | Features públicas |
| GET | `subscription` | admin, superadmin | Suscripción actual |
| POST | `checkout` | admin, superadmin | Checkout Stripe |
| POST | `change-plan` | admin, superadmin | Cambiar plan |
| POST | `cancel` | admin, superadmin | Cancelar suscripción |
| GET | `usage` | admin, superadmin | Uso del tenant |
| GET | `usage/summary` | admin, superadmin | Resumen de uso |
| GET | `limits` | admin, superadmin | Límites del plan |
| PATCH | `tenant` | admin, superadmin | Actualizar tenant |

## Super Admin — `/api/super-admin`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `stats` | superadmin |
| GET | `analytics/dashboard` | superadmin |
| GET | `analytics/top-tenants` | superadmin |
| GET | `analytics/revenue` | superadmin |
| GET | `analytics/growth` | superadmin |
| GET | `tenants` | superadmin |
| GET | `tenants/:id` | superadmin |
| POST | `tenants` | superadmin |
| PATCH | `tenants/:id` | superadmin |
| DELETE | `tenants/:id` | superadmin |
| GET | `users` | superadmin |
| PATCH | `users/:userId/active` | superadmin |

## Calendar — `/api/calendar`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `doctor/:doctorId/ics` | ❌ Público (exportación ICS de agenda) |

## Clinical Templates — `/api/clinical-templates`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/` | doctor, admin |
| GET | `:id` | doctor, admin |
| POST | `/` | doctor, admin |
| PUT | `:id` | doctor, admin |
| DELETE | `:id` | doctor, admin |

## Data Portability / Export — `/api/export`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `me` | Authenticated (exporta los propios datos GDPR) |
| GET | `patients/:patientId` | admin, doctor, superadmin, patient |

## Holidays — `/api/holidays`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/` | admin, doctor, superadmin |
| POST | `/` | admin, superadmin |
| DELETE | `:id` | admin, superadmin |

## Medical History — `/api/medical-history`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `patient/:patientId` | doctor, admin, user, patient, superadmin |
| GET | `/` | doctor, admin, user, patient, superadmin |
| POST | `/` | doctor, admin, superadmin |
| PATCH | `:id` | doctor, admin, superadmin |

## Notifications — `/api/notifications`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/` | Authenticated |
| GET | `unread-count` | Authenticated |
| PATCH | `read-all` | Authenticated |
| PATCH | `:id/read` | Authenticated |

## Reports — `/api/reports`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `available` | Público |
| POST | `generate` | Autenticado |
| GET | `:id/pdf` | Autenticado |
| GET | `:id` | Autenticado |

## Waitlist — `/api/waitlist`

| Método | Ruta | Roles |
|--------|------|-------|
| POST | `/` | Authenticated |
| GET | `me` | Authenticated |
| DELETE | `:id` | Authenticated (salir de la lista) |
| GET | `/` | admin, doctor, superadmin |

## Webhooks — `/api/webhooks`

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/` | Cliente autenticado |
| POST | `/` | Cliente autenticado |
| PUT | `:id` | Cliente autenticado |
| DELETE | `:id` | Cliente autenticado |

## Attachments — `/api/attachments`

| Método | Ruta | Roles |
|--------|------|-------|
| POST | `/` | doctor, admin, superadmin, patient, user |
| GET | `/` | doctor, admin, superadmin, patient, user |
| GET | `:id/download` | doctor, admin, superadmin, patient, user |
| DELETE | `:id` | doctor, admin, superadmin, patient, user |

---

Tags: #api #endpoints #referencia
