# No-Show Model

Predice probabilidad de que un paciente no asista a su cita.

## Inputs
- `doctorId`
- `userId`
- `date`
- `time`
- `bookingId`

## Output
- Probabilidad de no-show (0-1)

## Endpoint
`POST /ml/predict/no-show`
