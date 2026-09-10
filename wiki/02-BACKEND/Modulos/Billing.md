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

## Pagos externos

- Las **suscripciones SaaS** se cobran con **Mercado Pago (CLP)** vía el módulo `saas` (webhook `POST /api/saas/webhook/mercadopago`). Sin `MERCADOPAGO_ACCESS_TOKEN`, el checkout opera en modo simulado (stub).
- El módulo `billing` mantiene facturación interna (facturas, items, pagos, reclamos a seguros) sin pasarela externa.

---

Tags: #modulo #billing #facturacion
