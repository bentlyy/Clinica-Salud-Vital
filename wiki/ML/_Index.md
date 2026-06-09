# Machine Learning

4 modelos TensorFlow.js integrados en el módulo `src/modules/ml/`.

## Modelos

| Modelo | Propósito |
|--------|-----------|
| [[ML/NoShow\|No-Show]] | Predice probabilidad de inasistencia |
| [[ML/Diagnosis\|Diagnosis]] | Clasifica diagnósticos desde texto |
| [[ML/Demand\|Demand]] | Forecast de demanda diaria de citas |
| [[ML/VitalAnomaly\|Vital Anomaly]] | Detecta anomalías en signos vitales |

## Features
- LRU cache para predicciones (`ml.cache.ts`)
- Metrics middleware trackea count y latencia
- Input sanitization + validation (`ml.validator.ts`)
- `trainAllModels()` entrena con datos históricos
- Resultados en `ml_prediction_history`, `ml_model_metrics`, `ml_demand_forecast`
- Modelos disposed on reset, cache cleared
