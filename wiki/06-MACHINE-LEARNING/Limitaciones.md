# Limitaciones del ML

> Limitaciones de la implementación actual de ML/simulación.

## Limitaciones Funcionales

| Limitación | Impacto |
|------------|---------|
| No hay modelos de ML reales | Precisión limitada a promedios históricos |
| `smaForecast` es una **media móvil simple** | No captura tendencias, estacionalidad ni efectos de calendario (feriados, horas, especialidad) |
| Predicción constante | El pronóstico de cada día es idéntico; ignora patrones semanales |
| Sin actualización en tiempo real | No hay persistencia de forecast por fecha en `ml_demand_forecast` (write-only de seed) |
| Sin métricas de error | No se computa MAE/MAPE vs `actual_demand` |

## Limitaciones de Datos

| Item | Detalle |
|------|---------|
| Volumen | Depende de los bookings del tenant; tenants nuevos tienen datos insuficientes |
| Calidad | Cuenta sólo bookings (no no-shows, cancelados excluidos) |
| Granularidad | Diaria; sin desagregación por médico/especialidad/hora |
| Multi-tenant | Todo el cálculo es por tenant (correcto) pero sin modelo global |

## Limitaciones de Implementación

- El endpoint hace el cálculo **en vivo** sobre `bookings` (no usa la tabla `ml_demand_forecast`)
- El fallback a promedio global degrada el pronóstico cuando no hay histórico
- No hay feature flags ni gating para el "ML" (a diferencia de laboratory)

## Mejoras recomendadas

1. Persistir pronósticos en `ml_demand_forecast` y comparar con `actual_demand`
2. Suavizado exponencial doble (Holts) para capturar tendencia
3. Variables exógenas: feriados (`clinic_holidays`), día de la semana, disponibilidad de médicos
4. Definir y medir una métrica de error (MAPE) expuesta en el dashboard

---

Tags: #ml #limitaciones #deuda-tecnica