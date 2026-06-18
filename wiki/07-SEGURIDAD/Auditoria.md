# Auditoría

> Logs de auditoría con integridad criptográfica.

## Cadena de Auditoría

Cada operación CUD en entidades críticas registra:

```json
{
  "user_id": 1,
  "action": "UPDATE",
  "resource_type": "booking",
  "resource_id": 123,
  "old_values": { "status": "pending" },
  "new_values": { "status": "confirmed" },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/...",
  "previous_hash": "abc...",
  "hash": "def..."
}
```

## Integridad HMAC

```sql
hash = HMAC-SHA256(
  previous_hash + action + old_values + new_values,
  AUDIT_HMAC_SECRET
)
```

## Verificación Programada

El cron job `audit-integrity.job.ts` (cada 6 horas):
1. Recorre la cadena de auditoría
2. Recalcula hashes
3. Reporta inconsistencias

## Lo que se Audita

- Creación/modificación/eliminación de reservas
- Cambios en registros clínicos
- Modificaciones de usuarios
- Operaciones de facturación
- Cambios en configuración del tenant

---

Tags: #seguridad #auditoria #hmac
