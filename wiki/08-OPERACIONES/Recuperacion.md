# Recuperación ante Desastres

> Plan de continuidad del negocio.

## Estrategia

| Escenario | RTO Objetivo | RPO Objetivo | Estrategia |
|-----------|-------------|-------------|------------|
| Caída de instancia Render | 15 min | - | Reinicio automático + health check |
| Corrupción de DB | 2 horas | 24 horas | Restaurar desde backup |
| Error en deploy | 30 min | - | Rollback a versión anterior |
| Pérdida total del servidor | 4 horas | 24 horas | Provisionar nueva instancia + restaurar backup |

## Procedimiento de Recuperación

### 1. Caída de API
- Render reinicia automáticamente el servicio
- Verificar con `GET /health`
- Revisar logs en Render dashboard

### 2. Corrupción de DB
```bash
# 1. Detener aplicación
# 2. Restaurar backup más reciente
gunzip -c backup_latest.sql.gz | psql "$DATABASE_URL"

# 3. Verificar integridad
# 4. Reiniciar aplicación
```

### 3. Error en Deploy
- Render mantiene la versión anterior activa si falla el health check
- Hacer deploy manual de la versión estable

---

Tags: #operaciones #disaster-recovery
