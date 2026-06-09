# Billing

## Endpoints
- `GET /billing/invoices` — Lista facturas
- `POST /billing/invoices` — Crear (admin)
- `GET /billing/invoices/:id` — Detalle

## Features
- Facturas con formato `INV-YYYY-XXXXX`
- Items de factura
- Pagos asociados
- Reclamos a seguros (insurance claims)
- Integración con Stripe para pagos
