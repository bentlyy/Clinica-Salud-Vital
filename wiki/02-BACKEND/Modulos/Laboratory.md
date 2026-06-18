# Módulo Laboratory

> Gestión de exámenes de laboratorio.

## Ubicación: `src/modules/laboratory/`

| Archivo | Propósito |
|---------|-----------|
| `laboratory.controller.ts` | Handlers de rutas |
| `laboratory.service.ts` | Lógica de laboratorio |
| `laboratory.routes.ts` | Definición de rutas |
| `laboratory.schema.ts` | Validación Zod |
| `lab-order-pdf.service.ts` | Generación de PDF de órdenes |

## Endpoints: `/api/laboratory`

- CRUD de tests de laboratorio (catálogo)
- Gestión de solicitudes de laboratorio
- Registro de resultados
- Descarga de PDF
- Soporte para `lab_technician` role
- Filtro por `lab_type`: internal / external

## Entidades

- `lab_tests`: Catálogo de exámenes con rangos de referencia
- `lab_requests`: Solicitudes de laboratorio
- `lab_request_items`: Items individuales con resultados

## Feature Gate

El módulo requiere la feature flag `laboratory` habilitada en el plan SaaS.

---

Tags: #modulo #laboratory #laboratorio
