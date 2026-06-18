# Modelos

> Modelos de TensorFlow.js disponibles.

## Arquitectura

- Framework: TensorFlow.js (carga lazy bajo demanda)
- Modelos entrenados en servidor con datos del tenant
- Cache LRU para inferencia rápida
- Locks de entrenamiento para evitar concurrencia

## Modelos (4)

| Modelo | Propósito | Input | Output |
|--------|-----------|-------|--------|
| NoShow | Predicción de inasistencias | Datos paciente, historial | Probabilidad |
| Demand | Pronóstico de demanda | Histórico de reservas | Demanda esperada |
| ... | ... | ... | ... |
| ... | ... | ... | ... |

> Nota: La documentación detallada está pendiente de restaurar junto con el código fuente.

## Modo Simplificado

Si `ML_SIMPLIFIED=true`, se usan estadísticas básicas sin TensorFlow.js.

---

Tags: #ml #modelos #tensorflow
