# Monitoring

Observabilidad y operaciones del sistema.

## Endpoints (Admin)
- `GET /monitoring/health` — Health check público (DB latency, event loop, memoria)
- `GET /monitoring/memory` — Reporte de memoria con tendencias
- `GET /monitoring/database` — Introspect DB (slow queries, table sizes)
- `GET /monitoring/ml-metrics` — Métricas de modelos ML
- `GET /monitoring/logs` — Tail de logs
- `POST /monitoring/gc` — Trigger manual de garbage collection

## Features
- Health check público (no requiere auth)
- Análisis de `pg_stat_activity` y `pg_stat_user_tables`
- Reportes de memoria con análisis de tendencias
- Acceso admin para endpoints sensibles
