# Módulos del Backend

> 23 módulos activos en `src/modules/` (98 archivos). Patrón monolito modular.

## Módulos de Autenticación y Acceso

| Módulo | Prefijo API | Archivos | Descripción |
|--------|-------------|----------|-------------|
| [[02-BACKEND/Modulos/Auth\|Auth]] | `/api/auth` | 4 | Registro, login, JWT, 2FA, refresh, sesiones, password |
| [[02-BACKEND/Modulos/Guest\|Guest]] | `/api/guest` | 5 | Booking para invitados por RUT + confirmación por email |

## Módulos de Agenda

| Módulo | Prefijo API | Archivos | Descripción |
|--------|-------------|----------|-------------|
| [[02-BACKEND/Modulos/Doctor\|Doctor]] | `/api/doctors` | 5 | Perfiles, registro, invitación, gestión |
| [[02-BACKEND/Modulos/Booking\|Booking]] | `/api/bookings` | 5 | Reservas, slots, series, agenda, emails |
| [[02-BACKEND/Modulos/Availability\|Availability]] | `/api/availability` + `/api/availability-exceptions` | 4 + 4 | Bloques semanales + excepciones |
| Holidays | `/api/holidays` | 4 | Feriados de la clínica |
| Calendar | `/api/calendar` | 4 + `ics.util.ts` | Exportación ICS de agenda |
| Waitlist | `/api/waitlist` | 4 | Lista de espera |

## Módulos de Datos Clínicos

| Módulo | Prefijo API | Archivos | Descripción |
|--------|-------------|----------|-------------|
| [[02-BACKEND/Modulos/ClinicalRecord\|Clinical Record]] | `/api/clinical-records` | 7 | EHR SOAP, recetas, CIE-10, PDF |
| Clinical Templates | `/api/clinical-templates` | 4 | Plantillas de fichas clínicas |
| Medical History | `/api/medical-history` | 3 | Historial médico del paciente |
| [[02-BACKEND/Modulos/Laboratory\|Laboratory]] | `/api/laboratory` | 7 | Exámenes, solicitudes, resultados, muestras, QC, PDF, emails |
| Attachments | `/api/attachments` | 4 | Adjuntos a registros |
| Data Portability | `/api/export` | 4 | Exportación (GDPR) de historia clínica |

## Módulos de Negocio

| Módulo | Prefijo API | Archivos | Descripción |
|--------|-------------|----------|-------------|
| [[02-BACKEND/Modulos/Analytics\|Analytics]] | `/api/analytics` | 3 | Dashboard, KPIs, demanda (SMA), vitals |
| [[02-BACKEND/Modulos/Billing\|Billing]] | `/api/billing` | 4 | Facturas, pagos, seguros |
| Reports | `/api/reports` | 4 | Reportes + PDF |
| Notifications | `/api/notifications` | 4 | Notificaciones in-app |
| Webhooks | `/api/webhooks` | 4 | Suscripciones y entregas de webhooks |
| [[02-BACKEND/Modulos/SaaS\|SaaS]] | `/api/saas` | 4 | Multi-tenant, planes, suscripciones, features |

## Módulos de Sistema

| Módulo | Prefijo API | Archivos | Descripción |
|--------|-------------|----------|-------------|
| [[02-BACKEND/Modulos/Audit\|Audit]] | `/api/audit` | 3 | Logs de auditoría |
| [[02-BACKEND/Modulos/Specialties\|Specialties]] | `/api/specialties` | 3 | Catálogo de especialidades |
| [[02-BACKEND/Modulos/SuperAdmin\|Super Admin]] | `/api/super-admin` | 4 | Gestión global de tenants, usuarios, analytics |

## Notas

- ~66% de los módulos incluyen `*.schema.ts` (Zod). `analytics`, `audit`, `specialties`, `reports` y `medical-history` usan Zod inline o validan en el service.
- `laboratory` (46 endpoints) y `super-admin` (22) son los módulos con mayor superficie de API.
- El sistema de sesiones vive en `shared/sessions.service.ts` y se expone por `/api/auth/sessions`.

---

Tags: #modulos #backend #indice