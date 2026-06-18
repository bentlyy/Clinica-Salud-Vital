# Módulo Billing

> Facturación, pagos y seguros.

## Ubicación: `src/modules/billing/`

| Archivo | Propósito |
|---------|-----------|
| `billing.controller.ts` | Handlers de rutas |
| `billing.service.ts` | Lógica de facturación |
| `billing.routes.ts` | Definición de rutas |
| `billing.schema.ts` | Validación Zod |

## Endpoints: `/api/billing`

- `GET /` — Listar facturas
- `GET /stats` — Estadísticas de facturación
- `GET /:id` — Detalle de factura
- `POST /` — Crear factura
- `PATCH /:id/status` — Actualizar estado
- `DELETE /:id` — Eliminar factura

## Entidades

- `invoices`: Facturas con concepto, montos, impuestos
- `invoice_items`: Items individuales de cada factura
- `payments`: Pagos asociados a facturas
- `insurance_claims`: Reclamos a seguros

## Integración Stripe

Stripe está en **modo simulado** (stub). Sin API key válida, opera en modo local.

---

Tags: #modulo #billing #facturacion
