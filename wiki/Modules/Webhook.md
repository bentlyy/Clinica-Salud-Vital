# Webhook

Sistema de webhooks salientes con HMAC.

## Endpoints (Admin)
- `GET /webhooks` — Lista webhooks
- `POST /webhooks` — Crear webhook
- `DELETE /webhooks/:id` — Eliminar webhook

## Features
- Eventos: booking confirmation, etc.
- Secret HMAC autogenerado (32 bytes hex)
- Headers: `X-Webhook-Signature` (HMAC-SHA256), `X-Webhook-Event`
- Tabla `webhook_deliveries` con historial de entregas
- Función `dispatchEvent(event, payload)` para integración en cualquier módulo
