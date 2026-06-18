# Módulos del Backend

> 14 módulos activos en `src/modules/`. Patrón monolito modular.

## Módulos Core

| Módulo | Prefijo API | Archivos | Descripción |
|--------|-------------|----------|-------------|
| [[02-BACKEND/Modulos/Auth\|Auth]] | `/api/auth` | 4 | Registro, login, JWT, 2FA, refresh tokens |
| [[02-BACKEND/Modulos/Doctor\|Doctor]] | `/api/doctors` | 5 | Perfiles, registro, gestión |
| [[02-BACKEND/Modulos/Booking\|Booking]] | `/api/bookings` | 5 | Reservas, slots, agenda |
| [[02-BACKEND/Modulos/Availability\|Availability]] | `/api/availability` | 4 | Bloques semanales |
| [[02-BACKEND/Modulos/Guest\|Guest]] | `/api/guest` | 5 | Booking para invitados |

## Módulos de Datos Clínicos

| Módulo | Prefijo API | Archivos | Descripción |
|--------|-------------|----------|-------------|
| [[02-BACKEND/Modulos/ClinicalRecord\|Clinical Record]] | `/api/clinical-records` | 7 | EHR, recetas, CIE-10, PDF |
| [[02-BACKEND/Modulos/Laboratory\|Laboratory]] | `/api/laboratory` | 6 | Exámenes, solicitudes, resultados |

## Módulos de Negocio

| Módulo | Prefijo API | Archivos | Descripción |
|--------|-------------|----------|-------------|
| [[02-BACKEND/Modulos/Analytics\|Analytics]] | `/api/analytics` | 3 | Dashboard, KPIs |
| [[02-BACKEND/Modulos/Billing\|Billing]] | `/api/billing` | 4 | Facturas, pagos, seguros |
| [[02-BACKEND/Modulos/SaaS\|SaaS]] | `/api/saas` | 4 | Multi-tenant, planes, suscripciones |

## Módulos de Sistema

| Módulo | Prefijo API | Archivos | Descripción |
|--------|-------------|----------|-------------|
| [[02-BACKEND/Modulos/Audit\|Audit]] | `/api/audit` | 3 | Logs de auditoría |
| [[02-BACKEND/Modulos/Specialties\|Specialties]] | `/api/specialties` | 3 | Catálogo de especialidades |
| [[02-BACKEND/Modulos/SuperAdmin\|Super Admin]] | `/api/super-admin` | 4 | Gestión global de tenants |

## Módulo Placeholder

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Patient | ⬜ Vacío | Sin implementar (directorio sin archivos) |

---

Tags: #modulos #backend #indice
