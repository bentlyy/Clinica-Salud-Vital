# Modelos

> Modelos de ML activos en el sistema.

## Modelo Activo

### SMA Forecast (Pronóstico de Demanda)

| Aspecto | Detalle |
|---------|---------|
| Tipo | Estadístico (media móvil simple), NO red neuronal |
| Ubicación | `src/modules/analytics/analytics.service.ts:33` |
| Endpoint | `GET /api/analytics/demand` |
| Parámetro | `days` (días históricos a considerar) |
| Horizontes | 7 días hacia adelante |
| Ventana | Min(7, históricos disponibles) |
| Fallback | Promedio global de bookings si no hay datos |
| Unidad | Reservas esperadas por día |

## Algoritmo

```text
window  = min(7, historical.length)
base    = avg(últimos 'window' días de bookings) → redondeado, mím. 0
output  = base, base, ..., base  (horizon=7)
```

- El valor predicho es **constante** (promedio simple), sin tendencia ni estacionalidad.
- Frontend: `modules/analytics` despliega `date` vs `predicted` junto al histórico real.

## Modelos Planificados / No Existentes

| Modelo | Estado |
|--------|--------|
| Redes neuronales (TF.js) | ❌ No existe (eliminado/documentado como falso en docs antiguos) |
| Registro/MLOps | ❌ No hay serving, entrenamiento ni pipelines |
| Suavizado exponencial | 🟡 Candidato a futuro |

## Tabla de soporte

`ml_demand_forecast` (tenant_id, date, predicted_demand, actual_demand, confidence) — diseñada para persistir pronósticos; hoy solo recibe backfill de seed.

---

Tags: #ml #modelos #forecast