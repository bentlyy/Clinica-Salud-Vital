# SUB-14 — Portabilidad de datos y webhooks

> **Estado:** AS-IS completado · **Certeza global:** confirmado (código + SQL). Efecto en prod NO VERIFICADO.
> **Evidencia principal:** `src/modules/data-portability/*`, `src/modules/webhooks/*`, `src/shared/queue.service.ts` (worker `webhook:dispatch`), `db/migrations/017_webhook_subscriptions.sql`, `db/init.sql` (`webhook_subscriptions`/`webhook_deliveries`), `src/app.ts` (montaje).
> **Nota:** este subsistema agrupa dos módulos independientes (export RGPD y webhooks salientes).

## 1. Propósito

- **Portabilidad de datos (RGPD):** permitir a un paciente descargar sus datos clínicos y administrativos en JSON (`/api/export`).
- **Webhooks salientes:** permitir a un tenant admin configurar suscripciones HTTP que reciban eventos del sistema (`booking.created`, `result.ready`, …) firmados con HMAC (`/api/webhooks`).

## 2. Componentes

| Módulo | Rol |
|---|---|
| `data-portability.routes/controller/service/schema` | Export JSON de la historia de un paciente (o la propia) |
| `webhooks.routes/controller/schema` | CRUD de suscripciones webhook (admin/superadmin) |
| `webhooks.service` | Validación URL/eventos, `dispatchEvent`, `dispatchWebhook` (firma HMAC), worker `webhook:dispatch` |
| `shared/queue.service` | Cola de jobs; `registerWorkers()` registra `webhook:dispatch` |

## 3. Superficie HTTP

| Módulo | Prefijo | Auth | Endpoints |
|---|---|---|---|
| data-portability | `/api/export` (`app.ts:288`) | authMiddleware | `GET /me`; `GET /patients/:patientId` (+ `authorize('admin','doctor','superadmin','patient')`) |
| webhooks | `/api/webhooks` (`app.ts:289`) | authMiddleware + `authorize('admin','superadmin')` | `GET /`; `POST /`; `PUT /:id`; `DELETE /:id` |

## 4. Reglas de negocio (AS-IS)

- **Export:** sólo devuelve datos del `tenant_id` de la sesión; redacta campos sensibles (`password`, `totp_secret`, `token_version`, …). Un paciente (`role='patient'`) sólo puede exportarse a sí mismo; `admin`/`doctor`/`superadmin` pueden exportar a cualquier id del tenant. **No existe endpoint de supresión/borrado ni anonimización** (sólo export).
- **Webhooks:** eventos permitidos = `WEBHOOK_EVENTS` (6). URL validada contra rangos privados (SSRF básico). Secreto autogenerado (32 bytes) o provisto; firma `sha256` sobre `${timestamp}.${JSON.stringify({event,payload})}`. Entrega por cola con timeout 10s.

## 5. Integración de eventos (AS-IS crítico)

- `dispatchEvent(event, payload, tenantId)` es el único punto que **encola** entregas, pero **no tiene ningún invocador** en el código → los webhooks **nunca disparan** (ver FND-N1).
- El worker `webhook:dispatch` **sí** está registrado al arranque (`queue.service.ts:151-152`) y ejecuta `dispatchWebhook`; la tabla `webhook_deliveries` existe pero el código **nunca** la escribe (FND-N5).

## 6. Almacenamiento/secretos

- `webhook_subscriptions.secret` es `TEXT` **en claro**; no se usa el cifrado disponible (`ENCRYPTION_KEY`/AES-GCM) (FND-N2).
- Drift entre `init.sql:645-655` y la migración `017` (UNIQUE `(tenant_id,url)` + `TIMESTAMPTZ` sólo en la migración) (FND-N9).

## 7. NO VERIFICADO

- Si algún consumidor externo cria webhooks esperando entregas (hoy no llegan).
- Si `webhook_deliveries` fue poblada por una versión anterior del código.
- Uso real de `/api/export` y volumen de datos exportados.
