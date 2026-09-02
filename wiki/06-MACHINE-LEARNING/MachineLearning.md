# Machine Learning

> El sistema **no incluye TensorFlow.js** ni modelos de deep learning.

## Realidad (2026-09-01)

- ❌ No existe `src/modules/ml/` ni `dist/modules/ml/`
- ❌ No hay dependencia `@tensorflow/tfjs` en el backend
- ✅ Existe una **simulación/predicción estadística** de demanda de citas dentro del módulo `analytics`

## Qué hay hoy

**Pronóstico de demanda** — media móvil simple (SMA) de 7 días:

- Función `smaForecast(historical, horizon, fallback)` en `src/modules/analytics/analytics.service.ts:33`
- Endpoint `GET /api/analytics/demand` (roles admin/superadmin)
- Toma los últimos N días de bookings reales, calcula el promedio de la última ventana (máx 7 días) y proyecta ese valor constante hacia adelante (horizonte 7 días)

## Tabla `ml_demand_forecast`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | SERIAL PK | Identificador |
| `tenant_id` | TEXT | Tenant (RLS aplicada) |
| `date` | DATE | Fecha del pronóstico |
| `predicted_demand` | INTEGER | Demanda predicha |
| `actual_demand` | INTEGER | Demanda real (posterior) |
| `confidence` | INTEGER | Confianza (sin usar) |
| `created_at` | TIMESTAMP | Fecha de creación |

Estado: se crea en `db/init.sql:801`, se rellena con backfill en `seed/seed.ts:1053`, está incluida en las políticas RLS, pero **todavía no se lee** por el endpoint (el cálculo es en vivo sobre `bookings`). Es una tabla preparada para un futuro modelo, hoy es write-only.

## Próximos pasos

1. Alimentar `ml_demand_forecast` desde `/api/analytics/demand` (persistir pronósticos)
2. Modelo de regresión simple (media móvil ponderada / suavizado exponencial)
3. Evaluar TF.js o un microservicio Python para modelos más complejos

---

Tags: #ml #machine-learning #analytics