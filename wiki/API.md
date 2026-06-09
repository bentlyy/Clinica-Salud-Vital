# API — Endpoints

Base URL: `/api/v1/`

## Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Registro usuario |
| POST | `/auth/login` | No | Login (access + refresh token) |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | Sí | Revoca refresh token |
| POST | `/auth/logout-all` | Sí | Revoca todos los tokens |
| POST | `/auth/change-password` | Sí | Cambio de password |
| POST | `/auth/2fa/enable` | Sí | Genera secreto TOTP |
| POST | `/auth/2fa/verify` | Sí | Verifica y activa 2FA |
| POST | `/auth/2fa/disable` | Sí | Desactiva 2FA |

## Bookings

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/bookings` | Sí | Lista reservas (paginado) |
| POST | `/bookings` | Sí | Crear reserva |
| GET | `/bookings/:id` | Sí | Detalle reserva |
| PATCH | `/bookings/:id` | Sí | Actualizar reserva |
| DELETE | `/bookings/:id` | Sí | Cancelar reserva |
| GET | `/bookings/slots` | No | Slots disponibles |

## Doctores

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/doctors` | No | Lista doctores |
| POST | `/doctors` | Admin | Crear doctor |
| GET | `/doctors/:id` | No | Perfil doctor |
| GET | `/doctors/users` | Admin | Lista usuarios del tenant |
| PATCH | `/doctors/users/:id/active` | Admin | Activar/desactivar usuario |

## Clinical Records

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/clinical-records` | Sí | Lista EHR |
| POST | `/clinical-records` | Doctor | Crear EHR |
| GET | `/clinical-records/:id` | Sí | Detalle EHR |
| GET | `/clinical-records/:id/pdf` | Sí | Receta PDF |

## Analytics (Admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/analytics/dashboard` | Dashboard stats |
| GET | `/analytics/appointments` | Stats citas |
| GET | `/analytics/revenue` | Stats ingresos |

## Billing

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/billing/invoices` | Sí | Lista facturas |
| POST | `/billing/invoices` | Admin | Crear factura |
| GET | `/billing/invoices/:id` | Sí | Detalle factura |

## Laboratory

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/laboratory/tests` | Sí | Lista exámenes |
| POST | `/laboratory/requests` | Doctor | Solicitar examen |
| GET | `/laboratory/results/:id` | Sí | Ver resultado |

## ML

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/ml/predict/no-show` | Sí | Predecir no-show |
| POST | `/ml/predict/diagnosis` | Doctor | Clasificar diagnóstico |
| GET | `/ml/forecast/demand` | Admin | Forecast demanda |
| POST | `/ml/train` | Admin | Entrenar modelos |

## SaaS / Multi-tenant

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/saas/onboard` | No | Crear tenant + admin |
| POST | `/saas/checkout` | No | Stripe checkout |

## Super Admin

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/super-admin/stats` | Super | Stats globales |
| GET | `/super-admin/tenants` | Super | Lista tenants |
| POST | `/super-admin/tenants` | Super | Crear tenant |
| GET | `/super-admin/tenants/:id` | Super | Detalle tenant |
| PATCH | `/super-admin/tenants/:id` | Super | Editar tenant |
| DELETE | `/super-admin/tenants/:id` | Super | Eliminar tenant |

## i18n

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/i18n/translations` | Todas las traducciones |

## Webhooks (Admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/webhooks` | Lista webhooks |
| POST | `/webhooks` | Crear webhook |
| DELETE | `/webhooks/:id` | Eliminar webhook |

## Auth
- Header: `Authorization: Bearer <token>`
- Access token: 15 min
- Refresh token: 30 días
- Login response: `{ access_token, refresh_token, user }`

## Errores
```json
{ "error": "mensaje", "details": ["campo: detalle"], "stack": "..." }
```
Stack solo en dev.
