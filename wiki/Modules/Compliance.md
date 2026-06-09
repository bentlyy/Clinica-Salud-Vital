# Compliance (GDPR)

Gestión de privacidad y cumplimiento normativo.

## Endpoints
- `GET /compliance/export` — Exportar datos personales del usuario
- `DELETE /compliance/erase` — Derecho al olvido (anonimiza usuario + PHI)
- `GET /compliance/consents` — Ver consentimientos
- `POST /compliance/consents` — Actualizar consentimientos

## Features
- Exporta profile, bookings, clinical records, invoices
- Borrado anonimiza en 10+ tablas en una transacción
- Tabla `user_consents` para tracking de consentimientos
