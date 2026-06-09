# FHIR (Fast Healthcare Interoperability Resources)

Capa de interoperabilidad estándar FHIR R4.

## Endpoints
- `GET /fhir/Patient/:id` — Recurso Patient en FHIR
- `GET /fhir/Patient` — Búsqueda de pacientes (searchset bundle)
- `GET /fhir/Appointment/:id` — Recurso Appointment en FHIR
- `GET /fhir/Appointment` — Búsqueda de citas

## Features
- Mapeo de `users` → FHIR Patient
- Mapeo de `bookings` → FHIR Appointment
- Formato estándar con `resourceType`, `identifier`, `name`, `telecom`
- Searchset bundles para listados
