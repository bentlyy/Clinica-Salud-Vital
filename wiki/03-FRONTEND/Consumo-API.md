# Consumo de API

> Capa de comunicación del frontend con el backend (2026-09-01).

Ya no existe la carpeta `src/api/` con archivos `axios.js`. Toda la comunicación pasa por un **único cliente Axios** en `shared/services/api-client.ts` consumido por **22 services por módulo**.

## Cliente central — `api-client.ts`

```typescript
// shared/services/api-client.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  timeout: 30000
});
export default api;
```

- `baseURL` configurable vía `VITE_API_URL` (default `/api`)
- `withCredentials: true` (cookies: refresh, CSRF, tenant)
- timeout 30s

### Interceptores

**Request**
- Inyecta `Authorization: Bearer <token>` (token en memoria desde AuthProvider)
- Inyecta `X-Tenant-Id` (leído de localStorage)
- Inyecta `X-CSRF-Token` (cookie `csrf_token`)

**Response**
- Captura headers `x-csrf-token` / `x-tenant-id` y los propaga
- Refresh automático de token (cola de subscribers para peticiones concurrentes)
- Errores unificados vía `toast` + mensajes i18n

## Services por módulo (22)

| Service | Módulo | Funciones destacadas |
|---------|--------|---------------------|
| `two-fa.service.ts` | 2fa | setup, verify, disable |
| `analytics.service.ts` | analytics (dashboard) | KPIs, demand forecast, vitals |
| `attachments.service.ts` | attachments | upload, list, download, delete |
| `audit.service.ts` | audit | list logs, integrator |
| `availability.service.ts` | availability | slots + excepciones |
| `billing.service.ts` | billing | invoices, payments, insurances |
| `booking.service.ts` | bookings | CRUD bookings, slots, series |
| `clinical-record.service.ts` | clinical-records | SOAP, recetas, CIE-10 |
| `clinical-template.service.ts` | clinical-templates | CRUD plantillas |
| `doctor.service.ts` | doctors | CRUD doctors, invites |
| `holiday.service.ts` | holidays | CRUD feriados |
| `lab.service.ts` | laboratory | tests, solicitudes, muestras, QC, resultados, áreas |
| `medical-history.service.ts` | medical-history | historia del paciente |
| `notification.service.ts` | notifications | list, unread, mark-read |
| `patient.service.ts` | patients | listado y detalle pacientes |
| `prescription.service.ts` | prescriptions | recetas del paciente |
| `report.service.ts` | reports | generate, pdf |
| `settings.service.ts` | settings | ajustes de usuario/clínica |
| `specialty.service.ts` | specialties | catálogo |
| `super-admin.service.ts` | super-admin | tenants, usuarios, billing global |
| `user.service.ts` | users | gestión de usuarios |
| `waitlist.service.ts` | waitlist | join, leave, list |

## Ejemplo de uso

```typescript
import api from '@/shared/services/api-client';

export async function listBookings(params: BookingListParams) {
  const { data } = await api.get('/bookings', { params });
  return data; // { data, pagination }
}
```

## Convenciones de respuesta

| Formato | Descripción |
|---------|-------------|
| `{ data }` | Lógica o lista |
| `{ data, pagination }` | Listas paginadas |
| `{ error, details }` | Errores de API |
| `204` | Sin contenido (deletes) |

---

Tags: #frontend #api #axios #consumo-api