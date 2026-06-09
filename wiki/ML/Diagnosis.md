# Diagnosis Model

Clasifica diagnósticos desde el texto del motivo de consulta.

## Inputs
- `chiefComplaint` — texto del paciente

## Output
- Categoría de diagnóstico CIE-10

## Endpoint
`POST /ml/predict/diagnosis` (requiere rol doctor)
