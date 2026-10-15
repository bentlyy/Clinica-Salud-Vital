# Recuperación ante Desastres

> Plan de continuidad del negocio.

## Estrategia

| Escenario | RTO Objetivo | RPO Objetivo | Estrategia |
|-----------|-------------|-------------|------------|
| Caída de instancia Render | 15 min | - | Reinicio automático + health check |
| Corrupción de DB | < 1 hora | 24 horas | Restaurar desde backup verificado |
| Error en deploy | 30 min | - | Rollback a versión anterior |
| Pérdida total del servidor | 4 horas | 24 horas | Provisionar nueva instancia + restaurar backup |

## Backup automático (servidor OCI) — implementado 2026-10-09

El backup de `clinicdb` corre en el propio servidor OCI (`146.181.55.59`) mediante
systemd, **con drill de restauración verificado dentro del mismo job** (regla dura:
*ningún backup cuenta hasta que una restauración pase*).

| Elemento | Valor |
|----------|-------|
| Script | `/usr/local/bin/clinic-backup.sh` |
| Dumps | `/home/opc/projects/clinic-db/backups/clinicdb_<ts>.dump` (`pg_dump -Fc`, modo `600`) |
| Log | `.../backups/backup.log` |
| Unidad | `clinic-backup.service` + `clinic-backup.timer` (diario 03:30 GMT, `Persistent=true`) |
| Retención local | 14 días (`BACKUP_RETENTION_DAYS`) |
| Verificación | Restaura en BD temporal `verify_*`, compara nº de tablas, `_migrations` y filas de `tenants/users/doctors/bookings/clinical_records`; **falla ruidosamente** si no cuadra |
| RTO medido (drill) | **4 s** (BD de 21 MB) |

> **Pendiente offsite (3-2-1):** subir el dump a Object Storage (OCI Always Free) o
> S3-compatible. El script deja el hook listo para añadir el paso de subida.

### Restauración probada (RTO)

```bash
# 1. Dump más reciente
LS=$(ls -1t /home/opc/projects/clinic-db/backups/clinicdb_*.dump | head -1)
# 2. Restaurar en BD limpia (dentro del contenedor)
sudo docker exec clinic-db psql -U clinic_admin -d postgres -c "CREATE DATABASE restore_test"
sudo docker exec -i clinic-db pg_restore -U clinic_admin -d restore_test --no-owner --no-acl < "$LS"
# 3. Validar y descartar
sudo docker exec clinic-db psql -U clinic_admin -d restore_test -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
sudo docker exec clinic-db psql -U clinic_admin -d postgres -c "DROP DATABASE restore_test"
```

## Procedimiento de Recuperación

### 1. Caída de API
- Render reinicia automáticamente el servicio
- Verificar con `GET /health`
- Revisar logs en Render dashboard

### 2. Corrupción de DB
```bash
# 1. Detener la aplicación (Render) para evitar escrituras
# 2. Restaurar el dump custom más reciente (formato -Fc)
DUMP=$(ls -1t /home/opc/projects/clinic-db/backups/clinicdb_*.dump | head -1)
sudo docker exec -i clinic-db pg_restore -U clinic_admin -d clinicdb --clean --if-exists --no-owner --no-acl < "$DUMP"
# 3. Verificar integridad (tablas + _migrations + smoke test /api/health + login)
# 4. Reiniciar la aplicación
```

### 3. Error en Deploy
- Render mantiene la versión anterior activa si falla el health check
- Hacer deploy manual de la versión estable

---

Tags: #operaciones #disaster-recovery
