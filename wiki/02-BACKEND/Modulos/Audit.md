# Módulo Audit

> Logs de auditoría con integridad criptográfica.

## Ubicación: `src/modules/audit/`

| Archivo | Propósito |
|---------|-----------|
| `audit.controller.ts` | Handlers de rutas |
| `audit.service.ts` | Consulta de logs |
| `audit.routes.ts` | Definición de rutas |

## Endpoints: `/api/audit`

- `GET /` — Listar logs de auditoría (admin)

## Integridad de la Cadena

Los logs de auditoría usan una cadena HMAC-SHA256:

```sql
hash = HMAC-SHA256(previous_hash + action + old_values + new_values)
```

Cada log contiene:
- `previous_hash`: Hash del registro anterior
- `hash`: Hash del registro actual

## Verificación

El cron job `audit-integrity.job.ts` verifica la integridad de la cadena cada 6 horas.

## Registro de Eventos

Todas las operaciones CUD en entidades críticas se registran automáticamente:
- IP + user agent
- Valores antes y después del cambio
- ID del usuario que realizó la acción

---

Tags: #modulo #audit #auditoria
