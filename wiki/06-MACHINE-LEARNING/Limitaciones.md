# Limitaciones

> Limitaciones actuales del módulo de Machine Learning.

## Problemas Conocidos

| # | Problema | Impacto | Prioridad |
|---|----------|---------|-----------|
| 1 | Código fuente ausente en `src/modules/ml/` | No se puede modificar ni mantener | Alta |
| 2 | Solo existe en `dist/` como JS compilado | No hay tipados ni documentación | Alta |
| 3 | Modelos TF.js en heap de Node.js | Presión de memoria en procesos compartidos | Media |
| 4 | `ML_SIMPLIFIED` no documentado en código | Modo stats sin documentación | Baja |
| 5 | Sin tests para modelos ML | Riesgo de regresiones | Media |

## Recomendaciones

1. Restaurar fuente desde `dist/` o reescribir módulo ML
2. Agregar tests unitarios para modelos
3. Documentar API de inferencia
4. Evaluar si el módulo ML es necesario para el alcance actual (20 clínicas)

---

Tags: #ml #limitaciones #deuda-tecnica
